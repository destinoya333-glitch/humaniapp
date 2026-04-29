import { NextResponse, after } from "next/server";

// Webhook EcoDrive+ — Meta WhatsApp Cloud API directa.
// MVP: verifica webhook + procesa mensaje con Claude + responde.
// La lógica completa del bot (matching, viajes, wallet) se construirá en lib/ecodrive/.

export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.ECODRIVE_META_VERIFY_TOKEN;

  if (mode === "subscribe" && token && expected && token === expected) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type MetaIncomingMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
};

export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Meta requiere ack 200 rápido o reintenta. Procesamos en background con after().
  after(async () => {
    try {
      await handleEvent(payload);
    } catch (err) {
      console.error("[ecodrive-webhook] error:", err);
    }
  });

  return NextResponse.json({ ok: true });
}

async function handleEvent(payload: unknown) {
  const messages = extractMessages(payload);
  if (messages.length === 0) return;

  const { getOrCreateUser, getConversation, appendMessage } = await import("@/lib/ecodrive/db");
  const { processMessage } = await import("@/lib/ecodrive/agent");
  const { sendText, isMetaConfigured } = await import("@/lib/ecodrive/wa-send");

  for (const msg of messages) {
    if (msg.type !== "text" || !msg.text?.body) continue;

    const celular = `+${msg.from.replace(/^\+/, "")}`;
    const body = msg.text.body.trim();

    await getOrCreateUser(celular);
    const conv = await getConversation(celular);
    const history = conv?.messages || [];

    await appendMessage(celular, { role: "user", content: body });

    const reply = await processMessage({ celular, message: body, history });

    await appendMessage(celular, { role: "assistant", content: reply });

    if (!isMetaConfigured()) {
      console.warn("[ecodrive-webhook] Meta no configurada — no se envía respuesta. Reply:", reply);
      continue;
    }
    await sendText(celular, reply);
  }
}

function extractMessages(payload: unknown): MetaIncomingMessage[] {
  // Estructura típica de Meta Cloud API:
  // { entry: [{ changes: [{ value: { messages: [...] } }] }] }
  const out: MetaIncomingMessage[] = [];
  const p = payload as { entry?: Array<{ changes?: Array<{ value?: { messages?: MetaIncomingMessage[] } }> }> };
  for (const entry of p?.entry || []) {
    for (const change of entry.changes || []) {
      for (const message of change.value?.messages || []) {
        out.push(message);
      }
    }
  }
  return out;
}
