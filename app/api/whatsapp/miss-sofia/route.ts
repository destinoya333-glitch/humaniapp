/**
 * POST /api/whatsapp/miss-sofia
 * Twilio WhatsApp webhook — uses Content API (interactive buttons) when available.
 *
 * Pattern:
 *   - Responds to webhook with empty TwiML immediately (fast ack)
 *   - Processes the message and sends reply via Twilio API in after()
 */
import { NextRequest, NextResponse, after } from "next/server";
import twilio from "twilio";
import {
  processVoiceMessage,
  processWhatsAppMessage,
} from "@/lib/miss-sofia-voice/whatsapp-agent";
import {
  isTwilioConfigured,
  sendContentTemplate,
  sendPlainMessage,
} from "@/lib/miss-sofia-voice/twilio-content";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = (formData.get("From") as string) || "";
  const body = (formData.get("Body") as string) || "";
  const numMedia = parseInt((formData.get("NumMedia") as string) || "0", 10) || 0;
  const mediaUrl0 = (formData.get("MediaUrl0") as string) || "";
  const mediaType0 = (formData.get("MediaContentType0") as string) || "";
  const phone = from.replace(/^whatsapp:/, "");

  const emptyTwiml = new twilio.twiml.MessagingResponse().toString();
  if (!phone) {
    return new NextResponse(emptyTwiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Process and reply asynchronously after responding to Twilio webhook
  after(async () => {
    try {
      // Voice message + posible flag de pronunciation pending del Flow #5.
      // Si el handler maneja el caso retorna reply; si no, caemos al flujo texto.
      let reply: Awaited<ReturnType<typeof processWhatsAppMessage>> | null = null;
      if (numMedia > 0 && mediaUrl0 && mediaType0.startsWith("audio/")) {
        reply = await processVoiceMessage(phone, mediaUrl0, mediaType0);
      }
      if (!reply) {
        reply = await processWhatsAppMessage(phone, body);
      }
      if (!isTwilioConfigured()) {
        console.warn("Twilio Sofia subaccount not configured");
        return;
      }
      // If both leading text AND template, send as two messages
      if (reply.text && reply.templateSid) {
        await sendPlainMessage({ toPhone: phone, body: reply.text });
      }
      if (reply.templateSid && reply.variables) {
        await sendContentTemplate({
          toPhone: phone,
          contentSid: reply.templateSid,
          variables: reply.variables,
        });
      } else if (reply.text || reply.mediaUrl) {
        await sendPlainMessage({
          toPhone: phone,
          body: reply.text,
          mediaUrl: reply.mediaUrl,
        });
      }
    } catch (e) {
      console.error("Miss Sofia WhatsApp async error:", e);
      try {
        await sendPlainMessage({
          toPhone: phone,
          body: "Tuve un problema técnico. ¿Me escribes en un minuto?",
        });
      } catch {}
    }
  });

  return new NextResponse(emptyTwiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
