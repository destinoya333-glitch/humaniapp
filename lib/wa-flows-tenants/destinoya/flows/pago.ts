/**
 * TuDestinoYa — Flow Pago Yape.
 *
 * 1 screen PAGO + SUCCESS.
 * Usuario selecciona plan + ingresa código de operación → registra pago_pendiente
 * en destinoya_pagos. MadroDroid después matchea con notificación Yape externa.
 *
 * flow_token: "destinoya:pago:{phone}"
 */
import type { FlowDefinition, FlowRequestPayload } from "../../../wa-flows-platform/registry";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRICING: Record<string, number> = {
  basico: 3,
  intermedio: 6,
  premium: 9,
  pro: 9.9,
  vip_mensual: 18,
  vip_anual: 63,
};

const SCREEN_PAGO_DATA = {
  linea_titulo: "Pago por Yape",
  linea_yape: "Yapea a Percy Roj* — 998 102 258",
  linea_instrucciones:
    "Selecciona el plan que ya yapeaste y pega el código de operación.",
  option_basico: "Básico · S/3",
  option_intermedio: "Intermedio · S/6",
  option_premium: "Premium · S/9",
  option_pro: "PRO · S/9.90",
  option_vip_mensual: "VIP Mensual · S/18",
  option_vip_anual: "VIP Anual · S/63",
};

type PagoSubmit = {
  step?: string;
  plan?: string;
  operacion?: string;
};

const flow: FlowDefinition = {
  tenant: "destinoya",
  flow_key: "pago",
  meta: {
    name: "DestinoYa_Pago_v1",
    description: "Pago Yape — registra pago_pendiente, MadroDroid valida.",
  },

  async handle(req: FlowRequestPayload) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }

    if (req.action === "INIT") {
      return { version: "3.0", screen: "PAGO", data: SCREEN_PAGO_DATA };
    }

    if (req.action !== "data_exchange") {
      return { version: "3.0", data: { status: "unknown_action" } };
    }

    const tokenParts = (req.flow_token || "").split(":");
    const phone = tokenParts[2] || "";
    const data = (req.data || {}) as PagoSubmit;

    if (data.step === "submit_pago") {
      const plan = data.plan || "";
      const operacion = (data.operacion || "").trim();
      const monto = PRICING[plan];

      if (!monto || !operacion) {
        return {
          version: "3.0",
          screen: "PAGO",
          data: {
            ...SCREEN_PAGO_DATA,
            linea_titulo: "Datos incompletos",
            linea_instrucciones: "Selecciona plan y pega código de operación.",
          },
        };
      }

      // Registrar pago_pendiente
      try {
        await supabase.from("destinoya_pagos").insert({
          celular: phone,
          monto: String(monto),
          operacion,
          estado: "esperando_pago",
          servicio: plan,
        });
      } catch (e) {
        console.error("[destinoya/pago handler]", (e as Error).message);
      }

      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token: req.flow_token,
              status: "pago_registrado",
              plan,
              monto,
              operacion,
            },
          },
        },
      };
    }

    return { version: "3.0", screen: "PAGO", data: SCREEN_PAGO_DATA };
  },
};

export default flow;
