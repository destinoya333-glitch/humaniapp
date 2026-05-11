/**
 * TuCuentoYa — Meta Cloud direct sender.
 *
 * Clon del patrón de lib/destinoya/meta-cloud-sender.ts. Reusa token de
 * HumaniAppManager (System User) si no hay token específico del producto.
 *
 * Env vars:
 *  - META_CUENTO_PHONE_ID  (phone_id Meta del número TuCuento)
 *  - META_CUENTO_ACCESS_TOKEN  (opcional, sino reusa META_SOFIA_ACCESS_TOKEN)
 *  - META_CUENTO_VERIFY_TOKEN  (verify webhook)
 */
const GRAPH = "https://graph.facebook.com/v22.0";

function meta(): { phoneId: string; token: string } | null {
  const phoneId = (process.env.META_CUENTO_PHONE_ID ?? "").trim();
  const token =
    (process.env.META_CUENTO_ACCESS_TOKEN ?? "").trim() ||
    (process.env.META_SOFIA_ACCESS_TOKEN ?? "").trim();
  if (!phoneId || !token) return null;
  return { phoneId, token };
}

export function isMetaCloudConfigured(): boolean {
  return meta() !== null;
}

async function rawSend(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const m = meta();
  if (!m) return { ok: false, error: "META_CUENTO_* no configuradas" };
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
 * Sube un MP3/PDF a Meta /media y envía como mensaje (audio/document).
 */
export async function uploadAndSendMedia(opts: {
  to: string;
  buffer: Buffer;
  mimeType: string;
  filename?: string;
  caption?: string;
  asDocument?: boolean;
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const m = meta();
  if (!m) return { ok: false, error: "META_CUENTO_* no configuradas" };

  const boundary = "----CuentoBoundary" + Date.now();
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
    `Content-Disposition: form-data; name="file"; filename="${opts.filename ?? "cuento.mp3"}"`,
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

  if (opts.asDocument) {
    return rawSend({
      messaging_product: "whatsapp",
      to: normalizeTo(opts.to),
      type: "document",
      document: {
        id: mediaId,
        filename: opts.filename ?? "cuento.pdf",
        ...(opts.caption ? { caption: opts.caption } : {}),
      },
    });
  }

  return rawSend({
    messaging_product: "whatsapp",
    to: normalizeTo(opts.to),
    type: "audio",
    audio: { id: mediaId },
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

export async function downloadMetaMedia(
  mediaId: string,
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
