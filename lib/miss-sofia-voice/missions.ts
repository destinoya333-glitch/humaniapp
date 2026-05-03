/**
 * Misiones reales del Método Cuna.
 *
 * Cada misión está atada a una fase. La función pickTodaysMission elige
 * deterministically (mismo día → misma misión) para que el estudiante reciba
 * UNA sola misión por día y no cambie si vuelve a abrir el chat.
 *
 * Reemplaza la lógica vieja de practice-exercises.ts (CEFR-based).
 */
import type { CunaPhase } from "./phase-engine";

export type EvidenceType = "audio" | "photo" | "text" | "none";

export type MissionTemplate = {
  id: string;
  phase: CunaPhase;
  title: string;
  description_es: string;
  evidence_required: EvidenceType;
  /**
   * Optional placeholders to substitute with student profile data.
   * Supported: {name}, {city}, {profession}, {motivation}.
   */
  uses_profile: boolean;
};

export const MISSIONS: MissionTemplate[] = [
  // ───────────── Phase 0 — Cuna (no production demanded) ─────────────
  {
    id: "p0_listen_morning",
    phase: 0,
    title: "Escucha tu audio matutino",
    description_es: "Hoy solo escucha el audio que Sofia te manda en la mañana. Mientras te bañas o desayunas. Después marca 👍 si entendiste algo o 👎 si no. NO tienes que hablar.",
    evidence_required: "none",
    uses_profile: false,
  },
  {
    id: "p0_diary_in_spanish",
    phase: 0,
    title: "Cuéntame tu día (en español)",
    description_es: "Mándame un audio de 1 minuto contándome cómo te fue hoy. EN ESPAÑOL. En segundos te lo devuelvo narrado en inglés para que escuches tu propia vida en otro idioma.",
    evidence_required: "audio",
    uses_profile: false,
  },
  {
    id: "p0_recognize_sounds",
    phase: 0,
    title: "Reconoce los sonidos",
    description_es: "Escucha 3 audios cortos en inglés que te paso. No traduzcas. Solo dime si suenan parecidos o diferentes entre sí. Tu cerebro está aprendiendo a distinguir fonemas.",
    evidence_required: "text",
    uses_profile: false,
  },

  // ───────────── Phase 1 — Primera Palabra ─────────────
  {
    id: "p1_one_word_waiter",
    phase: 1,
    title: "Una palabra al mesero",
    description_es: "Hoy en algún momento le dices UNA palabra en inglés a un mesero, cajero o vendedor. 'Thanks'. 'Water'. 'Please'. Mándame screenshot o cuéntame qué pasó.",
    evidence_required: "text",
    uses_profile: false,
  },
  {
    id: "p1_one_word_family",
    phase: 1,
    title: "Una palabra a tu familia",
    description_es: "Saluda en inglés a alguien de tu familia hoy. 'Morning'. 'Hi'. 'Bye'. Aunque te miren raro. Cuéntame la cara que pusieron.",
    evidence_required: "text",
    uses_profile: false,
  },
  {
    id: "p1_pick_emotion",
    phase: 1,
    title: "¿Cómo estás hoy?",
    description_es: "Mándame UNA palabra en inglés para describir cómo te sentiste hoy. 'Happy'. 'Tired'. 'Bored'. 'Excited'. Solo una.",
    evidence_required: "text",
    uses_profile: false,
  },
  {
    id: "p1_label_object",
    phase: 1,
    title: "Etiqueta un objeto",
    description_es: "Toma un objeto que tengas a la mano. Mándame foto + UNA palabra en inglés que describa el objeto. Si no sabes, te la enseño y la usas mañana.",
    evidence_required: "photo",
    uses_profile: false,
  },

  // ───────────── Phase 2 — Telegráfico ─────────────
  {
    id: "p2_30sec_lunch",
    phase: 2,
    title: "30 segundos: tu almuerzo",
    description_es: "Mándame un audio de 30 segundos describiendo qué comiste hoy. EN INGLÉS, aunque sea telegráfico. 'Eat chicken. Rice. Drink coke.' Eso vale.",
    evidence_required: "audio",
    uses_profile: false,
  },
  {
    id: "p2_window_view",
    phase: 2,
    title: "Lo que ves por la ventana",
    description_es: "Audio de 30 segundos en inglés describiendo lo que ves por tu ventana ahora mismo. Sin español. Aunque sean palabras sueltas.",
    evidence_required: "audio",
    uses_profile: false,
  },
  {
    id: "p2_three_things_today",
    phase: 2,
    title: "3 cosas de hoy",
    description_es: "Audio: 3 cosas que hiciste hoy, en inglés. Una frase corta cada una. Ejemplo: 'Wake up early. Eat breakfast. Go work.' Listo.",
    evidence_required: "audio",
    uses_profile: false,
  },

  // ───────────── Phase 3 — Tu Voz ─────────────
  {
    id: "p3_childhood_memory",
    phase: 3,
    title: "Un recuerdo de tu infancia",
    description_es: "Audio de 2 minutos contándome un recuerdo bonito o gracioso de cuando eras niño. En inglés. Errores OK. Yo te corrijo nada — sólo te escucho.",
    evidence_required: "audio",
    uses_profile: false,
  },
  {
    id: "p3_describe_friend",
    phase: 3,
    title: "Describe a tu mejor amigo",
    description_es: "Audio de 2 min: cuéntame quién es tu mejor amigo, cómo es físicamente y qué los une. En inglés.",
    evidence_required: "audio",
    uses_profile: false,
  },
  {
    id: "p3_dream_check",
    phase: 3,
    title: "¿Soñaste en inglés?",
    description_es: "Sí o no. ¿Has tenido algún sueño donde alguien hablara inglés (aunque sea una palabra)? Si sí, cuéntame. Es un hito mítico.",
    evidence_required: "text",
    uses_profile: false,
  },
  {
    id: "p3_chapter_response",
    phase: 3,
    title: "Tu parte del capítulo",
    description_es: "Escuchaste el capítulo de tu novela hoy en la mañana. Ahora grábate diciendo la línea de tu personaje. Eso desbloquea el capítulo de mañana.",
    evidence_required: "audio",
    uses_profile: false,
  },

  // ───────────── Phase 4 — Tu Mundo ─────────────
  {
    id: "p4_make_someone_laugh",
    phase: 4,
    title: "Hazme reír en inglés",
    description_es: "Cuéntame un chiste en inglés. Mal contado vale. Si funciona, anotamos el primer 'first joke landed' en tus hitos.",
    evidence_required: "audio",
    uses_profile: false,
  },
  {
    id: "p4_youtube_clip",
    phase: 4,
    title: "Mira este clip y dime qué te pareció",
    description_es: "Te mando un clip de YouTube de 2 min en inglés. Míralo SIN subtítulos. Mándame audio de 1 min en inglés diciéndome qué entendiste y qué te llamó la atención.",
    evidence_required: "audio",
    uses_profile: false,
  },
  {
    id: "p4_argue_position",
    phase: 4,
    title: "Defiende una posición",
    description_es: "Te lanzo una opinión polémica. Tú me la rebates en inglés con audio de 2 min. Hoy: 'Lima is overrated.' ¿Estás de acuerdo o no? Defiende.",
    evidence_required: "audio",
    uses_profile: true,
  },

  // ───────────── Phase 5 — Tu Yo en Inglés ─────────────
  {
    id: "p5_industry_pitch",
    phase: 5,
    title: "Pitchea tu trabajo en inglés",
    description_es: "Audio de 2 min: imagínate que conoces a un gringo en una conferencia. Te pregunta a qué te dedicas. Pitchéale tu trabajo como si tu carrera dependiera de ello.",
    evidence_required: "audio",
    uses_profile: true,
  },
  {
    id: "p5_tweet_industry",
    phase: 5,
    title: "Publica algo en inglés",
    description_es: "Postea algo en LinkedIn o X en inglés sobre tu industria. Mándame el link. Vamos a calibrarlo antes para que suene 100% nativo.",
    evidence_required: "text",
    uses_profile: true,
  },
  {
    id: "p5_native_call_prep",
    phase: 5,
    title: "Prepara tu Sello Cuna",
    description_es: "Tu llamada con un nativo USA está cerca. Hoy practicamos: te lanzo 5 preguntas que el nativo probablemente te haga. Tú me respondes en audio sin pensar.",
    evidence_required: "audio",
    uses_profile: true,
  },
];

/**
 * Pick today's mission for the student.
 *
 * Deterministic by (user_id, date, phase) so reopening the chat the same day
 * always returns the same mission. Cycles through available missions for
 * the phase by day-of-year hash.
 */
export function pickTodaysMission(opts: {
  userId: string;
  phase: CunaPhase;
  today?: Date;
}): MissionTemplate {
  const today = opts.today ?? new Date();
  const candidates = MISSIONS.filter((m) => m.phase === opts.phase);
  if (candidates.length === 0) {
    // Defensive fallback — should never happen with current catalog.
    return {
      id: `fallback_p${opts.phase}`,
      phase: opts.phase,
      title: "Conversa con Sofia",
      description_es: "Hoy es un día libre de misión formal. Conversa con Sofia un rato.",
      evidence_required: "none",
      uses_profile: false,
    };
  }

  // Stable deterministic hash from userId + ISO date.
  const dayKey = today.toISOString().slice(0, 10);
  const seed = simpleHash(`${opts.userId}:${dayKey}:p${opts.phase}`);
  return candidates[seed % candidates.length];
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Substitute profile placeholders in a mission description.
 */
export function renderMissionDescription(
  mission: MissionTemplate,
  profile: { name?: string | null; city?: string | null; profession?: string | null; motivation?: string | null }
): string {
  if (!mission.uses_profile) return mission.description_es;
  return mission.description_es
    .replace(/\{name\}/g, profile.name ?? "estudiante")
    .replace(/\{city\}/g, profile.city ?? "tu ciudad")
    .replace(/\{profession\}/g, profile.profession ?? "tu trabajo")
    .replace(/\{motivation\}/g, profile.motivation ?? "tu sueño");
}
