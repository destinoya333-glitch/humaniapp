/**
 * POST /api/sofia-flows/madrodroid
 *
 * MacroDroid Yape detector for Miss Sofia.
 * Triggered when phone +51 998 102 258 receives a Yape notification.
 *
 * Flow:
 *   - Parse Yape SMS (monto, op, sender name)
 *   - Find pending payment in mse_payments by monto + 60 min window
 *   - Update status validated → activate plan
 *   - Send confirmation WhatsApp via Sofia phone
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendText } from "@/lib/miss-sofia-voice/meta-cloud-sender";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  let bodyRaw = "";
  let texto = "";
  const ct = req.headers.get("content-type") || "";
  try { bodyRaw = await req.text(); } catch {}
  try {
    if (ct.includes("application/json")) {
      const j = JSON.parse(bodyRaw);
      texto = j.mensaje || j.text || j.body || j.message || j.notification_text || JSON.stringify(j);
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const p = new URLSearchParams(bodyRaw);
      texto = p.get("mensaje") || p.get("text") || p.get("body") || p.get("notification_text") || bodyRaw;
    } else {
      texto = bodyRaw;
    }
  } catch { texto = bodyRaw; }

  const log = (step: string, info?: unknown) =>
    supabase.from("destinoya_debug_log").insert({
      endpoint: "sofia-madrodroid", body: bodyRaw,
      parsed: { step, info: info ? String(JSON.stringify(info)).slice(0, 500) : "", texto: texto.slice(0, 200) },
      result: step,
    }).then(() => {}, () => {});

  if (!texto) {
    await log("ERROR_no_texto");
    return NextResponse.json({ error: "no texto" }, { status: 400 });
  }

  const montoMatch = texto.match(/S\/\s?(\d+\.?\d*)/);
  if (!montoMatch) {
    await log("ERROR_no_monto");
    return NextResponse.json({ error: "no monto" }, { status: 400 });
  }
  const monto = parseFloat(montoMatch[1]);

  const opMatch = texto.match(/(?:operaci[oó]n|oper[.#]?)[:\s]*([0-9]{5,12})/i);
  const operacion = opMatch ? opMatch[1] : `OP${Date.now().toString().slice(-6)}`;

  await log("PARSED", { monto, op: operacion });

  // Sofia montos validos: 30, 89, 299, 799
  const sofiaMontos = [30, 89, 299, 799];
  if (!sofiaMontos.includes(monto)) {
    await log("MONTO_NO_SOFIA", { monto });
    return NextResponse.json({ ok: false, reason: "monto fuera del rango Sofia", monto });
  }

  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: pagosCandidatos, error: searchErr } = await supabase
    .from("mse_payments")
    .select("*")
    .eq("amount_pen", monto)
    .eq("status", "pending_validation")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(5);

  if (searchErr) {
    await log("DB_ERROR", searchErr.message);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  if (!pagosCandidatos || pagosCandidatos.length === 0) {
    await log("NO_PAGO_PENDIENTE", { monto });
    return NextResponse.json({ ok: false, reason: "no pago pendiente" });
  }

  const pago = pagosCandidatos[0];
  await log("MATCHED", { payment_id: pago.id, phone: pago.phone, plan: pago.plan });

  const { error: updErr } = await supabase
    .from("mse_payments")
    .update({
      status: "validated",
      yape_operation_code: pago.yape_operation_code || operacion,
      validated_at: new Date().toISOString(),
    })
    .eq("id", pago.id);

  if (updErr) {
    await log("UPDATE_ERROR", updErr.message);
    return NextResponse.json({ error: "update error" }, { status: 500 });
  }

  const planEnd = new Date();
  if (pago.billing === "yearly") planEnd.setDate(planEnd.getDate() + 365);
  else planEnd.setDate(planEnd.getDate() + 30);

  await supabase
    .from("mse_users")
    .upsert({
      phone: pago.phone,
      plan: pago.plan,
      billing: pago.billing,
      plan_active_until: planEnd.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "phone" })
    .then(() => {}, () => {});

  // ⭐ Actualizar lead: marcar como pagado + plan info en chat_data
  try {
    const { data: leadCurrent } = await supabase
      .from("mse_whatsapp_leads")
      .select("chat_data")
      .eq("phone", pago.phone)
      .maybeSingle();
    const cd = (leadCurrent?.chat_data as Record<string, unknown>) || {};
    cd.plan = pago.plan;
    cd.billing = pago.billing;
    cd.plan_active_until = planEnd.toISOString();
    cd.amount_pen = monto;
    cd.last_payment_at = new Date().toISOString();
    await supabase
      .from("mse_whatsapp_leads")
      .update({
        chat_data: cd,
        updated_at: new Date().toISOString(),
      })
      .eq("phone", pago.phone);
  } catch (e) {
    console.error("[madrodroid sofia lead update err]", e);
  }

  const planLabel = pago.plan === "premium" ? "Premium" : "Regular";
  const billingLabel = pago.billing === "yearly" ? "anual" : "mensual";

  // Verificar estado del lead — si ya tiene Pacto Cuna sellado, dar instrucciones diferentes
  const { data: lead } = await supabase
    .from("mse_whatsapp_leads")
    .select("chat_state, name, chat_data")
    .eq("phone", pago.phone)
    .maybeSingle();

  const tienePacto = lead?.chat_state === "done" || lead?.chat_state === "dia_uno_sent";
  const primerNombre = (lead?.name as string)?.split(/\s+/)[0] || "";
  const horario = ((lead?.chat_data as Record<string, unknown>)?.preferred_morning_time as string) || "";

  if (tienePacto) {
    // Cliente ya selló Pacto — explicar qué sigue
    await sendText(
      pago.phone,
      `✅ *¡Plan ${planLabel} ${billingLabel} activo${primerNombre ? ", " + primerNombre : ""}!* 💎\n\n` +
      `Pago confirmado: S/${monto} (Op: ${pago.yape_operation_code || operacion})\n\n` +
      `🎧 *Cómo empezar tus clases:*\n\n` +
      `1️⃣ *Audios diarios automáticos* — te llegan ${horario ? "a las " + horario : "en tu horario configurado"} cada día. Solo escucha. No traduzcas.\n\n` +
      `2️⃣ *Práctica live AHORA* — escríbeme cualquier cosa en *inglés o español* y te respondo. Cada conversación es tu lección.\n\n` +
      `3️⃣ *Test de pronunciación* — escribe *pronunciacion* y te puntúo 0-100.\n\n` +
      `4️⃣ *Tu progreso* — escribe *progreso* para ver cómo vas.\n\n` +
      `Dime, *${primerNombre || "amigo"}* — *¿quieres arrancar con un audio de práctica AHORA, o prefieres esperar el de mañana?* 🌟`
    );
  } else {
    // Cliente NO ha sellado Pacto — pedirlo primero
    await sendText(
      pago.phone,
      `✅ *¡Pago confirmado!* Plan ${planLabel} ${billingLabel} S/${monto} 💎\n\n` +
      `Op: ${pago.yape_operation_code || operacion}\n\n` +
      `Para empezar, primero necesito sellar tu *Pacto Cuna* (60 segundos). Te abro el formulario...`
    );
    // Mandar Flow Pacto Cuna
    try {
      const { sendSofiaFlow } = await import("@/lib/miss-sofia-voice/flow-sender");
      await sendSofiaFlow({
        phone: pago.phone,
        flowKey: "pacto-cuna",
        userIdOrPhone: pago.phone,
      });
    } catch (e) {
      console.error("[madrodroid sofia send pacto err]", e);
    }
  }

  return NextResponse.json({
    ok: true,
    matched: true,
    payment_id: pago.id,
    phone: pago.phone,
    monto,
    operacion,
  });
}
