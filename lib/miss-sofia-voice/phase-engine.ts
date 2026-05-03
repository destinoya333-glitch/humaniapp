/**
 * Phase Engine — pure utilities for the Método Cuna.
 *
 * No DB dependencies. All functions are pure given inputs.
 * Used by context-builder, missions, and the bot's core loop.
 */

export type CunaPhase = 0 | 1 | 2 | 3 | 4 | 5;
export type RitualSlot = "morning" | "lunch" | "night" | "bedtime" | "weekend";

export const PHASE_META: Record<CunaPhase, {
  key: CunaPhase;
  name: string;
  subtitle: string;
  duration_days: number;
  exit_signal_key: VisceralMilestoneKey;
  exit_signal_human: string;
}> = {
  0: {
    key: 0,
    name: "Cuna",
    subtitle: "Despertar Silencioso",
    duration_days: 30,
    exit_signal_key: "first_word_in_real_life", // proxy: el día 30 entiende un audio que no entendía
    exit_signal_human: "Entiendes un audio del día 30 que el día 1 no entendías",
  },
  1: {
    key: 1,
    name: "Primera Palabra",
    subtitle: "One Word Magic",
    duration_days: 30,
    exit_signal_key: "first_word_in_real_life",
    exit_signal_human: "30 palabras inglesas que USAS en tu vida real",
  },
  2: {
    key: 2,
    name: "Telegráfico",
    subtitle: "Two-Word Magic",
    duration_days: 30,
    exit_signal_key: "first_60sec_no_spanish",
    exit_signal_human: "Audio de 60 segundos sin tirar al español ni una vez",
  },
  3: {
    key: 3,
    name: "Tu Voz",
    subtitle: "Sentence Builder",
    duration_days: 60,
    exit_signal_key: "first_dream_in_english",
    exit_signal_human: "Cuentas un recuerdo de infancia en inglés en 2 minutos",
  },
  4: {
    key: 4,
    name: "Tu Mundo",
    subtitle: "Storyteller",
    duration_days: 90,
    exit_signal_key: "first_joke_landed",
    exit_signal_human: "Cuentas la trama de tu serie favorita en 5 min sin prepararlo",
  },
  5: {
    key: 5,
    name: "Tu Yo en Inglés",
    subtitle: "Native Self",
    duration_days: 125,
    exit_signal_key: "sello_cuna_completed",
    exit_signal_human: "Un nativo USA en 5 min no detecta que eres hispanohablante",
  },
};

export type VisceralMilestoneKey =
  | "first_dream_in_english"
  | "first_thought_without_translation"
  | "first_joke_landed"
  | "first_native_understood_first_try"
  | "first_word_in_real_life"
  | "first_30sec_no_spanish"
  | "first_60sec_no_spanish"
  | "first_full_conversation_5min"
  | "first_podcast_understood"
  | "first_series_no_subs"
  | "sello_cuna_completed";

/**
 * Determine the current ritual slot based on Lima local time.
 * Lima is UTC-5 year-round (no DST).
 *
 *   Morning  : 05:00 – 11:00
 *   Lunch    : 11:00 – 15:00
 *   Night    : 19:00 – 22:30
 *   Bedtime  : 22:30 – 05:00 (next day)
 *   Weekend  : Sunday all day → overrides above slots into "weekend"
 *
 * Mid-afternoon (15:00-19:00) defaults to "lunch" since the lunch ritual is the
 * least time-sensitive of the four and we never want to leave the student without
 * an active slot.
 */
export function ritualSlotForNow(now: Date = new Date()): RitualSlot {
  const limaOffsetMs = -5 * 60 * 60 * 1000;
  const lima = new Date(now.getTime() + limaOffsetMs - now.getTimezoneOffset() * 60 * 1000);
  const dow = lima.getUTCDay(); // 0 = Sunday
  if (dow === 0) return "weekend";

  const hour = lima.getUTCHours();
  const minute = lima.getUTCMinutes();
  const minutesOfDay = hour * 60 + minute;

  if (minutesOfDay >= 5 * 60 && minutesOfDay < 11 * 60) return "morning";
  if (minutesOfDay >= 11 * 60 && minutesOfDay < 19 * 60) return "lunch";
  if (minutesOfDay >= 19 * 60 && minutesOfDay < 22 * 60 + 30) return "night";
  return "bedtime";
}

/**
 * Compute completion percentage of the current phase based on phase_day.
 * phase_day starts at 1 on the first day of the phase.
 */
export function phaseCompletionPct(phase: CunaPhase, phaseDay: number): number {
  const total = PHASE_META[phase].duration_days;
  const pct = Math.min(100, Math.round((phaseDay / total) * 100));
  return Math.max(0, pct);
}

/**
 * Has the student met the exit signal for their current phase?
 * Combines: phase_day reached the floor + the visceral milestone exists.
 *
 * The visceral milestone is recorded by the bot's session_report whenever it
 * detects the qualifying behavior (e.g. student dreamed in English).
 *
 * Some phases (0, 1) don't require a milestone — just reaching phase_day is enough.
 */
export function hasExitSignal(opts: {
  phase: CunaPhase;
  phaseDay: number;
  visceralMilestonesAchieved: VisceralMilestoneKey[];
}): boolean {
  const meta = PHASE_META[opts.phase];
  const dayThresholdMet = opts.phaseDay >= meta.duration_days;

  // Phases 0 and 1: pure time-based for now (UX validation phase).
  if (opts.phase === 0 || opts.phase === 1) return dayThresholdMet;

  // Phase 5: only completes via Sello Cuna (manual nativo USA call).
  if (opts.phase === 5) {
    return opts.visceralMilestonesAchieved.includes("sello_cuna_completed");
  }

  // Phases 2-4: require both day threshold AND visceral milestone.
  return dayThresholdMet && opts.visceralMilestonesAchieved.includes(meta.exit_signal_key);
}

/**
 * Returns the next phase or null if already at the final phase.
 */
export function nextPhase(phase: CunaPhase): CunaPhase | null {
  if (phase >= 5) return null;
  return (phase + 1) as CunaPhase;
}

/**
 * Days elapsed since a date, integer (rounding down).
 * Returns 0 if from is in the future.
 */
export function daysElapsedSince(from: Date | string, now: Date = new Date()): number {
  const fromDate = typeof from === "string" ? new Date(from) : from;
  const ms = now.getTime() - fromDate.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
