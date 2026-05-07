/**
 * Endpoint público — manda template eco_pasajero_invite al wa_id desde landing.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { wa_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const waId = (body.wa_id || "").replace(/\D/g, "");
  if (waId.length < 9) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  const normalized = waId.length === 9 ? `51${waId}` : waId;

  const phoneId = process.env.ECODRIVE_META_PHONE_ID!;
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN!;

  const payload = {
    messaging_product: "whatsapp",
    to: normalized,
    type: "template",
    template: {
      name: "eco_pasajero_invite",
      language: { code: "es" },
      components: [
        {
          type: "button",
          sub_type: "flow",
          index: "0",
          parameters: [
            {
              type: "action",
              action: { flow_token: `ecodrive:inscripcion-pasajero:${normalized}` },
            },
          ],
        },
      ],
    },
  };

  const metaResp = await fetch(
    `https://graph.facebook.com/v22.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const json = await metaResp.json();
  if (!metaResp.ok) {
    return NextResponse.json({ error: "meta_send_failed", detail: json }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message_id: json?.messages?.[0]?.id });
}
