import { NextResponse } from "next/server";

// Webhook EcoDrive+ — Meta WhatsApp Cloud API directa.
// Stub: pasa verificación de Meta + ack a eventos entrantes.
// La lógica del bot Eco (agente Claude + tools de viaje) se implementará en lib/ecodrive/.

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

export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  // TODO(ecodrive-bot): enrutar a lib/ecodrive/agent cuando esté implementado.
  // Por ahora solo acknowledge: Meta requiere 200 OK rápido o reintenta el webhook.
  console.log("[ecodrive-webhook]", JSON.stringify(payload));

  return NextResponse.json({ ok: true });
}
