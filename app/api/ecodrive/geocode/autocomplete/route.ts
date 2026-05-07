/**
 * GET /api/ecodrive/geocode/autocomplete?q=texto&lat=&lng=
 * Devuelve sugerencias de Google Places Autocomplete (sesgado a Trujillo, Peru).
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ predictions: [] }, { headers: noStore });
  }
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ predictions: [] }, { headers: noStore });

  const params = new URLSearchParams({
    input: q,
    language: "es",
    components: "country:pe",
    key,
  });
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("location", `${lat},${lng}`);
    params.set("radius", "30000"); // 30km
  } else {
    // Trujillo centro
    params.set("location", "-8.115,-79.029");
    params.set("radius", "30000");
  }

  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
      { cache: "no-store" }
    );
    const j = (await r.json()) as {
      predictions?: Array<{ description: string; place_id: string }>;
    };
    return NextResponse.json(
      {
        predictions: (j.predictions || []).slice(0, 5).map((p) => ({
          description: p.description,
          place_id: p.place_id,
        })),
      },
      { headers: noStore }
    );
  } catch {
    return NextResponse.json({ predictions: [] }, { headers: noStore });
  }
}
