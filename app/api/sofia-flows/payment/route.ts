/**
 * POST /api/sofia-flows/payment
 *
 * Receives the submit of WhatsApp Flow #3 — Pago Pro/Elite.
 *
 * Body:
 *   {
 *     phone: string,                 // E.164, required (lead identifier)
 *     user_id?: string,              // optional, set if user already registered
 *     plan: 'cuna' | 'cuna_vip',
 *     billing: 'monthly' | 'yearly',
 *     yape_operation_code?: string   // optional at this point — MacroDroid validates later
 *   }
 *
 * Effect:
 *   - Inserts into mse_payments with status='pending_validation'
 *   - Returns expected amount + Yape destination so the user knows what to pay
 *
 * Validation flow (separate, NOT here):
 *   - MacroDroid Android del operador detecta notificación Yape
 *   - Llama webhook que matchea por monto + (opcionalmente) código operación
 *   - Marca el payment como 'validated' y activa el plan en mse_users
 *
 * Returns:
 *   { ok, payment_id, amount_pen, yape_destination, message }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Pricing — single source of truth (en sync con landing page.tsx)
const PRICING: Record<string, Record<string, number>> = {
  regular: { monthly: 39, yearly: 349 },
  premium: { monthly: 89, yearly: 799 },
  // Legacy keys aliased to new ones (backwards compat)
  cuna: { monthly: 39, yearly: 349 },
  cuna_vip: { monthly: 89, yearly: 799 },
};

// Default Yape (Percy master) — usado solo si el alumno NO viene de un operador franquicia
const YAPE_DEFAULT = {
  number: "998 102 258",
  name: "Percy Roj*",
};

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

/**
 * Multi-tenant: dado el phone del alumno, busca a qué operador pertenece y
 * devuelve SU Yape personal. Si el alumno no viene de un operador franquicia,
 * devuelve el Yape default de Percy (legacy/master).
 *
 * Source of truth: mse_whatsapp_leads.tenant_id (lead) o mse_users.tenant_id (registrado).
 */
async function resolveYapeForAlumno(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  phone: string,
): Promise<{ number: string; name: string; tenant_id: string | null }> {
  // 1) Intentar por mse_whatsapp_leads (que ya se etiquetó con tenant_id en F3 cuando llegó el msg)
  const { data: lead } = await supabase
    .from("mse_whatsapp_leads")
    .select("tenant_id")
    .eq("phone", phone)
    .maybeSingle();

  let tenantId: string | null = (lead as { tenant_id?: string | null } | null)?.tenant_id ?? null;

  // 2) Fallback: por mse_users si el alumno ya está registrado
  if (!tenantId) {
    const { data: user } = await supabase
      .from("mse_users")
      .select("tenant_id")
      .eq("whatsapp_phone", phone)
      .maybeSingle();
    tenantId = (user as { tenant_id?: string | null } | null)?.tenant_id ?? null;
  }

  if (!tenantId) {
    return { ...YAPE_DEFAULT, tenant_id: null };
  }

  // Resolver Yape del operador
  const { data: tenant } = await supabase
    .from("ay_tenants")
    .select("name, yape_numero, status")
    .eq("id", tenantId)
    .maybeSingle();

  const t = tenant as { name?: string; yape_numero?: string | null; status?: string } | null;
  if (!t || !t.yape_numero || t.status !== "active") {
    // Operador no activo o sin Yape configurado → fallback a default Percy
    return { ...YAPE_DEFAULT, tenant_id: null };
  }

  // Formato bonito: 51999111111 → "999 111 111"
  const last9 = t.yape_numero.startsWith("51") ? t.yape_numero.slice(2) : t.yape_numero;
  const display = `${last9.slice(0, 3)} ${last9.slice(3, 6)} ${last9.slice(6, 9)}`;

  return {
    number: display,
    name: t.name ?? "Tu operador",
    tenant_id: tenantId,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const phone = normalizePhone(body.phone);
    const userId: string | undefined = body.user_id;
    const plan: string | undefined = body.plan;
    const billing: string | undefined = body.billing;
    const yapeOperationCode: string | undefined = body.yape_operation_code;

    if (!phone) return NextResponse.json({ error: "phone required (E.164)" }, { status: 400 });
    if (!plan || !PRICING[plan]) {
      return NextResponse.json(
        { error: "plan must be 'regular' or 'premium'" },
        { status: 400 }
      );
    }
    // Normalize legacy keys to new ones for DB insert
    const normalizedPlan = plan === "cuna" ? "regular" : plan === "cuna_vip" ? "premium" : plan;
    if (!billing || !PRICING[plan][billing]) {
      return NextResponse.json(
        { error: "billing must be 'monthly' or 'yearly'" },
        { status: 400 }
      );
    }

    const amount = PRICING[plan][billing];

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Multi-tenant: resolver el Yape del operador correcto (o default Percy)
    const yape = await resolveYapeForAlumno(supabase, phone);

    const { data: payment, error } = await supabase
      .from("mse_payments")
      .insert({
        user_id: userId ?? null,
        phone,
        plan: normalizedPlan,
        billing,
        amount_pen: amount,
        yape_operation_code: yapeOperationCode?.trim() || null,
        status: "pending_validation",
        tenant_id: yape.tenant_id, // F3b: atribuye el pago al operador franquicia
        metadata: { source: "whatsapp_flow" },
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      payment_id: payment.id,
      amount_pen: amount,
      currency: "PEN",
      yape_destination: { number: yape.number, name: yape.name },
      message: `Yapea S/${amount} a ${yape.name} (${yape.number}). Tu plan se activa en minutos cuando confirmemos el pago.`,
    });
  } catch (e) {
    console.error("sofia-flows/payment error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
