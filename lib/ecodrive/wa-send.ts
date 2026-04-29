// EcoDrive+ — Cliente Meta WhatsApp Cloud API
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

function getCreds() {
  const phoneId = process.env.ECODRIVE_META_PHONE_ID;
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN;
  if (!phoneId || !token) {
    return null;
  }
  return { phoneId, token };
}

export function isMetaConfigured() {
  return getCreds() !== null;
}

// WhatsApp limita mensajes de texto a 4096 chars; partimos por párrafo a ≤1500 para fluidez.
export function chunkMessage(text: string, maxLen = 1500): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf("\n\n", maxLen);
    if (cut < maxLen / 2) cut = rest.lastIndexOf("\n", maxLen);
    if (cut < maxLen / 2) cut = rest.lastIndexOf(". ", maxLen);
    if (cut < maxLen / 2) cut = maxLen;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function normalizePhone(phone: string): string {
  // Meta espera el número sin "+" ni "whatsapp:"
  return phone.replace(/^\+/, "").replace(/^whatsapp:/, "").replace(/[^0-9]/g, "");
}

export async function sendText(to: string, body: string): Promise<void> {
  const creds = getCreds();
  if (!creds) throw new Error("Meta WhatsApp Cloud API no configurada");
  const recipient = normalizePhone(to);

  const chunks = chunkMessage(body);
  for (let i = 0; i < chunks.length; i++) {
    const res = await fetch(`${GRAPH_BASE}/${creds.phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: { preview_url: false, body: chunks[i] },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Meta send failed (${res.status}): ${err}`);
    }
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}
