import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyChoferPanelToken } from "@/lib/activosya/choferya-token";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function auth(req: NextRequest): { ok: true; choferId: string } | { ok: false; status: number; msg: string } {
  const token = new URL(req.url).searchParams.get("token") || req.headers.get("x-choferya-token");
  if (!token) return { ok: false, status: 401, msg: "token requerido" };
  const v = verifyChoferPanelToken(token);
  if (!v.ok) return { ok: false, status: 401, msg: `token: ${v.reason}` };
  return { ok: true, choferId: v.choferId };
}

// GET — lista precios del chofer
export async function GET(req: NextRequest) {
  const a = auth(req);
  if (!a.ok) return NextResponse.json({ error: a.msg }, { status: a.status });
  const { data, error } = await db()
    .from("choferya_precios")
    .select("id, etiqueta, origen, destino, precio_pen, duracion_estimada_min, activo, orden")
    .eq("chofer_id", a.choferId)
    .order("orden");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, precios: data || [] });
}

// POST — crea precio nuevo
export async function POST(req: NextRequest) {
  const a = auth(req);
  if (!a.ok) return NextResponse.json({ error: a.msg }, { status: a.status });
  const body = await req.json();
  const { etiqueta, origen, destino, precio_pen, duracion_estimada_min, orden } = body;

  if (!etiqueta || etiqueta.trim().length < 3)
    return NextResponse.json({ error: "Etiqueta requerida" }, { status: 400 });
  const precio = Number(precio_pen);
  if (!Number.isFinite(precio) || precio <= 0)
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });

  const { data, error } = await db()
    .from("choferya_precios")
    .insert({
      chofer_id: a.choferId,
      etiqueta: etiqueta.trim(),
      origen: origen?.trim() || null,
      destino: destino?.trim() || null,
      precio_pen: precio,
      duracion_estimada_min: duracion_estimada_min ? Number(duracion_estimada_min) : null,
      orden: orden ? Number(orden) : 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, precio: data });
}

// PATCH — edita precio (body incluye id)
export async function PATCH(req: NextRequest) {
  const a = auth(req);
  if (!a.ok) return NextResponse.json({ error: a.msg }, { status: a.status });
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (rest.etiqueta !== undefined) updates.etiqueta = String(rest.etiqueta).trim();
  if (rest.origen !== undefined) updates.origen = rest.origen ? String(rest.origen).trim() : null;
  if (rest.destino !== undefined) updates.destino = rest.destino ? String(rest.destino).trim() : null;
  if (rest.precio_pen !== undefined) {
    const p = Number(rest.precio_pen);
    if (!Number.isFinite(p) || p <= 0)
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    updates.precio_pen = p;
  }
  if (rest.duracion_estimada_min !== undefined)
    updates.duracion_estimada_min = rest.duracion_estimada_min
      ? Number(rest.duracion_estimada_min)
      : null;
  if (rest.activo !== undefined) updates.activo = Boolean(rest.activo);
  if (rest.orden !== undefined) updates.orden = Number(rest.orden);

  const { error } = await db()
    .from("choferya_precios")
    .update(updates)
    .eq("id", id)
    .eq("chofer_id", a.choferId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — borra precio (body o query: ?id=)
export async function DELETE(req: NextRequest) {
  const a = auth(req);
  if (!a.ok) return NextResponse.json({ error: a.msg }, { status: a.status });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { error } = await db()
    .from("choferya_precios")
    .delete()
    .eq("id", id)
    .eq("chofer_id", a.choferId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
