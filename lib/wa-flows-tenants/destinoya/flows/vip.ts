/**
 * TuDestinoYa — Flow VIP signup.
 * 2 screens: VIP_INFO + VIP_PAGO. Submit registra pago_pendiente vip.
 */
import type { FlowDefinition, FlowRequestPayload } from "../../../wa-flows-platform/registry";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRICING: Record<string, number> = {
  vip_mensual: 18,
  vip_anual: 63,
};

const SCREEN_INFO_DATA = {
  linea_titulo: "DestinoYA VIP — Servicios ilimitados",
  linea_mensual: "Mensual S/18 · todos los servicios ilimitados por 30 días",
  linea_anual: "Anual S/63 · todos los servicios ilimitados por 365 días (ahorras S/153)",
  linea_garantia: "Garantía: si no quedas satisfecho, te devuelvo lo pagado.",
};

const SCREEN_PAGO_DATA = {
  linea_titulo: "Pago VIP por Yape",
  linea_yape: "Yapea a Percy Roj* — 998 102 258",
  linea_instrucciones: "Yapea el monto exacto y pega el código de operación.",
  option_mensual: "Mensual · S/18",
  option_anual: "Anual · S/63 (ahorras S/153)",
};

type VipSubmit = {
  step?: string;
  plan?: string;
  operacion?: string;
};

const flow: FlowDefinition = {
  tenant: "destinoya",
  flow_key: "vip",
  meta: {
    name: "DestinoYa_VIP_v1",
    description: "VIP signup mensual o anual.",
  },

  async handle(req: FlowRequestPayload) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }
    if (req.action === "INIT") {
      return { version: "3.0", screen: "VIP_INFO", data: SCREEN_INFO_DATA };
    }
    if (req.action !== "data_exchange") {
      return { version: "3.0", data: { status: "unknown_action" } };
    }
    const tokenParts = (req.flow_token || "").split(":");
    const phone = tokenParts[2] || "";
    const data = (req.data || {}) as VipSubmit;

    if (data.step === "to_pago_vip") {
      return { version: "3.0", screen: "VIP_PAGO", data: SCREEN_PAGO_DATA };
    }

    if (data.step === "submit_vip") {
      const plan = data.plan || "";
      const operacion = (data.operacion || "").trim();
      const monto = PRICING[plan];
      if (!monto || !operacion) {
        return {
          version: "3.0",
          screen: "VIP_PAGO",
          data: {
            ...SCREEN_PAGO_DATA,
            linea_titulo: "Datos incompletos",
            linea_instrucciones: "Selecciona plan y pega código de operación.",
          },
        };
      }
      try {
        await supabase.from("destinoya_pagos").insert({
          celular: phone,
          monto: String(monto),
          operacion,
          estado: "esperando_pago",
          servicio: plan,
        });
      } catch (e) {
        console.error("[destinoya/vip handler]", (e as Error).message);
      }
      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token: req.flow_token,
              status: "vip_pendiente",
              plan,
              monto,
              operacion,
            },
          },
        },
      };
    }
    return { version: "3.0", screen: "VIP_INFO", data: SCREEN_INFO_DATA };
  },
};

export default flow;
