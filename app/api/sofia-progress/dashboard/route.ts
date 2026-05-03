/**
 * GET /api/sofia-progress/dashboard?user_id=<uuid>
 *
 * One-shot endpoint that returns all data needed by the /sofia-progress page:
 *   - Phase + completion + visceral metrics
 *   - Personal dictionary (words with context + uses_count)
 *   - Novel chapters history
 *   - Visceral milestones with timestamps
 *   - Recent sessions
 *   - Days since Cuna started
 *
 * Single fetch from the UI keeps it snappy.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getNovelChapters,
  getPersonalDictionary,
  getStudentProfile,
  getVisceralMilestones,
} from "@/lib/miss-sofia-voice/db";
import { PHASE_META, daysElapsedSince, phaseCompletionPct } from "@/lib/miss-sofia-voice/phase-engine";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id query param required" }, { status: 400 });
  }

  try {
    const profile = await getStudentProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: "student_profile not found" }, { status: 404 });
    }

    const [dictionary, milestones, chapters, sessionsRes] = await Promise.all([
      getPersonalDictionary(userId, 200),
      getVisceralMilestones(userId),
      getNovelChapters(userId, 30),
      fetchRecentSessions(userId, 20),
    ]);

    const phaseMeta = PHASE_META[profile.current_phase];
    const daysInCuna = profile.cuna_started_at ? daysElapsedSince(profile.cuna_started_at) : 0;

    return NextResponse.json({
      phase: {
        number: profile.current_phase,
        name: phaseMeta.name,
        subtitle: phaseMeta.subtitle,
        day: profile.phase_day,
        total_days: phaseMeta.duration_days,
        completion_pct: phaseCompletionPct(profile.current_phase, profile.phase_day),
        exit_signal: phaseMeta.exit_signal_human,
      },
      metrics: {
        days_in_cuna: daysInCuna,
        tiempo_de_boca_seconds: profile.tiempo_de_boca_seconds,
        tiempo_de_boca_minutes: Math.round(profile.tiempo_de_boca_seconds / 60),
        palabras_tuyas_count: dictionary.length,
        milestones_unlocked_count: milestones.length,
        chapters_completed_count: chapters.filter((c) => c.completed_at !== null).length,
        chapters_total_count: chapters.length,
      },
      dictionary: dictionary.map((d) => ({
        word: d.word,
        learned_on: d.learned_on,
        context: d.context,
        phase_when_learned: d.phase_when_learned,
        uses_count: d.uses_count,
        last_used_at: d.last_used_at,
      })),
      milestones: milestones.map((m) => ({
        key: m.milestone_key,
        achieved_at: m.achieved_at,
        context: m.context,
      })),
      chapters: chapters.map((c) => ({
        id: c.id,
        chapter_number: c.chapter_number,
        title: c.title,
        audio_url: c.audio_url,
        student_part_audio_url: c.student_part_audio_url,
        cliffhanger: c.cliffhanger,
        generated_at: c.generated_at,
        completed_at: c.completed_at,
        phase_when_generated: c.phase_when_generated,
      })),
      sessions: sessionsRes,
      cuna_started_at: profile.cuna_started_at,
      profile_summary: {
        last_session_summary: profile.last_session_summary,
        recurring_errors_count: Array.isArray(profile.recurring_errors) ? profile.recurring_errors.length : 0,
      },
    });
  } catch (e) {
    console.error("sofia-progress/dashboard error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}

async function fetchRecentSessions(userId: string, limit: number) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("mse_sessions")
    .select("id, session_type, duration_seconds, started_at, ended_at")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((s) => ({
    id: s.id as string,
    session_type: s.session_type as string | null,
    duration_seconds: s.duration_seconds as number | null,
    started_at: s.started_at as string,
    ended_at: s.ended_at as string | null,
  }));
}
