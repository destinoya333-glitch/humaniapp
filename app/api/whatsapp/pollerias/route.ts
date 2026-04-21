import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { getTenant, getOrCreateCliente, getConversacion } from "@/lib/pollerias/db";
import { procesarMensaje } from "@/lib/pollerias/agent";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const from = formData.get("From") as string;        // ej: whatsapp:+51999888777
  const to = formData.get("To") as string;            // ej: whatsapp:+13612875933
  const body = (formData.get("Body") as string) || "";
  const mediaUrl = formData.get("MediaUrl0") as string | null;
  const latitude = formData.get("Latitude") as string | null;
  const longitude = formData.get("Longitude") as string | null;

  const telefono = from.replace("whatsapp:", "");
  const whatsappNumber = to.replace("whatsapp:", "");

  // Obtener tenant por número WhatsApp
  const tenant = await getTenant(whatsappNumber);
  if (!tenant) {
    return new NextResponse("Tenant no encontrado", { status: 404 });
  }

  // Obtener o crear cliente
  await getOrCreateCliente(tenant.id, telefono);

  // Obtener historial de conversación
  const conversacion = await getConversacion(tenant.id, telefono);
  const historial = (conversacion?.messages as Array<{ role: string; content: unknown }>) || [];

  // Procesar con agente IA
  const respuesta = await procesarMensaje({
    tenant,
    telefono,
    mensaje: body,
    mediaUrl: mediaUrl || undefined,
    latitude: latitude || undefined,
    longitude: longitude || undefined,
    historial,
  });

  // Responder a Twilio con TwiML
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(respuesta);

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" }
  });
}
