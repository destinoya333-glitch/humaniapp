/**
 * GET /api/sofia-flows/progress?user_id=<uuid>
 *
 * Returns aggregated student progress data formatted for the WhatsApp Flow #4
 * (read-only progress screen).
 *
 * Response shape:
 *   {
 *     phase: { number, name, subtitle, day, total_days, completion_pct },
 *     metrics: { tiempo_de_boca_minutes, palabras_tuyas_count, milestones_unlocked_count },
 *     milestones: [ { key, achieved_at } ],
 *     novel: { current_chapter_number, title, audio_url, completed } | null,
 *     mission_today: { title, completed } | null
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getLatestChapter,
  getPersonalDictionary,
  getStudentProfile,
  getTodayMission,
  getVisceralMilestones,
} from "@/lib/miss-sofia-voice/db";
import { PHASE_META, phaseCompletionPct } from "@/lib/miss-sofia-voice/phase-engine";

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

    const [dictionary, milestones, latestChapter, todayMission] = await Promise.all([
      getPersonalDictionary(userId, 200),
      getVisceralMilestones(userId),
      getLatestChapter(userId),
      getTodayMission(userId),
    ]);

    const phaseMeta = PHASE_META[profile.current_phase];

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
        tiempo_de_boca_minutes: Math.round(profile.tiempo_de_boca_seconds / 60),
        palabras_tuyas_count: dictionary.length,
        milestones_unlocked_count: milestones.length,
      },
      milestones: milestones.map((m) => ({
        key: m.milestone_key,
        achieved_at: m.achieved_at,
        context: m.context,
      })),
      novel: latestChapter
        ? {
            current_chapter_number: latestChapter.chapter_number,
            title: latestChapter.title,
            audio_url: latestChapter.audio_url,
            completed: latestChapter.completed_at !== null,
          }
        : null,
      mission_today: todayMission
        ? {
            title: todayMission.title,
            completed: todayMission.completed_at !== null,
          }
        : null,
      cuna_started_at: profile.cuna_started_at,
    });
  } catch (e) {
    console.error("sofia-flows/progress error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
