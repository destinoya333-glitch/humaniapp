/**
 * POST /api/yape-detect/[token]
 *
 * Webhook que recibe notificaciones Yape desde el MacroDroid del OPERADOR
 * franquicia (no de Percy). El token único en la URL identifica al operador.
 *
 * Flujo:
 *   1. Validar token → resolver tenant_id del operador
 *   2. Parsear notificación Yape (monto, operación, remitente)
 *   3. Buscar pago pendiente del alumno filtrado por tenant_id en:
 *      - destinoya_pagos (TuDestinoYa)
 *      - mse_payments (Miss Sofia)
 *   4. Si match → procesar con la lógica correspondiente y notificar al alumno
 *   5. Registrar en ay_operador_pagos para reporte mensual del operador
 *   6. Notificar al operador del cobro recibido
 *
 * MacroDroid del operador apunta a:
 *   https://activosya.com/api/yape-detect/{macrodroid_token}
 *
 * Body acepta text/plain, application/json o form-urlencoded con la notif Yape.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/activosya/db";
import { sendText as sendDestinoText } from "@/lib/destinoya/meta-cloud-sender";
import { sendText as sendSofiaText, isMetaCloudConfigured as isSofiaMetaCfg } from "@/lib/miss-sofia-voice/meta-cloud-sender";
import { acumularPago, activarVIP } from "@/lib/destinoya/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const META_PHONE_ID_PLATAFORMA = "1044803088721236"; // EcoDrive+ canal genérico para outbound de plataforma
const META_TOKEN = process.env.ECODRIVE_META_ACCESS_TOKEN || "";

type ParsedYape = {
  amount: number;
  operation: string;
  phone: string | null;
  senderName: string | null;
};

function parseYapeText(text: string): ParsedYape | null {
  const amountMatch = text.match(/S\/\s?(\d+\.?\d*)/);
  if (!amountMatch) return null;
  const opMatch = text.match(/(?:operaci[oó]n|oper[.#]?)[:\s]*([0-9]{5,12})/i);
  const operation = opMatch ? opMatch[1] : `OP${Date.now().toString().slice(-6)}`;
  const phoneMatch = text.match(/\b51(\d{9})\b|\b(\d{9})\b/);
  const phone = phoneMatch ? `+51${phoneMatch[1] || phoneMatch[2]}` : null;
  const nameMatch = text.match(/Yape!?\s+([A-ZÁÉÍÓÚÑ\s]+?)\s+te env/i);
  const senderName = nameMatch ? nameMatch[1].trim() : null;
  return { amount: parseFloat(amountMatch[1]), operation, phone, senderName };
}

async function readBodyAsText(req: NextRequest): Promise<{ text: string; raw: string }> {
  const contentType = req.headers.get("content-type") || "";
  const raw = await req.text();
  if (!raw) return { text: "", raw };
  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(raw);
      const text = json.mensaje || json.text || json.body || json.message || json.notification_text || JSON.stringify(json);
      return { text: String(text), raw };
    } catch {
      return { text: raw, raw };
    }
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const text = params.get("mensaje") || params.get("text") || params.get("body") || params.get("message") || params.get("notification_text") || raw;
    return { text, raw };
  }
  return { text: raw, raw };
}

async function notifyAdminPlatform(body: string): Promise<void> {
  // Redirige a ActivosYA central
  try {
    const { notifyActivosYA } = await import("@/lib/activosya-central/notify");
    let tipo: "yape_confirmado" | "error_bot" = "yape_confirmado";
    if (/error|fall/i.test(body)) tipo = "error_bot";
    await notifyActivosYA({ tipo, servicio: "activosya", mensaje_corto: body });
  } catch (e) {
    console.error("[yape-detect notifyAdmin->ay]", (e as Error).message);
  }
}

async function notifyOperador(operadorWA: string, body: string): Promise<void> {
  if (!META_TOKEN || !operadorWA) return;
  try {
    await fetch(`https://graph.facebook.com/v22.0/${META_PHONE_ID_PLATAFORMA}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: operadorWA,
        type: "text",
        text: { body },
      }),
    });
  } catch (e) {
    console.error("[yape-detect notifyOperador]", (e as Error).message);
  }
}

type Operador = {
  id: string;
  name: string;
  whatsapp_personal: string;
  yape_numero: string;
  status: string;
};

/**
 * Buscar pago pendiente TuDestinoYa filtrado por tenant_id del operador.
 * Prioriza match por celular, fallback por monto + ventana 60min.
 */
async function buscarPagoDestinoTenant(
  tenantId: string,
  monto: number,
  celular: string | null,
): Promise<{ id: string; celular: string; monto: number; monto_pagado: number; servicio: string } | null> {
  // 1) por celular
  if (celular) {
    const { data } = await supabaseAdmin
      .from("destinoya_pagos")
      .select("*")
      .eq("celular", celular)
      .eq("tenant_id", tenantId)
      .eq("estado", "esperando_pago")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  // 2) por monto + ventana 60min
  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("destinoya_pagos")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("monto", monto)
    .eq("estado", "esperando_pago")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/**
 * Buscar pago pendiente Miss Sofia filtrado por tenant_id del operador.
 * Prioriza match por código operación, fallback por monto + ventana 60min.
 */
async function buscarPagoSofiaTenant(
  tenantId: string,
  monto: number,
  operacion: string,
): Promise<{ id: string; user_id: string | null; phone: string | null; plan: string; billing: string; amount_pen: number; status: string } | null> {
  // 1) por código de operación
  const { data: byOp } = await supabaseAdmin
    .from("mse_payments")
    .select("id, user_id, phone, plan, billing, amount_pen, status")
    .eq("tenant_id", tenantId)
    .eq("yape_operation_code", operacion)
    .eq("status", "pending_validation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byOp) return byOp;
  // 2) por monto + ventana
  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("mse_payments")
    .select("id, user_id, phone, plan, billing, amount_pen, status")
    .eq("tenant_id", tenantId)
    .eq("amount_pen", monto)
    .eq("status", "pending_validation")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function planExpiryFromBilling(billing: string, fromIso?: string): string {
  const base = fromIso ? new Date(fromIso) : new Date();
  const days = billing === "yearly" ? 365 : 30;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // ─── 1. Validar token y resolver operador ────────────────────────────────
  if (!token || token.length < 24) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const { data: tenant } = await supabaseAdmin
    .from("ay_tenants")
    .select("id, name, whatsapp_personal, yape_numero, status, type")
    .eq("macrodroid_token", token)
    .eq("type", "operador")
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ error: "Token no reconocido" }, { status: 401 });
  }
  if (tenant.status !== "active") {
    return NextResponse.json(
      { error: `Operador en estado ${tenant.status} — no se procesa el pago` },
      { status: 403 },
    );
  }

  const operador = tenant as Operador;

  // ─── 2. Leer body Yape ───────────────────────────────────────────────────
  const { text, raw } = await readBodyAsText(req);
  if (!text) {
    return NextResponse.json({ error: "body vacío" }, { status: 400 });
  }
  const parsed = parseYapeText(text);
  if (!parsed) {
    return NextResponse.json({ error: "No se detectó monto en la notificación Yape", text: text.slice(0, 200) }, { status: 400 });
  }

  // ─── 3a. Buscar pago pendiente TuDestinoYa ───────────────────────────────
  const pagoDestino = await buscarPagoDestinoTenant(operador.id, parsed.amount, parsed.phone);

  // ─── 3b. Buscar pago pendiente Miss Sofia ────────────────────────────────
  const pagoSofia = !pagoDestino
    ? await buscarPagoSofiaTenant(operador.id, parsed.amount, parsed.operation)
    : null;

  // ─── 4a. Procesar pago TuDestinoYa ───────────────────────────────────────
  if (pagoDestino) {
    const celularFinal = pagoDestino.celular;
    const montoEsperado = Number(pagoDestino.monto);
    const yaPagado = Number(pagoDestino.monto_pagado || 0);
    const acumulado = yaPagado + parsed.amount;

    await acumularPago(pagoDestino.id, parsed.amount, parsed.operation);

    // Registrar en historial del operador
    await supabaseAdmin.from("ay_operador_pagos").insert({
      tenant_id: operador.id,
      tipo: "pago_alumno",
      monto_pen: parsed.amount,
      yape_operacion: parsed.operation,
      yape_numero_origen: parsed.phone ?? null,
      yape_nombre_origen: parsed.senderName ?? null,
      alumno_phone: celularFinal,
      asset_slug: "tudestinoya",
      servicio_id: pagoDestino.id,
      detectado_via: "macrodroid",
      validado: true,
    });

    if (acumulado >= montoEsperado) {
      // Pago completo → confirmar al alumno
      const servicioStr = String(pagoDestino.servicio || "");
      const [categoria, subRaw] = servicioStr.includes(":") ? servicioStr.split(":", 2) : ["", servicioStr];

      // VIP: activación inmediata
      if (categoria === "vip") {
        const planVip = subRaw === "vip_anual" || /anual/i.test(subRaw) ? "anual" : "mensual";
        try {
          await activarVIP(celularFinal, planVip);
        } catch (e) {
          console.error("[yape-detect activarVIP]", (e as Error).message);
        }
      }

      try {
        await sendDestinoText(
          celularFinal,
          `✅ *¡Pago confirmado!* S/${montoEsperado} 💫\n\nTe atiendo en un momento ✨`,
        );
      } catch (e) {
        console.error("[yape-detect sendDestino]", (e as Error).message);
      }

      // Notificar al operador
      await notifyOperador(
        operador.whatsapp_personal,
        `💰 *Cobro confirmado* — S/${montoEsperado}\n\n` +
          `Cliente: ${celularFinal}\n` +
          `Servicio: ${servicioStr}\n` +
          `Op Yape: ${parsed.operation}\n\n` +
          `_Sofia/Destino le confirmó automáticamente al cliente._`,
      );

      return NextResponse.json({
        ok: true,
        action: "destino_pago_confirmado",
        operador_id: operador.id,
        alumno: celularFinal,
        monto: parsed.amount,
      });
    } else {
      // Pago parcial
      const falta = (montoEsperado - acumulado).toFixed(2);
      try {
        await sendDestinoText(
          celularFinal,
          `⚠️ Recibí tu Yape de S/${parsed.amount}.\n\nEl servicio cuesta S/${montoEsperado}. Te faltan *S/${falta}* para activar 🙏`,
        );
      } catch {}
      return NextResponse.json({ ok: true, action: "destino_pago_parcial", falta });
    }
  }

  // ─── 4b. Procesar pago Miss Sofia ────────────────────────────────────────
  if (pagoSofia) {
    const expectedAmount = Number(pagoSofia.amount_pen);
    if (parsed.amount < expectedAmount) {
      const falta = (expectedAmount - parsed.amount).toFixed(2);
      if (isSofiaMetaCfg() && pagoSofia.phone) {
        try {
          await sendSofiaText(
            pagoSofia.phone,
            `⚠️ Recibí tu Yape de S/${parsed.amount}. Tu plan cuesta S/${expectedAmount}. Te faltan S/${falta}.`,
          );
        } catch {}
      }
      return NextResponse.json({ ok: true, action: "sofia_underpaid", expected: expectedAmount, got: parsed.amount });
    }

    const nowIso = new Date().toISOString();
    const expiresAt = planExpiryFromBilling(pagoSofia.billing, nowIso);

    await supabaseAdmin
      .from("mse_payments")
      .update({
        status: "validated",
        validated_at: nowIso,
        yape_operation_code: parsed.operation,
        metadata: { sender_name: parsed.senderName, paid_amount: parsed.amount, source: "operador_macrodroid" },
      })
      .eq("id", pagoSofia.id);

    let userId = pagoSofia.user_id;
    if (!userId && pagoSofia.phone) {
      const { data: u } = await supabaseAdmin
        .from("mse_users")
        .select("id")
        .eq("whatsapp_phone", pagoSofia.phone)
        .maybeSingle();
      userId = u?.id ?? null;
    }
    if (userId) {
      await supabaseAdmin
        .from("mse_users")
        .update({
          plan: pagoSofia.plan,
          plan_started_at: nowIso,
          plan_expires_at: expiresAt,
          tenant_id: operador.id,
        })
        .eq("id", userId);
    }

    await supabaseAdmin.from("ay_operador_pagos").insert({
      tenant_id: operador.id,
      tipo: "pago_alumno",
      monto_pen: parsed.amount,
      yape_operacion: parsed.operation,
      yape_numero_origen: parsed.phone ?? null,
      yape_nombre_origen: parsed.senderName ?? null,
      alumno_phone: pagoSofia.phone,
      asset_slug: "miss-sofia",
      servicio_id: pagoSofia.id,
      detectado_via: "macrodroid",
      validado: true,
    });

    if (isSofiaMetaCfg() && pagoSofia.phone) {
      const planName = pagoSofia.plan === "premium" ? "Sofia Cuna VIP" : "Sofia Cuna";
      const billingLabel = pagoSofia.billing === "yearly" ? "anual" : "mensual";
      const expiresLima = new Date(expiresAt).toLocaleDateString("es-PE", { timeZone: "America/Lima" });
      try {
        await sendSofiaText(
          pagoSofia.phone,
          `✅ Recibí tu Yape de S/${parsed.amount}.\n\nTu plan *${planName}* (${billingLabel}) está activo hasta el *${expiresLima}*.\n\nEntra a tu chat con Sofia y arrancamos.`,
        );
      } catch {}
    }

    await notifyOperador(
      operador.whatsapp_personal,
      `💰 *Cobro Miss Sofia confirmado* — S/${parsed.amount}\n\n` +
        `Alumno: ${pagoSofia.phone}\n` +
        `Plan: ${pagoSofia.plan} (${pagoSofia.billing})\n` +
        `Op Yape: ${parsed.operation}\n\n` +
        `_Plan activado hasta ${new Date(expiresAt).toLocaleDateString("es-PE")}._`,
    );

    return NextResponse.json({
      ok: true,
      action: "sofia_validated",
      operador_id: operador.id,
      payment_id: pagoSofia.id,
      plan: pagoSofia.plan,
    });
  }

  // ─── 5. NO MATCH: registrar como saldo pendiente y avisar al operador ────
  await supabaseAdmin.from("ay_operador_pagos").insert({
    tenant_id: operador.id,
    tipo: "pago_alumno",
    monto_pen: parsed.amount,
    yape_operacion: parsed.operation,
    yape_numero_origen: parsed.phone ?? null,
    yape_nombre_origen: parsed.senderName ?? null,
    asset_slug: null,
    detectado_via: "macrodroid",
    validado: false,
    metadata: { reason: "no_pago_pendiente_match", raw_text: text.slice(0, 500) },
  });

  await notifyOperador(
    operador.whatsapp_personal,
    `🔔 *Yape recibido sin match automático*\n\n` +
      `Monto: S/${parsed.amount}\n` +
      `${parsed.senderName ? `De: ${parsed.senderName}\n` : ""}` +
      `${parsed.phone ? `Tel: ${parsed.phone}\n` : ""}` +
      `Op: ${parsed.operation}\n\n` +
      `_Tu sistema no encontró un servicio pendiente con este monto en los últimos 60 min. Si es válido, atiende a tu cliente manualmente._`,
  );

  await notifyAdminPlatform(
    `⚠️ yape-detect NO_MATCH operador ${operador.name}\n` +
      `Monto S/${parsed.amount} op ${parsed.operation}\n` +
      `Raw: ${text.slice(0, 200)}`,
  );

  return NextResponse.json({
    ok: true,
    action: "no_match",
    operador_id: operador.id,
    monto: parsed.amount,
    raw_preview: text.slice(0, 100),
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Healthcheck que el operador puede usar para verificar que su MacroDroid apunta bien
  const { data: tenant } = await supabaseAdmin
    .from("ay_tenants")
    .select("id, name, status")
    .eq("macrodroid_token", token)
    .eq("type", "operador")
    .maybeSingle();
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "Token no reconocido" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    operador: tenant.name,
    status: tenant.status,
    endpoint: "yape-detect",
    method: "POST",
    description: "Webhook MacroDroid del operador franquicia. POST con body raw de la notificación Yape.",
  });
}
