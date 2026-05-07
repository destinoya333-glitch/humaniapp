/**
 * GET /api/ecodrive/geocode/place-detail?place_id=X
 * Devuelve { lat, lng, address } para el place_id de Google Places.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const placeId = (url.searchParams.get("place_id") || "").trim();
  if (!placeId) {
    return NextResponse.json({ error: "missing_place_id" }, { status: 400, headers: noStore });
  }
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500, headers: noStore });

  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
      )}&fields=geometry,formatted_address&language=es&key=${key}`,
      { cache: "no-store" }
    );
    const j = (await r.json()) as {
      result?: {
        geometry?: { location?: { lat?: number; lng?: number } };
        formatted_address?: string;
      };
    };
    const lat = j.result?.geometry?.location?.lat;
    const lng = j.result?.geometry?.location?.lng;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "no_geometry" }, { status: 404, headers: noStore });
    }
    const full = j.result?.formatted_address || "";
    const short = full.split(",").slice(0, 2).join(",").trim();
    return NextResponse.json(
      { lat, lng, address: short || `${lat.toFixed(5)}, ${lng.toFixed(5)}` },
      { headers: noStore }
    );
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500, headers: noStore });
  }
}
