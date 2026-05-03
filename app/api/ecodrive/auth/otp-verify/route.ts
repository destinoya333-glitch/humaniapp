import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// POST /api/ecodrive/auth/otp-verify
// Body: { phone, code }
// Verifica código y crea cookie de sesión 30 días.
export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json().catch(() => ({}));
    if (!phone || !code) return NextResponse.json({ error: "phone y code requeridos" }, { status: 400 });

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: otps } = await sb
      .from("eco_otp_codes")
      .select("id, code, expires_at, used_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1);

    const otp = otps?.[0];
    if (!otp) return NextResponse.json({ error: "No hay código pendiente" }, { status: 400 });
    if (otp.used_at) return NextResponse.json({ error: "Código ya usado" }, { status: 400 });
    if (new Date(otp.expires_at) < new Date()) return NextResponse.json({ error: "Código expirado" }, { status: 400 });
    if (otp.code !== code) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

    // Marcar como usado
    await sb.from("eco_otp_codes").update({ used_at: new Date().toISOString() }).eq("id", otp.id);

    // Crear sesión 30 días
    const token = crypto.randomBytes(32).toString("hex");
    const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await sb.from("eco_sessions").insert({
      token,
      phone,
      expires_at: sessionExpires.toISOString(),
    });

    const res = NextResponse.json({ ok: true, phone });
    res.cookies.set("eco_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return res;
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
