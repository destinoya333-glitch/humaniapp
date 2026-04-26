import { NextRequest, NextResponse, after } from "next/server";
import { getTenant } from "@/lib/pollerias/db";
import { procesarMensaje } from "@/lib/pollerias/agent";
import twilio from "twilio";

export const maxDuration = 60; // segundos

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

  // 3. DestinoYA — agente Claude propio (Twilio +51961347233)
  const DESTINOYA_NUMBERS = ["+51961347233"];
  if (DESTINOYA_NUMBERS.includes(toNumber)) {
    return await handleDestinoYA(req, formData, from);
  }

  // 4. DestinoYA legacy (n8n) — números viejos
  const DESTINOYA_LEGACY = ["+13612875933"];
  if (DESTINOYA_LEGACY.includes(toNumber)) {
    return await forwardToN8n(req, formData);
  }

  // 5. Número no reconocido
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

// ─── HANDLER MISS SOFIA (NEW — usa miss-sofia-voice con audio turn-by-turn) ──

async function handleMissSofia(
  _req: NextRequest,
  formData: FormData,
  from: string,
  _tenant: Record<string, unknown>
) {
  const telefono = from.replace("whatsapp:", "");
  const body = (formData.get("Body") as string) || "";
  const emptyTwiml = new twilio.twiml.MessagingResponse().toString();

  // Process + send asynchronously so we can use Content API templates
  after(async () => {
    try {
      const { processWhatsAppMessage } = await import("@/lib/miss-sofia-voice/whatsapp-agent");
      const { isTwilioConfigured, sendContentTemplate, sendPlainMessage } = await import(
        "@/lib/miss-sofia-voice/twilio-content"
      );

      const reply = await processWhatsAppMessage(telefono, body);
      if (!isTwilioConfigured()) {
        console.warn("Twilio Sofia subaccount not configured");
        return;
      }
      if (reply.text && reply.templateSid) {
        await sendPlainMessage({ toPhone: telefono, body: reply.text });
      }
      if (reply.templateSid && reply.variables) {
        await sendContentTemplate({
          toPhone: telefono,
          contentSid: reply.templateSid,
          variables: reply.variables,
        });
      } else if (reply.text || reply.mediaUrl) {
        await sendPlainMessage({
          toPhone: telefono,
          body: reply.text,
          mediaUrl: reply.mediaUrl,
        });
      }
    } catch (e) {
      console.error("Miss Sofia router async error:", e);
    }
  });

  return new NextResponse(emptyTwiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

// ─── HANDLER DESTINOYA (Claude agent propio) ────────────────────────────────

async function handleDestinoYA(
  _req: NextRequest,
  formData: FormData,
  from: string
) {
  const telefono = from.replace("whatsapp:", "");
  const body = (formData.get("Body") as string) || "";
  const mediaUrl = formData.get("MediaUrl0") as string | null;
  const mediaContentType = formData.get("MediaContentType0") as string | null;

  // Si hay imagen → procesar después con after() y feedback inmediato
  if (mediaUrl) {
    after(async () => {
      try {
        await procesarImagenAsync(telefono, body, mediaUrl, mediaContentType || "image/jpeg");
      } catch (err) {
        console.error("Error procesando imagen async:", err);
      }
    });

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("🔮 *Analizando tu palma...*\n\nDame unos segundos para leer las líneas de tu mano ✨");
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" }
    });
  }

  // Detectar si vamos a generar una consulta larga (después de "Pago confirmado")
  const { getConversacion } = await import("@/lib/destinoya/db");
  const conversacion = await getConversacion(telefono);
  const historial = (conversacion?.messages as Array<{ role: string; content: unknown }>) || [];

  const lastAsst = [...historial].reverse().find(m => m.role === "assistant");
  const lastAsstContent = typeof lastAsst?.content === "string" ? lastAsst.content : "";
  const esperaDatos =
    /pago confirmado/i.test(lastAsstContent) &&
    /(necesito|envíame|cuéntame|elige|dame)/i.test(lastAsstContent);

  // Si es turno de generar consulta larga → procesar async
  if (esperaDatos) {
    after(async () => {
      try {
        await procesarTextoAsync(telefono, body, historial);
      } catch (err) {
        console.error("Error procesando texto async:", err);
      }
    });

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("🔮 *Generando tu consulta...*\n\nDame unos segundos ✨");
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" }
    });
  }

  // Caso normal: respuestas cortas (menús, preguntas) → sync
  const { procesarMensaje } = await import("@/lib/destinoya/agent");
  const respuesta = await procesarMensaje({ telefono, mensaje: body, historial });

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(respuesta);
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" }
  });
}

async function procesarTextoAsync(
  telefono: string,
  body: string,
  historial: Array<{ role: string; content: unknown }>
) {
  const { procesarMensaje } = await import("@/lib/destinoya/agent");
  const respuesta = await procesarMensaje({ telefono, mensaje: body, historial });

  const TWILIO_SID = process.env.TWILIO_DESTINOYA_ACCOUNT_SID!;
  const TWILIO_TOKEN = process.env.TWILIO_DESTINOYA_AUTH_TOKEN!;
  const client = twilio(TWILIO_SID, TWILIO_TOKEN);

  const chunks = dividirMensaje(respuesta, 1500);
  for (let i = 0; i < chunks.length; i++) {
    await client.messages.create({
      from: "whatsapp:+51961347233",
      to: `whatsapp:${telefono}`,
      body: chunks[i],
    });
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 500));
  }
}

// Divide texto largo respetando saltos de línea/párrafos
function dividirMensaje(texto: string, maxLen: number): string[] {
  if (texto.length <= maxLen) return [texto];

  const chunks: string[] = [];
  let resto = texto;

  while (resto.length > maxLen) {
    let cortar = resto.lastIndexOf("\n\n", maxLen);
    if (cortar < maxLen / 2) cortar = resto.lastIndexOf("\n", maxLen);
    if (cortar < maxLen / 2) cortar = resto.lastIndexOf(". ", maxLen);
    if (cortar < maxLen / 2) cortar = maxLen;

    chunks.push(resto.slice(0, cortar).trim());
    resto = resto.slice(cortar).trim();
  }
  if (resto) chunks.push(resto);
  return chunks;
}

async function procesarImagenAsync(
  telefono: string,
  body: string,
  mediaUrl: string,
  mediaContentType: string
) {
  const { supabase } = await import("@/lib/destinoya/db");
  const log = (step: string, info?: unknown) =>
    supabase.from("destinoya_debug_log").insert({
      endpoint: "imagen_async",
      body: telefono,
      parsed: { step, mediaUrl: mediaUrl.slice(0, 60), info: info ? String(info).slice(0, 500) : "" },
      result: step,
    }).then(() => {}, () => {});

  await log("inicio");

  try {
    const { getConversacion } = await import("@/lib/destinoya/db");
    const { procesarMensaje } = await import("@/lib/destinoya/agent");

    await log("imports_ok");

    const conversacion = await getConversacion(telefono);
    const historial = (conversacion?.messages as Array<{ role: string; content: unknown }>) || [];

    await log("historial_ok", `len=${historial.length}`);

    const respuesta = await procesarMensaje({
      telefono,
      mensaje: body,
      historial,
      mediaUrl,
      mediaContentType,
    });

    await log("respuesta_ok", `len=${respuesta.length}`);

    const TWILIO_SID = process.env.TWILIO_DESTINOYA_ACCOUNT_SID!;
    const TWILIO_TOKEN = process.env.TWILIO_DESTINOYA_AUTH_TOKEN!;
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);

    // Dividir en chunks de 1500 caracteres (límite WhatsApp es 1600)
    const chunks = dividirMensaje(respuesta, 1500);
    await log("chunks_generated", `total=${chunks.length}`);

    for (let i = 0; i < chunks.length; i++) {
      await client.messages.create({
        from: "whatsapp:+51961347233",
        to: `whatsapp:${telefono}`,
        body: chunks[i],
      });
      // Pequeña pausa entre mensajes para que lleguen en orden
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    await log("twilio_sent_ok", `chunks_sent=${chunks.length}`);
  } catch (err) {
    await log("ERROR", err instanceof Error ? `${err.message}\n${err.stack}` : String(err));
    throw err;
  }
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
