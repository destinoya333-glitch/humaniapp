// Google Directions API — calcula la ruta sobre las pistas reales.
// Devuelve la polyline codificada lista para Leaflet (decodificada a array de [lat,lng]).

type DirectionsResult = {
  polyline: string;
  points: [number, number][];
  distance_m: number;
  duration_s: number;
};

// Decodifica el formato "encoded polyline" de Google a array de [lat,lng].
// Algoritmo estándar: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
export function decodePolyline(encoded: string): [number, number][] {
  const out: [number, number][] = [];
  let lat = 0;
  let lng = 0;
  let i = 0;
  while (i < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

export async function fetchDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DirectionsResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${originLat},${originLng}` +
    `&destination=${destLat},${destLng}` +
    `&mode=driving&units=metric&region=pe&language=es&key=${key}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      status?: string;
      routes?: Array<{
        overview_polyline?: { points?: string };
        legs?: Array<{
          distance?: { value?: number };
          duration?: { value?: number };
        }>;
      }>;
    };
    if (j.status !== "OK" || !j.routes?.length) return null;
    const route = j.routes[0];
    const enc = route.overview_polyline?.points;
    if (!enc) return null;
    const leg = route.legs?.[0];
    return {
      polyline: enc,
      points: decodePolyline(enc),
      distance_m: leg?.distance?.value ?? 0,
      duration_s: leg?.duration?.value ?? 0,
    };
  } catch {
    return null;
  }
}
