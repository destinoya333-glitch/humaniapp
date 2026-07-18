/**
 * TuCuentoYa — OpenAI TTS (reusa OPENAI_API_KEY ya cargada en Vercel).
 *
 * Modelo: tts-1 ($0.015/1K chars ≈ $0.011/min de voz) — más barato que ElevenLabs.
 * Voces: nova (narradora femenina), onyx (personajes masculinos), shimmer, echo, etc.
 *
 * OpenAI TTS NO soporta SSML ni multi-voz por call. Estrategia:
 *  - Concatenar todos los segmentos como UN texto con saltos de párrafo
 *    para crear pausas naturales entre voces.
 *  - Usar una sola voz dominante ("nova", femenina cálida) para todo el cuento.
 *  - La distinción de personajes viene del texto narrativo ("dijo el papá, ...").
 *
 * Si en el futuro queremos multi-voz real, sería N calls + concat MP3 buffers.
 */

export type SegmentoNarracion = {
  voz: string; // "narrador" | "personaje:papá" | "personaje:lobo" | ...
  texto: string;
};

export type ResultadoTTS = {
  audio: Buffer;
  azure_chars: number; // mantengo el nombre del campo por compat con db.ts
  duracion_estimada_seg: number;
};

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? "tts-1";
const DEFAULT_VOICE = (process.env.TCI_TTS_VOICE ?? "nova") as
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";
// Velocidad pausada para cuento infantil (más fácil de seguir, evoca lectura nocturna)
const DEFAULT_SPEED = parseFloat(process.env.TCI_TTS_SPEED ?? "0.85");

function escapeForTTS(s: string): string {
  // OpenAI TTS no soporta SSML — devolvemos texto plano.
  // Preservamos pausas naturales con saltos de párrafo.
  return s.trim();
}

/**
 * Construye el texto final del cuento concatenando segmentos con pausas.
 */
export function buildTextoCuento(segmentos: SegmentoNarracion[]): string {
  return segmentos
    .map((s) => escapeForTTS(s.texto))
    .filter(Boolean)
    .join("\n\n"); // párrafos separados generan pausa natural
}

export function totalChars(segmentos: SegmentoNarracion[]): number {
  return segmentos.reduce((acc, s) => acc + s.texto.length, 0);
}

// OpenAI TTS impone max 4096 chars por request. Si el cuento es más largo,
// dividimos en chunks por límites naturales (párrafo, frase) y concatenamos audios.
const MAX_CHARS_PER_CALL = 4000;

function splitTextoEnChunks(texto: string, maxChars: number): string[] {
  if (texto.length <= maxChars) return [texto];
  const chunks: string[] = [];
  let resto = texto;
  while (resto.length > maxChars) {
    // Buscar el último párrafo (\n\n) antes del límite
    let cortar = resto.lastIndexOf("\n\n", maxChars);
    if (cortar < maxChars * 0.5) cortar = resto.lastIndexOf("\n", maxChars);
    if (cortar < maxChars * 0.5) cortar = resto.lastIndexOf(". ", maxChars);
    if (cortar < maxChars * 0.5) cortar = resto.lastIndexOf(" ", maxChars);
    if (cortar <= 0) cortar = maxChars;
    chunks.push(resto.slice(0, cortar).trim());
    resto = resto.slice(cortar).trim();
  }
  if (resto.length > 0) chunks.push(resto);
  return chunks;
}

async function sintetizarChunk(texto: string, apiKey: string): Promise<Buffer> {
  const r = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: texto,
      voice: DEFAULT_VOICE,
      response_format: "mp3",
      speed: Math.max(0.25, Math.min(4.0, DEFAULT_SPEED)),
    }),
  });
  if (!r.ok) {
    const errTxt = await r.text().catch(() => "");
    throw new Error(`OpenAI TTS HTTP ${r.status}: ${errTxt.slice(0, 200)}`);
  }
  return Buffer.from(await r.arrayBuffer());
}

/**
 * Sintetiza el cuento completo como un MP3. Si el texto excede 4096 chars (límite OpenAI),
 * divide en chunks y concatena los MP3 resultantes.
 */
export async function sintetizar(
  segmentos: SegmentoNarracion[],
): Promise<ResultadoTTS> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada");

  const texto = buildTextoCuento(segmentos);
  const chars = texto.length;
  const chunks = splitTextoEnChunks(texto, MAX_CHARS_PER_CALL);

  let audio: Buffer;
  if (chunks.length === 1) {
    audio = await sintetizarChunk(chunks[0], apiKey);
  } else {
    // Concatenar MP3 binarios (válido para MP3 — frames son independientes).
    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      buffers.push(await sintetizarChunk(chunk, apiKey));
    }
    audio = Buffer.concat(buffers);
  }

  // Estimación duración: ~130 palabras/min en español pausado, ~5.5 chars/palabra
  const palabras = chars / 5.5;
  const duracion_estimada_seg = (palabras / 130) * 60;

  return { audio, azure_chars: chars, duracion_estimada_seg };
}

/**
 * Costo estimado USD (tts-1: $15/1M chars).
 */
export function costoEstimadoUSD(chars: number): number {
  return (chars / 1_000_000) * 15;
}
