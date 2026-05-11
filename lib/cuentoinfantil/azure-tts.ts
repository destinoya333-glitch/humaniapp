/**
 * TuCuentoYa — Azure Neural TTS con SSML multivoz.
 *
 * Voces (es-PE por defecto, voces peruanas neurales):
 *  - es-PE-CamilaNeural   → narradora principal + personajes femeninos
 *  - es-PE-AlexNeural     → personajes masculinos
 *
 * Llamamos directamente a la REST API de Azure Speech Service (sin SDK),
 * para minimizar dependencias y bundle size en Vercel Functions.
 *
 * Env vars:
 *  - AZURE_TTS_KEY                    subscription key
 *  - AZURE_TTS_REGION                 ej: brazilsouth | eastus
 *  - AZURE_TTS_DEFAULT_VOICE_F        default Camila
 *  - AZURE_TTS_DEFAULT_VOICE_M        default Alex
 */

export type SegmentoNarracion = {
  voz: string; // "narrador" | "personaje:papá" | "personaje:lobo" | ...
  texto: string;
};

export type ResultadoTTS = {
  audio: Buffer;
  azure_chars: number;
  duracion_estimada_seg: number;
};

const VOICE_F_DEFAULT = "es-PE-CamilaNeural";
const VOICE_M_DEFAULT = "es-PE-AlexNeural";

function voiceFromTag(tag: string): { voice: string; style?: string; rate?: string } {
  const v = tag.toLowerCase().trim();

  // Mapeo voz → género según convención del prompt
  const masculinos = ["papá", "papa", "abuelo", "tío", "tio", "hermano", "rey", "lobo", "dragón", "dragon", "villano", "monstruo", "ladrón", "ladron", "pirata", "narrador_m"];
  const femeninas = ["mamá", "mama", "abuela", "tía", "tia", "hermana", "reina", "bruja", "hada", "princesa", "maestra", "narradora"];

  const voiceFDefault = (process.env.AZURE_TTS_DEFAULT_VOICE_F ?? VOICE_F_DEFAULT).trim();
  const voiceMDefault = (process.env.AZURE_TTS_DEFAULT_VOICE_M ?? VOICE_M_DEFAULT).trim();

  if (v === "narrador" || v === "narradora") {
    return { voice: voiceFDefault, style: "narration-relaxed" };
  }

  if (v.startsWith("personaje:")) {
    const tipo = v.slice("personaje:".length);
    // Villanos → voz grave + ritmo dramático
    if (["lobo", "dragón", "dragon", "villano", "monstruo", "ladrón", "ladron", "bruja"].includes(tipo)) {
      const voz = femeninas.includes(tipo) ? voiceFDefault : voiceMDefault;
      return { voice: voz, style: "angry", rate: "-10%" };
    }
    // Niño → suave, expresivo
    if (["niño", "nino", "niña", "nina", "hijo", "hija"].includes(tipo)) {
      return { voice: voiceFDefault, style: "cheerful", rate: "+5%" };
    }
    // Acompañantes
    if (masculinos.includes(tipo)) return { voice: voiceMDefault };
    if (femeninas.includes(tipo)) return { voice: voiceFDefault };
    // Fallback
    return { voice: voiceFDefault };
  }

  return { voice: voiceFDefault };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSSML(segmentos: SegmentoNarracion[]): string {
  const voicesXml = segmentos
    .map((seg) => {
      const v = voiceFromTag(seg.voz);
      const inner = escapeXml(seg.texto);
      const prosody = v.rate ? `<prosody rate="${v.rate}">${inner}</prosody>` : inner;
      const exprBody = v.style
        ? `<mstts:express-as style="${v.style}">${prosody}</mstts:express-as>`
        : prosody;
      return `<voice name="${v.voice}">${exprBody}<break time="350ms"/></voice>`;
    })
    .join("\n");

  return [
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="es-PE">`,
    voicesXml,
    `</speak>`,
  ].join("\n");
}

export function totalChars(segmentos: SegmentoNarracion[]): number {
  return segmentos.reduce((acc, s) => acc + s.texto.length, 0);
}

/**
 * Sintetiza audio MP3 a partir de segmentos multi-voz con SSML.
 * Retorna Buffer MP3 listo para subir/enviar.
 */
export async function sintetizar(
  segmentos: SegmentoNarracion[],
): Promise<ResultadoTTS> {
  const key = (process.env.AZURE_TTS_KEY ?? "").trim();
  const region = (process.env.AZURE_TTS_REGION ?? "brazilsouth").trim();
  if (!key) throw new Error("AZURE_TTS_KEY no configurada");

  const ssml = buildSSML(segmentos);
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "TuCuentoYa/1.0",
    },
    body: ssml,
  });

  if (!r.ok) {
    const errTxt = await r.text().catch(() => "");
    throw new Error(`Azure TTS HTTP ${r.status}: ${errTxt.slice(0, 200)}`);
  }

  const audio = Buffer.from(await r.arrayBuffer());
  const chars = totalChars(segmentos);
  // Estimación duración: ~130 palabras/min en español pausado, ~5.5 chars/palabra
  const palabras = chars / 5.5;
  const duracion_estimada_seg = (palabras / 130) * 60;

  return { audio, azure_chars: chars, duracion_estimada_seg };
}

/**
 * Costo estimado en USD por la generación.
 * Standard Neural pricing: $16/1M chars.
 */
export function costoEstimadoUSD(chars: number): number {
  return (chars / 1_000_000) * 16;
}
