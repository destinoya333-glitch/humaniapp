/**
 * GET /api/ecodrive/tracker/pending-offer?token=X
 * Devuelve si hay un viaje "buscando" o "asignado" para este chofer.
 * El PWA hace polling y dispara alarma sonora cuando aparece uno nuevo.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyChoferTrackerToken } from "@/lib/ecodrive/tracker-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const v = verifyChoferTrackerToken(token);
  if (!v.ok) {
    return NextResponse.json({ error: `token_${v.reason}` }, { status: 401, headers: noStore });
  }

  const sb = db();

  // 1. Viaje ya asignado a este chofer
  const { data: asignados } = await sb
    .from("eco_viajes")
    .select(
      "id, origen_direccion, destino_direccion, tarifa_estimada, distancia_km, solicitado_at, estado"
    )
    .eq("chofer_id", v.choferId)
    .in("estado", ["asignado", "en_curso"])
    .order("solicitado_at", { ascending: false })
    .limit(1);

  const viajeAsig = (Array.isArray(asignados) && asignados[0]) || null;
  if (viajeAsig) {
    const va = viajeAsig as {
      id: string;
      origen_direccion: string;
      destino_direccion: string;
      tarifa_estimada: number;
      distancia_km: number;
      solicitado_at: string;
      estado: string;
    };
    return NextResponse.json(
      {
        has_offer: true,
        kind: "asignado",
        viaje_id: va.id,
        origen: va.origen_direccion,
        destino: va.destino_direccion,
        precio: va.tarifa_estimada,
        distancia_km: va.distancia_km,
        created_at: va.solicitado_at,
        estado: va.estado,
      },
      { headers: noStore }
    );
  }

  // 2. Viaje en estado "buscando" donde este chofer fue notificado (en intentos_choferes)
  const { data: pendientes } = await sb
    .from("eco_viajes")
    .select(
      "id, origen_direccion, destino_direccion, tarifa_estimada, distancia_km, solicitado_at, estado, intentos_choferes"
    )
    .eq("estado", "buscando")
    .order("solicitado_at", { ascending: false })
    .limit(20);

  const oferta = (pendientes || []).find((p) => {
    const intentos = ((p as { intentos_choferes: string[] }).intentos_choferes || []) as string[];
    return intentos.length > 0 && intentos[intentos.length - 1] === v.choferId;
  });

  if (!oferta) {
    return NextResponse.json({ has_offer: false }, { headers: noStore });
  }
  const o = oferta as {
    id: string;
    origen_direccion: string;
    destino_direccion: string;
    tarifa_estimada: number;
    distancia_km: number;
    solicitado_at: string;
    estado: string;
  };

  return NextResponse.json(
    {
      has_offer: true,
      kind: "oferta_pendiente",
      viaje_id: o.id,
      origen: o.origen_direccion,
      destino: o.destino_direccion,
      precio: o.tarifa_estimada,
      distancia_km: o.distancia_km,
      estado_viaje: o.estado,
      created_at: o.solicitado_at,
    },
    { headers: noStore }
  );
}
