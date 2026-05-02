import { NextResponse } from "next/server";
import { supabase } from "@/lib/ecodrive/db";
import { verifyChoferTrackerToken } from "@/lib/ecodrive/tracker-token";

const noStore = { "Cache-Control": "no-store" };

// GET /api/ecodrive/tracker/pending-offer?token=X
// Devuelve la oferta pendiente más reciente del chofer (o el viaje asignado por
// auto-asignación). La PWA hace polling para detectar nuevos pedidos y disparar
// alarma sonora.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const v = verifyChoferTrackerToken(token);
  if (!v.ok) {
    return NextResponse.json({ error: `token_${v.reason}` }, { status: 401, headers: noStore });
  }

  // 1. Buscar viaje asignado al chofer (auto-asignación con 1 chofer activo)
  const { data: asignados } = await supabase
    .from("viajes")
    .select("id, origen_texto, destino_texto, precio_estimado, distancia_km, created_at, estado")
    .eq("chofer_id", v.choferId)
    .in("estado", ["asignado", "en_curso"])
    .order("created_at", { ascending: false })
    .limit(1);

  const viajeAsig = (Array.isArray(asignados) && asignados[0]) || null;
  if (viajeAsig) {
    return NextResponse.json(
      {
        has_offer: true,
        kind: "asignado",
        viaje_id: viajeAsig.id,
        origen: viajeAsig.origen_texto,
        destino: viajeAsig.destino_texto,
        precio: viajeAsig.precio_estimado,
        distancia_km: viajeAsig.distancia_km,
        created_at: viajeAsig.created_at,
        estado: viajeAsig.estado,
      },
      { headers: noStore }
    );
  }

  // 2. Buscar oferta pendiente del chofer (cuando varios choferes ofertaron)
  const { data: ofertas } = await supabase
    .from("ofertas")
    .select("id, viaje_id, precio_ofertado, estado, created_at")
    .eq("chofer_id", v.choferId)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false })
    .limit(1);

  const oferta = (Array.isArray(ofertas) && ofertas[0]) || null;
  if (!oferta) {
    return NextResponse.json({ has_offer: false }, { headers: noStore });
  }

  // Detalle del viaje
  const { data: viaje } = await supabase
    .from("viajes")
    .select("id, origen_texto, destino_texto, distancia_km, estado, created_at")
    .eq("id", oferta.viaje_id)
    .maybeSingle();

  return NextResponse.json(
    {
      has_offer: true,
      kind: "oferta_pendiente",
      offer_id: oferta.id,
      viaje_id: oferta.viaje_id,
      origen: viaje?.origen_texto,
      destino: viaje?.destino_texto,
      precio: oferta.precio_ofertado,
      distancia_km: viaje?.distancia_km,
      estado_viaje: viaje?.estado,
      created_at: oferta.created_at,
    },
    { headers: noStore }
  );
}
