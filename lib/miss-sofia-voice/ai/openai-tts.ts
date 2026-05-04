/**
 * OpenAI TTS — voice for Plan Regular y Free tier.
 *
 * Modelo: tts-1 (más rápido, $0.015/1K chars ≈ $0.011/min de voz)
 * Voz default: "nova" (femenina joven, energética — escogida por Percy 2026-05-03)
 *
 * Costo vs ElevenLabs:
 *   - OpenAI tts-1 nova : $0.011/min ← Plan Regular + Free
 *   - ElevenLabs Sofia  : $0.165/min ← Plan Premium
 */

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? "tts-1";

export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" | "sage" | "coral";

export type OpenAITTSResult = {
  audioBuffer: Buffer;
  contentType: string;
};

export async function openaiTTS(
  text: string,
  voice: OpenAIVoice = "nova"
): Promise<OpenAITTSResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      input: text,
      voice,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI TTS error ${res.status}: ${err.slice(0, 300)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return {
    audioBuffer: Buffer.from(arrayBuffer),
    contentType: "audio/mpeg",
  };
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
