/**
 * EcoDrive+ Hello Test — primer flow para validar pipeline encripción.
 * Solo prueba el roundtrip request → decrypt → response → encrypt.
 *
 * Una pantalla con texto "Hola desde EcoDrive+" y botón "Cerrar".
 */
import type { FlowDefinition } from "../../../wa-flows-platform/registry";

const flow: FlowDefinition = {
  tenant: "ecodrive",
  flow_key: "hello-test",
  meta: {
    name: "EcoDrive+ Hello Test",
    description: "Flow de prueba para validar pipeline de encripción",
  },
  async handle(req) {
    // Si action='ping', Meta solo está validando que el endpoint vive
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }

    // INIT: primera llamada al abrir el flow
    if (req.action === "INIT") {
      return {
        version: "3.0",
        screen: "WELCOME",
        data: {
          mensaje_principal: "🚗 Hola desde EcoDrive+",
          mensaje_sub: "Pipeline de encripción funcionando correctamente.",
        },
      };
    }

    // data_exchange: usuario interactuó (presionó botón)
    if (req.action === "data_exchange") {
      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token: req.flow_token,
              status: "completed",
            },
          },
        },
      };
    }

    return {
      version: "3.0",
      data: { status: "unknown_action" },
      error_msg: `Action ${req.action} no implementada`,
    };
  },
};

export default flow;
