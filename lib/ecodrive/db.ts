import { createClient } from "@supabase/supabase-js";
import type { ConversationMessage, ConversationState, EcodriveUser, Role } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Users (perfil base con multi-rol) ───────────────────────────────────
export async function getOrCreateUser(
  celular: string,
  nombre?: string
): Promise<EcodriveUser> {
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
    return existing;
  }

  const { data: nuevo } = await supabase
    .from("ecodrive_users")
    .insert({ celular, nombre: nombre || null })
    .select()
    .single();
  return nuevo;
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
