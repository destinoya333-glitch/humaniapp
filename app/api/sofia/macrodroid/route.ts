/**
 * POST /api/sofia/macrodroid
 *
 * Webhook que recibe notificaciones Yape desde MacroDroid Android del operador
 * y valida pagos pendientes registrados via /api/sofia-flows/payment.
 *
 * Patrón heredado de /api/destinoya/madrodroid pero adaptado a Sofia:
 *   - Sofia es subscription (no servicios pay-per-use). Match exacto por monto.
 *   - Activa el plan en mse_users con fecha de expiración (30d monthly, 365d yearly).
 *   - Notifica al user via Meta Cloud (sender Sofia direct).
 *
 * MacroDroid manda el body raw de la notificación Yape. El parser tolera:
 *   - text/plain (default Android)
 *   - application/x-www-form-urlencoded con campos {mensaje|text|body|message}
 *   - application/json idem
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sendText, isMetaCloudConfigured } from "@/lib/miss-sofia-voice/meta-cloud-sender";

export const runtime = "nodejs";

const MATCH_WINDOW_MINUTES = 60;

function getClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function planExpiryFromBilling(billing: string, fromIso?: string): string {
  const base = fromIso ? new Date(fromIso) : new Date();
  const days = billing === "yearly" ? 365 : 30;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

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

async function readBodyAsText(req: NextRequest): Promise<{ text: string; raw: string; contentType: string }> {
  const contentType = req.headers.get("content-type") || "";
  const raw = await req.text();
  if (!raw) return { text: "", raw, contentType };

  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(raw);
      const text =
        json.mensaje || json.text || json.body || json.message || json.notification_text || JSON.stringify(json);
      return { text: String(text), raw, contentType };
    } catch {
      return { text: raw, raw, contentType };
    }
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const text =
      params.get("mensaje") ||
      params.get("text") ||
      params.get("body") ||
      params.get("message") ||
      params.get("notification_text") ||
      raw;
    return { text, raw, contentType };
  }
  return { text: raw, raw, contentType };
}

export async function POST(req: NextRequest) {
  const supabase = getClient();
  const { text, raw, contentType } = await readBodyAsText(req);

  const logRow = {
    raw_body: raw,
    parsed: { contentType } as Record<string, unknown>,
    result: "" as string,
    payment_id: null as string | null,
  };

  if (!text) {
    logRow.result = "ERROR: empty body";
    await supabase.from("mse_macrodroid_log").insert(logRow);
    return NextResponse.json({ error: "empty body" }, { status: 400 });
  }

  const parsed = parseYapeText(text);
  if (!parsed) {
    logRow.result = "ERROR: no amount detected";
    logRow.parsed = { ...logRow.parsed, text: text.slice(0, 300) };
    await supabase.from("mse_macrodroid_log").insert(logRow);
    return NextResponse.json({ error: "no amount detected", text: text.slice(0, 200) }, { status: 400 });
  }

  logRow.parsed = { ...logRow.parsed, ...parsed };

  // Buscar pago pendiente: prioriza match por código operación, luego por monto+ventana.
  const sinceIso = new Date(Date.now() - MATCH_WINDOW_MINUTES * 60 * 1000).toISOString();

  let { data: payment } = await supabase
    .from("mse_payments")
    .select("id, user_id, phone, plan, billing, amount_pen, status")
    .eq("yape_operation_code", parsed.operation)
    .eq("status", "pending_validation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) {
    const { data } = await supabase
      .from("mse_payments")
      .select("id, user_id, phone, plan, billing, amount_pen, status")
      .eq("amount_pen", parsed.amount)
      .eq("status", "pending_validation")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    payment = data ?? null;
  }

  if (!payment) {
    logRow.result = `NO_MATCH amount=${parsed.amount} op=${parsed.operation}`;
    await supabase.from("mse_macrodroid_log").insert(logRow);
    return NextResponse.json({
      ok: false,
      action: "no_match",
      reason: `No hay pago pendiente con monto S/${parsed.amount} ni código ${parsed.operation} en últimos ${MATCH_WINDOW_MINUTES} min`,
      parsed,
    });
  }

  const expectedAmount = Number(payment.amount_pen);
  if (parsed.amount < expectedAmount) {
    logRow.result = `UNDERPAID expected=${expectedAmount} got=${parsed.amount}`;
    logRow.payment_id = payment.id;
    await supabase.from("mse_macrodroid_log").insert(logRow);
    if (isMetaCloudConfigured() && payment.phone) {
      const falta = (expectedAmount - parsed.amount).toFixed(2);
      await sendText(
        payment.phone,
        `⚠️ Recibí tu Yape de S/${parsed.amount}. Tu plan cuesta S/${expectedAmount}. Te faltan S/${falta} para activarlo. Yapea la diferencia y queda listo.`
      );
    }
    return NextResponse.json({ ok: true, action: "underpaid", expected: expectedAmount, got: parsed.amount });
  }

  // Match válido — activar plan.
  const nowIso = new Date().toISOString();
  const expiresAt = planExpiryFromBilling(payment.billing, nowIso);

  const { error: updPayErr } = await supabase
    .from("mse_payments")
    .update({
      status: "validated",
      validated_at: nowIso,
      yape_operation_code: parsed.operation,
      metadata: { sender_name: parsed.senderName, paid_amount: parsed.amount },
    })
    .eq("id", payment.id);
  if (updPayErr) {
    logRow.result = `DB_ERROR_PAYMENT ${updPayErr.message}`;
    logRow.payment_id = payment.id;
    await supabase.from("mse_macrodroid_log").insert(logRow);
    return NextResponse.json({ error: "db error updating payment" }, { status: 500 });
  }

  // Activar plan en mse_users. Si no hay user_id, intentamos por phone.
  let userId = payment.user_id as string | null;
  if (!userId && payment.phone) {
    const { data: u } = await supabase
      .from("mse_users")
      .select("id")
      .eq("whatsapp_phone", payment.phone)
      .maybeSingle();
    userId = u?.id ?? null;
  }

  if (userId) {
    const { error: updUserErr } = await supabase
      .from("mse_users")
      .update({
        plan: payment.plan,
        plan_started_at: nowIso,
        plan_expires_at: expiresAt,
      })
      .eq("id", userId);
    if (updUserErr) {
      logRow.result = `DB_ERROR_USER ${updUserErr.message}`;
      logRow.payment_id = payment.id;
      await supabase.from("mse_macrodroid_log").insert(logRow);
      return NextResponse.json({ error: "db error updating user" }, { status: 500 });
    }
  }

  // Notificar al user.
  if (isMetaCloudConfigured() && payment.phone) {
    const planName = payment.plan === "premium" ? "Sofia Cuna VIP" : "Sofia Cuna";
    const billingLabel = payment.billing === "yearly" ? "anual" : "mensual";
    const expiresLima = new Date(expiresAt).toLocaleDateString("es-PE", { timeZone: "America/Lima" });
    const userPart = userId
      ? `Tu plan *${planName}* (${billingLabel}) está activo hasta el *${expiresLima}*.`
      : `Tu pago quedó registrado. Crea tu cuenta en https://activosya.com/sofia-auth/signup para activar tu plan *${planName}*.`;
    await sendText(
      payment.phone,
      `✅ Recibí tu Yape de S/${parsed.amount}, gracias.\n\n${userPart}\n\nEntra a tu chat con Sofia y arrancamos.`
    );
  }

  logRow.result = userId ? "VALIDATED_AND_ACTIVATED" : "VALIDATED_NO_USER";
  logRow.payment_id = payment.id;
  await supabase.from("mse_macrodroid_log").insert(logRow);

  return NextResponse.json({
    ok: true,
    action: "validated",
    payment_id: payment.id,
    plan: payment.plan,
    billing: payment.billing,
    plan_expires_at: expiresAt,
    user_activated: Boolean(userId),
  });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "sofia/macrodroid",
    method: "POST",
    description: "Webhook MacroDroid Yape validator. Acepta text/json/form con la notificación Yape raw.",
  });
}
