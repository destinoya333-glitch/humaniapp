/**
 * Free tier policy del Método Cuna.
 *
 * Modelo aprobado por Percy 2026-05-03:
 *   - Día 1-3:   ilimitado (trial completo, alumno vive el método)
 *   - Día 4-30:  6 min/día (hábito mantenido, presión natural a upgrade)
 *   - Día 31+:   bloqueado (paga Pro o se va)
 *
 * Cualquier user con plan != 'free' (pro / pro_vip) tiene acceso ilimitado
 * sin restricciones — el helper SOLO aplica a tier free.
 */

import { daysElapsedSince } from "./phase-engine";

export const FREE_TIER_TRIAL_DAYS = 3;
export const FREE_TIER_LIMIT_DAYS = 30;
export const FREE_TIER_DAILY_SECONDS_AFTER_TRIAL = 360; // 6 min

export type FreeTierStatus = {
  /** "trial" = 1-3, "limited" = 4-30, "blocked" = 31+, "unlimited" = paid */
  state: "trial" | "limited" | "blocked" | "unlimited";
  /** Día actual del programa (1-based). N/A si unlimited. */
  day_of_program: number | null;
  /** Días restantes en el state actual (trial o limited). 0 si bloqueado. */
  days_remaining_in_state: number;
  /** Segundos diarios disponibles. Infinity para trial/unlimited, 360 para limited, 0 para blocked. */
  daily_seconds_limit: number;
  /** Mensaje human-friendly para mostrar al usuario. */
  display_message: string;
};

/**
 * Calcula el estado del tier free para un usuario.
 *
 * @param plan        El plan del user ('free' | 'pro' | 'pro_vip' | otro)
 * @param cunaStartedAt  ISO date del día que arrancó Cuna. null = nunca arrancó (trial).
 * @param now         Optional, para testing.
 */
export function getFreeTierStatus(opts: {
  plan: string | null | undefined;
  cunaStartedAt: string | null;
  now?: Date;
}): FreeTierStatus {
  // Plan pagado → ilimitado
  if (opts.plan && opts.plan !== "free") {
    return {
      state: "unlimited",
      day_of_program: null,
      days_remaining_in_state: 0,
      daily_seconds_limit: Number.POSITIVE_INFINITY,
      display_message: "Plan ilimitado",
    };
  }

  // Free user. Calculamos el día.
  const cuna = opts.cunaStartedAt;
  const daysElapsed = cuna ? daysElapsedSince(cuna, opts.now) : 0;
  const day = daysElapsed + 1; // Día 1 = día que arrancó

  if (day <= FREE_TIER_TRIAL_DAYS) {
    return {
      state: "trial",
      day_of_program: day,
      days_remaining_in_state: FREE_TIER_TRIAL_DAYS - day + 1,
      daily_seconds_limit: Number.POSITIVE_INFINITY,
      display_message: `Trial gratis · ${FREE_TIER_TRIAL_DAYS - day + 1} día${
        FREE_TIER_TRIAL_DAYS - day + 1 === 1 ? "" : "s"
      } ilimitado${FREE_TIER_TRIAL_DAYS - day + 1 === 1 ? "" : "s"} restante${
        FREE_TIER_TRIAL_DAYS - day + 1 === 1 ? "" : "s"
      }`,
    };
  }

  if (day <= FREE_TIER_LIMIT_DAYS) {
    return {
      state: "limited",
      day_of_program: day,
      days_remaining_in_state: FREE_TIER_LIMIT_DAYS - day + 1,
      daily_seconds_limit: FREE_TIER_DAILY_SECONDS_AFTER_TRIAL,
      display_message: `6 min/día · día ${day} de ${FREE_TIER_LIMIT_DAYS}`,
    };
  }

  return {
    state: "blocked",
    day_of_program: day,
    days_remaining_in_state: 0,
    daily_seconds_limit: 0,
    display_message: "Periodo gratis terminado · upgrade a Pro para continuar",
  };
}

/**
 * Helper de check rápido: ¿el user puede iniciar/continuar una sesión hoy?
 * Retorna true si tiene segundos disponibles.
 */
export function hasSecondsAvailable(opts: {
  status: FreeTierStatus;
  secondsUsedToday: number;
}): boolean {
  if (opts.status.daily_seconds_limit === Number.POSITIVE_INFINITY) return true;
  if (opts.status.state === "blocked") return false;
  return opts.secondsUsedToday < opts.status.daily_seconds_limit;
}

/**
 * Cuántos segundos le quedan hoy.
 * Infinity si trial o pro. 0 si bloqueado o agotado.
 */
export function secondsRemainingToday(opts: {
  status: FreeTierStatus;
  secondsUsedToday: number;
}): number {
  if (opts.status.daily_seconds_limit === Number.POSITIVE_INFINITY) {
    return Number.POSITIVE_INFINITY;
  }
  if (opts.status.state === "blocked") return 0;
  return Math.max(0, opts.status.daily_seconds_limit - opts.secondsUsedToday);
}
