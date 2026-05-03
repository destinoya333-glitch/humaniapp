/**
 * POST /api/sofia-flows/study-plan
 *
 * Receives the submit of WhatsApp Flow #2 — Plan de estudio.
 *
 * Body:
 *   {
 *     user_id: string,
 *     preferred_morning_time: string,         // "HH:MM" 24h, e.g. "07:00"
 *     mode: 'estricto' | 'suave',
 *     weekdays: string[]                      // ['mon','tue','wed','thu','fri','sat','sun']
 *   }
 *
 * Effect:
 *   - Stores the study plan in mse_student_profiles.personal_facts
 *     under key 'cuna_study_plan' (JSON merge — keeps existing facts intact).
 *
 * Returns: { ok, plan }
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentProfile, updateStudentProfile } from "@/lib/miss-sofia-voice/db";

export const runtime = "nodejs";

const VALID_MODES: ReadonlySet<string> = new Set(["estricto", "suave"]);
const VALID_WEEKDAYS: ReadonlySet<string> = new Set([
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
]);

function isValidTime(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId: string | undefined = body.user_id;
    const preferredTime: string | undefined = body.preferred_morning_time;
    const mode: string | undefined = body.mode;
    const weekdays: unknown = body.weekdays;

    if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    if (!preferredTime || !isValidTime(preferredTime)) {
      return NextResponse.json(
        { error: "preferred_morning_time must be HH:MM 24h" },
        { status: 400 }
      );
    }
    if (!mode || !VALID_MODES.has(mode)) {
      return NextResponse.json(
        { error: "mode must be 'estricto' or 'suave'" },
        { status: 400 }
      );
    }
    if (!Array.isArray(weekdays) || weekdays.length === 0) {
      return NextResponse.json(
        { error: "weekdays must be a non-empty array" },
        { status: 400 }
      );
    }
    const cleanWeekdays = weekdays
      .filter((d): d is string => typeof d === "string")
      .map((d) => d.toLowerCase().slice(0, 3))
      .filter((d) => VALID_WEEKDAYS.has(d));
    if (cleanWeekdays.length === 0) {
      return NextResponse.json(
        { error: "weekdays must contain at least one valid day (mon..sun)" },
        { status: 400 }
      );
    }

    const profile = await getStudentProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: "student_profile not found" }, { status: 404 });
    }

    const studyPlan = {
      preferred_morning_time: preferredTime,
      mode,
      weekdays: cleanWeekdays,
      updated_at: new Date().toISOString(),
    };

    const mergedFacts: Record<string, unknown> = {
      ...(profile.personal_facts ?? {}),
      cuna_study_plan: studyPlan,
    };

    await updateStudentProfile(userId, { personal_facts: mergedFacts });

    return NextResponse.json({ ok: true, plan: studyPlan });
  } catch (e) {
    console.error("sofia-flows/study-plan error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
