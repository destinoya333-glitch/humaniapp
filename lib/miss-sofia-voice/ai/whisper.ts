/**
 * Speech-to-Text — Groq Whisper primario + Deepgram fallback.
 *
 * Stack:
 *   1. Groq Whisper-large-v3-turbo ($0.0011/min) — primario
 *   2. Deepgram Nova-2 ($0.0043/min) — fallback si Groq falla
 *
 * Required env: GROQ_API_KEY (primario)
 * Optional env: DEEPGRAM_API_KEY (fallback automático)
 */
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3-turbo";
const DEEPGRAM_BASE_URL = "https://api.deepgram.com/v1/listen";
const DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL ?? "nova-2";

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

async function groqWhisperSTT(audioBlob: Blob, ext: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const formData = new FormData();
  formData.append("file", audioBlob, `audio.${ext}`);
  formData.append("model", GROQ_WHISPER_MODEL);
  formData.append("response_format", "json");
  formData.append("temperature", "0");

  const res = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq Whisper ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as { text: string };
  return data.text ?? "";
}

async function deepgramSTT(audioBlob: Blob, mimeType: string): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not set");

  // Deepgram acepta el audio crudo via raw body
  const buffer = await audioBlob.arrayBuffer();
  const url = new URL(DEEPGRAM_BASE_URL);
  url.searchParams.set("model", DEEPGRAM_MODEL);
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("detect_language", "true");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": mimeType || "audio/webm",
    },
    body: buffer,
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
  };
  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  return transcript.trim();
}

export async function whisperSTT(audioBlob: Blob, mimeType?: string): Promise<string> {
  const ext = extensionFromMime(mimeType ?? audioBlob.type);
  const mime = mimeType ?? audioBlob.type ?? "audio/webm";

  // 1. Intentar Groq (primario, más barato)
  try {
    const text = await groqWhisperSTT(audioBlob, ext);
    if (text) return text;
  } catch (e) {
    console.error("[STT] Groq failed, trying Deepgram fallback:", (e as Error).message);
  }

  // 2. Fallback Deepgram
  if (process.env.DEEPGRAM_API_KEY) {
    try {
      const text = await deepgramSTT(audioBlob, mime);
      return text;
    } catch (e) {
      console.error("[STT] Deepgram fallback also failed:", (e as Error).message);
      throw e;
    }
  }

  throw new Error("STT failed: Groq error and no Deepgram fallback configured");
}
