/**
 * Miss Sofia — Flow #4: Progreso semanal (read-only).
 *
 * 1 screen: badge fase + tiempo de boca + palabras tuyas + hitos + capitulo novela.
 * Toda la data se carga en INIT desde GET /api/sofia-flows/progress?user_id=
 * y se pre-arma como strings atomicos por gotcha #2 (Meta no interpola inline).
 *
 * flow_token: "miss-sofia:progreso:{user_id}"  (uuid mse_users.id)
 */
import type { FlowDefinition, FlowRequestPayload } from "../../../wa-flows-platform/registry";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://activosya.com").replace(/\/$/, "");

const PHASE_EMOJI: Record<number, string> = {
  0: "🌙",
  1: "💧",
  2: "⚡",
  3: "🌱",
  4: "🌊",
  5: "🔥",
};

const flow: FlowDefinition = {
  tenant: "miss-sofia",
  flow_key: "progreso",
  meta: {
    name: "Sofia_Progreso_v1",
    description: "Progreso semanal: fase, tiempo de boca, palabras, hitos, novela",
  },

  async handle(req: FlowRequestPayload) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }

    if (req.action !== "INIT" && req.action !== "data_exchange") {
      return { version: "3.0", data: { status: "unknown_action" } };
    }

    const tokenParts = (req.flow_token || "").split(":");
    const userId = tokenParts[2] || "";

    // data_exchange viene del boton "Cerrar" -> SUCCESS para cerrar el flow.
    if (req.action === "data_exchange") {
      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: { flow_token: req.flow_token, status: "progress_closed" },
          },
        },
      };
    }

    // INIT: cargar progreso del endpoint REST.
    if (!userId) {
      return {
        version: "3.0",
        screen: "PROGRESO",
        data: {
          linea_fase: "Sesion expirada",
          linea_tiempo: "Vuelve a abrir el flow desde tu chat con Sofia.",
          linea_palabras: "",
          linea_hitos: "",
          linea_novela: "",
          linea_mision: "",
        },
      };
    }

    try {
      const r = await fetch(
        `${BASE_URL}/api/sofia-flows/progress?user_id=${encodeURIComponent(userId)}`,
        { cache: "no-store" }
      );

      if (!r.ok) {
        return {
          version: "3.0",
          screen: "PROGRESO",
          data: {
            linea_fase: "No pude cargar tu progreso",
            linea_tiempo: "Intenta de nuevo en unos segundos.",
            linea_palabras: "",
            linea_hitos: "",
            linea_novela: "",
            linea_mision: "",
          },
        };
      }

      const body = (await r.json()) as {
        phase?: { number: number; name: string; subtitle?: string; day: number; total_days: number; completion_pct: number };
        metrics?: { tiempo_de_boca_minutes: number; palabras_tuyas_count: number; milestones_unlocked_count: number };
        milestones?: Array<{ key: string; achieved_at: string }>;
        novel?: { current_chapter_number: number; title: string | null; audio_url: string | null; completed: boolean } | null;
        mission_today?: { title: string; completed: boolean } | null;
      };

      const phaseNum = body.phase?.number ?? 0;
      const phaseEmoji = PHASE_EMOJI[phaseNum] || "🌙";
      const phaseName = body.phase?.name || "Cuna";
      const phaseDay = body.phase?.day ?? 1;
      const phaseTotal = body.phase?.total_days ?? 30;
      const phasePct = body.phase?.completion_pct ?? 0;

      const tiempoMin = body.metrics?.tiempo_de_boca_minutes ?? 0;
      const palabras = body.metrics?.palabras_tuyas_count ?? 0;
      const hitosCount = body.metrics?.milestones_unlocked_count ?? 0;

      const linea_hitos = hitosCount === 0
        ? "Hitos viscerales: 0 (en progreso, los desbloqueas viviendo el ingles)."
        : `Hitos viscerales: ${hitosCount} desbloqueados.`;

      const linea_novela = body.novel
        ? `Novela: capitulo ${body.novel.current_chapter_number}${body.novel.title ? ` - ${body.novel.title}` : ""}${body.novel.completed ? " (terminado)" : " (en curso)"}`
        : "Novela: aun no inicia. Llega cuando entres a Fase 3.";

      const linea_mision = body.mission_today
        ? `Mision de hoy: ${body.mission_today.title}${body.mission_today.completed ? " (cumplida)" : ""}`
        : "Mision de hoy: aun no asignada. Te llega con tu audio matutino.";

      return {
        version: "3.0",
        screen: "PROGRESO",
        data: {
          linea_fase: `${phaseEmoji} Fase ${phaseNum} - ${phaseName} - dia ${phaseDay} de ${phaseTotal} (${phasePct}%)`,
          linea_tiempo: `Tiempo de boca: ${tiempoMin} min acumulados`,
          linea_palabras: `Palabras tuyas: ${palabras}`,
          linea_hitos,
          linea_novela,
          linea_mision,
        },
      };
    } catch (e) {
      console.error("[sofia/progreso handler]", (e as Error).message);
      return {
        version: "3.0",
        screen: "PROGRESO",
        data: {
          linea_fase: "Error temporal del servidor",
          linea_tiempo: "Reintenta en unos segundos.",
          linea_palabras: "",
          linea_hitos: "",
          linea_novela: "",
          linea_mision: "",
        },
      };
    }
  },
};

export default flow;
