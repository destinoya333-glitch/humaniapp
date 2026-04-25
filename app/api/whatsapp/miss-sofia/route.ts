/**
 * POST /api/whatsapp/miss-sofia
 * Twilio WhatsApp webhook for Miss Sofia.
 *
 * Uses the new mse_* schema (whatsapp_leads → bridges to mse_users on signup).
 * Replaces the old sofia_* (legacy) flow which is now deprecated.
 */
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { processWhatsAppMessage } from "@/lib/miss-sofia-voice/whatsapp-agent";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = (formData.get("From") as string) || "";
  const body = (formData.get("Body") as string) || "";

  const phone = from.replace(/^whatsapp:/, "");
  if (!phone) {
    const twiml = new twilio.twiml.MessagingResponse();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  let reply = "";
  try {
    reply = await processWhatsAppMessage(phone, body);
  } catch (e) {
    console.error("Miss Sofia WhatsApp error:", e);
    reply = "Tuve un problemita técnico, mi amor. ¿Me escribes en un minutito? 💕";
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
