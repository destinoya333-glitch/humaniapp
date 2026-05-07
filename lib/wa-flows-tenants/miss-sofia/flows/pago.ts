/**
 * Miss Sofia — Flow #3: Pago Cuna / Cuna VIP.
 *
 * 2 screens:
 *  - COMPARATIVA: cards Cuna S/39 vs Cuna VIP S/89, boton "Continuar al pago"
 *  - PAGO: seleccion plan+billing + Yape destination + input codigo operacion
 *
 * Pricing single source de truth: el endpoint REST. Aqui lo replicamos para
 * el rendering de la primera pantalla (texto comparativa).
 *
 * flow_token: "miss-sofia:pago:{phone}"  (E.164; user_id se asocia despues si existe)
 * Endpoint REST: POST /api/sofia-flows/payment
 */
import type { FlowDefinition, FlowRequestPayload } from "../../../wa-flows-platform/registry";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://activosya.com").replace(/\/$/, "");

// Espejo del endpoint para texto de comparativa. Si cambia el endpoint, cambiar aqui.
const PRICING_DISPLAY = {
  cuna_monthly: 39,
  cuna_yearly: 349,
  premium_monthly: 89,
  premium_yearly: 799,
};

type PagoSubmit = {
  step?: string;
  plan_billing?: string; // ej "cuna_monthly", "premium_yearly"
  yape_operation_code?: string;
};

function planBillingFromKey(key: string): { plan: string; billing: string } | null {
  if (!key) return null;
  const parts = key.split("_");
  if (parts.length < 2) return null;
  const billing = parts[parts.length - 1]; // ultima parte
  const plan = parts.slice(0, -1).join("_"); // resto
  if (!["monthly", "yearly"].includes(billing)) return null;
  if (!["cuna", "premium", "cuna_vip", "regular"].includes(plan)) return null;
  return { plan, billing };
}

const flow: FlowDefinition = {
  tenant: "miss-sofia",
  flow_key: "pago",
  meta: {
    name: "Sofia_Pago_v1",
    description: "Pago Cuna / Cuna VIP — Yape persona-a-persona, validacion MacroDroid",
  },

  async handle(req: FlowRequestPayload) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }

    if (req.action === "INIT") {
      // Pre-armar texto comparativa (Meta no interpola texto inline mixto).
      return {
        version: "3.0",
        screen: "COMPARATIVA",
        data: {
          linea_titulo: "Sofia Regular o Sofia Premium",
          linea_cuna: `Regular - S/${PRICING_DISPLAY.cuna_monthly}/mes o S/${PRICING_DISPLAY.cuna_yearly}/ano. Audios diarios ilimitados con voz Nova + chat con Sofia + novela personal.`,
          linea_vip: `Premium - S/${PRICING_DISPLAY.premium_monthly}/mes o S/${PRICING_DISPLAY.premium_yearly}/ano. Voz ElevenLabs (45 min/mes) + capitulos novela + audio diario inmediato + Sello Cuna nativo USA.`,
          linea_garantia: "Garantia Klaric 6 meses: si no progresas, te devolvemos cada centavo.",
        },
      };
    }

    if (req.action !== "data_exchange") {
      return { version: "3.0", data: { status: "unknown_action" } };
    }

    const tokenParts = (req.flow_token || "").split(":");
    const phone = tokenParts[2] || "";
    const data = (req.data || {}) as PagoSubmit;

    // Step 1: usuario presiono "Continuar al pago" -> mostrar pantalla PAGO con Yape destination.
    if (data.step === "to_pago") {
      return {
        version: "3.0",
        screen: "PAGO",
        data: {
          linea_titulo: "Pago por Yape",
          linea_yape: "Yapea a Percy Roj* — 998 102 258",
          linea_instrucciones: "Selecciona tu plan y yapea el monto exacto. Detectamos tu pago automaticamente.",
          // Bindings para los radios del form.
          option_cuna_monthly: `Regular · S/${PRICING_DISPLAY.cuna_monthly}/mes`,
          option_cuna_yearly: `Regular · S/${PRICING_DISPLAY.cuna_yearly}/ano`,
          option_premium_monthly: `Premium · S/${PRICING_DISPLAY.premium_monthly}/mes`,
          option_premium_yearly: `Premium · S/${PRICING_DISPLAY.premium_yearly}/ano`,
        },
      };
    }

    // Step 2: usuario submitio el pago.
    if (data.step === "submit_pago") {
      const parsed = planBillingFromKey(data.plan_billing || "");
      if (!parsed) {
        return {
          version: "3.0",
          screen: "PAGO",
          data: {
            linea_titulo: "Selecciona un plan valido",
            linea_yape: "Yapea a Percy Roj* — 998 102 258",
            linea_instrucciones: "Elige una opcion y vuelve a confirmar.",
            option_cuna_monthly: `Cuna · S/${PRICING_DISPLAY.cuna_monthly}/mes`,
            option_cuna_yearly: `Cuna · S/${PRICING_DISPLAY.cuna_yearly}/ano`,
            option_premium_monthly: `Cuna VIP · S/${PRICING_DISPLAY.premium_monthly}/mes`,
            option_premium_yearly: `Cuna VIP · S/${PRICING_DISPLAY.premium_yearly}/ano`,
          },
        };
      }

      try {
        const r = await fetch(`${BASE_URL}/api/sofia-flows/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone,
            plan: parsed.plan,
            billing: parsed.billing,
            yape_operation_code: data.yape_operation_code,
          }),
          cache: "no-store",
        });

        const body = (await r.json()) as {
          ok?: boolean;
          error?: string;
          payment_id?: string;
          amount_pen?: number;
          message?: string;
        };

        if (!r.ok || !body.ok) {
          return {
            version: "3.0",
            screen: "PAGO",
            data: {
              linea_titulo: body.error || "No pude registrar el pago. Revisa el monto.",
              linea_yape: "Yapea a Percy Roj* — 998 102 258",
              linea_instrucciones: "Vuelve a intentar y selecciona un plan valido.",
              option_cuna_monthly: `Cuna · S/${PRICING_DISPLAY.cuna_monthly}/mes`,
              option_cuna_yearly: `Cuna · S/${PRICING_DISPLAY.cuna_yearly}/ano`,
              option_premium_monthly: `Cuna VIP · S/${PRICING_DISPLAY.premium_monthly}/mes`,
              option_premium_yearly: `Cuna VIP · S/${PRICING_DISPLAY.premium_yearly}/ano`,
            },
          };
        }

        return {
          version: "3.0",
          screen: "SUCCESS",
          data: {
            extension_message_response: {
              params: {
                flow_token: req.flow_token,
                status: "payment_pending_validation",
                payment_id: body.payment_id,
                amount_pen: body.amount_pen,
                message: body.message || "Pago registrado, validamos en minutos.",
              },
            },
          },
        };
      } catch (e) {
        console.error("[sofia/pago handler]", (e as Error).message);
        return {
          version: "3.0",
          screen: "PAGO",
          data: {
            linea_titulo: "Error temporal del servidor",
            linea_yape: "Yapea a Percy Roj* — 998 102 258",
            linea_instrucciones: "Reintenta en unos segundos.",
            option_cuna_monthly: `Cuna · S/${PRICING_DISPLAY.cuna_monthly}/mes`,
            option_cuna_yearly: `Cuna · S/${PRICING_DISPLAY.cuna_yearly}/ano`,
            option_premium_monthly: `Cuna VIP · S/${PRICING_DISPLAY.premium_monthly}/mes`,
            option_premium_yearly: `Cuna VIP · S/${PRICING_DISPLAY.premium_yearly}/ano`,
          },
        };
      }
    }

    return { version: "3.0", screen: "COMPARATIVA", data: {} };
  },
};

export default flow;
