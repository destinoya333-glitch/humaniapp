/**
 * Genera token efimero (15 min) + manda template eco_pedir_viaje_url al pasajero.
 * El template tiene URL button que abre https://ecodriveplus.com/eco-pedir/{token}
 *
 * Auth: x-admin-passcode
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-passcode") !== process.env.ECODRIVE_ADMIN_PASSCODE) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { wa_id?: string };
  const waId = (body.wa_id || "").replace(/\D/g, "");
  if (waId.length < 9) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  const normalized = waId.length === 9 ? `51${waId}` : waId;

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Lookup pasajero (puede no existir todavia — pero permitimos generar el token igual)
  const { data: pas } = await sb
    .from("eco_pasajeros")
    .select("id")
    .eq("wa_id", normalized)
    .maybeSingle();

  // Crear token
  const { data: tokenRow } = await sb
    .from("eco_pedir_viaje_tokens")
    .insert({
      wa_id: normalized,
      pasajero_id: (pas as { id: string } | null)?.id || null,
    })
    .select("token")
    .single();

  const token = (tokenRow as { token: string } | null)?.token;
  if (!token) {
    return NextResponse.json({ error: "token_create_failed" }, { status: 500 });
  }

  const phoneId = process.env.ECODRIVE_META_PHONE_ID!;
  const accessToken = process.env.ECODRIVE_META_ACCESS_TOKEN!;

  const payload = {
    messaging_product: "whatsapp",
    to: normalized,
    type: "template",
    template: {
      name: "eco_pedir_viaje_url",
      language: { code: "es" },
      components: [
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: token }],
        },
      ],
    },
  };

  const r = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await r.json();
  if (!r.ok) {
    return NextResponse.json({ error: "meta_send_failed", detail: json }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    token,
    picker_url: `https://ecodriveplus.com/eco-pedir/${token}`,
    message_id: json?.messages?.[0]?.id,
  });
}
