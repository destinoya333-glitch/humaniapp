import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyChoferPanelToken } from "@/lib/activosya/choferya-token";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/choferya/dashboard?token=<panel_token>
 * Devuelve resumen mes + próximas reservas + alertas.
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token requerido" }, { status: 401 });

  const v = verifyChoferPanelToken(token);
  if (!v.ok) return NextResponse.json({ error: `token: ${v.reason}` }, { status: 401 });

  const sb = db();
  const { data: chofer, error } = await sb
    .from("eco_choferes")
    .select(
      "id, nombre, choferya_slug, choferya_plan, choferya_active, choferya_subscription_until, choferya_bio, choferya_zonas, yape_celular, soat_vencimiento"
    )
    .eq("id", v.choferId)
    .maybeSingle();

  if (error || !chofer) return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    { count: completadasMes },
    { data: totalMesData },
    { data: proximas },
    { count: pendientesCount },
  ] = await Promise.all([
    sb
      .from("choferya_reservas")
      .select("*", { count: "exact", head: true })
      .eq("chofer_id", chofer.id)
      .eq("estado", "completada")
      .gte("completed_at", inicioMes.toISOString()),
    sb
      .from("choferya_reservas")
      .select("precio_pen")
      .eq("chofer_id", chofer.id)
      .eq("estado", "completada")
      .gte("completed_at", inicioMes.toISOString()),
    sb
      .from("choferya_reservas")
      .select(
        "id, pasajero_nombre, pasajero_wa_id, fecha_viaje, hora_viaje, origen_direccion, destino_direccion, precio_pen, estado"
      )
      .eq("chofer_id", chofer.id)
      .in("estado", ["pendiente", "confirmada"])
      .gte("fecha_viaje", new Date().toISOString().slice(0, 10))
      .order("fecha_viaje")
      .order("hora_viaje")
      .limit(10),
    sb
      .from("choferya_reservas")
      .select("*", { count: "exact", head: true })
      .eq("chofer_id", chofer.id)
      .eq("estado", "pendiente"),
  ]);

  const ingresosMes = (totalMesData || []).reduce(
    (sum: number, r: { precio_pen: number }) => sum + Number(r.precio_pen || 0),
    0
  );

  // Alertas
  const alertas: { tipo: string; mensaje: string }[] = [];
  if (chofer.choferya_subscription_until) {
    const venceEn = Math.floor(
      (new Date(chofer.choferya_subscription_until).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000)
    );
    if (venceEn <= 3 && venceEn >= 0) {
      alertas.push({
        tipo: "renta",
        mensaje: `Tu renta vence en ${venceEn} día${venceEn === 1 ? "" : "s"}. Yapea S/. para renovar.`,
      });
    } else if (venceEn < 0) {
      alertas.push({
        tipo: "renta",
        mensaje: `Tu renta venció hace ${-venceEn} día${-venceEn === 1 ? "" : "s"}. Reactivación: Yape al 998 102 258.`,
      });
    }
  }
  if (chofer.soat_vencimiento) {
    const soatVenceEn = Math.floor(
      (new Date(chofer.soat_vencimiento).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    if (soatVenceEn <= 30 && soatVenceEn >= 0)
      alertas.push({
        tipo: "soat",
        mensaje: `Tu SOAT vence en ${soatVenceEn} día${soatVenceEn === 1 ? "" : "s"}.`,
      });
  }
  if (!chofer.yape_celular)
    alertas.push({
      tipo: "yape",
      mensaje: "Configura tu número Yape para que tus pasajeros sepan a quién pagar.",
    });

  return NextResponse.json({
    ok: true,
    chofer: {
      id: chofer.id,
      nombre: chofer.nombre,
      slug: chofer.choferya_slug,
      plan: chofer.choferya_plan,
      active: chofer.choferya_active,
      subscription_until: chofer.choferya_subscription_until,
      bio: chofer.choferya_bio,
      zonas: chofer.choferya_zonas || [],
      yape: chofer.yape_celular,
      soat_vencimiento: chofer.soat_vencimiento,
    },
    stats_mes: {
      completadas: completadasMes || 0,
      ingresos_pen: ingresosMes,
      pendientes_total: pendientesCount || 0,
    },
    proximas_reservas: proximas || [],
    alertas,
  });
}
