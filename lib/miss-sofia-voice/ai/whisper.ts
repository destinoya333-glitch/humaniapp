/**
 * Groq Whisper — Speech-to-Text.
 * Uses the same OpenAI-compatible API but on Groq infrastructure (faster + cheaper).
 *
 * Required env: GROQ_API_KEY
 * Optional env: GROQ_WHISPER_MODEL (default: whisper-large-v3-turbo)
 *
 * Costs: ~$0.0011/min (vs OpenAI's $0.006/min)
 * Latency: <1s typical
 */
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3-turbo";

/**
 * Map common browser-recorded mime types to Whisper-compatible file extensions.
 * Browsers report things like "audio/webm;codecs=opus" — Whisper API needs
 * a clean extension in the filename (e.g. "audio.webm").
 */
function extensionFromMime(mime: string | undefined): string {
  if (!mime) return "webm";
  const base = mime.split(";")[0].trim().toLowerCase();
  const sub = base.split("/")[1] ?? "";
  if (sub === "mpeg" || sub === "mp3") return "mp3";
  if (sub === "ogg") return "ogg";
  if (sub === "webm") return "webm";
  if (sub === "wav" || sub === "x-wav") return "wav";
  if (sub === "mp4" || sub === "x-m4a" || sub === "m4a") return "m4a";
  return "webm";
}

export async function whisperSTT(audioBlob: Blob, mimeType?: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const ext = extensionFromMime(mimeType ?? audioBlob.type);

  const formData = new FormData();
  formData.append("file", audioBlob, `audio.${ext}`);
  formData.append("model", GROQ_WHISPER_MODEL);
  // Detect language automatically. Force English with: formData.append("language", "en");
  formData.append("response_format", "json");
  formData.append("temperature", "0");

  const res = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq Whisper error ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as { text: string };
  return data.text ?? "";
}
