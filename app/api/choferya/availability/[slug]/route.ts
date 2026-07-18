import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/choferya/availability/[slug]?date=YYYY-MM-DD
 *
 * Devuelve slots disponibles para reservar con ese chofer en esa fecha.
 * Usa SQL function `choferya_slots_disponibles` que cruza horarios definidos
 * con reservas ya tomadas.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const date = url.searchParams.get("date");

  if (!slug) return NextResponse.json({ error: "slug requerido" }, { status: 400 });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "date YYYY-MM-DD requerido" }, { status: 400 });

  const sb = db();
  const { data: chofer } = await sb
    .from("eco_choferes")
    .select("id, choferya_active")
    .eq("choferya_slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (!chofer) return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });
  if (!chofer.choferya_active)
    return NextResponse.json({ slots: [], reason: "inactive" });

  const { data: slots, error } = await sb.rpc("choferya_slots_disponibles", {
    p_chofer_id: chofer.id,
    p_fecha: date,
    p_step_min: 30,
  });

  if (error) {
    console.error("[choferya availability err]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    chofer_id: chofer.id,
    date,
    slots: (slots || []).map((s: { slot_inicio: string; slot_fin: string }) => ({
      inicio: s.slot_inicio,
      fin: s.slot_fin,
    })),
  });
}
