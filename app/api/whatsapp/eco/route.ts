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

    // Comando admin: si el celular es del admin y manda "STATS", responder con métricas y skip al agent.
    const adminCommand = await maybeHandleAdminCommand(celular, body);
    if (adminCommand) {
      if (isMetaConfigured()) await sendText(celular, adminCommand);
      continue;
    }

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

async function maybeHandleAdminCommand(celular: string, body: string): Promise<string | null> {
  const adminPhone = process.env.ECODRIVE_ADMIN_PHONE;
  if (!adminPhone || celular !== adminPhone) return null;

  const cmd = body.toUpperCase().trim();

  if (cmd === "STATS" || cmd === "ADMIN STATS" || cmd === "/STATS") {
    const { getStats } = await import("@/lib/ecodrive/db");
    const s = await getStats();
    return [
      "*EcoDrive+ — Stats*",
      `Users total: ${s.users_total}`,
      `Drivers: ${s.drivers_total}`,
      `Passengers: ${s.passengers_total}`,
      `Waitlist total: ${s.waitlist_total} (hoy: ${s.waitlist_today})`,
      `Conversaciones hoy: ${s.conversations_today}`,
    ].join("\n");
  }

  return null;
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
