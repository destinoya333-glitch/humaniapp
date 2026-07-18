/**
 * POST /api/sofia-flows/culqi-charge
 *
 * Cobra con tarjeta vía Culqi (reusa la cuenta Culqi de EcoDrive+).
 * Recibe el token de tarjeta (tkn_...) generado por Culqi.js en el frontend,
 * crea el cargo con la llave secreta, y al confirmarse activa el plan del usuario.
 *
 * Body: { token, email, plan: 'regular'|'premium', billing: 'monthly'|'yearly', user_id?, phone? }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const PRICING: Record<string, Record<string, number>> = {
  regular: { monthly: 30, yearly: 299 },
  premium: { monthly: 89, yearly: 799 },
};

export async function POST(req: NextRequest) {
  try {
    const { token, email, plan, billing, user_id, phone } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token requerido" }, { status: 400 });
    }
    if (!email || !String(email).includes("@")) {
      return NextResponse.json({ error: "email requerido" }, { status: 400 });
    }
    if (!plan || !PRICING[plan]) {
      return NextResponse.json({ error: "plan inválido" }, { status: 400 });
    }
    if (!billing || !PRICING[plan][billing]) {
      return NextResponse.json({ error: "billing inválido" }, { status: 400 });
    }

    const secret = process.env.CULQI_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Culqi no configurado" }, { status: 500 });
    }

    const amountSoles = PRICING[plan][billing];
    const amountCentimos = amountSoles * 100;

    // 1. Crear el cargo en Culqi
    const culqiRes = await fetch("https://api.culqi.com/v2/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountCentimos,
        currency_code: "PEN",
        email: String(email).trim(),
        source_id: token,
        description: `Miss Sofia ${plan} ${billing}`,
        metadata: { producto: "miss-sofia", plan, billing, user_id: user_id ?? "" },
      }),
    });

    const charge = await culqiRes.json();

    // Culqi devuelve object:"charge" + id (chr_...) cuando el cobro fue exitoso.
    const exito = culqiRes.ok && charge?.object === "charge" && charge?.id;
    if (!exito) {
      const msg =
        charge?.user_message ||
        charge?.merchant_message ||
        "No se pudo procesar la tarjeta. Revisa los datos o intenta con otra.";
      return NextResponse.json({ error: msg, culqi: charge?.type ?? null }, { status: 402 });
    }

    // 2. Activar el plan en la BD
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // FK-safe: solo enlazar user_id si existe en mse_users
    let safeUserId: string | null = user_id ?? null;
    if (safeUserId) {
      const { data: u } = await supabase.from("mse_users").select("id").eq("id", safeUserId).maybeSingle();
      if (!u) safeUserId = null;
    }

    const days = billing === "yearly" ? 365 : 30;
    const now = new Date();
    const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    await supabase.from("mse_payments").insert({
      user_id: safeUserId,
      phone: phone ?? null,
      plan,
      billing,
      amount_pen: amountSoles,
      status: "validated",
      validated_at: now.toISOString(),
      metadata: { source: "culqi", charge_id: charge.id, email },
    });

    if (safeUserId) {
      await supabase
        .from("mse_users")
        .update({
          plan,
          plan_started_at: now.toISOString(),
          plan_expires_at: expires.toISOString(),
        })
        .eq("id", safeUserId);
    }

    return NextResponse.json({ ok: true, plan, charge_id: charge.id, plan_expires_at: expires.toISOString() });
  } catch (e) {
    console.error("culqi-charge error:", e);
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}
