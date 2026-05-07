/**
 * Miss Sofia — Flow #2: Plan de estudio.
 *
 * 1 screen: hora preferida audio matutino + modo (estricto/suave) + dias semana.
 *
 * flow_token: "miss-sofia:plan-estudio:{user_id}"  (uuid mse_users.id)
 * Endpoint REST: POST /api/sofia-flows/study-plan
 */
import type { FlowDefinition, FlowRequestPayload } from "../../../wa-flows-platform/registry";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://activosya.com").replace(/\/$/, "");

type PlanSubmit = {
  preferred_morning_time?: string;
  mode?: string;
  weekdays?: string[];
};

const flow: FlowDefinition = {
  tenant: "miss-sofia",
  flow_key: "plan-estudio",
  meta: {
    name: "Sofia_Plan_Estudio_v1",
    description: "Plan de estudio — hora matutina, modo, dias de practica",
  },

  async handle(req: FlowRequestPayload) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }

    if (req.action === "INIT") {
      return {
        version: "3.0",
        screen: "PLAN",
        data: {
          linea_intro: "Configura tu rutina diaria. Puedes cambiarla cuando quieras.",
        },
      };
    }

    if (req.action !== "data_exchange") {
      return { version: "3.0", data: { status: "unknown_action" } };
    }

    const tokenParts = (req.flow_token || "").split(":");
    const userId = tokenParts[2] || "";
    const data = (req.data || {}) as PlanSubmit;

    if (!userId) {
      return {
        version: "3.0",
        screen: "PLAN",
        data: { linea_intro: "Sesion expirada. Vuelve a abrir el flow desde tu chat con Sofia." },
      };
    }

    try {
      const r = await fetch(`${BASE_URL}/api/sofia-flows/study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          preferred_morning_time: data.preferred_morning_time,
          mode: data.mode,
          weekdays: data.weekdays || [],
        }),
        cache: "no-store",
      });

      const body = (await r.json()) as {
        ok?: boolean;
        error?: string;
        plan?: { preferred_morning_time?: string; mode?: string; weekdays?: string[] };
      };

      if (!r.ok || !body.ok) {
        return {
          version: "3.0",
          screen: "PLAN",
          data: { linea_intro: body.error || "Revisa los datos e intenta de nuevo." },
        };
      }

      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token: req.flow_token,
              status: "plan_saved",
              preferred_morning_time: body.plan?.preferred_morning_time,
              mode: body.plan?.mode,
              weekdays: body.plan?.weekdays,
            },
          },
        },
      };
    } catch (e) {
      console.error("[sofia/plan-estudio handler]", (e as Error).message);
      return {
        version: "3.0",
        screen: "PLAN",
        data: { linea_intro: "No pude guardar el plan. Intenta de nuevo en unos segundos." },
      };
    }
  },
};

export default flow;
