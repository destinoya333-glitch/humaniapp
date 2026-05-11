/**
 * TTS Router — selecciona el motor de voz según el plan del usuario.
 *
 * Reglas:
 *   - Plan 'premium' → ElevenLabs Sofia (voz cálida, $0.165/min)
 *   - Plan 'regular' → OpenAI Nova ($0.011/min)
 *   - Plan 'free'    → OpenAI Nova ($0.011/min)
 *   - Fallback si OpenAI no configurado → ElevenLabs (cobra más pero funciona)
 *   - Fallback si nada configurado → null (caller debe manejar TTS opcional)
 *
 * Uso en endpoints:
 *   const audio = await synthesizeForPlan(text, user.plan);
 *   if (audio) {
 *     audioBase64 = audio.audioBuffer.toString("base64");
 *     audioContentType = audio.contentType;
 *   }
 */
import { cleanTextForTTS, elevenLabsTTS } from "./elevenlabs";
import { isOpenAIConfigured, openaiTTS } from "./openai-tts";
import { isKokoroConfigured, kokoroTTS } from "./kokoro-tts";
import { canUseEleven, addElevenUsedChars } from "../eleven-cap";

export type TTSContext = "chat" | "hero"; // 'hero' = momentos especiales (Día 1, capítulos, audio-diario)
export type UserPlan = "free" | "regular" | "premium" | string | null | undefined;

export type TTSResult = {
  audioBuffer: Buffer;
  contentType: string;
  engine: "elevenlabs" | "openai" | "kokoro" | "none";
};

/**
 * Synthesize text to speech selecting the engine based on user plan + context.
 *
 * Hero contexts (Día 1, capítulos novela, audio-diario inmediato) ALWAYS use
 * ElevenLabs Sofia regardless of plan — the magic is preserved for these key
 * moments. Only "chat" context routes by plan.
 *
 * Returns null if no TTS engine is configured (caller treats audio as optional).
 */
export async function synthesizeForPlan(opts: {
  text: string;
  plan: UserPlan;
  context?: TTSContext;
  phone?: string; // E.164 — para cap ElevenLabs por cliente
}): Promise<TTSResult | null> {
  const cleaned = cleanTextForTTS(opts.text);
  if (!cleaned.trim()) return null;

  const context = opts.context ?? "chat";
  const phone = opts.phone || "";

  // Hero moments → ElevenLabs preferido (con cap). Si exceed cap → Kokoro → OpenAI
  if (context === "hero") {
    if (phone) {
      const { allowed } = await canUseEleven(phone, cleaned.length);
      if (allowed) {
        const eleven = await tryElevenLabs(cleaned);
        if (eleven) {
          await addElevenUsedChars(phone, cleaned.length).catch(() => {});
          return eleven;
        }
      }
    } else {
      const eleven = await tryElevenLabs(cleaned);
      if (eleven) return eleven;
    }
    const kokoro = await tryKokoro(cleaned);
    if (kokoro) return kokoro;
    return tryOpenAI(cleaned);
  }

  // Chat: route by plan
  const plan = (opts.plan ?? "free").toLowerCase();
  if (plan === "premium") {
    // Premium chat: Kokoro principal (margen alto), ElevenLabs backup con cap, OpenAI último
    const kokoro = await tryKokoro(cleaned);
    if (kokoro) return kokoro;
    if (phone) {
      const { allowed } = await canUseEleven(phone, cleaned.length);
      if (allowed) {
        const eleven = await tryElevenLabs(cleaned);
        if (eleven) {
          await addElevenUsedChars(phone, cleaned.length).catch(() => {});
          return eleven;
        }
      }
    }
    return tryOpenAI(cleaned);
  }

  // Free + Regular: Kokoro principal (gratis), OpenAI Nova fallback, ElevenLabs último (con cap)
  const kokoro = await tryKokoro(cleaned);
  if (kokoro) return kokoro;
  const oa = await tryOpenAI(cleaned);
  if (oa) return oa;
  if (phone) {
    const { allowed } = await canUseEleven(phone, cleaned.length);
    if (allowed) {
      const eleven = await tryElevenLabs(cleaned);
      if (eleven) {
        await addElevenUsedChars(phone, cleaned.length).catch(() => {});
        return eleven;
      }
    }
  }
  return null;
}

async function tryElevenLabs(text: string): Promise<TTSResult | null> {
  if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_MISS_SOFIA_VOICE_ID) {
    return null;
  }
  try {
    const tts = await elevenLabsTTS(text);
    return { ...tts, engine: "elevenlabs" };
  } catch (e) {
    console.error("tts-router: ElevenLabs failed:", e);
    return null;
  }
}

async function tryOpenAI(text: string): Promise<TTSResult | null> {
  if (!isOpenAIConfigured()) return null;
  try {
    const tts = await openaiTTS(text, "nova");
    return { ...tts, engine: "openai" };
  } catch (e) {
    console.error("tts-router: OpenAI failed:", e);
    return null;
  }
}

async function tryKokoro(text: string): Promise<TTSResult | null> {
  if (!isKokoroConfigured()) return null;
  try {
    const tts = await kokoroTTS(text);
    return { ...tts, engine: "kokoro" };
  } catch (e) {
    console.error("tts-router: Kokoro failed:", (e as Error).message);
    return null;
  }
}

/**
 * Convenience: returns base64 + content type for endpoints that respond JSON,
 * or nulls if no TTS available.
 */
export async function synthesizeAsBase64(opts: {
  text: string;
  plan: UserPlan;
  context?: TTSContext;
}): Promise<{ audioBase64: string | null; audioContentType: string | null; engine: string | null }> {
  const result = await synthesizeForPlan(opts);
  if (!result) return { audioBase64: null, audioContentType: null, engine: null };
  return {
    audioBase64: result.audioBuffer.toString("base64"),
    audioContentType: result.contentType,
    engine: result.engine,
  };
}
