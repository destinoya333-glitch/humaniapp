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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeCount = (r: any): number => (r && typeof r.count === "number" ? r.count : 0);

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
  trips_active: number;
  revenue_today: number;
  drivers_on_shift: number;
  total_wallet_balance: number;
  pending_commissions_amount: number;
  // Compat aliases
  waitlist_total: number;
  waitlist_today: number;
};

export async function getStats(): Promise<AdminStats> {
  const todayIso = startOfTodayLima();
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
      .from("viajes")
      .select("*", { count: "exact", head: true })
      .in("estado", ["buscando", "con_ofertas", "asignado", "en_curso"]),
    supabase
      .from("chofer_estado")
      .select("*", { count: "exact", head: true })
      .eq("en_turno", true),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = (i: number): any =>
    results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<any>).value : null;
  const [
    users,
    drivers,
    passengers,
    activos,
    pre,
    preToday,
    convosToday,
    tripsToday,
    tripsCompletedToday,
    tripsActive,
    onShift,
  ] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value);

  // Sumas agregadas
  let revenue_today = 0;
  let total_wallet_balance = 0;
  let pending_commissions_amount = 0;
  try {
    const { data } = await supabase
      .from("viajes")
      .select("precio_estimado")
      .gte("created_at", todayIso)
      .eq("estado", "completado");
    revenue_today = ((data || []) as Array<{ precio_estimado: number | null }>).reduce(
      (a: number, r: { precio_estimado: number | null }) => a + (Number(r.precio_estimado) || 0),
      0
    );
  } catch {}
  try {
    const { data } = await supabase.from("wallets").select("saldo_disponible");
    total_wallet_balance = ((data || []) as Array<{ saldo_disponible: number | null }>).reduce(
      (a: number, r: { saldo_disponible: number | null }) => a + (Number(r.saldo_disponible) || 0),
      0
    );
  } catch {}
  try {
    const { data } = await supabase
      .from("comisiones_pendientes")
      .select("monto_comision, service_fee")
      .eq("estado", "pendiente");
    pending_commissions_amount = (
      (data || []) as Array<{ monto_comision: number | null; service_fee: number | null }>
    ).reduce(
      (a: number, r: { monto_comision: number | null; service_fee: number | null }) =>
        a + (Number(r.monto_comision) || 0) + (Number(r.service_fee) || 0),
      0
    );
  } catch {}

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
    trips_active: safeCount(tripsActive),
    revenue_today,
    drivers_on_shift: safeCount(onShift),
    total_wallet_balance,
    pending_commissions_amount,
    waitlist_total: safeCount(pre),
    waitlist_today: safeCount(preToday),
  };
}

// ─── Listas para el dashboard ───────────────────────────────────────────────

export type DriverOnShift = {
  chofer_id: number;
  telefono: string;
  zona: string | null;
  ultimo_ping: string | null;
  nombre: string | null;
  calificacion: number | null;
  vehiculo: { modelo?: string; placas?: string } | null;
};

export async function listDriversOnShift(): Promise<DriverOnShift[]> {
  // 1. choferes en turno
  const { data: estados } = await supabase
    .from("chofer_estado")
    .select("chofer_id, telefono, zona, ultimo_ping")
    .eq("en_turno", true);
  if (!estados || estados.length === 0) return [];
  const ids = (estados as Array<{ chofer_id: number }>).map((e) => e.chofer_id);
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nombre, calificacion, vehiculo")
    .in("id", ids);
  const map = new Map<number, { nombre: string | null; calificacion: number | null; vehiculo: DriverOnShift["vehiculo"] }>();
  for (const u of (usuarios || []) as Array<{ id: number; nombre: string | null; calificacion: number | null; vehiculo: DriverOnShift["vehiculo"] }>) {
    map.set(u.id, { nombre: u.nombre, calificacion: u.calificacion, vehiculo: u.vehiculo });
  }
  return (estados as Array<{ chofer_id: number; telefono: string; zona: string | null; ultimo_ping: string | null }>).map((e) => ({
    chofer_id: e.chofer_id,
    telefono: e.telefono,
    zona: e.zona,
    ultimo_ping: e.ultimo_ping,
    ...(map.get(e.chofer_id) || { nombre: null, calificacion: null, vehiculo: null }),
  }));
}

export type ActiveTrip = {
  id: number;
  pasajero_telefono: string | null;
  origen_texto: string | null;
  destino_texto: string | null;
  precio_estimado: number | null;
  modo: string | null;
  estado: string | null;
  created_at: string;
};

export async function listActiveTrips(): Promise<ActiveTrip[]> {
  const { data } = await supabase
    .from("viajes")
    .select("id, pasajero_telefono, origen_texto, destino_texto, precio_estimado, modo, estado, created_at")
    .in("estado", ["buscando", "con_ofertas", "asignado", "en_curso"])
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as ActiveTrip[]) || [];
}

export type RecentTrip = ActiveTrip;

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

export type TopWallet = {
  telefono: string;
  saldo_disponible: number;
  total_ganado_lifetime: number;
  total_retirado_lifetime: number;
};

export async function listTopWallets(limit = 10): Promise<TopWallet[]> {
  const { data } = await supabase
    .from("wallets")
    .select("telefono, saldo_disponible, total_ganado_lifetime, total_retirado_lifetime")
    .order("saldo_disponible", { ascending: false })
    .limit(limit);
  return (data as TopWallet[]) || [];
}

export type PendingCommission = {
  id: number;
  viaje_id: number | null;
  chofer_telefono: string | null;
  monto_comision: number | null;
  service_fee: number | null;
  created_at: string;
};

export async function listPendingCommissions(limit = 15): Promise<PendingCommission[]> {
  const { data } = await supabase
    .from("comisiones_pendientes")
    .select("id, viaje_id, chofer_telefono, monto_comision, service_fee, created_at")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as PendingCommission[]) || [];
}

export type WalletTx = {
  id: number;
  telefono: string;
  tipo: string | null;
  monto: number | null;
  saldo_despues: number | null;
  descripcion: string | null;
  created_at: string;
};

export async function listRecentTransactions(limit = 20): Promise<WalletTx[]> {
  const { data } = await supabase
    .from("wallet_transactions")
    .select("id, telefono, tipo, monto, saldo_despues, descripcion, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as WalletTx[]) || [];
}

export type TopUser = {
  telefono: string;
  nombre: string | null;
  amount: number;
  trips: number;
};

export async function listTopDrivers(limit = 10): Promise<TopUser[]> {
  const { data } = await supabase
    .from("usuarios")
    .select("telefono, nombre, ganado_lifetime, viajes_lifetime")
    .eq("rol", "chofer")
    .order("ganado_lifetime", { ascending: false })
    .limit(limit);
  return ((data || []) as Array<{ telefono: string; nombre: string | null; ganado_lifetime: number | null; viajes_lifetime: number | null }>).map((u) => ({
    telefono: u.telefono,
    nombre: u.nombre,
    amount: Number(u.ganado_lifetime) || 0,
    trips: Number(u.viajes_lifetime) || 0,
  }));
}

export async function listTopPassengers(limit = 10): Promise<TopUser[]> {
  const { data } = await supabase
    .from("usuarios")
    .select("telefono, nombre, gastado_lifetime, viajes_lifetime")
    .eq("rol", "pasajero")
    .order("gastado_lifetime", { ascending: false })
    .limit(limit);
  return ((data || []) as Array<{ telefono: string; nombre: string | null; gastado_lifetime: number | null; viajes_lifetime: number | null }>).map((u) => ({
    telefono: u.telefono,
    nombre: u.nombre,
    amount: Number(u.gastado_lifetime) || 0,
    trips: Number(u.viajes_lifetime) || 0,
  }));
}

export type RecentConvo = { user_phone: string; last_at: string; preview: string };

export async function listRecentConversations(limit = 15): Promise<RecentConvo[]> {
  const { data } = await supabase
    .from("eco_messages")
    .select("user_phone, content, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (!data) return [];
  const seen: Record<string, RecentConvo> = {};
  for (const m of data as Array<{
    user_phone: string;
    content: string;
    role: string;
    created_at: string;
  }>) {
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

// ─── Buckets viajes/hora últimas 24h ──────────────────────────────────────

export type HourBucket = { hour: string; count: number; revenue: number };

export async function listTripsLast24hByHour(): Promise<HourBucket[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("viajes")
    .select("created_at, precio_estimado, estado")
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  const rows = (data || []) as Array<{ created_at: string; precio_estimado: number | null; estado: string | null }>;
  // 24 buckets, key = hora local Lima (UTC-5)
  const buckets: HourBucket[] = [];
  const now = new Date();
  for (let h = 23; h >= 0; h--) {
    const start = new Date(now.getTime() - h * 60 * 60 * 1000);
    const startMs = start.getTime();
    const endMs = startMs + 60 * 60 * 1000;
    let count = 0;
    let revenue = 0;
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      if (t >= startMs && t < endMs) {
        count++;
        if (r.estado === "completado") revenue += Number(r.precio_estimado) || 0;
      }
    }
    const limaHour = new Date(start.getTime() - 5 * 60 * 60 * 1000).getUTCHours();
    buckets.push({ hour: `${String(limaHour).padStart(2, "0")}h`, count, revenue });
  }
  return buckets;
}

// ─── Acción admin: cancelar viaje ──────────────────────────────────────────

export async function cancelTripById(id: number): Promise<boolean> {
  const { error } = await supabase
    .from("viajes")
    .update({ estado: "cancelado" })
    .eq("id", id);
  return !error;
}

// ─── Backward-compat con bot Eco legacy /api/whatsapp/eco ───────────────────
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
  const rolMap: Record<string, string> = {
    passenger: "pasajero",
    driver: "chofer",
    both: "pasajero",
  };
  const rol = rolMap[args.interes] || "pasajero";
  const { data } = await supabase
    .from("usuarios")
    .upsert(
      {
        telefono: args.celular,
        nombre: args.nombre || null,
        rol,
        estado: "pre_registro",
        metadata: {
          interes: args.interes,
          notas: args.notas || null,
          source: args.source || "whatsapp_bot",
        },
      },
      { onConflict: "telefono" }
    )
    .select()
    .single();
  return data;
}

export async function setConversationState(_celular: string, _state: unknown) {
  // Stub para compat con endpoint legacy.
}
