/**
 * EcoDrive+ Flow Pedir Viaje (CORE).
 *
 * Pasajero abre flow -> escribe origen + destino + notas
 * step=calcular: backend usa Google Distance Matrix para distancia/duracion + tarifa
 * step=solicitar: crea row eco_viajes + busca chofer aprobado al azar + manda template Aceptar Viaje
 */
import type { FlowDefinition } from "../../../wa-flows-platform/registry";
import { createClient } from "@supabase/supabase-js";

type Payload = {
  step?: "calcular" | "solicitar";
  origen?: string;
  destino?: string;
  notas?: string;
  viaje_id?: string;
};

// Tarifa modelo simple Trujillo: base S/.4 + S/.1.20 por km
const BASE_FARE = 4.0;
const PER_KM = 1.2;

function computeFare(km: number): number {
  return Math.max(4, Math.round((BASE_FARE + km * PER_KM) * 2) / 2); // redondeo S/.0.5
}

async function distanceMatrix(origin: string, destination: string): Promise<{ km: number; min: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${encodeURIComponent(origin + ", Trujillo, Peru")}` +
    `&destinations=${encodeURIComponent(destination + ", Trujillo, Peru")}` +
    `&mode=driving&language=es&region=pe&key=${key}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    const j = (await r.json()) as {
      rows?: Array<{ elements?: Array<{ status?: string; distance?: { value?: number }; duration?: { value?: number } }> }>;
    };
    const el = j.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") return null;
    return {
      km: Math.round(((el.distance?.value || 0) / 1000) * 10) / 10,
      min: Math.max(1, Math.round((el.duration?.value || 0) / 60)),
    };
  } catch {
    return null;
  }
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function buscarYAsignarChofer(
  viajeId: string,
  origen: string,
  destino: string,
  km: number,
  min: number,
  tarifa: number,
  pasajeroNombre: string,
  notas: string
): Promise<{ ok: boolean; choferId?: string; choferWaId?: string }> {
  const sb = db();

  const { data: choferes } = await sb
    .from("eco_choferes")
    .select("id,wa_id,nombre")
    .eq("status", "approved")
    .limit(20);

  if (!choferes || choferes.length === 0) {
    await sb.from("eco_viajes").update({ estado: "rechazado_global" }).eq("id", viajeId);
    return { ok: false };
  }

  // Por ahora: random simple (siguiente sprint = matching por distancia GPS)
  const elegido = choferes[Math.floor(Math.random() * choferes.length)] as {
    id: string;
    wa_id: string;
    nombre: string;
  };

  // Notificar al chofer via template eco_chofer_nuevo_viaje
  const phoneId = process.env.ECODRIVE_META_PHONE_ID;
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN;
  if (phoneId && token) {
    try {
      await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: elegido.wa_id,
          type: "template",
          template: {
            name: "eco_chofer_nuevo_viaje",
            language: { code: "es" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: pasajeroNombre.split(" ")[0] || "pasajero" },
                  { type: "text", text: origen.slice(0, 60) },
                  { type: "text", text: destino.slice(0, 60) },
                  { type: "text", text: `${km}` },
                  { type: "text", text: `${tarifa}` },
                ],
              },
              {
                type: "button",
                sub_type: "flow",
                index: "0",
                parameters: [
                  {
                    type: "action",
                    action: { flow_token: `ecodrive:aceptar-viaje:${viajeId}` },
                  },
                ],
              },
            ],
          },
        }),
      });
    } catch {}
  }

  await sb
    .from("eco_viajes")
    .update({
      estado: "buscando",
      intentos_choferes: [elegido.id],
    })
    .eq("id", viajeId);

  return { ok: true, choferId: elegido.id, choferWaId: elegido.wa_id };
}

const flow: FlowDefinition = {
  tenant: "ecodrive",
  flow_key: "pedir-viaje",
  meta: {
    name: "EcoDrive_Pedir_Viaje_v1",
    description: "Pasajero pide viaje, sistema matchea chofer",
  },
  async handle(req) {
    if (req.action === "ping") return { version: "3.0", data: { status: "active" } };
    if (req.action === "INIT") return { version: "3.0", screen: "DESTINO", data: {} };
    if (req.action !== "data_exchange") return { version: "3.0", data: { status: "unknown_action" } };

    const data = (req.data || {}) as Payload;
    const tokenParts = (req.flow_token || "").split(":");
    const waId = tokenParts[2] || "unknown";
    const sb = db();

    // ===== Step calcular =====
    if (data.step === "calcular") {
      const origen = (data.origen || "").trim();
      const destino = (data.destino || "").trim();
      if (!origen || !destino) {
        return {
          version: "3.0",
          screen: "DESTINO",
          data: {},
        };
      }
      const dm = await distanceMatrix(origen, destino);
      const km = dm?.km ?? 3.0;
      const min = dm?.min ?? 10;
      const tarifa = computeFare(km);

      // Crear row preliminar (estado solicitado, sin chofer aun)
      const { data: row } = await sb
        .from("eco_viajes")
        .insert({
          pasajero_wa_id: waId,
          origen_direccion: origen,
          destino_direccion: destino,
          notas: data.notas || null,
          distancia_km: km,
          duracion_min: min,
          tarifa_estimada: tarifa,
          estado: "solicitado",
        })
        .select("id")
        .single();

      const viajeId = (row as { id: string } | null)?.id || "";

      return {
        version: "3.0",
        screen: "CONFIRMAR",
        data: {
          linea_origen: `Sales de: ${origen}`,
          linea_destino: `Vas a: ${destino}`,
          linea_distancia: `Distancia: ${km} km · ${min} min`,
          linea_tarifa: `Tarifa estimada: S/ ${tarifa.toFixed(2)}`,
          linea_aviso: dm
            ? "Tarifa final puede variar segun trafico real."
            : "No pude calcular la distancia exacta. Tarifa minima aplicada.",
          viaje_id: viajeId,
          origen,
          destino,
          notas: data.notas || "",
        },
      };
    }

    // ===== Step solicitar =====
    if (data.step === "solicitar" && data.viaje_id) {
      // Recuperar viaje
      const { data: viaje } = await sb
        .from("eco_viajes")
        .select("id,origen_direccion,destino_direccion,distancia_km,duracion_min,tarifa_estimada")
        .eq("id", data.viaje_id)
        .maybeSingle();

      if (!viaje) {
        return {
          version: "3.0",
          screen: "BUSCANDO",
          data: {
            linea_estado: "No encontre tu solicitud.",
            linea_detalle: "Vuelve a abrir el flow e intenta de nuevo.",
          },
        };
      }
      const v = viaje as {
        id: string;
        origen_direccion: string;
        destino_direccion: string;
        distancia_km: number;
        duracion_min: number;
        tarifa_estimada: number;
      };

      // Lookup nombre pasajero
      const { data: pas } = await sb
        .from("eco_pasajeros")
        .select("id,nombre")
        .eq("wa_id", waId)
        .eq("status", "approved")
        .maybeSingle();
      const pasajeroNombre = (pas as { nombre?: string } | null)?.nombre || "Pasajero";

      // Linkear pasajero_id si lo encontramos
      if (pas) {
        await sb
          .from("eco_viajes")
          .update({ pasajero_id: (pas as { id: string }).id })
          .eq("id", v.id);
      }

      const result = await buscarYAsignarChofer(
        v.id,
        v.origen_direccion,
        v.destino_direccion,
        v.distancia_km,
        v.duracion_min,
        v.tarifa_estimada,
        pasajeroNombre,
        data.notas || ""
      );

      return {
        version: "3.0",
        screen: "BUSCANDO",
        data: {
          linea_estado: result.ok
            ? "Buscando chofer cercano..."
            : "No hay choferes disponibles ahora.",
          linea_detalle: result.ok
            ? "Te avisamos por WhatsApp apenas un chofer acepte. Suele tomar menos de 2 minutos."
            : "Intenta de nuevo en unos minutos. Si urge, escribenos por aqui.",
        },
      };
    }

    return { version: "3.0", screen: "DESTINO", data: {} };
  },
};

export default flow;
