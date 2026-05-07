/**
 * Miss Sofia — Meta Cloud direct sender.
 *
 * Reemplaza Twilio Content API por envio directo via Meta Graph (igual al
 * patron EcoDrive+). Permite mandar texto, audio, imagen, template y flow
 * interactivo.
 *
 * Env vars:
 *  - META_SOFIA_PHONE_ID  (993581680516098)
 *  - META_SOFIA_ACCESS_TOKEN
 */
const GRAPH = "https://graph.facebook.com/v22.0";

function meta(): { phoneId: string; token: string } | null {
  const phoneId = (process.env.META_SOFIA_PHONE_ID ?? "").trim();
  const token = (process.env.META_SOFIA_ACCESS_TOKEN ?? "").trim();
  if (!phoneId || !token) return null;
  return { phoneId, token };
}

export function isMetaCloudConfigured(): boolean {
  return meta() !== null;
}

async function rawSend(payload: Record<string, unknown>): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const m = meta();
  if (!m) return { ok: false, error: "META_SOFIA_* no configuradas" };
  try {
    const r = await fetch(`${GRAPH}/${m.phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${m.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const json = (await r.json().catch(() => ({}))) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };
    if (!r.ok) {
      return { ok: false, error: json.error?.message ?? `HTTP ${r.status}` };
    }
    return { ok: true, messageId: json.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function normalizeTo(to: string): string {
  return to.replace(/^whatsapp:/, "").replace(/^\+/, "");
}

export async function sendText(to: string, body: string) {
  return rawSend({
    messaging_product: "whatsapp",
    to: normalizeTo(to),
    type: "text",
    text: { body, preview_url: false },
  });
}

/**
 * Manda texto + audio en 2 mensajes consecutivos (Meta no soporta texto+audio
 * en una misma llamada, a diferencia de Twilio).
 */
export async function sendTextWithAudio(to: string, body: string, audioUrl: string) {
  const recipient = normalizeTo(to);
  const r1 = await rawSend({
    messaging_product: "whatsapp",
    to: recipient,
    type: "text",
    text: { body, preview_url: false },
  });
  if (!r1.ok) return r1;
  return rawSend({
    messaging_product: "whatsapp",
    to: recipient,
    type: "audio",
    audio: { link: audioUrl },
  });
}

export async function sendImage(to: string, imageUrl: string, caption?: string) {
  return rawSend({
    messaging_product: "whatsapp",
    to: normalizeTo(to),
    type: "image",
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  });
}

/**
 * Descarga un media de Meta Cloud (voice messages, images, etc.).
 * Retorna buffer + mime, o null si falla.
 */
export async function downloadMetaMedia(
  mediaId: string
): Promise<{ buffer: Buffer; mime: string } | null> {
  const m = meta();
  if (!m) return null;
  try {
    const info = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${m.token}` },
    });
    if (!info.ok) return null;
    const j = (await info.json()) as { url?: string; mime_type?: string };
    if (!j.url) return null;
    const r = await fetch(j.url, { headers: { Authorization: `Bearer ${m.token}` } });
    if (!r.ok) return null;
    return { buffer: Buffer.from(await r.arrayBuffer()), mime: j.mime_type ?? "audio/ogg" };
  } catch {
    return null;
  }
}
