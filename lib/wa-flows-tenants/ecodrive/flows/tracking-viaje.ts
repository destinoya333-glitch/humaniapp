/**
 * EcoDrive+ Tracking Viaje V2 — flow real productivo con mapa dinámico.
 * Cuando el pasajero clickea "Ver mapa en vivo" en el mensaje WhatsApp,
 * se abre este flow que muestra:
 *  - Mapa estático Google con pin naranja del chofer en tiempo real
 *  - Nombre + rating del chofer
 *  - Vehículo + placa
 *  - ETA + estado + distancia
 *  - Botón "Cerrar tracking"
 *
 * V3 agregará: botón llamar, compartir con familia, refresh automático.
 */
import type { FlowDefinition, FlowRequestPayload } from "../../../wa-flows-platform/registry";
import { createClient } from "@supabase/supabase-js";

// Trujillo centro como fallback si no llega lat/lng
const FALLBACK_LAT = -8.115;
const FALLBACK_LNG = -79.029;

type TrackingSession = {
  chofer_nombre: string;
  chofer_rating: string;
  vehiculo: string;
  placa: string;
  lat: number;
  lng: number;
  eta_min: number;
  distancia_km: string;
  estado: string;
};

async function lookupSession(sessionId: string): Promise<TrackingSession | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const sb = createClient(url, key);
  const { data } = await sb
    .from("eco_tracking_sessions")
    .select("chofer_nombre,chofer_rating,vehiculo,placa,lat,lng,eta_min,distancia_km,estado,expires_at,closed_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) return null;
  if (data.closed_at) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data as unknown as TrackingSession;
}

async function closeSession(sessionId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const sb = createClient(url, key);
  await sb
    .from("eco_tracking_sessions")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", sessionId);
}

async function fetchMapAsBase64(lat: number, lng: number): Promise<string> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    // 1x1 png transparente como fallback para no romper el render
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
  const url =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}` +
    `&zoom=15&size=400x240&scale=2` +
    `&markers=color:0xE1811B%7Csize:mid%7C${lat},${lng}` +
    `&style=feature:poi%7Cvisibility:off` +
    `&key=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

const flow: FlowDefinition = {
  tenant: "ecodrive",
  flow_key: "tracking-viaje",
  meta: {
    name: "EcoDrive_Tracking_Viaje_v1",
    description: "Tracking en vivo del viaje: mapa, chofer, vehículo, ETA",
  },
  async handle(req: FlowRequestPayload) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }

    if (req.action === "INIT") {
      // flow_token = "ecodrive:tracking-viaje:<session_id>" -> lookup BD
      // Fallback a datos demo si no hay session.
      const tokenParts = (req.flow_token || "").split(":");
      const sessionId = tokenParts[2];
      const session = sessionId ? await lookupSession(sessionId) : null;

      const lat = session?.lat ?? FALLBACK_LAT;
      const lng = session?.lng ?? FALLBACK_LNG;
      const mapa_base64 = await fetchMapAsBase64(lat, lng);

      const chofer_nombre = session?.chofer_nombre || "Pepe Garcia";
      const chofer_rating = session?.chofer_rating || "4.9";
      const vehiculo = session
        ? `${session.vehiculo} ${session.placa}`
        : "Toyota Yaris ABC-123";
      const eta_min = String(session?.eta_min ?? "4");
      const estado = session?.estado || "En camino";
      const distancia_km = session?.distancia_km || "1.2";

      // Strings pre-armados porque Meta Flows no interpola texto dinamico inline
      // en TextHeading/TextBody (solo binding completo del campo).
      return {
        version: "3.0",
        screen: "TRACKING",
        data: {
          mapa_base64,
          linea_chofer: `Chofer: ${chofer_nombre}`,
          linea_vehiculo: `${chofer_rating} estrellas - ${vehiculo}`,
          linea_estado: `Estado: ${estado}`,
          linea_eta: `Llega en ${eta_min} minutos - ${distancia_km} km de distancia`,
        },
      };
    }

    // data_exchange: usuario presionó "Cerrar tracking"
    if (req.action === "data_exchange") {
      const tokenParts = (req.flow_token || "").split(":");
      const sessionId = tokenParts[2];
      if (sessionId) await closeSession(sessionId);
      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token: req.flow_token,
              status: "tracking_closed",
            },
          },
        },
      };
    }

    return {
      version: "3.0",
      data: { status: "unknown_action" },
    };
  },
};

export default flow;
