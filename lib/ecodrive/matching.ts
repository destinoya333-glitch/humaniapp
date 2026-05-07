/**
 * Matching de chofer al pasajero por distancia GPS.
 * Reemplaza el random anterior. Usa haversine sobre eco_choferes.last_lat/last_lng.
 */
import { createClient } from "@supabase/supabase-js";

export type ChoferCandidato = {
  id: string;
  wa_id: string;
  nombre: string;
  last_lat: number;
  last_lng: number;
  distancia_km: number;
  en_turno: boolean;
};

export function distanceKmHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 100) / 100;
}

const RADIOS_KM = [3, 6, 12, 25];
const MAX_PING_AGE_MIN = 10; // chofer con ping mayor a esto se considera offline

/**
 * Busca el chofer aprobado MAS CERCANO al origen del viaje.
 * Prioriza:
 *   1. en_turno=true + last_ping reciente (≤10 min)
 *   2. Distancia ≤ 3km, luego 6km, 12km, 25km
 * Excluye choferes en `excludeIds` (ya rechazaron este viaje).
 */
export async function findNearestChofer(
  origenLat: number,
  origenLng: number,
  excludeIds: string[] = []
): Promise<ChoferCandidato | null> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await sb
    .from("eco_choferes")
    .select("id, wa_id, nombre, last_lat, last_lng, last_ping, en_turno")
    .eq("status", "approved")
    .not("last_lat", "is", null)
    .not("last_lng", "is", null);

  const ahora = Date.now();
  const cutoff = ahora - MAX_PING_AGE_MIN * 60 * 1000;

  type Row = {
    id: string;
    wa_id: string;
    nombre: string;
    last_lat: number;
    last_lng: number;
    last_ping: string | null;
    en_turno: boolean;
  };

  const candidatos: ChoferCandidato[] = ((data || []) as Row[])
    .filter((c) => !excludeIds.includes(c.id))
    .filter((c) => {
      if (!c.last_ping) return false;
      return new Date(c.last_ping).getTime() > cutoff;
    })
    .map((c) => ({
      id: c.id,
      wa_id: c.wa_id,
      nombre: c.nombre,
      last_lat: c.last_lat,
      last_lng: c.last_lng,
      en_turno: c.en_turno,
      distancia_km: distanceKmHaversine(origenLat, origenLng, c.last_lat, c.last_lng),
    }));

  // Ordenar: en_turno primero, luego distancia ASC
  candidatos.sort((a, b) => {
    if (a.en_turno !== b.en_turno) return a.en_turno ? -1 : 1;
    return a.distancia_km - b.distancia_km;
  });

  // Probar radios crecientes
  for (const radio of RADIOS_KM) {
    const dentro = candidatos.find((c) => c.distancia_km <= radio);
    if (dentro) return dentro;
  }

  return null;
}
