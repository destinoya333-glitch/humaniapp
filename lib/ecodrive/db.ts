import { createClient } from "@supabase/supabase-js";
import type { ConversationMessage, ConversationState, EcodriveUser, Role } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Bono pasajero por bienvenida (lo promete la landing)
const PASSENGER_WELCOME_BONUS = 5;

// ─── Users (perfil base con multi-rol) ───────────────────────────────────
export async function getOrCreateUser(
  celular: string,
  nombre?: string
): Promise<EcodriveUser & { isNew: boolean }> {
  const { data: existing } = await supabase
    .from("ecodrive_users")
    .select("*")
    .eq("celular", celular)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("ecodrive_users")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", existing.id);
    return { ...existing, isNew: false };
  }

  const { data: nuevo } = await supabase
    .from("ecodrive_users")
    .insert({ celular, nombre: nombre || null })
    .select()
    .single();

  // Bono S/5 de bienvenida — auto-acreditado al wallet (la landing lo promete).
  // Si el bono ya existe (legacy_imported) no se duplica.
  const { data: existingWallet } = await supabase
    .from("ecodrive_wallet")
    .select("celular")
    .eq("celular", celular)
    .maybeSingle();
  if (!existingWallet) {
    await creditWallet(celular, PASSENGER_WELCOME_BONUS, "bono_inicial");
  }

  return { ...nuevo, isNew: true };
}

export async function addRole(celular: string, role: Role) {
  const { data: user } = await supabase
    .from("ecodrive_users")
    .select("roles")
    .eq("celular", celular)
    .maybeSingle();
  if (!user) return null;

  const roles: Role[] = user.roles || [];
  if (roles.includes(role)) return user;

  roles.push(role);
  const { data } = await supabase
    .from("ecodrive_users")
    .update({ roles })
    .eq("celular", celular)
    .select()
    .single();
  return data;
}

// ─── Conversaciones (historial WA + estado) ──────────────────────────────
export async function getConversation(celular: string) {
  const { data } = await supabase
    .from("ecodrive_conversations")
    .select("*")
    .eq("celular", celular)
    .maybeSingle();
  return data as
    | { celular: string; messages: ConversationMessage[]; state: ConversationState; updated_at: string }
    | null;
}

export async function appendMessage(
  celular: string,
  message: ConversationMessage
) {
  const conv = await getConversation(celular);
  const messages = [...(conv?.messages || []), { ...message, ts: new Date().toISOString() }];

  // Mantener solo últimos 40 mensajes para no inflar el contexto.
  const trimmed = messages.slice(-40);

  await supabase
    .from("ecodrive_conversations")
    .upsert(
      {
        celular,
        messages: trimmed,
        state: conv?.state || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "celular" }
    );
}

export async function setConversationState(celular: string, state: ConversationState) {
  await supabase
    .from("ecodrive_conversations")
    .upsert(
      { celular, state, updated_at: new Date().toISOString() },
      { onConflict: "celular" }
    );
}

// ─── Wallet ──────────────────────────────────────────────────────────────
export async function getBalance(celular: string): Promise<number> {
  const { data } = await supabase
    .from("ecodrive_wallet")
    .select("balance")
    .eq("celular", celular)
    .maybeSingle();
  return data ? parseFloat(data.balance) : 0;
}

export async function creditWallet(
  celular: string,
  amount: number,
  reason: string,
  reference?: string
) {
  const current = await getBalance(celular);
  const next = current + amount;

  await supabase
    .from("ecodrive_wallet")
    .upsert(
      { celular, balance: next, updated_at: new Date().toISOString() },
      { onConflict: "celular" }
    );

  await supabase.from("ecodrive_wallet_transactions").insert({
    celular,
    type: "credit",
    amount,
    reason,
    reference,
    balance_after: next,
  });

  return next;
}

// ─── Waitlist (captura de leads pre-lanzamiento del bot completo) ────────
export async function addToWaitlist(args: {
  celular: string;
  nombre?: string;
  interes: "passenger" | "driver" | "both";
  notas?: string;
  source?: string;
}) {
  const { data } = await supabase
    .from("ecodrive_waitlist")
    .insert({
      celular: args.celular,
      nombre: args.nombre || null,
      interes: args.interes,
      notas: args.notas || null,
      source: args.source || "whatsapp_bot",
    })
    .select()
    .single();
  return data;
}

export async function listWaitlist(limit = 100) {
  const { data } = await supabase
    .from("ecodrive_waitlist")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

// ─── Stats (para comando admin STATS via WA) ─────────────────────────────
export async function getStats() {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [users, drivers, passengers, waitlist, waitlistToday, conversationsToday] = await Promise.all([
    supabase.from("ecodrive_users").select("*", { count: "exact", head: true }),
    supabase.from("ecodrive_drivers").select("*", { count: "exact", head: true }),
    supabase.from("ecodrive_passengers").select("*", { count: "exact", head: true }),
    supabase.from("ecodrive_waitlist").select("*", { count: "exact", head: true }),
    supabase.from("ecodrive_waitlist").select("*", { count: "exact", head: true }).gte("created_at", todayIso),
    supabase.from("ecodrive_conversations").select("*", { count: "exact", head: true }).gte("updated_at", todayIso),
  ]);

  return {
    users_total: users.count || 0,
    drivers_total: drivers.count || 0,
    passengers_total: passengers.count || 0,
    waitlist_total: waitlist.count || 0,
    waitlist_today: waitlistToday.count || 0,
    conversations_today: conversationsToday.count || 0,
  };
}
