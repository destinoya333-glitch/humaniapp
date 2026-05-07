/**
 * Miss Sofia — Flow #1: Pacto Cuna ("Quién eres").
 *
 * Reemplaza el placement test CEFR (CEFR fue descartado el 2026-05-03).
 * 1 screen unica: nombre + ciudad + motivacion + minutos/dia + checkbox compromiso.
 *
 * flow_token: "miss-sofia:pacto-cuna:{phone}"  (phone E.164)
 * Endpoint REST: POST /api/sofia-flows/pacto
 */
import type { FlowDefinition, FlowRequestPayload } from "../../../wa-flows-platform/registry";
import { sendText, sendTextWithAudio } from "../../../miss-sofia-voice/meta-cloud-sender";
import { sendSofiaFlow } from "../../../miss-sofia-voice/flow-sender";
import { updateLead } from "../../../miss-sofia-voice/whatsapp-leads";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://activosya.com").replace(/\/$/, "");

type PactoSubmit = {
  name?: string;
  city?: string;
  motivation?: string;
  minutes_per_day?: string | number;
  committed?: boolean | string[];
};

const flow: FlowDefinition = {
  tenant: "miss-sofia",
  flow_key: "pacto-cuna",
  meta: {
    name: "Sofia_Pacto_Cuna_v1",
    description: "Pacto Cuna — quien eres + compromiso 30 dias Fase Cuna",
  },

  async handle(req: FlowRequestPayload) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }

    if (req.action === "INIT") {
      return {
        version: "3.0",
        screen: "PACTO",
        data: {
          // Estos textos se muestran a nivel de pantalla, no inline mixto.
          linea_intro: "Antes de empezar, necesito conocerte.",
          linea_compromiso: "Me comprometo a 30 dias de Fase Cuna (escuchar sin presion).",
        },
      };
    }

    if (req.action !== "data_exchange") {
      return { version: "3.0", data: { status: "unknown_action" } };
    }

    const tokenParts = (req.flow_token || "").split(":");
    const phone = tokenParts[2] || ""; // E.164 viene en el token
    const data = (req.data || {}) as PactoSubmit;

    // Meta a veces manda checkbox como array de keys seleccionadas, otras como bool.
    const committed = Array.isArray(data.committed)
      ? data.committed.includes("yes")
      : data.committed === true;

    const minutes = Number(data.minutes_per_day);

    try {
      const r = await fetch(`${BASE_URL}/api/sofia-flows/pacto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: data.name,
          city: data.city,
          motivation: data.motivation,
          minutes_per_day: minutes,
          committed,
        }),
        cache: "no-store",
      });

      const body = (await r.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        signup_url?: string;
        day1_audio_url?: string;
        lead_id?: string;
      };

      if (!r.ok || !body.ok) {
        // Mostramos el error en la misma pantalla en lugar de cerrar el flow.
        return {
          version: "3.0",
          screen: "PACTO",
          data: {
            linea_intro: body.error || "Hubo un problema. Revisa los datos e intenta de nuevo.",
            linea_compromiso: "Me comprometo a 30 dias de Fase Cuna (escuchar sin presion).",
          },
        };
      }

      // Post-Pacto sealed: mandar al user via Meta Cloud:
      //  1. Texto bienvenida + audio Día 1 (hero context)
      //  2. Flow Plan Estudio (siguiente paso del onboarding)
      // Si Meta no esta configurado, el user ve solo el message en
      // extension_message_response y se entera por el funnel WhatsApp text.
      try {
        const phoneE164 = phone.startsWith("+") ? phone : `+${phone}`;
        const userName = (data.name || "").trim().split(/\s+/)[0] || "";
        const intro =
          `🤝 *Pacto sellado${userName ? ", " + userName : ""}.*\n\n` +
          `Bienvenido a tu *Día 1 de la Fase Cuna*. 🌙\n\n` +
          `Ahora escucha esto. No traduzcas. No repitas. Solo escucha (90 segundos):`;
        if (body.day1_audio_url) {
          await sendTextWithAudio(phoneE164, intro, body.day1_audio_url);
        } else {
          await sendText(phoneE164, intro);
        }
        // Update chat_state a dia_uno_sent (el endpoint REST ya lo hace, pero
        // garantizamos consistencia post-Flow).
        await updateLead(phoneE164, { chat_state: "dia_uno_sent" }).catch(() => {});

        // Encadenar: 30s después manda Flow Plan Estudio para configurar rutina
        // Lo hacemos sin await para no bloquear la respuesta al Flow.
        void (async () => {
          await new Promise((r) => setTimeout(r, 30_000));
          await sendText(
            phoneE164,
            "Ahora vamos a configurar tu rutina diaria — hora del audio matutino y dias que practicas. Solo 30 seg."
          );
          await sendSofiaFlow({
            phone: phoneE164,
            flowKey: "plan-estudio",
            userIdOrPhone: phoneE164,
          });
        })();
      } catch (e) {
        console.error("[sofia/pacto-cuna post-submit]", (e as Error).message);
      }

      // Cierra el flow con respuesta -> el bot continua la conversacion.
      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token: req.flow_token,
              status: "pacto_sealed",
              lead_id: body.lead_id,
              signup_url: body.signup_url,
              day1_audio_url: body.day1_audio_url,
              message: body.message || "Pacto sellado. Empezamos tu Fase Cuna.",
            },
          },
        },
      };
    } catch (e) {
      console.error("[sofia/pacto-cuna handler]", (e as Error).message);
      return {
        version: "3.0",
        screen: "PACTO",
        data: {
          linea_intro: "No pude guardar tu pacto. Intenta de nuevo en unos segundos.",
          linea_compromiso: "Me comprometo a 30 dias de Fase Cuna (escuchar sin presion).",
        },
      };
    }
  },
};

export default flow;
