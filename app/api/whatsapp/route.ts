import { NextRequest, NextResponse } from "next/server";
import { getTenant } from "@/lib/pollerias/db";
import { procesarMensaje } from "@/lib/pollerias/agent";
import twilio from "twilio";

// Router maestro — recibe TODOS los mensajes WhatsApp
// y enruta según el número destino (To)
export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const from = formData.get("From") as string;   // whatsapp:+51999888777
  const to = formData.get("To") as string;       // whatsapp:+14155238886

  const toNumber = to.replace("whatsapp:", "");

  // ─── ENRUTADOR ─────────────────────────────────────────────────────────────

  // 1. ¿Es un tenant de pollerías?
  const tenant = await getTenant(toNumber);
  if (tenant) {
    return await handlePolleria(req, formData, from, tenant);
  }

  // 2. ¿Es un tenant de Miss Sofia?
  const { getTenant: getSofiaTenant } = await import("@/lib/miss-sofia/db");
  const sofiaTenant = await getSofiaTenant(toNumber);
  if (sofiaTenant) {
    return await handleMissSofia(req, formData, from, sofiaTenant);
  }

  // 3. DestinoYA (n8n legacy) — reenviar al webhook de n8n
  const DESTINOYA_NUMBERS = [
    "+13612875933",
    // agrega aquí más números de DestinoYA si tienes
  ];

  if (DESTINOYA_NUMBERS.includes(toNumber)) {
    return await forwardToN8n(req, formData);
  }

  // 4. Número no reconocido
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message("Lo sentimos, este servicio no está disponible.");
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" }
  });
}

// ─── HANDLER POLLERÍAS ───────────────────────────────────────────────────────

async function handlePolleria(
  _req: NextRequest,
  formData: FormData,
  from: string,
  tenant: Record<string, unknown>
) {
  const { getOrCreateCliente, getConversacion } = await import("@/lib/pollerias/db");

  const telefono = from.replace("whatsapp:", "");
  const body = (formData.get("Body") as string) || "";
  const mediaUrl = formData.get("MediaUrl0") as string | null;
  const latitude = formData.get("Latitude") as string | null;
  const longitude = formData.get("Longitude") as string | null;

  await getOrCreateCliente(tenant.id as string, telefono);

  const conversacion = await getConversacion(tenant.id as string, telefono);
  const historial = (conversacion?.messages as Array<{ role: string; content: unknown }>) || [];

  const respuesta = await procesarMensaje({
    tenant,
    telefono,
    mensaje: body,
    mediaUrl: mediaUrl || undefined,
    latitude: latitude || undefined,
    longitude: longitude || undefined,
    historial,
  });

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(respuesta);
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" }
  });
}

// ─── HANDLER MISS SOFIA ─────────────────────────────────────────────────────

async function handleMissSofia(
  _req: NextRequest,
  formData: FormData,
  from: string,
  tenant: Record<string, unknown>
) {
  const { getConversacion } = await import("@/lib/miss-sofia/db");
  const { procesarMensaje } = await import("@/lib/miss-sofia/agent");

  const telefono = from.replace("whatsapp:", "");
  const body = (formData.get("Body") as string) || "";

  const conversacion = await getConversacion(tenant.id as string, telefono);
  const historial = (conversacion?.messages as Array<{ role: string; content: unknown }>) || [];

  const respuesta = await procesarMensaje({ tenant, telefono, mensaje: body, historial });

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(respuesta);
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" }
  });
}

// ─── FORWARD A N8N (DestinoYA legacy) ───────────────────────────────────────

async function forwardToN8n(_req: NextRequest, formData: FormData) {
  const N8N_WEBHOOK = "https://n8n-production-b739.up.railway.app/webhook/destinoya-agent";

  const body = new URLSearchParams();
  formData.forEach((value, key) => {
    body.append(key, value.toString());
  });

  try {
    await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (e) {
    console.error("Error forwarding to n8n:", e);
  }

  // Respuesta vacía — n8n maneja la respuesta por su cuenta via WATI
  return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
    headers: { "Content-Type": "text/xml" }
  });
}
