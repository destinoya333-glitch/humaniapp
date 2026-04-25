/**
 * POST /api/whatsapp/miss-sofia
 * Twilio WhatsApp webhook for Miss Sofia.
 *
 * Returns TwiML with optional audio Media (for level test questions).
 */
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { processWhatsAppMessage } from "@/lib/miss-sofia-voice/whatsapp-agent";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = (formData.get("From") as string) || "";
  const body = (formData.get("Body") as string) || "";

  const phone = from.replace(/^whatsapp:/, "");
  const twiml = new twilio.twiml.MessagingResponse();

  if (!phone) {
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  let text = "";
  let mediaUrl: string | undefined;
  try {
    const reply = await processWhatsAppMessage(phone, body);
    text = reply.text;
    mediaUrl = reply.mediaUrl;
  } catch (e) {
    console.error("Miss Sofia WhatsApp error:", e);
    text = "Tuve un problemita técnico, mi amor. ¿Me escribes en un minutito? 💕";
  }

  const msg = twiml.message(text);
  if (mediaUrl) msg.media(mediaUrl);

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
