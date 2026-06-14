/**
 * POST /api/tudramaya/culqi-charge
 *
 * Cobra con tarjeta vía Culqi (reusa la cuenta Culqi de ActivosYA) y otorga
 * el acceso correspondiente. Recibe el token de Culqi.js generado en el front.
 *
 * Body: { token, email, user_id, serie_id, tier: 'cap'|'pack5'|'completo',
 *         episodio?, celular? }
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/tudramaya/db";
import { otorgarAcceso } from "@/lib/tudramaya/accesos";
import { PRECIOS, TIER_LABEL, type Tier } from "@/lib/tudramaya/precios";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { token, email, user_id, serie_id, tier, episodio, celular } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token requerido" }, { status: 400 });
    }
    if (!email || !String(email).includes("@")) {
      return NextResponse.json({ error: "email requerido" }, { status: 400 });
    }
    if (!serie_id) {
      return NextResponse.json({ error: "serie_id requerido" }, { status: 400 });
    }
    if (!tier || !(tier in PRECIOS)) {
      return NextResponse.json({ error: "tier inválido" }, { status: 400 });
    }

    const secret = process.env.CULQI_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Culqi no configurado" }, { status: 500 });
    }

    const monto = PRECIOS[tier as Tier];
    const amountCentimos = Math.round(monto * 100);

    // 1) Crear el cargo en Culqi
    const culqiRes = await fetch("https://api.culqi.com/v2/charges", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountCentimos,
        currency_code: "PEN",
        email: String(email).trim(),
        source_id: token,
        description: `TuDramaYa — ${TIER_LABEL[tier as Tier]}`,
        metadata: { producto: "tudramaya", tier, serie_id, episodio: episodio ?? "", user_id: user_id ?? "" },
      }),
    });

    const charge = await culqiRes.json();
    const exito = culqiRes.ok && charge?.object === "charge" && charge?.id;
    if (!exito) {
      const msg =
        charge?.user_message ||
        charge?.merchant_message ||
        "No se pudo procesar la tarjeta. Revisa los datos o intenta con otra.";
      return NextResponse.json({ error: msg, culqi: charge?.type ?? null }, { status: 402 });
    }

    // 2) Registrar el pago validado
    const { data: pago } = await supabase
      .from("tdy_pagos")
      .insert({
        user_id: user_id ?? null,
        celular: celular ?? null,
        serie_id,
        tier,
        episodio: episodio ?? null,
        monto_esperado: monto,
        monto_pagado: monto,
        metodo: "culqi",
        estado: "validado",
        referencia: charge.id,
        validado_por: "culqi",
        validado: true,
        validado_at: new Date().toISOString(),
        metadata: { email, charge_id: charge.id },
      })
      .select("id")
      .single();

    // 3) Otorgar el acceso
    if (user_id) {
      await otorgarAcceso({
        userId: user_id,
        serieId: serie_id,
        tier: tier as Tier,
        episodio: episodio ?? null,
        origen: "culqi",
        pagoId: pago?.id ?? null,
      });
    }

    return NextResponse.json({ ok: true, tier, charge_id: charge.id });
  } catch (e) {
    console.error("tudramaya culqi-charge error:", e);
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}
