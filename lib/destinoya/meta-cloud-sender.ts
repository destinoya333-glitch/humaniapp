/**
 * TuDestinoYa — Meta Cloud direct sender.
 *
 * Patron clonado de lib/miss-sofia-voice/meta-cloud-sender.ts (que a su vez
 * sigue el patron EcoDrive+). Reemplaza Twilio Content API por envio directo
 * via Meta Graph cuando el bot Destino corre en Meta Cloud direct.
 *
 * Env vars:
 *  - META_DESTINOYA_PHONE_ID  (1092032833995142)
 *  - META_DESTINOYA_ACCESS_TOKEN  (mismo system user / user token que Sofia)
 */
const GRAPH = "https://graph.facebook.com/v22.0";

function meta(): { phoneId: string; token: string } | null {
  const phoneId = (process.env.META_DESTINOYA_PHONE_ID ?? "").trim();
  // Reusamos token Sofia si Destino no tiene propio (mismo HumaniAppManager).
  const token =
    (process.env.META_DESTINOYA_ACCESS_TOKEN ?? "").trim() ||
    (process.env.META_SOFIA_ACCESS_TOKEN ?? "").trim();
  if (!phoneId || !token) return null;
  return { phoneId, token };
}

export function isMetaCloudConfigured(): boolean {
  return meta() !== null;
}

async function rawSend(payload: Record<string, unknown>): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const m = meta();
  if (!m) return { ok: false, error: "META_DESTINOYA_* no configuradas" };
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

export async function sendImage(to: string, imageUrl: string, caption?: string) {
  return rawSend({
    messaging_product: "whatsapp",
    to: normalizeTo(to),
    type: "image",
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  });
}

export async function sendAudio(to: string, audioUrl: string) {
  return rawSend({
    messaging_product: "whatsapp",
    to: normalizeTo(to),
    type: "audio",
    audio: { link: audioUrl },
  });
}

/**
 * Sube un archivo a Meta /media y envía al cliente como mensaje document.
 * `filename` debe incluir extensión (ej. "CV-Percy.docx" o "CV-Percy.pdf").
 */
export async function sendDocument(opts: {
  to: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  caption?: string;
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const m = meta();
  if (!m) return { ok: false, error: "META_DESTINOYA_* no configuradas" };
  // Step 1: upload media
  const boundary = "----DocBoundary" + Date.now();
  const crlf = "\r\n";
  const partsHeader = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="messaging_product"`,
    "",
    "whatsapp",
    `--${boundary}`,
    `Content-Disposition: form-data; name="type"`,
    "",
    opts.mimeType,
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${opts.filename}"`,
    `Content-Type: ${opts.mimeType}`,
    "",
    "",
  ].join(crlf);
  const partsFooter = `${crlf}--${boundary}--${crlf}`;
  const payload = Buffer.concat([
    Buffer.from(partsHeader),
    opts.buffer,
    Buffer.from(partsFooter),
  ]);
  let mediaId: string | null = null;
  try {
    const r = await fetch(`${GRAPH}/${m.phoneId}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${m.token}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: payload,
    });
    const j = (await r.json()) as { id?: string; error?: { message?: string } };
    if (!r.ok || !j.id) return { ok: false, error: j.error?.message || `upload HTTP ${r.status}` };
    mediaId = j.id;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  // Step 2: send message with media id
  return rawSend({
    messaging_product: "whatsapp",
    to: normalizeTo(opts.to),
    type: "document",
    document: {
      id: mediaId,
      filename: opts.filename,
      ...(opts.caption ? { caption: opts.caption } : {}),
    },
  });
}

export async function sendTemplate(opts: {
  to: string;
  templateName: string;
  language?: string;
  components?: unknown[];
}) {
  return rawSend({
    messaging_product: "whatsapp",
    to: normalizeTo(opts.to),
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: opts.language ?? "es" },
      ...(opts.components ? { components: opts.components } : {}),
    },
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
