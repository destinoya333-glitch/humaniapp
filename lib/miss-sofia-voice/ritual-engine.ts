/**
 * Sofia Daily Ritual Engine
 *
 * Para cada estudiante activo, genera el audio del ritual correspondiente
 * al slot actual (morning/lunch/night/bedtime) usando Claude + Kokoro TTS,
 * lo sube a Supabase Storage y lo envía por WhatsApp.
 */
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { MISS_SOFIA_MASTER_PROMPT } from "./master-prompt";
import { synthesizeForPlan, type TTSResult } from "./ai/tts-router";
import { sendTextWithAudio } from "./meta-cloud-sender";
import {
  ritualSlotForNow,
  type RitualSlot,
  type CunaPhase,
} from "./phase-engine";

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6").trim();

export type RitualContext = {
  user_id: string;
  name: string;
  phone: string;
  current_phase: CunaPhase;
  phase_day: number;
  ritual_slot: RitualSlot;
};

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Genera el guion del ritual via Claude.
 * Devuelve un objeto { intro_es, audio_text } donde:
 *   - intro_es: 1-2 líneas en español que acompañan el audio (preview/context)
 *   - audio_text: lo que Sofia DICE en el audio (mayormente inglés según fase)
 */
export async function generateRitualScript(
  ctx: RitualContext,
): Promise<{ intro_es: string; audio_text: string }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const userPrompt = `
Genera el RITUAL DIARIO para esta estudiante:
- Nombre: ${ctx.name}
- Fase actual: ${ctx.current_phase}
- Día en fase: ${ctx.phase_day}
- Slot del día: ${ctx.ritual_slot}

Reglas:
- Phase 0 (días 1-30): audio en SPANISH narrando 90 seg algo cotidiano + 1 frase fija en inglés repetida.
- Phase 1 (días 31-60): mezcla 70% spanish framing + 30% inglés.
- Phase 2 (días 61-90): 50/50 spanish/inglés.
- Phase 3+ (días 91+): 100% inglés con español sólo si pregunta vocabulario.

Estructura del slot:
- morning: 3-5 min, energético, narra "hoy escucharás...".
- lunch: 2 min, casual, una misión real de inglés práctico.
- night: 10-15 min Phase 3+, íntimo, conversación capítulo novela.
- bedtime: 90 seg relajante, audio-cuento subliminal.
- weekend: relajado, capítulo bonus de novela.

Output STRICTO en este formato JSON (sin markdown wrapper):
{
  "intro_es": "Hola ${ctx.name}, aquí tu audio de la mañana...",
  "audio_text": "Texto exacto que Sofia leerá en voz alta..."
}

Genera CONTENIDO REAL — no placeholders. Sé concreta, cálida, profesional.
audio_text debe respetar la regla idiomática de la fase ${ctx.current_phase}.
audio_text duración objetivo: ${ctx.ritual_slot === "bedtime" ? "60-90" : ctx.ritual_slot === "morning" ? "180-300" : ctx.ritual_slot === "lunch" ? "120" : "300-600"} segundos hablados.
`;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: [
      { type: "text", text: MISS_SOFIA_MASTER_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("Claude returned no text");
  }
  const raw = text.text.trim();
  // Strip possible markdown wrapper
  const cleaned = raw.replace(/^```json\s*|\s*```$/gm, "");
  try {
    const parsed = JSON.parse(cleaned) as { intro_es: string; audio_text: string };
    if (!parsed.intro_es || !parsed.audio_text) throw new Error("missing fields");
    return parsed;
  } catch (e) {
    // Fallback: tomamos todo como audio_text + intro genérica
    return {
      intro_es: `Hola ${ctx.name}, aquí tu audio de ${ctx.ritual_slot}.`,
      audio_text: raw,
    };
  }
}

/**
 * Sube el audio a Supabase Storage y devuelve la URL pública.
 */
async function uploadAudioToStorage(
  audio: TTSResult,
  userId: string,
  ritual: RitualSlot,
  phaseDay: number,
): Promise<string> {
  const supabase = db();
  const date = new Date().toISOString().slice(0, 10);
  const ct = audio.contentType;
  const ext = ct.includes("mpeg") || ct.includes("mp3") ? "mp3" : "ogg";
  const filename = `rituals/${userId}/${date}_${ritual}_d${phaseDay}.${ext}`;
  const { error } = await supabase.storage
    .from("sofia-audios")
    .upload(filename, audio.audioBuffer, {
      contentType: ct,
      upsert: true,
    });
  if (error) throw new Error(`upload failed: ${error.message}`);
  const { data } = supabase.storage.from("sofia-audios").getPublicUrl(filename);
  return data.publicUrl;
}

/**
 * Pipeline completo: script + audio + upload + send + log.
 */
export async function executeRitualForUser(ctx: RitualContext): Promise<{
  ok: boolean;
  audio_url?: string;
  wamid?: string;
  error?: string;
}> {
  try {
    // 1. Verificar si ya se envió hoy (por phone, más robusto que user_id que puede no ser uuid)
    const supabase = db();
    const today = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("mse_daily_rituals_sent")
      .select("id, wamid")
      .eq("phone", ctx.phone)
      .eq("ritual_slot", ctx.ritual_slot)
      .eq("sent_date", today)
      .maybeSingle();
    if (existing) {
      return { ok: true, wamid: existing.wamid ?? "already_sent" };
    }

    // 2. Generar guion via Claude
    const { intro_es, audio_text } = await generateRitualScript(ctx);

    // 3. Generar audio via TTS (context="hero" para preservar calidad ElevenLabs cuando aplique)
    const audio = await synthesizeForPlan({
      text: audio_text,
      plan: "regular",
      context: "hero",
      phone: ctx.phone,
    });
    if (!audio) {
      throw new Error("TTS failed (no audio returned)");
    }

    // 4. Subir a Supabase Storage
    const audioUrl = await uploadAudioToStorage(audio, ctx.user_id, ctx.ritual_slot, ctx.phase_day);

    // 5. Enviar por WhatsApp (intro + audio)
    const sendResult = await sendTextWithAudio(ctx.phone, intro_es, audioUrl);
    if (!sendResult.ok) {
      throw new Error(`send failed: ${(sendResult as { error?: string }).error ?? "unknown"}`);
    }
    const wamid = (sendResult as { data?: { messages?: Array<{ id: string }> } }).data
      ?.messages?.[0]?.id;

    // 6. Loggear envío (user_id puede ser null si el estudiante no tiene cuenta mse_users)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ctx.user_id);
    await supabase.from("mse_daily_rituals_sent").insert({
      user_id: isUuid ? ctx.user_id : null,
      phone: ctx.phone,
      ritual_slot: ctx.ritual_slot,
      phase_day: ctx.phase_day,
      current_phase: ctx.current_phase,
      audio_url: audioUrl,
      audio_duration_sec: null,
      script_text: audio_text.slice(0, 5000),
      wamid: wamid ?? null,
    });

    return { ok: true, audio_url: audioUrl, wamid };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Devuelve la lista de usuarios elegibles para recibir el ritual actual.
 * - Tienen perfil Cuna activo (current_phase >= 0)
 * - Tienen teléfono
 * - NO recibieron ya este slot hoy
 */
export async function getDueRituals(
  now: Date = new Date(),
  forcedSlot?: RitualSlot,
): Promise<RitualContext[]> {
  const supabase = db();
  const ritual_slot = forcedSlot ?? ritualSlotForNow(now);
  const today = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10); // Lima date

  // Buscar estudiantes activos en mse_whatsapp_leads (registro directo via WhatsApp).
  // Criterio elegible: tiene chat_data.plan + plan_active_until vigente + chat_state >= dia_uno_sent.
  const { data: leads, error } = await supabase
    .from("mse_whatsapp_leads")
    .select("phone, name, chat_state, chat_data, status, created_at")
    .in("chat_state", ["dia_uno_sent", "done"]);
  if (error) {
    console.error("getDueRituals leads query err:", error.message);
    return [];
  }
  if (!leads) return [];

  // Map de quienes ya recibieron este slot hoy (por phone)
  const { data: sentToday } = await supabase
    .from("mse_daily_rituals_sent")
    .select("phone")
    .eq("ritual_slot", ritual_slot)
    .eq("sent_date", today);
  const sentPhones = new Set((sentToday ?? []).map((r) => r.phone));

  const due: RitualContext[] = [];
  for (const lead of leads) {
    if (!lead.phone || sentPhones.has(lead.phone)) continue;
    const chatData = (lead.chat_data ?? {}) as Record<string, unknown>;
    // Estudiantes elegibles: ya pasaron el onboarding (dia_uno_sent o done)
    // No filtramos por plan pagado — TODOS los que llegaron a Cuna deben recibir audios diarios
    const created = lead.created_at ? new Date(lead.created_at as string) : now;
    const daysSinceCreated = Math.max(
      1,
      Math.floor((now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000)),
    );
    // Por ahora todos quedan en Phase 0 hasta que migremos a tabla con phase_day formal
    const phase_day = Math.min(daysSinceCreated, 30);
    const current_phase = (phase_day <= 30 ? 0 : phase_day <= 60 ? 1 : phase_day <= 90 ? 2 : 3) as CunaPhase;

    due.push({
      user_id: (chatData.user_id as string) || lead.phone,
      name: (lead.name as string) || (chatData.name as string) || "estudiante",
      phone: lead.phone,
      current_phase,
      phase_day,
      ritual_slot,
    });
  }
  return due;
}
