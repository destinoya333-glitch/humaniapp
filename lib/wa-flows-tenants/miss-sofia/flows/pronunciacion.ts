/**
 * Miss Sofia — Flow #5: Test pronunciacion.
 *
 * IMPORTANTE: Meta WhatsApp Flows v7 NO tiene componente AudioRecorder nativo.
 * Patron implementado:
 *  - Screen 1 (FRASE): muestra una frase target en ingles + boton "Estoy listo".
 *  - Al cerrar el flow, marca en mse_student_profiles.personal_facts un flag
 *    `cuna_pronunciation_pending = { target_phrase, started_at }`.
 *  - El bot WhatsApp (whatsapp-agent.ts) detecta el siguiente voice message
 *    del usuario, lee el flag, y llama POST /api/sofia-flows/pronunciation.
 *  - Bot responde con score + feedback. Borra el flag.
 *
 * La integracion del lado bot queda como pendiente coordinado con la otra
 * ventana (curriculum + voz).
 *
 * flow_token: "miss-sofia:pronunciacion:{user_id}"
 */
import type { FlowDefinition, FlowRequestPayload } from "../../../wa-flows-platform/registry";
import { createClient } from "@supabase/supabase-js";

// Pool inicial de frases por fase. La frase real se selecciona deterministicamente
// segun el dia para que dos usuarios distintos puedan ver frases distintas.
const PHRASES_BY_PHASE: Record<number, string[]> = {
  0: [
    "Good morning.",
    "Thank you very much.",
    "How are you today?",
    "I am fine.",
  ],
  1: [
    "I would like a coffee, please.",
    "Where is the bathroom?",
    "Can you help me?",
    "I am hungry.",
  ],
  2: [
    "I want to learn English fast.",
    "She works at the hospital.",
    "We are going to the market.",
    "I need to call my mother.",
  ],
  3: [
    "When I was a child, I lived near the beach.",
    "I think this country has a lot of potential.",
    "Could you explain that one more time?",
  ],
  4: [
    "The series finale completely changed my opinion of the main character.",
    "If I had known earlier, I would have made a different decision.",
  ],
  5: [
    "From a strategic standpoint, the implications of this decision are significant.",
    "Although I appreciate your perspective, I respectfully disagree with the conclusion.",
  ],
};

function pickPhraseForDay(phase: number, dayIso: string): string {
  const pool = PHRASES_BY_PHASE[phase] || PHRASES_BY_PHASE[0];
  // Hash deterministico simple a partir del dia + fase.
  let hash = 0;
  const s = `${phase}:${dayIso}`;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % pool.length;
  return pool[idx];
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const flow: FlowDefinition = {
  tenant: "miss-sofia",
  flow_key: "pronunciacion",
  meta: {
    name: "Sofia_Pronunciacion_v1",
    description: "Test pronunciacion — frase target + handoff al bot para grabar audio",
  },

  async handle(req: FlowRequestPayload) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }

    const tokenParts = (req.flow_token || "").split(":");
    const userId = tokenParts[2] || "";

    if (req.action === "INIT") {
      // Lookup fase del usuario para pickear frase apropiada.
      let phase = 0;
      if (userId) {
        try {
          const { data: profile } = await db()
            .from("mse_student_profiles")
            .select("current_phase")
            .eq("user_id", userId)
            .maybeSingle();
          if (profile && typeof profile.current_phase === "number") {
            phase = profile.current_phase;
          }
        } catch {
          // ignore, default fase 0
        }
      }
      const today = new Date().toISOString().slice(0, 10);
      const targetPhrase = pickPhraseForDay(phase, today);

      return {
        version: "3.0",
        screen: "FRASE",
        data: {
          target_phrase: targetPhrase,
          linea_titulo: "Test de pronunciacion",
          linea_instruccion: "Lee esta frase en ingles. Cuando estes listo, presiona el boton y graba un audio en WhatsApp diciendo la frase.",
          linea_pista: "Habla con calma y vocaliza claro. Te puntuo 0-100 y te doy feedback.",
        },
      };
    }

    if (req.action !== "data_exchange") {
      return { version: "3.0", data: { status: "unknown_action" } };
    }

    const data = (req.data || {}) as { target_phrase?: string };
    const targetPhrase = (data.target_phrase || "").trim();

    // Marcar en personal_facts que el usuario espera evaluacion de esta frase.
    if (userId && targetPhrase) {
      try {
        const { data: profile } = await db()
          .from("mse_student_profiles")
          .select("personal_facts")
          .eq("user_id", userId)
          .maybeSingle();
        const merged: Record<string, unknown> = {
          ...((profile?.personal_facts as Record<string, unknown> | null) ?? {}),
          cuna_pronunciation_pending: {
            target_phrase: targetPhrase,
            started_at: new Date().toISOString(),
          },
        };
        await db()
          .from("mse_student_profiles")
          .update({ personal_facts: merged })
          .eq("user_id", userId);
      } catch (e) {
        console.error("[sofia/pronunciacion flag]", (e as Error).message);
        // sigue de todos modos; el bot tiene un fallback.
      }
    }

    return {
      version: "3.0",
      screen: "SUCCESS",
      data: {
        extension_message_response: {
          params: {
            flow_token: req.flow_token,
            status: "awaiting_audio",
            target_phrase: targetPhrase,
            message: `Listo. Ahora envia un audio diciendo: "${targetPhrase}"`,
          },
        },
      },
    };
  },
};

export default flow;
