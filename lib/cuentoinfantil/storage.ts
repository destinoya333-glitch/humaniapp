/**
 * TuCuentoYa — Storage helpers (Supabase Storage).
 *
 * Suben MP3 generado y PDF ilustrado a buckets públicos con URL firmada
 * de larga duración (1 año).
 *
 * Buckets requeridos en Supabase:
 *  - tci-audios   (público)
 *  - tci-pdfs     (público)
 */
import { supabase } from "./db";

const BUCKET_AUDIOS = process.env.SUPABASE_BUCKET_CUENTOS ?? "tci-audios";
const BUCKET_PDFS = process.env.SUPABASE_BUCKET_PDFS ?? "tci-pdfs";

export async function subirAudio(
  pedidoId: string,
  buffer: Buffer,
  mimeType = "audio/mpeg",
): Promise<{ url: string; path: string }> {
  const path = `${pedidoId}.mp3`;
  const { error } = await supabase.storage
    .from(BUCKET_AUDIOS)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
      cacheControl: "31536000",
    });
  if (error) throw new Error(`subirAudio: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET_AUDIOS).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function subirPDF(
  pedidoId: string,
  buffer: Buffer,
): Promise<{ url: string; path: string }> {
  const path = `${pedidoId}.pdf`;
  const { error } = await supabase.storage.from(BUCKET_PDFS).upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`subirPDF: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET_PDFS).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
