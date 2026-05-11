/**
 * TuCuentoYa — Audio mixer (ffmpeg).
 *
 * Mezcla la narración Azure TTS con música ambiente según escenario y
 * efectos opcionales (lobo aullando, viento, mar). Música low-volume
 * detrás de la voz.
 *
 * Para mantener Vercel Functions livianas, soportamos dos modos:
 *  - "puro": solo narración TTS (sin música) → bundle más liviano, gratis
 *  - "ambient": narración + 1 track ambient lazo + fadeOut → requiere ffmpeg
 *
 * En MVP arrancamos con modo "puro" (no requiere ffmpeg en Vercel).
 * El soporte "ambient" se activa cuando configures FFMPEG_BIN o uses
 * @ffmpeg-installer/ffmpeg como dependencia.
 */
import { spawn } from "node:child_process";
import { Writable } from "node:stream";

export type EscenarioAmbient =
  | "bosque"
  | "mar"
  | "espacio"
  | "castillo"
  | "ciudad"
  | "selva"
  | "noche"
  | "ninguno";

const AMBIENT_URLS: Record<EscenarioAmbient, string | null> = {
  // URLs públicas a tracks libres de copyright en Supabase Storage:
  // tci-music/bosque.mp3, mar.mp3, ... (subir manualmente al bucket)
  bosque: process.env.TCI_AMBIENT_BOSQUE_URL ?? null,
  mar: process.env.TCI_AMBIENT_MAR_URL ?? null,
  espacio: process.env.TCI_AMBIENT_ESPACIO_URL ?? null,
  castillo: process.env.TCI_AMBIENT_CASTILLO_URL ?? null,
  ciudad: process.env.TCI_AMBIENT_CIUDAD_URL ?? null,
  selva: process.env.TCI_AMBIENT_SELVA_URL ?? null,
  noche: process.env.TCI_AMBIENT_NOCHE_URL ?? null,
  ninguno: null,
};

/**
 * Detecta el escenario ambient apropiado según el texto del escenario.
 */
export function detectarAmbient(escenario: string): EscenarioAmbient {
  const e = escenario.toLowerCase();
  if (/bosque|árbol|arbol|selva fría|montaña/.test(e)) return "bosque";
  if (/mar|océano|oceano|playa|barco|isla|sirena/.test(e)) return "mar";
  if (/espacio|planeta|estrella|cohete|astronauta|galaxia/.test(e)) return "espacio";
  if (/castillo|reino|principe|princesa|rey|reina|dragón|dragon/.test(e)) return "castillo";
  if (/ciudad|edificio|metro|tráfico|trafico/.test(e)) return "ciudad";
  if (/selva|jungla|amazonas|tigre|mono/.test(e)) return "selva";
  if (/noche|dormir|estrellas|luna/.test(e)) return "noche";
  return "ninguno";
}

/**
 * Mezcla la narración con música ambient usando ffmpeg.
 * Solo se usa si FFMPEG_BIN está definido o si está instalado en el path.
 * Si falla, retorna la narración pura (degradación elegante).
 */
export async function mezclarConAmbient(
  narracion: Buffer,
  escenario: EscenarioAmbient,
): Promise<Buffer> {
  const ambientUrl = AMBIENT_URLS[escenario];
  if (!ambientUrl) return narracion;

  const ffmpegBin = (process.env.FFMPEG_BIN ?? "ffmpeg").trim();

  try {
    // ffmpeg -i pipe:0 -i ambient_url -filter_complex
    //   "[1:a]aloop=loop=-1:size=2e+09,volume=0.12[bg];[0:a][bg]amix=duration=first:dropout_transition=2"
    //   -f mp3 pipe:1
    return await new Promise<Buffer>((resolve, reject) => {
      const proc = spawn(
        ffmpegBin,
        [
          "-i",
          "pipe:0",
          "-i",
          ambientUrl,
          "-filter_complex",
          "[1:a]aloop=loop=-1:size=2e+09,volume=0.12[bg];[0:a][bg]amix=duration=first:dropout_transition=2",
          "-f",
          "mp3",
          "-b:a",
          "48k",
          "pipe:1",
        ],
        { stdio: ["pipe", "pipe", "pipe"] },
      );

      const chunks: Buffer[] = [];
      proc.stdout.on("data", (c: Buffer) => chunks.push(c));
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code !== 0) return reject(new Error(`ffmpeg exit ${code}`));
        resolve(Buffer.concat(chunks));
      });

      const stdin = proc.stdin as Writable;
      stdin.end(narracion);
    });
  } catch (e) {
    // Si ffmpeg no está disponible, devuelve narración pura
    console.warn("[audio-mixer] ffmpeg no disponible, narración sin ambient:", (e as Error).message);
    return narracion;
  }
}
