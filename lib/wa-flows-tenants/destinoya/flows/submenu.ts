/**
 * TuDestinoYa — Sub-menu Flow genérico.
 * Uso: tras Menu Flow, bot envia este Flow con flow_token "destinoya:submenu:{categoria}:{phone}".
 * Handler lee categoria y devuelve sub-servicios correspondientes en INIT.
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
};

const SUBSERVICIOS: Record<string, { titulo: string; intro: string; subs: string[] }> = {
  esoterico: {
    titulo: "🔮 DestinoYA Esotérico",
    intro: "Elige sub-servicio + plan. Yapeas, pegas la operación y empezamos.",
    subs: [
      "Lectura de Mano",
      "Compatibilidad Amorosa",
      "Carta Astral",
      "Tu Futuro 30/60/90 días",
      "Feng Shui Express",
      "Numerología Personal",
    ],
  },
  profesional: {
    titulo: "💼 Área Profesional",
    intro: "Elige especialidad + plan. Después yapeas y empezamos tu consulta.",
    subs: [
      "Asesoría Legal Express",
      "Salud Express",
      "Veterinaria Express",
      "Plantas y Cultivos",
      "Asesor Financiero Personal",
      "Nutricionista Express",
    ],
  },
  rapidas: {
    titulo: "⚡ Soluciones Rápidas",
    intro: "Elige solución + plan. Ágil y al grano.",
    subs: [
      "Elaborar o Mejorar mi CV",
      "Consejo para mi problema",
      "Decisión que me conviene tomar",
      "Analizar problema y dar solución",
      "Plan para bajar de peso",
      "Alimentación personalizada",
    ],
  },
};

const PLAN_LABELS: Record<string, string> = {
  basico: "Básico · S/3 · 3 secciones",
  intermedio: "Intermedio · S/6 · 4 secciones",
  premium: "Premium · S/9 · 6 secciones",
  pro: "PRO · S/9.90 · profundo",
};

function dataForCategoria(cat: string) {
  const c = SUBSERVICIOS[cat] || SUBSERVICIOS.esoterico;
  return {
    linea_titulo: c.titulo,
    linea_intro: c.intro,
    linea_yape: "Yape: 998 102 258 (Percy Roj*)",
    sub_1: c.subs[0],
    sub_2: c.subs[1],
    sub_3: c.subs[2],
    sub_4: c.subs[3],
    sub_5: c.subs[4],
    sub_6: c.subs[5],
    plan_basico: PLAN_LABELS.basico,
    plan_intermedio: PLAN_LABELS.intermedio,
    plan_premium: PLAN_LABELS.premium,
    plan_pro: PLAN_LABELS.pro,
  };
}

type SubmenuSubmit = {
  step?: string;
  sub_servicio?: string;
  plan?: string;
};

const flow: FlowDefinition = {
  tenant: "destinoya",
  flow_key: "submenu",
  meta: {
    name: "DestinoYa_SubMenu_v1",
    description: "Sub-menu genérico (esoterico/profesional/rapidas) + plan + Yape.",
  },

  async handle(req: FlowRequestPayload) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }

    // flow_token format: destinoya:submenu:{categoria}:{phone}
    const tokenParts = (req.flow_token || "").split(":");
    const categoria = tokenParts[2] || "esoterico";
    const phone = tokenParts[3] || "";

    if (req.action === "INIT") {
      return { version: "3.0", screen: "SUBMENU", data: dataForCategoria(categoria) };
    }
    if (req.action !== "data_exchange") {
      return { version: "3.0", data: { status: "unknown_action" } };
    }

    const data = (req.data || {}) as SubmenuSubmit;
    if (data.step === "submit") {
      const plan = data.plan || "";
      const monto = PRICING[plan];
      const subId = data.sub_servicio || "";
      const subTitulo = SUBSERVICIOS[categoria]?.subs[parseInt(subId, 10) - 1] || "";

      if (!monto || !subId) {
        return {
          version: "3.0",
          screen: "SUBMENU",
          data: {
            ...dataForCategoria(categoria),
            linea_titulo: "Datos incompletos",
            linea_intro: "Selecciona sub-servicio y plan.",
          },
        };
      }

      try {
        await supabase.from("destinoya_pagos").insert({
          celular: phone,
          monto: String(monto),
          operacion: null,
          estado: "esperando_pago",
          servicio: `${categoria}:${subTitulo}`,
        });
      } catch (e) {
        console.error("[destinoya/submenu]", (e as Error).message);
      }

      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token: req.flow_token,
              status: "submenu_listo",
              categoria,
              sub_servicio: subTitulo,
              plan,
              monto,
            },
          },
        },
      };
    }
    return { version: "3.0", screen: "SUBMENU", data: dataForCategoria(categoria) };
  },
};

export default flow;
