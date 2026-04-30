import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const startOfTodayLima = (): string => {
  // Lima = UTC-5 (sin DST). "Hoy en Lima 00:00" = "ayer 05:00 UTC" si UTC < 05:00,
  // o "hoy 05:00 UTC" si UTC >= 05:00.
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  const utcHour = now.getUTCHours();
  const dateForLima = utcHour < 5 ? utcDate - 1 : utcDate;
  return new Date(Date.UTC(utcYear, utcMonth, dateForLima, 5, 0, 0)).toISOString();
};

export type AdminStats = {
  users_total: number;
  drivers_total: number;
  passengers_total: number;
  active_total: number;
  preregistered_total: number;
  preregistered_today: number;
  conversations_today: number;
  trips_today: number;
  trips_completed_today: number;
  revenue_today: number;
  drivers_on_shift: number;
  // Aliases para compat con endpoints legacy
  waitlist_total: number;
  waitlist_today: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeCount = (r: any): number => (r && typeof r.count === "number" ? r.count : 0);

export async function getStats(): Promise<AdminStats> {
  const todayIso = startOfTodayLima();
  // Promise.allSettled: si una query falla no rompe el dashboard.
  const results = await Promise.allSettled([
    supabase.from("usuarios").select("*", { count: "exact", head: true }),
    supabase.from("usuarios").select("*", { count: "exact", head: true }).eq("rol", "chofer"),
    supabase.from("usuarios").select("*", { count: "exact", head: true }).eq("rol", "pasajero"),
    supabase.from("usuarios").select("*", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("usuarios").select("*", { count: "exact", head: true }).eq("estado", "pre_registro"),
    supabase
      .from("usuarios")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pre_registro")
      .gte("created_at", todayIso),
    supabase
      .from("eco_messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayIso),
    supabase
      .from("viajes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayIso),
    supabase
      .from("viajes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayIso)
      .eq("estado", "completado"),
    supabase
      .from("chofer_estado")
      .select("*", { count: "exact", head: true })
      .eq("en_turno", true),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = (i: number): any => (results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<any>).value : null);
  const [users, drivers, passengers, activos, pre, preToday, convosToday, tripsToday, tripsCompletedToday, onShift] =
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(value);

  // Revenue hoy: sumar precio_estimado de viajes completados (resiliente a fallos)
  let revenue_today = 0;
  try {
    const { data: revenueRows } = await supabase
      .from("viajes")
      .select("precio_estimado")
      .gte("created_at", todayIso)
      .eq("estado", "completado");
    revenue_today = ((revenueRows || []) as Array<{ precio_estimado: number | null }>).reduce(
      (acc: number, r: { precio_estimado: number | null }) => acc + (Number(r.precio_estimado) || 0),
      0
    );
  } catch {
    revenue_today = 0;
  }

  return {
    users_total: safeCount(users),
    drivers_total: safeCount(drivers),
    passengers_total: safeCount(passengers),
    active_total: safeCount(activos),
    preregistered_total: safeCount(pre),
    preregistered_today: safeCount(preToday),
    conversations_today: safeCount(convosToday),
    trips_today: safeCount(tripsToday),
    trips_completed_today: safeCount(tripsCompletedToday),
    revenue_today,
    drivers_on_shift: safeCount(onShift),
    // Compat aliases para endpoints legacy
    waitlist_total: safeCount(pre),
    waitlist_today: safeCount(preToday),
  };
}

// ─── Backward-compat con bot Eco legacy /api/whatsapp/eco ───────────────────
// El bot real corre en n8n; estos helpers solo son para que el endpoint
// secundario de /api/whatsapp/eco no rompa el build.
import type { ConversationMessage } from "./types";

export async function getOrCreateUser(celular: string, nombre?: string) {
  const { data: existing } = await supabase
    .from("usuarios")
    .select("*")
    .eq("telefono", celular)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("usuarios")
      .update({ ultimo_contacto_eco: new Date().toISOString() })
      .eq("id", existing.id);
    return { ...existing, isNew: false };
  }
  const { data: nuevo } = await supabase
    .from("usuarios")
    .insert({
      telefono: celular,
      nombre: nombre || null,
      rol: "pasajero",
      estado: "pre_registro",
      primer_contacto_eco: new Date().toISOString(),
    })
    .select()
    .single();
  return { ...nuevo, isNew: true };
}

export async function getConversation(celular: string) {
  const { data } = await supabase
    .from("eco_messages")
    .select("role, content, created_at")
    .eq("user_phone", celular)
    .order("created_at", { ascending: true })
    .limit(40);
  if (!data || data.length === 0) return null;
  return {
    celular,
    messages: data.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
    state: {},
    updated_at: data[data.length - 1]?.created_at,
  };
}

export async function appendMessage(celular: string, message: ConversationMessage) {
  await supabase.from("eco_messages").insert({
    user_phone: celular,
    role: message.role,
    content: message.content,
    msg_type: "text",
  });
}

export async function addToWaitlist(args: {
  celular: string;
  nombre?: string;
  interes: "passenger" | "driver" | "both";
  notas?: string;
  source?: string;
}) {
  const rolMap: Record<string, string> = { passenger: "pasajero", driver: "chofer", both: "pasajero" };
  const rol = rolMap[args.interes] || "pasajero";
  const { data } = await supabase
    .from("usuarios")
    .upsert(
      {
        telefono: args.celular,
        nombre: args.nombre || null,
        rol,
        estado: "pre_registro",
        metadata: { interes: args.interes, notas: args.notas || null, source: args.source || "whatsapp_bot" },
      },
      { onConflict: "telefono" }
    )
    .select()
    .single();
  return data;
}

export async function setConversationState(_celular: string, _state: unknown) {
  // El estado de conversacion vive en metadata del usuario en el bot real.
  // Stub para compat con endpoint legacy.
}

export type RecentTrip = {
  id: number;
  pasajero_telefono: string | null;
  origen_texto: string | null;
  destino_texto: string | null;
  precio_estimado: number | null;
  modo: string | null;
  estado: string | null;
  created_at: string;
};

export async function listRecentTrips(limit = 30): Promise<RecentTrip[]> {
  const { data } = await supabase
    .from("viajes")
    .select(
      "id, pasajero_telefono, origen_texto, destino_texto, precio_estimado, modo, estado, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as RecentTrip[]) || [];
}

export type RecentConvo = { user_phone: string; last_at: string; preview: string };

export async function listRecentConversations(limit = 15): Promise<RecentConvo[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await supabase
    .from("eco_messages")
    .select("user_phone, content, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (!data) return [];
  // dedup por user_phone, conservar el más reciente
  const seen: Record<string, RecentConvo> = {};
  for (const m of data as Array<{ user_phone: string; content: string; role: string; created_at: string }>) {
    if (!seen[m.user_phone]) {
      seen[m.user_phone] = {
        user_phone: m.user_phone,
        last_at: m.created_at,
        preview: (m.content || "").slice(0, 120),
      };
    }
    if (Object.keys(seen).length >= limit) break;
  }
  return Object.values(seen);
}

export type WaitlistRow = {
  id: number;
  telefono: string;
  nombre: string | null;
  rol: string | null;
  estado: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export async function listWaitlist(limit = 50): Promise<WaitlistRow[]> {
  const { data } = await supabase
    .from("usuarios")
    .select("id, telefono, nombre, rol, estado, created_at, metadata")
    .eq("estado", "pre_registro")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as WaitlistRow[]) || [];
}
