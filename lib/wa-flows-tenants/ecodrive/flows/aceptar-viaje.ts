/**
 * EcoDrive+ Flow Aceptar Viaje (CHOFER).
 * Cuando un viaje es ofrecido al chofer, recibe template con boton que abre este flow.
 * Ve datos del viaje y elige aceptar o rechazar.
 *
 * Si acepta: crea eco_tracking_sessions + manda template eco_tracking_invite_v2 al pasajero.
 * Si rechaza: backend reasigna a otro chofer.
 */
import type { FlowDefinition } from "../../../wa-flows-platform/registry";
import { createClient } from "@supabase/supabase-js";
import { issueChoferTrackerToken } from "../../../ecodrive/tracker-token";
import { findNearestChofer } from "../../../ecodrive/matching";

type Payload = {
  step?: "respuesta";
  respuesta?: "aceptar" | "rechazar";
  viaje_id?: string;
};

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function lookupViajeForScreen(viajeId: string) {
  const sb = db();
  const { data: v } = await sb
    .from("eco_viajes")
    .select("id,origen_direccion,destino_direccion,distancia_km,duracion_min,tarifa_estimada,pasajero_wa_id,notas,estado")
    .eq("id", viajeId)
    .maybeSingle();
  if (!v) return null;
  const viaje = v as {
    id: string;
    origen_direccion: string;
    destino_direccion: string;
    distancia_km: number;
    duracion_min: number;
    tarifa_estimada: number;
    pasajero_wa_id: string;
    notas: string | null;
    estado: string;
  };
  const { data: p } = await sb
    .from("eco_pasajeros")
    .select("nombre")
    .eq("wa_id", viaje.pasajero_wa_id)
    .maybeSingle();
  const pasajeroNombre =
    (p as { nombre?: string } | null)?.nombre || "Pasajero";
  return { viaje, pasajeroNombre };
}

async function notificarPasajeroChoferAsignado(
  viajeId: string,
  choferId: string,
  pasajeroWaId: string,
  origen: string,
  km: number,
  min: number
): Promise<void> {
  const sb = db();

  const { data: chofer } = await sb
    .from("eco_choferes")
    .select("id,wa_id,nombre,vehiculo_marca,vehiculo_modelo,placa,rating,last_lat,last_lng")
    .eq("id", choferId)
    .maybeSingle();

  const c = chofer as {
    id: string;
    wa_id: string;
    nombre: string;
    vehiculo_marca: string;
    vehiculo_modelo: string;
    placa: string;
    rating: number | null;
    last_lat: number | null;
    last_lng: number | null;
  } | null;

  if (!c) return;

  // Marcar chofer en_turno=true para que sus pings GPS sean aceptados
  await sb
    .from("eco_choferes")
    .update({ en_turno: true, updated_at: new Date().toISOString() })
    .eq("id", c.id);

  // Usar lat/lng actual del chofer si tiene GPS, si no Trujillo centro
  const lat = c.last_lat ?? -8.115;
  const lng = c.last_lng ?? -79.029;

  const { data: session } = await sb
    .from("eco_tracking_sessions")
    .insert({
      wa_id: pasajeroWaId,
      chofer_nombre: c.nombre,
      chofer_rating: c.rating != null ? String(c.rating) : "5.0",
      vehiculo: `${c.vehiculo_marca} ${c.vehiculo_modelo}`.trim(),
      placa: c.placa,
      lat,
      lng,
      eta_min: min,
      distancia_km: String(km),
      estado: "En camino",
    })
    .select("id")
    .single();

  const sessionId = (session as { id: string } | null)?.id;
  if (!sessionId) return;

  const phoneId = process.env.ECODRIVE_META_PHONE_ID;
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN;
  if (!phoneId || !token) return;

  // 1) UN SOLO mensaje al pasajero — template eco_chofer_asignado con URL al tracking web real-time
  // (reemplaza al duplicado eco_tracking_invite_v2 [mapa estático] + mensaje libre que generaba 2 mensajes)
  try {
    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: pasajeroWaId,
        type: "template",
        template: {
          name: "eco_chofer_asignado",
          language: { code: "es" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: "amigo" },
                { type: "text", text: c.nombre.split(" ")[0] || "Chofer" },
                { type: "text", text: String(min) },
                { type: "text", text: `${c.vehiculo_marca} ${c.vehiculo_modelo}`.trim() },
                { type: "text", text: c.placa },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: viajeId }],
            },
          ],
        },
      }),
    });
  } catch {}

  // 3) Mandar al chofer un link a su tracker GPS PWA (para que su ubicacion se actualice en vivo)
  const choferTrackerToken = issueChoferTrackerToken(c.id);
  const choferTrackerUrl = `https://ecodriveplus.com/track-chofer/${choferTrackerToken}`;
  try {
    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: c.wa_id,
        type: "text",
        text: {
          body:
            `🚖 Aceptaste el viaje. Va a ${origen}\n\n` +
            `📡 Abre tu GPS para que el pasajero te vea en vivo:\n${choferTrackerUrl}\n\n` +
            `Acepta los permisos de ubicacion. Vas a recibir alarma cuando llegue otro pedido.`,
        },
      }),
    });
  } catch {}
}

async function reasignarOtroChofer(viajeId: string): Promise<void> {
  const sb = db();
  const { data: v } = await sb
    .from("eco_viajes")
    .select("origen_direccion,destino_direccion,origen_lat,origen_lng,distancia_km,duracion_min,tarifa_estimada,pasajero_wa_id,intentos_choferes,notas")
    .eq("id", viajeId)
    .maybeSingle();
  if (!v) return;
  const vv = v as {
    origen_direccion: string;
    destino_direccion: string;
    origen_lat: number | null;
    origen_lng: number | null;
    distancia_km: number;
    duracion_min: number;
    tarifa_estimada: number;
    pasajero_wa_id: string;
    intentos_choferes: string[];
    notas: string | null;
  };

  // Matching por distancia GPS al origen del viaje, excluyendo choferes que ya rechazaron
  const elegido = vv.origen_lat != null && vv.origen_lng != null
    ? await findNearestChofer(vv.origen_lat, vv.origen_lng, vv.intentos_choferes)
    : null;

  if (!elegido) {
    // Avisar al pasajero que no hay chofer cercano
    const phoneId = process.env.ECODRIVE_META_PHONE_ID;
    const token = process.env.ECODRIVE_META_ACCESS_TOKEN;
    if (phoneId && token) {
      try {
        await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: vv.pasajero_wa_id,
            type: "text",
            text: { body: "No hay choferes cerca de tu ubicacion ahora. Intenta nuevamente en unos minutos." },
          }),
        });
      } catch {}
    }
    await sb.from("eco_viajes").update({ estado: "rechazado_global", cancelado_at: new Date().toISOString() }).eq("id", viajeId);
    return;
  }

  // Lookup nombre pasajero
  const { data: pas } = await sb
    .from("eco_pasajeros")
    .select("nombre")
    .eq("wa_id", vv.pasajero_wa_id)
    .maybeSingle();
  const pasajeroNombre = (pas as { nombre?: string } | null)?.nombre || "Pasajero";

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
                  { type: "text", text: vv.origen_direccion.slice(0, 60) },
                  { type: "text", text: vv.destino_direccion.slice(0, 60) },
                  { type: "text", text: `${vv.distancia_km}` },
                  { type: "text", text: `${vv.tarifa_estimada}` },
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
    .update({ intentos_choferes: [...vv.intentos_choferes, elegido.id] })
    .eq("id", viajeId);
}

const flow: FlowDefinition = {
  tenant: "ecodrive",
  flow_key: "aceptar-viaje",
  meta: {
    name: "EcoDrive_Aceptar_Viaje_v1",
    description: "Chofer ve viaje y acepta o rechaza",
  },
  async handle(req) {
    if (req.action === "ping") return { version: "3.0", data: { status: "active" } };

    const tokenParts = (req.flow_token || "").split(":");
    const viajeIdFromToken = tokenParts[2] || "";
    const choferWaId = tokenParts[3] || ""; // opcional si lo agregamos

    if (req.action === "INIT") {
      const lookup = await lookupViajeForScreen(viajeIdFromToken);
      if (!lookup) {
        return {
          version: "3.0",
          screen: "VIAJE",
          data: {
            linea_origen: "Viaje no disponible",
            linea_destino: "",
            linea_distancia: "",
            linea_tarifa: "",
            linea_pasajero: "",
            linea_notas: "Posiblemente otro chofer ya lo tomo.",
            viaje_id: viajeIdFromToken,
          },
        };
      }
      const { viaje, pasajeroNombre } = lookup;
      return {
        version: "3.0",
        screen: "VIAJE",
        data: {
          linea_origen: `Sale de: ${viaje.origen_direccion}`,
          linea_destino: `Va a: ${viaje.destino_direccion}`,
          linea_distancia: `Distancia: ${viaje.distancia_km} km · ${viaje.duracion_min} min`,
          linea_tarifa: `Tarifa: S/ ${Number(viaje.tarifa_estimada).toFixed(2)}`,
          linea_pasajero: `Pasajero: ${pasajeroNombre}`,
          linea_notas: viaje.notas ? `Notas: ${viaje.notas}` : "Sin notas",
          viaje_id: viaje.id,
        },
      };
    }

    if (req.action !== "data_exchange") return { version: "3.0", data: { status: "unknown_action" } };

    const data = (req.data || {}) as Payload;
    if (data.step !== "respuesta" || !data.viaje_id) {
      return { version: "3.0", screen: "VIAJE", data: {} };
    }

    const sb = db();

    // Buscar el chofer por wa_id (que es el que esta abriendo este flow)
    // El waId del flow_token es el viaje_id, asi que tomamos del payload
    // Mejor: lookup chofer por su wa_id que llega en el meta header... pero no llega.
    // Solucion: el flow_token incluye chofer_wa_id como parte 3
    // (lo agregamos en pedir-viaje al disparar la notificacion).
    // Por ahora: buscamos al chofer por intentos_choferes (el ultimo)
    const { data: viajeRow } = await sb
      .from("eco_viajes")
      .select("intentos_choferes,estado,pasajero_wa_id,origen_direccion,distancia_km,duracion_min,tarifa_estimada")
      .eq("id", data.viaje_id)
      .maybeSingle();

    if (!viajeRow) {
      return {
        version: "3.0",
        screen: "VIAJE",
        data: {
          linea_origen: "Viaje no encontrado",
          linea_destino: "",
          linea_distancia: "",
          linea_tarifa: "",
          linea_pasajero: "",
          linea_notas: "",
          viaje_id: data.viaje_id,
        },
      };
    }
    const vRow = viajeRow as {
      intentos_choferes: string[];
      estado: string;
      pasajero_wa_id: string;
      origen_direccion: string;
      distancia_km: number;
      duracion_min: number;
      tarifa_estimada: number;
    };

    if (vRow.estado === "asignado" || vRow.estado === "en_curso" || vRow.estado === "completado") {
      return {
        version: "3.0",
        screen: "VIAJE",
        data: {
          linea_origen: "Viaje ya tomado por otro chofer",
          linea_destino: "",
          linea_distancia: "",
          linea_tarifa: "",
          linea_pasajero: "",
          linea_notas: "Estaras al primero proximo viaje.",
          viaje_id: data.viaje_id,
        },
      };
    }

    const choferIdActual = vRow.intentos_choferes[vRow.intentos_choferes.length - 1];

    if (data.respuesta === "aceptar") {
      await sb
        .from("eco_viajes")
        .update({
          estado: "asignado",
          chofer_id: choferIdActual,
          asignado_at: new Date().toISOString(),
        })
        .eq("id", data.viaje_id);

      // Notificar pasajero con tracking
      await notificarPasajeroChoferAsignado(
        data.viaje_id,
        choferIdActual,
        vRow.pasajero_wa_id,
        vRow.origen_direccion,
        vRow.distancia_km,
        vRow.duracion_min
      );

      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token: req.flow_token,
              status: "accepted",
            },
          },
        },
      };
    }

    // rechazar -> reasignar
    if (data.respuesta === "rechazar") {
      await reasignarOtroChofer(data.viaje_id);
      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token: req.flow_token,
              status: "rejected",
            },
          },
        },
      };
    }

    return { version: "3.0", screen: "VIAJE", data: {} };
  },
};

export default flow;
