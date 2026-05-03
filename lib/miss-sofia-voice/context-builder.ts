/**
 * Context builder — injects student profile + Cuna phase + ritual slot +
 * personal novel + today's mission as the first user message to Claude.
 *
 * The system prompt stays SACRED (master-prompt.ts). All dynamic data lives
 * in the first user message, JSON-encoded under [CONTEXT].
 */
import {
  getLatestChapter,
  getPersonalDictionary,
  getStudentProfile,
  getTodayMission,
  getUser,
  getVisceralMilestones,
  upsertTodayMission,
  type StudentProfile,
  type User,
} from "./db";
import {
  pickTodaysMission,
  renderMissionDescription,
  type EvidenceType,
} from "./missions";
import {
  ritualSlotForNow,
  type CunaPhase,
  type RitualSlot,
  type VisceralMilestoneKey,
} from "./phase-engine";

export type CunaSessionContext = {
  current_phase: CunaPhase;
  phase_day: number;
  ritual_slot: RitualSlot;
  cuna_started_at: string | null;
  tiempo_de_boca_seconds: number;

  novel: {
    current_chapter_number: number;
    previous_chapter_summary: string | null;
    next_chapter_hook: string | null;
    completed: boolean;
  } | null;

  today_mission: {
    title: string;
    description: string;
    evidence_required: EvidenceType;
    completed: boolean;
  } | null;

  student_profile: {
    name: string | null;
    age: number | null;
    city: string | null;
    profession: string | null;
    motivation: string | null;
    personal_facts: Record<string, unknown>;
    personal_dictionary: Array<{
      word: string;
      learned_on: string;
      context: string;
      uses_count: number;
    }>;
    recurring_errors: unknown[];
    vocabulary_mastered: string[];
    vocabulary_struggling: string[];
    last_session_summary: string | null;
    visceral_milestones: Partial<Record<VisceralMilestoneKey, string>>;
  };
};

/**
 * Build the full Cuna context for a session.
 *
 * Reads from DB:
 *   - mse_users
 *   - mse_student_profiles
 *   - mse_personal_dictionary (top 30 by recency)
 *   - mse_novel_chapters (latest)
 *   - mse_real_life_missions (today's, creates one if missing)
 *   - mse_visceral_milestones
 *
 * Computes:
 *   - ritual_slot from current Lima time
 */
export async function buildCunaContext(userId: string): Promise<CunaSessionContext> {
  const [user, profile] = await Promise.all([getUser(userId), getStudentProfile(userId)]);
  if (!user) throw new Error(`buildCunaContext: user ${userId} not found`);
  if (!profile) throw new Error(`buildCunaContext: student_profile ${userId} not found`);

  const [dictionary, latestChapter, milestones, existingMission] = await Promise.all([
    getPersonalDictionary(userId, 30),
    getLatestChapter(userId),
    getVisceralMilestones(userId),
    getTodayMission(userId),
  ]);

  // Ensure today's mission exists (idempotent — UNIQUE on (user_id, assigned_date)).
  let mission = existingMission;
  if (!mission) {
    const template = pickTodaysMission({
      userId,
      phase: profile.current_phase,
    });
    mission = await upsertTodayMission({
      userId,
      phase: profile.current_phase,
      title: template.title,
      description: renderMissionDescription(template, {
        name: user.name,
        city: user.city,
        profession: user.profession,
        motivation: user.motivation,
      }),
      evidence_type: template.evidence_required,
    });
  }

  const visceralMap: Partial<Record<VisceralMilestoneKey, string>> = {};
  for (const m of milestones) visceralMap[m.milestone_key] = m.achieved_at;

  return {
    current_phase: profile.current_phase,
    phase_day: profile.phase_day,
    ritual_slot: ritualSlotForNow(),
    cuna_started_at: profile.cuna_started_at,
    tiempo_de_boca_seconds: profile.tiempo_de_boca_seconds,

    novel: latestChapter
      ? {
          current_chapter_number: latestChapter.chapter_number,
          previous_chapter_summary: latestChapter.cliffhanger ?? latestChapter.title,
          next_chapter_hook: latestChapter.cliffhanger,
          completed: latestChapter.completed_at !== null,
        }
      : null,

    today_mission: {
      title: mission.title,
      description: mission.description,
      evidence_required: mission.evidence_type,
      completed: mission.completed_at !== null,
    },

    student_profile: {
      name: user.name,
      age: user.age,
      city: user.city,
      profession: user.profession,
      motivation: user.motivation,
      personal_facts: profile.personal_facts ?? {},
      personal_dictionary: dictionary.map((d) => ({
        word: d.word,
        learned_on: d.learned_on,
        context: d.context,
        uses_count: d.uses_count,
      })),
      recurring_errors: profile.recurring_errors ?? [],
      vocabulary_mastered: profile.vocabulary_mastered ?? [],
      vocabulary_struggling: profile.vocabulary_struggling ?? [],
      last_session_summary: profile.last_session_summary,
      visceral_milestones: visceralMap,
    },
  };
}

/**
 * Render the Cuna context as the first user message to Claude.
 * Keeps the system prompt clean — all dynamic data lives here.
 */
export function contextAsFirstUserMessage(ctx: CunaSessionContext): string {
  return `[CONTEXT]
${JSON.stringify(ctx, null, 2)}

Comienza la sesión naturalmente como Sofia. Respeta las reglas de la fase actual (current_phase = ${ctx.current_phase}). Saluda al estudiante por su nombre. Usa el ritual_slot para ajustar tono (morning = energético, lunch = casual, night = íntimo, bedtime = relajante, weekend = familiar/relajado). Si hay una misión incompleta, ofrécela suavemente (no como tarea). Si hay un capítulo de la novela activo y no completado, refiérete a él.`;
}

// =====================================================================
// Legacy CEFR builder — kept for backwards compatibility during migration.
// Will be deleted once all consumers move to buildCunaContext.
// =====================================================================

/**
 * @deprecated Use buildCunaContext instead.
 */
export function buildLegacySessionContext(
  user: User,
  profile: StudentProfile,
  week: { topic: string; grammar_focus: string; vocabulary: string[]; situational_context: string },
  daily: { session_type: string; opening_prompt: string; roleplay_scenario: string | null }
): Record<string, unknown> {
  return {
    student_profile: {
      name: user.name,
      age: user.age,
      city: user.city,
      profession: user.profession,
      motivation: user.motivation,
      recurring_errors: profile.recurring_errors ?? [],
      vocabulary_mastered: profile.vocabulary_mastered ?? [],
      vocabulary_struggling: profile.vocabulary_struggling ?? [],
      personal_facts: profile.personal_facts ?? {},
      last_session_summary: profile.last_session_summary,
    },
    student_level: profile.current_level,
    current_week: profile.current_week,
    current_day: profile.current_day,
    weekly_topic: week.topic,
    weekly_grammar: week.grammar_focus,
    weekly_vocabulary: week.vocabulary,
    weekly_situation: week.situational_context,
    todays_session_type: daily.session_type,
    todays_opening_prompt: daily.opening_prompt,
    todays_roleplay_scenario: daily.roleplay_scenario,
  };
}

export function getCurrentDayName(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
}
