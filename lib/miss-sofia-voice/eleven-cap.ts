/**
 * Cap ElevenLabs Premium = 30 min/mes por cliente.
 *
 * Almacenado en mse_whatsapp_leads.chat_data.eleven_usage = { "2026-05": chars }.
 * 1 minuto ≈ 1000 chars (rough estimate de ElevenLabs).
 * Cap: 30 min × 1000 = 30,000 chars por mes.
 */
import { createClient } from "@supabase/supabase-js";

const ELEVEN_CAP_CHARS_PER_MONTH = 30_000; // ≈30 min
const CHARS_PER_MIN = 1000;

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

type LeadCapData = {
  eleven_usage?: Record<string, number>;
} & Record<string, unknown>;

/**
 * Lee chars consumidos por el cliente este mes.
 * Devuelve 0 si lead no existe o no tiene historial.
 */
export async function getElevenUsedCharsThisMonth(phone: string): Promise<number> {
  const sb = supabase();
  const { data } = await sb
    .from("mse_whatsapp_leads")
    .select("chat_data")
    .eq("phone", phone)
    .maybeSingle();
  const chat: LeadCapData = (data?.chat_data as LeadCapData) || {};
  const usage = chat.eleven_usage || {};
  return usage[currentMonthKey()] || 0;
}

/**
 * Suma chars al contador del mes actual.
 */
export async function addElevenUsedChars(phone: string, charsAdded: number): Promise<void> {
  if (charsAdded <= 0) return;
  const sb = supabase();
  const { data } = await sb
    .from("mse_whatsapp_leads")
    .select("id, chat_data")
    .eq("phone", phone)
    .maybeSingle();
  if (!data) return; // Lead no existe — no contamos para anonymous

  const chat: LeadCapData = (data.chat_data as LeadCapData) || {};
  const usage = chat.eleven_usage || {};
  const month = currentMonthKey();
  usage[month] = (usage[month] || 0) + charsAdded;
  // Limpiar meses viejos (>3 meses) para no acumular bloat
  const allowedMonths = new Set([month, prevMonth(month, 1), prevMonth(month, 2)]);
  for (const k of Object.keys(usage)) {
    if (!allowedMonths.has(k)) delete usage[k];
  }
  chat.eleven_usage = usage;
  await sb.from("mse_whatsapp_leads").update({ chat_data: chat }).eq("id", data.id);
}

function prevMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Decide si se puede llamar a ElevenLabs sin exceder el cap.
 * Usa una estimación conservadora: si el siguiente request agregaría 1 min más,
 * verifica que no supere el cap.
 */
export async function canUseEleven(
  phone: string,
  estimatedChars: number,
): Promise<{ allowed: boolean; usedMins: number; capMins: number; remainingMins: number }> {
  const used = await getElevenUsedCharsThisMonth(phone);
  const allowed = used + estimatedChars <= ELEVEN_CAP_CHARS_PER_MONTH;
  return {
    allowed,
    usedMins: Math.round(used / CHARS_PER_MIN),
    capMins: Math.round(ELEVEN_CAP_CHARS_PER_MONTH / CHARS_PER_MIN),
    remainingMins: Math.max(0, Math.round((ELEVEN_CAP_CHARS_PER_MONTH - used) / CHARS_PER_MIN)),
  };
}

export const ELEVEN_CAP = {
  charsPerMonth: ELEVEN_CAP_CHARS_PER_MONTH,
  minutesPerMonth: ELEVEN_CAP_CHARS_PER_MONTH / CHARS_PER_MIN,
};
