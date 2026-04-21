import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { getTenant, getConversacion } from "@/lib/miss-sofia/db";
import { procesarMensaje } from "@/lib/miss-sofia/agent";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const from = formData.get("From") as string;
  const to = formData.get("To") as string;
  const body = (formData.get("Body") as string) || "";

  const telefono = from.replace("whatsapp:", "");
  const whatsappNumber = to.replace("whatsapp:", "");

  const tenant = await getTenant(whatsappNumber);
  if (!tenant) {
    return new NextResponse("Tenant no encontrado", { status: 404 });
  }

  const conversacion = await getConversacion(tenant.id, telefono);
  const historial = (conversacion?.messages as Array<{ role: string; content: unknown }>) || [];

  const respuesta = await procesarMensaje({ tenant, telefono, mensaje: body, historial });

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(respuesta);
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" }
  });
}
