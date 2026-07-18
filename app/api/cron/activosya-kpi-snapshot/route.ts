/**
 * GET /api/cron/activosya-kpi-snapshot
 * Cron diario que corre 5:00 AM Lima (10 UTC).
 * Pre-calcula KPIs del día anterior y los guarda en ay_kpi_snapshots
 * para que los reportes /reporte hoy|semana|mes sean instantáneos.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SERVICIOS = ["destinoya", "sofia", "cuento", "ecodrive", "choferya", "activosya"] as const;

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = db();
  // Calculamos snapshot del día previo (Lima time)
  const ahora = new Date();
  const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
  const inicio = new Date(ayer.getTime() - 5 * 60 * 60 * 1000);
  inicio.setUTCHours(5, 0, 0, 0); // 5 UTC = 00:00 Lima
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  const fechaLima = inicio.toISOString().slice(0, 10);

  const { data: eventos, error } = await supabase
    .from("ay_eventos")
    .select("tipo, servicio, monto")
    .gte("created_at", inicio.toISOString())
    .lt("created_at", fin.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stats: Record<string, { ingresos: number; clientes: number; pagos: number; errores: number }> = {};
  for (const s of SERVICIOS) stats[s] = { ingresos: 0, clientes: 0, pagos: 0, errores: 0 };

  for (const e of eventos ?? []) {
    const s = e.servicio;
    if (!stats[s]) continue;
    if (e.tipo === "yape_confirmado" || e.tipo === "plan_activado" || e.tipo === "plan_renovado") {
      stats[s].ingresos += Number(e.monto || 0);
      stats[s].pagos++;
    }
    if (e.tipo === "cliente_nuevo" || e.tipo === "lead_b2b") stats[s].clientes++;
    if (e.tipo === "error_bot") stats[s].errores++;
  }

  // Upsert por (fecha, servicio)
  const rows = SERVICIOS.map((s) => ({
    fecha: fechaLima,
    servicio: s,
    ingresos_dia: stats[s].ingresos,
    clientes_nuevos: stats[s].clientes,
    pagos_count: stats[s].pagos,
    errores_count: stats[s].errores,
  }));

  const { error: upsertErr } = await supabase
    .from("ay_kpi_snapshots")
    .upsert(rows, { onConflict: "fecha,servicio" });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    fecha: fechaLima,
    servicios_procesados: rows.length,
    eventos_consultados: eventos?.length ?? 0,
    stats,
  });
}
