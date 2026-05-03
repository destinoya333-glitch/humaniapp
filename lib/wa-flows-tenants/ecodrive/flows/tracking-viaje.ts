/**
 * EcoDrive+ Tracking Viaje — flow real productivo.
 * Cuando el pasajero clickea "Ver mapa en vivo" en el mensaje WhatsApp,
 * se abre este flow que muestra:
 *  - Nombre + rating del chofer
 *  - Vehículo + placa
 *  - ETA + estado
 *  - Botón "Cerrar tracking"
 *
 * En V2 se agregará: mapa dinámico, botón llamar, compartir con familia.
 */
import type { FlowDefinition, FlowRequestPayload } from "../../../wa-flows-platform/registry";

const flow: FlowDefinition = {
  tenant: "ecodrive",
  flow_key: "tracking-viaje",
  meta: {
    name: "EcoDrive_Tracking_Viaje_v1",
    description: "Tracking en vivo del viaje: chofer, vehículo, ETA",
  },
  async handle(req: FlowRequestPayload) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }

    if (req.action === "INIT") {
      // V1: datos hardcoded. V2: lookup viaje activo del usuario
      const data = (req.data || {}) as Record<string, string>;
      return {
        version: "3.0",
        screen: "TRACKING",
        data: {
          chofer_nombre: data.chofer_nombre || "Pepe García",
          chofer_rating: data.chofer_rating || "4.9",
          vehiculo: data.vehiculo || "Toyota Yaris · ABC-123",
          eta_min: data.eta_min || "4",
          estado: data.estado || "En camino",
        },
      };
    }

    // data_exchange: usuario presionó "Cerrar tracking"
    if (req.action === "data_exchange") {
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
