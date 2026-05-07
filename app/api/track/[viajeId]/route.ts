/**
 * GET /api/track/[viajeId]
 *
 * Endpoint que consume TrackClient.tsx para mostrar el viaje en vivo al pasajero.
 * Lee de eco_viajes + eco_choferes + eco_viaje_tracking_pings (schema nuevo).
 * Mantiene compat con la forma de respuesta del cliente original.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decodePolyline, fetchDirections } from "@/lib/ecodrive/directions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

type Params = Promise<{ viajeId: string }>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(_req: Request, { params }: { params: Params }) {
  const { viajeId } = await params;
  const id = String(viajeId || "").trim();
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "viaje_not_found" }, { status: 404, headers: noStore });
  }

  const sb = db();
  const { data: viaje } = await sb
    .from("eco_viajes")
    .select(
      "id, estado, origen_lat, origen_lng, destino_lat, destino_lng, origen_direccion, destino_direccion, distancia_km, tarifa_estimada, chofer_id, metadata, solicitado_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!viaje) {
    return NextResponse.json({ error: "viaje_not_found" }, { status: 404, headers: noStore });
  }
  const v = viaje as {
    id: string;
    estado: string;
    origen_lat: number | null;
    origen_lng: number | null;
    destino_lat: number | null;
    destino_lng: number | null;
    origen_direccion: string | null;
    destino_direccion: string | null;
    distancia_km: number | null;
    tarifa_estimada: number | null;
    chofer_id: string | null;
    metadata: Record<string, unknown> | null;
    solicitado_at: string;
  };
  const meta = (v.metadata && typeof v.metadata === "object" ? v.metadata : {}) as Record<
    string,
    unknown
  >;

  let chofer: {
    nombre: string | null;
    foto: string | null;
    calificacion: number | null;
    telefono: string | null;
    vehiculo: { marca?: string; modelo?: string; color?: string; placas?: string } | null;
  } | null = null;
  let chofer_pos: { lat: number | null; lng: number | null; ultimo_ping: string | null } | null =
    null;

  if (v.chofer_id) {
    const { data: c } = await sb
      .from("eco_choferes")
      .select(
        "id, wa_id, nombre, rating, vehiculo_marca, vehiculo_modelo, vehiculo_color, placa, selfie_foto_url, last_lat, last_lng, last_ping"
      )
      .eq("id", v.chofer_id)
      .maybeSingle();

    if (c) {
      const cc = c as {
        wa_id: string;
        nombre: string;
        rating: number | null;
        vehiculo_marca: string;
        vehiculo_modelo: string;
        vehiculo_color: string;
        placa: string;
        selfie_foto_url: string | null;
        last_lat: number | null;
        last_lng: number | null;
        last_ping: string | null;
      };

      // Generar signed URL de la foto si existe
      let fotoUrl: string | null = null;
      if (cc.selfie_foto_url) {
        const { data: signed } = await sb.storage
          .from("eco-choferes-docs")
          .createSignedUrl(cc.selfie_foto_url, 3600);
        fotoUrl = signed?.signedUrl || null;
      }

      chofer = {
        nombre: cc.nombre,
        foto: fotoUrl,
        calificacion: cc.rating,
        telefono: cc.wa_id,
        vehiculo: {
          marca: cc.vehiculo_marca,
          modelo: cc.vehiculo_modelo,
          color: cc.vehiculo_color,
          placas: cc.placa,
        },
      };
      chofer_pos = {
        lat: cc.last_lat,
        lng: cc.last_lng,
        ultimo_ping: cc.last_ping,
      };
    }
  }

  // Insertar nuevo ping si la posicion del chofer cambio
  if (chofer_pos?.lat != null && chofer_pos?.lng != null && v.chofer_id) {
    try {
      const { data: lastPings } = await sb
        .from("eco_viaje_tracking_pings")
        .select("lat, lng")
        .eq("viaje_id", v.id)
        .order("t", { ascending: false })
        .limit(1);
      const last = Array.isArray(lastPings) && lastPings[0] ? lastPings[0] : null;
      const lat = chofer_pos.lat;
      const lng = chofer_pos.lng;
      const changed =
        !last ||
        Math.abs(Number(last.lat) - lat) > 1e-6 ||
        Math.abs(Number(last.lng) - lng) > 1e-6;
      if (changed) {
        await sb.from("eco_viaje_tracking_pings").insert({
          viaje_id: v.id,
          chofer_id: v.chofer_id,
          lat,
          lng,
          source: "auto_track",
        });
      }
    } catch {}
  }

  // Recuperar ultimos 60 pings
  let tracking_history: Array<{
    lat: number;
    lng: number;
    source: string | null;
    heading_deg: number | null;
    speed_kmh: number | null;
    t: string;
  }> = [];
  try {
    const { data: pings } = await sb
      .from("eco_viaje_tracking_pings")
      .select("lat, lng, source, heading_deg, speed_kmh, t")
      .eq("viaje_id", v.id)
      .order("t", { ascending: false })
      .limit(60);
    const arr = (pings || []) as Array<{
      lat: number;
      lng: number;
      source: string | null;
      heading_deg: number | null;
      speed_kmh: number | null;
      t: string;
    }>;
    tracking_history = arr
      .slice()
      .reverse()
      .map((p) => ({
        lat: Number(p.lat),
        lng: Number(p.lng),
        source: p.source,
        heading_deg: p.heading_deg,
        speed_kmh: p.speed_kmh,
        t: p.t,
      }));
  } catch {}

  // Ruta Google Directions con cache 60s en metadata.directions
  let route_points: [number, number][] | null = null;
  let route_distance_m: number | null = null;
  let route_duration_s: number | null = null;

  const leg: "to_pickup" | "to_dest" | null =
    v.estado === "asignado" ? "to_pickup" : v.estado === "en_curso" ? "to_dest" : null;

  if (
    leg &&
    chofer_pos?.lat != null &&
    chofer_pos?.lng != null &&
    ((leg === "to_pickup" && v.origen_lat != null && v.origen_lng != null) ||
      (leg === "to_dest" && v.destino_lat != null && v.destino_lng != null))
  ) {
    const origin = { lat: chofer_pos.lat, lng: chofer_pos.lng };
    const dest =
      leg === "to_pickup"
        ? { lat: v.origen_lat as number, lng: v.origen_lng as number }
        : { lat: v.destino_lat as number, lng: v.destino_lng as number };

    const cached =
      meta.directions && typeof meta.directions === "object"
        ? (meta.directions as {
            polyline?: string;
            calculated_at?: string;
            leg?: string;
            origin?: { lat: number; lng: number };
            distance_m?: number;
            duration_s?: number;
          })
        : null;

    const ageMs = cached?.calculated_at
      ? Date.now() - new Date(cached.calculated_at).getTime()
      : Infinity;
    const moved = cached?.origin
      ? Math.hypot(
          (cached.origin.lat - origin.lat) * 111_000,
          (cached.origin.lng - origin.lng) * 111_000 * Math.cos((origin.lat * Math.PI) / 180)
        )
      : Infinity;

    const needsRecalc = !cached?.polyline || cached.leg !== leg || ageMs > 60_000 || moved > 120;

    if (needsRecalc) {
      const dir = await fetchDirections(origin.lat, origin.lng, dest.lat, dest.lng);
      if (dir) {
        route_points = dir.points;
        route_distance_m = dir.distance_m;
        route_duration_s = dir.duration_s;
        try {
          await sb
            .from("eco_viajes")
            .update({
              metadata: {
                ...meta,
                directions: {
                  polyline: dir.polyline,
                  calculated_at: new Date().toISOString(),
                  leg,
                  origin,
                  dest,
                  distance_m: dir.distance_m,
                  duration_s: dir.duration_s,
                },
              },
            })
            .eq("id", v.id);
        } catch {}
      }
    } else if (cached?.polyline) {
      route_points = decodePolyline(cached.polyline);
      route_distance_m = cached.distance_m ?? null;
      route_duration_s = cached.duration_s ?? null;
    }
  }

  return NextResponse.json(
    {
      viaje: {
        id: v.id,
        estado: v.estado,
        origen_lat: v.origen_lat,
        origen_lng: v.origen_lng,
        destino_lat: v.destino_lat,
        destino_lng: v.destino_lng,
        origen_texto: v.origen_direccion,
        destino_texto: v.destino_direccion,
        modo: null,
        precio_estimado: v.tarifa_estimada,
        distancia_km: v.distancia_km,
        metadata: v.metadata,
        tracking_token: null,
      },
      chofer,
      chofer_pos,
      tracking_history,
      route: route_points
        ? { points: route_points, leg, distance_m: route_distance_m, duration_s: route_duration_s }
        : null,
    },
    { headers: noStore }
  );
}
