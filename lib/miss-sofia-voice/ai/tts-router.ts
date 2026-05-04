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

export type TTSContext = "chat" | "hero"; // 'hero' = momentos especiales (Día 1, capítulos, audio-diario)
export type UserPlan = "free" | "regular" | "premium" | string | null | undefined;

export type TTSResult = {
  audioBuffer: Buffer;
  contentType: string;
  engine: "elevenlabs" | "openai" | "none";
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
}): Promise<TTSResult | null> {
  const cleaned = cleanTextForTTS(opts.text);
  if (!cleaned.trim()) return null;

  const context = opts.context ?? "chat";

  // Hero moments → always ElevenLabs (la magia central del producto)
  if (context === "hero") {
    return tryElevenLabs(cleaned);
  }

  // Chat: route by plan
  const plan = (opts.plan ?? "free").toLowerCase();
  if (plan === "premium") {
    // Premium plan → ElevenLabs always; if it fails, try OpenAI as backup
    const result = await tryElevenLabs(cleaned);
    if (result) return result;
    return tryOpenAI(cleaned);
  }

  // Free, regular, anything else → OpenAI Nova; ElevenLabs as backup
  const result = await tryOpenAI(cleaned);
  if (result) return result;
  return tryElevenLabs(cleaned);
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
