/**
 * GET /api/ecodrive/geocode/pricing?olat=&olng=&dlat=&dlng=[&tipo=estandar]
 * Devuelve { km, min, tarifa } usando Google Distance Matrix (driving).
 * Tarifa editable desde /admin/ecodrive/tarifas (tabla eco_admin_config).
 */
import { NextResponse } from "next/server";
import { getTarifas, computeFare } from "@/lib/ecodrive/tarifas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 10) / 10;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const olat = Number(url.searchParams.get("olat"));
  const olng = Number(url.searchParams.get("olng"));
  const dlat = Number(url.searchParams.get("dlat"));
  const dlng = Number(url.searchParams.get("dlng"));
  const tipo = url.searchParams.get("tipo") || "estandar";
  if (![olat, olng, dlat, dlng].every(Number.isFinite)) {
    return NextResponse.json({ error: "bad_coords" }, { status: 400, headers: noStore });
  }

  const tarifas = await getTarifas();
  const fallback = () => {
    const km = haversineKm(olat, olng, dlat, dlng);
    const min = Math.max(5, Math.round(km * 3));
    return NextResponse.json(
      { km, min, tarifa: computeFare(km, min, tarifas, tipo) },
      { headers: noStore }
    );
  };

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return fallback();
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${olat},${olng}&destinations=${dlat},${dlng}&mode=driving&language=es&region=pe&key=${key}`,
      { cache: "no-store" }
    );
    const j = (await r.json()) as {
      rows?: Array<{
        elements?: Array<{
          status?: string;
          distance?: { value?: number };
          duration?: { value?: number };
        }>;
      }>;
    };
    const el = j.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") return fallback();
    const km = Math.round(((el.distance?.value || 0) / 1000) * 10) / 10;
    const min = Math.max(1, Math.round((el.duration?.value || 0) / 60));
    return NextResponse.json(
      { km, min, tarifa: computeFare(km, min, tarifas, tipo) },
      { headers: noStore }
    );
  } catch {
    return fallback();
  }
}
