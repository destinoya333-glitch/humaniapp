/**
 * GET /api/ecodrive/geocode/reverse?lat=X&lng=Y
 * Devuelve la dirección formateada en español/Peru.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "bad_coords" }, { status: 400, headers: noStore });
  }
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }, { headers: noStore });
  }
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=es&region=pe&key=${key}`,
      { cache: "no-store" }
    );
    const j = (await r.json()) as { results?: Array<{ formatted_address?: string }> };
    const full = j.results?.[0]?.formatted_address || "";
    // Mostrar primera linea (mas corto) — usualmente "Calle X, Distrito"
    const short = full.split(",").slice(0, 2).join(",").trim();
    return NextResponse.json(
      { address: short || `${lat.toFixed(5)}, ${lng.toFixed(5)}` },
      { headers: noStore }
    );
  } catch {
    return NextResponse.json(
      { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` },
      { headers: noStore }
    );
  }
}
