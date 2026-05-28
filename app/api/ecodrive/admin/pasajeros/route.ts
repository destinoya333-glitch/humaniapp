import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/ecodrive/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status") || "pending";
  const { data, error } = await db()
    .from("eco_pasajeros")
    .select("id,wa_id,nombre,dni,edad,status,created_at,approved_at,rejection_reason")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    id: string;
    action: "approve" | "reject" | "suspend" | "reactivate" | "refund";
    reason?: string;
    amount?: number;
    descripcion?: string;
  };
  if (!body.id || !body.action) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const sb = db();

  // refund: insertar wallet_transaction y actualizar wallet
  if (body.action === "refund") {
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount_required" }, { status: 400 });
    }
    const { data: pas } = await sb
      .from("eco_pasajeros")
      .select("wa_id")
      .eq("id", body.id)
      .single();
    if (!pas?.wa_id) {
      return NextResponse.json({ error: "pasajero_not_found" }, { status: 404 });
    }
    const telefono = pas.wa_id;

    const { data: wallet } = await sb
      .from("wallets")
      .select("saldo_disponible")
      .eq("telefono", telefono)
      .maybeSingle();
    const saldoAntes = Number(wallet?.saldo_disponible) || 0;
    const saldoDespues = saldoAntes + amount;

    if (!wallet) {
      await sb.from("wallets").insert({ telefono, saldo_disponible: saldoDespues });
    } else {
      await sb.from("wallets").update({ saldo_disponible: saldoDespues }).eq("telefono", telefono);
    }

    const { error: txErr } = await sb.from("wallet_transactions").insert({
      telefono,
      tipo: "refund_admin",
      monto: amount,
      saldo_despues: saldoDespues,
      descripcion: body.descripcion || body.reason || "Devolucion admin",
    });
    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, refund: { telefono, amount, saldo_despues: saldoDespues } });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.action === "approve" || body.action === "reactivate") {
    update.status = "approved";
    update.approved_at = new Date().toISOString();
    update.approved_by = "admin";
    update.rejection_reason = null;
  } else if (body.action === "reject") {
    update.status = "rejected";
    update.rejection_reason = body.reason || "Sin razon especificada";
  } else if (body.action === "suspend") {
    update.status = "suspended";
    update.rejection_reason = body.reason || "Sin razon";
  }

  const { error } = await sb.from("eco_pasajeros").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
