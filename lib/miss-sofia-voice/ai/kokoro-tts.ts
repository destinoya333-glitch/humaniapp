/**
 * Kokoro TTS client — self-hosted voice generation.
 *
 * Servidor: Hetzner Cloud (Helsinki).
 * Costo: $0/min después del setup ($5/mes fijo del servidor).
 *
 * Voces:
 *   - af_heart   (USA femenina cálida — DEFAULT Sofia)
 *   - af_bella   (USA expresiva)
 *   - ef_dora    (Spanish femenina)
 *   - em_alex    (Spanish masculina)
 *
 * Languages:
 *   - 'a' = American English  (DEFAULT — método Cuna inmersivo USA)
 *   - 'e' = Spanish
 */
type TTSCore = { audioBuffer: Buffer; contentType: string };

const KOKORO_URL = (process.env.KOKORO_TTS_URL ?? "").trim().replace(/\/$/, "");
const KOKORO_API_KEY = (process.env.KOKORO_TTS_API_KEY ?? "").trim();
const KOKORO_DEFAULT_VOICE = (process.env.KOKORO_DEFAULT_VOICE ?? "af_heart").trim();
const KOKORO_DEFAULT_LANG = (process.env.KOKORO_DEFAULT_LANG ?? "a").trim();
const KOKORO_TIMEOUT_MS = Number(process.env.KOKORO_TIMEOUT_MS ?? "20000");

export function isKokoroConfigured(): boolean {
  return Boolean(KOKORO_URL && KOKORO_API_KEY);
}

export type KokoroVoice =
  | "af_heart" | "af_bella" | "af_nicole" | "af_sky" | "af_alloy"
  | "bf_emma" | "bf_isabella" | "bf_alice"
  | "ef_dora"
  | "em_alex" | "em_santa"
  | string;

export async function kokoroTTS(
  text: string,
  voice: KokoroVoice = KOKORO_DEFAULT_VOICE,
  opts?: { lang?: string; speed?: number; signal?: AbortSignal },
): Promise<TTSCore> {
  if (!isKokoroConfigured()) {
    throw new Error("Kokoro not configured (set KOKORO_TTS_URL + KOKORO_TTS_API_KEY)");
  }
  const lang = opts?.lang ?? KOKORO_DEFAULT_LANG;
  const speed = opts?.speed ?? 1.0;

  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), KOKORO_TIMEOUT_MS);
  try {
    const r = await fetch(`${KOKORO_URL}/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": KOKORO_API_KEY,
      },
      body: JSON.stringify({ text, voice, lang, speed }),
      cache: "no-store",
      signal: opts?.signal ?? ctrl.signal,
    });
    if (!r.ok) {
      const err = await r.text().catch(() => "");
      throw new Error(`Kokoro HTTP ${r.status}: ${err.slice(0, 300)}`);
    }
    const buf = Buffer.from(await r.arrayBuffer());
    return { audioBuffer: buf, contentType: "audio/mpeg" };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Health check para detectar si el servidor está vivo. */
export async function kokoroHealth(): Promise<boolean> {
  if (!KOKORO_URL) return false;
  try {
    const r = await fetch(`${KOKORO_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
