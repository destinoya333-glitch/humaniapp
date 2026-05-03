import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/ecodrive/auth/otp-send
// Body: { phone: "51994810242" }
// Envía código OTP por WhatsApp Meta Cloud API.
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json().catch(() => ({}));
    if (!phone || !/^51\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "Número inválido. Formato: 51XXXXXXXXX" }, { status: 400 });
    }

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Generar código 6 dígitos
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Insertar (no borrar los anteriores — sirven hasta expirar)
    await sb.from("eco_otp_codes").insert({ phone, code, expires_at: expires });

    // Enviar por WhatsApp via Meta Cloud API (canal EcoDrive+)
    const META_PHONE = "1044803088721236";
    const META_TOKEN = process.env.ECODRIVE_META_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || "";

    const r = await fetch(`https://graph.facebook.com/v22.0/${META_PHONE}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: `🔐 Tu código EcoDrive+ es: *${code}*\n\nVálido por 5 minutos. No lo compartas.`,
        },
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return NextResponse.json({ error: "Falló envío WhatsApp", detail: detail.slice(0, 200) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Código enviado por WhatsApp", expires_in: 300 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
