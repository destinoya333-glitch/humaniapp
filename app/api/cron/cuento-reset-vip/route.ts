/**
 * TuCuentoYa — Cron mensual: reset contador VIP.
 *
 * Vercel Cron: día 1 de cada mes 10am Lima.
 * Para cada VIP activo, resetea `cuentos_used_mes` a 0 y actualiza `mes_reset_at`.
 * También desactiva VIPs cuyo `fecha_vencimiento` ya pasó.
 */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/cuentoinfantil/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Protección básica: Vercel cron envía Authorization header con CRON_SECRET
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  if (expected && auth !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  let resetCount = 0;
  let deactivatedCount = 0;

  try {
    // 1. Desactivar VIPs vencidos
    const { data: vencidos } = await supabase
      .from("tci_vip")
      .update({ activo: false })
      .lt("fecha_vencimiento", now)
      .eq("activo", true)
      .select("id");
    deactivatedCount = vencidos?.length ?? 0;

    // 2. Reset contador mensual de VIPs activos
    const { data: reseteados } = await supabase
      .from("tci_vip")
      .update({
        cuentos_used_mes: 0,
        mes_reset_at: now,
      })
      .eq("activo", true)
      .gt("fecha_vencimiento", now)
      .select("id");
    resetCount = reseteados?.length ?? 0;

    return NextResponse.json({
      ok: true,
      reset: resetCount,
      deactivated: deactivatedCount,
      timestamp: now,
    });
  } catch (e) {
    console.error("[cron cuento-reset-vip err]", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
