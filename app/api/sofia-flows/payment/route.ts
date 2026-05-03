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
  cuna: { monthly: 49, yearly: 449 },
  cuna_vip: { monthly: 89, yearly: 799 },
};

const YAPE_DESTINATION = {
  number: "998 102 258",
  name: "Percy Roj*",
};

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
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
        { error: "plan must be 'cuna' or 'cuna_vip'" },
        { status: 400 }
      );
    }
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

    const { data: payment, error } = await supabase
      .from("mse_payments")
      .insert({
        user_id: userId ?? null,
        phone,
        plan,
        billing,
        amount_pen: amount,
        yape_operation_code: yapeOperationCode?.trim() || null,
        status: "pending_validation",
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
      yape_destination: YAPE_DESTINATION,
      message: `Yapea S/${amount} a ${YAPE_DESTINATION.name} (${YAPE_DESTINATION.number}). Tu plan se activa en minutos cuando confirmemos el pago.`,
    });
  } catch (e) {
    console.error("sofia-flows/payment error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
