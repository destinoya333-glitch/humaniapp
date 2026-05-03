/**
 * GET /api/cron/cuna-daily-tick
 *
 * Vercel Cron job (1x/day @ 10:00 UTC = 5:00 AM Lima).
 * Recalcula phase_day de todos los estudiantes Cuna desde phase_started_at.
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}` que Vercel envía
 * automáticamente cuando CRON_SECRET está configurado en env vars.
 *
 * Self-healing: la función SQL recalcula desde phase_started_at, así que
 * si el cron pierde un día, al día siguiente el valor queda correcto.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // En producción siempre requerimos el secret. En dev (sin CRON_SECRET seteado)
  // se permite para debugging local — no es problema porque el endpoint es
  // idempotente.
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.rpc("cuna_daily_tick");
  if (error) {
    console.error("cuna_daily_tick RPC error:", error);
    return NextResponse.json(
      { error: "rpc_failed", message: error.message },
      { status: 500 }
    );
  }

  // RPC returns an array with a single row { updated_users, max_phase_day }
  const row = Array.isArray(data) && data.length > 0 ? data[0] : { updated_users: 0, max_phase_day: 0 };

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    updated_users: row.updated_users ?? 0,
    max_phase_day: row.max_phase_day ?? 0,
  });
}
