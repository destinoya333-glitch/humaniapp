import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/choferya/profile/[slug]
 *
 * Datos públicos del chofer (no expone DNI ni placa completa).
 * Útil para apps externas, embeds o widgets.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!slug) return NextResponse.json({ error: "slug requerido" }, { status: 400 });

  const sb = db();
  const { data, error } = await sb
    .from("choferya_directorio")
    .select("*")
    .eq("choferya_slug", slug)
    .maybeSingle();

  if (error || !data)
    return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });

  // Cargar precios + horarios
  const [{ data: precios }, { data: horarios }] = await Promise.all([
    sb
      .from("choferya_precios")
      .select("id, etiqueta, origen, destino, precio_pen, duracion_estimada_min")
      .eq("chofer_id", data.id)
      .eq("activo", true)
      .order("orden"),
    sb
      .from("choferya_horarios")
      .select("dia_semana, hora_inicio, hora_fin")
      .eq("chofer_id", data.id)
      .order("dia_semana")
      .order("hora_inicio"),
  ]);

  return NextResponse.json({
    ok: true,
    chofer: {
      id: data.id,
      slug: data.choferya_slug,
      nombre: data.nombre,
      bio: data.choferya_bio,
      zonas: data.choferya_zonas,
      plan: data.choferya_plan,
      foto: data.selfie_foto_url,
      vehiculo: {
        marca: data.vehiculo_marca,
        modelo: data.vehiculo_modelo,
        anio: data.vehiculo_anio,
        color: data.vehiculo_color,
        foto: data.carro_foto_url,
      },
      rating: Number(data.rating_promedio) || 0,
      total_calificaciones: data.total_calificaciones || 0,
      viajes_completados: data.viajes_completados || 0,
      antiguedad_desde: data.antiguedad_desde,
    },
    precios: precios || [],
    horarios: horarios || [],
  });
}
