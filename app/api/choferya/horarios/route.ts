import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyChoferPanelToken } from "@/lib/activosya/choferya-token";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function auth(req: NextRequest):
  | { ok: true; choferId: string }
  | { ok: false; status: number; msg: string } {
  const token = new URL(req.url).searchParams.get("token") || req.headers.get("x-choferya-token");
  if (!token) return { ok: false, status: 401, msg: "token requerido" };
  const v = verifyChoferPanelToken(token);
  if (!v.ok) return { ok: false, status: 401, msg: `token: ${v.reason}` };
  return { ok: true, choferId: v.choferId };
}

// GET — lista horarios
export async function GET(req: NextRequest) {
  const a = auth(req);
  if (!a.ok) return NextResponse.json({ error: a.msg }, { status: a.status });
  const { data, error } = await db()
    .from("choferya_horarios")
    .select("dia_semana, hora_inicio, hora_fin")
    .eq("chofer_id", a.choferId)
    .order("dia_semana")
    .order("hora_inicio");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, horarios: data || [] });
}

/**
 * PUT — reemplaza TODOS los horarios del chofer atómicamente.
 * Body: { horarios: [{ dia_semana, hora_inicio, hora_fin }, ...] }
 * Más simple que CRUD por slot y evita inconsistencias.
 */
export async function PUT(req: NextRequest) {
  const a = auth(req);
  if (!a.ok) return NextResponse.json({ error: a.msg }, { status: a.status });

  const body = await req.json();
  const horarios = body.horarios;
  if (!Array.isArray(horarios))
    return NextResponse.json({ error: "horarios debe ser array" }, { status: 400 });

  // Validar cada slot
  for (const h of horarios) {
    if (!Number.isInteger(h.dia_semana) || h.dia_semana < 0 || h.dia_semana > 6)
      return NextResponse.json({ error: "dia_semana 0-6" }, { status: 400 });
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(h.hora_inicio) || !/^\d{2}:\d{2}(:\d{2})?$/.test(h.hora_fin))
      return NextResponse.json({ error: "horas formato HH:MM" }, { status: 400 });
    if (h.hora_fin <= h.hora_inicio)
      return NextResponse.json({ error: "hora_fin debe ser mayor que hora_inicio" }, { status: 400 });
  }

  const sb = db();
  // Borrar todos los slots actuales del chofer y reinsertar
  const { error: errDel } = await sb.from("choferya_horarios").delete().eq("chofer_id", a.choferId);
  if (errDel) return NextResponse.json({ error: errDel.message }, { status: 500 });

  if (horarios.length === 0) return NextResponse.json({ ok: true, count: 0 });

  const rows = horarios.map((h: { dia_semana: number; hora_inicio: string; hora_fin: string }) => ({
    chofer_id: a.choferId,
    dia_semana: h.dia_semana,
    hora_inicio: h.hora_inicio,
    hora_fin: h.hora_fin,
  }));
  const { error: errIns } = await sb.from("choferya_horarios").insert(rows);
  if (errIns) return NextResponse.json({ error: errIns.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: rows.length });
}
