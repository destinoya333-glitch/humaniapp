import { NextRequest, NextResponse } from "next/server";
import { getTenant, getConversacion } from "@/lib/miss-sofia/db";
import { procesarMensaje } from "@/lib/miss-sofia/agent";

const WATI_API = "https://live.wati.io/1061490";
const WATI_TOKEN = process.env.WATI_API_TOKEN!;
const WATI_NUMBER = "+51979385499";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // Solo procesar mensajes entrantes de texto
  if (payload.eventType !== "incoming_message") {
    return NextResponse.json({ ok: true });
  }

  const telefono: string = payload.waId;           // "51979385499" sin +
  const mensaje: string = payload.text?.body || "";

  if (!mensaje.trim()) return NextResponse.json({ ok: true });

  const tenant = await getTenant(WATI_NUMBER);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  const conversacion = await getConversacion(tenant.id, `+${telefono}`);
  const historial = (conversacion?.messages as Array<{ role: string; content: unknown }>) || [];

  const respuesta = await procesarMensaje({
    tenant,
    telefono: `+${telefono}`,
    mensaje,
    historial,
  });

  // Enviar respuesta via WATI API
  await fetch(`${WATI_API}/sendSessionMessage/${telefono}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WATI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messageText: respuesta }),
  });

  return NextResponse.json({ ok: true });
}
