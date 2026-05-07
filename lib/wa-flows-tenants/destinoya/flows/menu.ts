/**
 * TuDestinoYa — Flow Menu principal.
 * Single screen: 5 servicios + RadioButtons. Submit → bot continúa por chat.
 */
import type { FlowDefinition, FlowRequestPayload } from "../../../wa-flows-platform/registry";

const SCREEN_DATA = {
  linea_titulo: "¿Qué necesitas hoy?",
  linea_intro:
    "Selecciona el servicio que más te ayude. Tras tu elección, te muestro planes y precios.",
  option_esoterico: "🔮 DestinoYA Esotérico",
  option_profesional: "💼 Área Profesional",
  option_rapidas: "⚡ Soluciones Rápidas",
  option_vip: "✨ DestinoYA VIP",
  option_gratuita: "🎁 Lectura Gratuita (1 vez)",
};

type MenuSubmit = {
  step?: string;
  servicio?: string;
};

const flow: FlowDefinition = {
  tenant: "destinoya",
  flow_key: "menu",
  meta: {
    name: "DestinoYa_Menu_v1",
    description: "Menu principal — 5 servicios.",
  },

  async handle(req: FlowRequestPayload) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }
    if (req.action === "INIT") {
      return { version: "3.0", screen: "MENU", data: SCREEN_DATA };
    }
    if (req.action !== "data_exchange") {
      return { version: "3.0", data: { status: "unknown_action" } };
    }
    const data = (req.data || {}) as MenuSubmit;
    if (data.step === "submit_menu") {
      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token: req.flow_token,
              status: "menu_seleccionado",
              servicio: data.servicio,
            },
          },
        },
      };
    }
    return { version: "3.0", screen: "MENU", data: SCREEN_DATA };
  },
};

export default flow;
