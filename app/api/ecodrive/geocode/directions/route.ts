/**
 * GET /api/ecodrive/geocode/directions?olat=&olng=&dlat=&dlng=
 * Retorna { points: [[lat,lng]...], distance_m, duration_s } usando Google Directions.
 * Los points son la polyline decodificada lista para Leaflet.
 */
import { NextResponse } from "next/server";
import { decodePolyline } from "@/lib/ecodrive/directions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const olat = Number(url.searchParams.get("olat"));
  const olng = Number(url.searchParams.get("olng"));
  const dlat = Number(url.searchParams.get("dlat"));
  const dlng = Number(url.searchParams.get("dlng"));
  if (![olat, olng, dlat, dlng].every(Number.isFinite)) {
    return NextResponse.json({ error: "bad_coords" }, { status: 400, headers: noStore });
  }
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ points: null }, { headers: noStore });
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${olat},${olng}&destination=${dlat},${dlng}&mode=driving&language=es&region=pe&key=${key}`,
      { cache: "no-store" }
    );
    const j = (await r.json()) as {
      routes?: Array<{
        overview_polyline?: { points?: string };
        legs?: Array<{ distance?: { value?: number }; duration?: { value?: number } }>;
      }>;
    };
    const route = j.routes?.[0];
    const enc = route?.overview_polyline?.points;
    if (!enc) return NextResponse.json({ points: null }, { headers: noStore });
    const points = decodePolyline(enc);
    const distance_m = route?.legs?.reduce((acc, l) => acc + (l.distance?.value || 0), 0) ?? null;
    const duration_s = route?.legs?.reduce((acc, l) => acc + (l.duration?.value || 0), 0) ?? null;
    return NextResponse.json({ points, distance_m, duration_s }, { headers: noStore });
  } catch {
    return NextResponse.json({ points: null }, { headers: noStore });
  }
}
