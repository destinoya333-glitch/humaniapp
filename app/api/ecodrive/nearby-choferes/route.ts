/**
 * GET /api/ecodrive/nearby-choferes?lat=X&lng=Y&km=5
 *
 * Devuelve choferes aprobados con last_ping reciente (≤10 min) cerca del punto.
 * Sirve para:
 *   1. Mostrar autitos rondando en el picker (efecto "ya hay autos aquí")
 *   2. Mostrar autitos cerca cuando estado=buscando/asignado en /track
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { distanceKmHaversine } from "@/lib/ecodrive/matching";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const MAX_PING_AGE_MIN = 10;
const MAX_RESULTS = 10;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const maxKm = Number(url.searchParams.get("km") || "5");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "bad_coords", choferes: [] },
      { status: 400, headers: noStore }
    );
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await sb
    .from("eco_choferes")
    .select("id, last_lat, last_lng, last_ping, en_turno")
    .eq("status", "approved")
    .not("last_lat", "is", null)
    .not("last_lng", "is", null);

  const cutoff = Date.now() - MAX_PING_AGE_MIN * 60 * 1000;
  const rows = (data || []) as Array<{
    id: string;
    last_lat: number;
    last_lng: number;
    last_ping: string | null;
    en_turno: boolean;
  }>;

  const choferes = rows
    .filter((r) => r.last_ping && new Date(r.last_ping).getTime() > cutoff)
    .map((r) => ({
      id: r.id,
      lat: r.last_lat,
      lng: r.last_lng,
      en_turno: r.en_turno,
      distancia_km: distanceKmHaversine(lat, lng, r.last_lat, r.last_lng),
    }))
    .filter((c) => c.distancia_km <= maxKm)
    .sort((a, b) => a.distancia_km - b.distancia_km)
    .slice(0, MAX_RESULTS);

  return NextResponse.json({ choferes, count: choferes.length }, { headers: noStore });
}
