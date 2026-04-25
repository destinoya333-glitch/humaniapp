/**
 * POST /api/conversation/end
 * Body: { session_id }
 * Returns: { report, examResult? }
 *
 * Finalizes a conversation:
 *   - Generates Shadow Coach JSON report
 *   - Updates student_profile (memory)
 *   - If session_type === 'weekly_exam', extracts exam result + advances week
 */
import { NextRequest, NextResponse } from "next/server";
import {
  closeSession,
  getTranscript,
  saveWeeklyExam,
  updateStudentProfile,
} from "@/lib/miss-sofia-voice/db";
import {
  extractExamResult,
  generateShadowCoachReport,
} from "@/lib/miss-sofia-voice/ai/claude";
import { createClient } from "@supabase/supabase-js";

type SessionRow = {
  id: string;
  user_id: string;
  level: string;
  week_number: number;
  day_name: string;
  session_type: string;
  started_at: string;
};

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id) return NextResponse.json({ error: "session_id required" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: sessionRaw } = await supabase
      .from("mse_sessions")
      .select("id, user_id, level, week_number, day_name, session_type, started_at")
      .eq("id", session_id)
      .single();
    const session = sessionRaw as SessionRow | null;
    if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

    const transcript = await getTranscript(session_id);
    const durationSec = Math.round(
      (Date.now() - new Date(session.started_at).getTime()) / 1000
    );

    // Generate Shadow Coach report
    const report = (await generateShadowCoachReport(transcript)) ?? {
      session_summary: "(report generation failed)",
      highlights: [],
      errors_detected: [],
      new_vocabulary_introduced: [],
      vocabulary_mastered_today: [],
      personal_facts_learned: [],
      next_session_recommendation: null,
    };

    // Persist to session
    await closeSession(session_id, report, durationSec);

    // Update student profile memory (merge errors, vocab, facts)
    const { data: profile } = await supabase
      .from("mse_student_profiles")
      .select("recurring_errors, vocabulary_mastered, personal_facts")
      .eq("user_id", session.user_id)
      .single();

    const existingErrors = (profile?.recurring_errors as unknown[]) ?? [];
    const newErrors = (report.errors_detected as unknown[]) ?? [];
    const recurring_errors = [...existingErrors, ...newErrors].slice(-10);

    const existingVocab = new Set((profile?.vocabulary_mastered as string[]) ?? []);
    ((report.vocabulary_mastered_today as string[]) ?? []).forEach((v) =>
      existingVocab.add(v)
    );

    const personalFactsExisting = (profile?.personal_facts as Record<string, unknown>) ?? {};
    const newFacts = (report.personal_facts_learned as string[]) ?? [];
    const personalFactsMerged = { ...personalFactsExisting };
    newFacts.forEach((f, i) => {
      personalFactsMerged[`fact_${Date.now()}_${i}`] = f;
    });

    await updateStudentProfile(session.user_id, {
      recurring_errors,
      vocabulary_mastered: Array.from(existingVocab),
      personal_facts: personalFactsMerged,
      last_session_summary: report.session_summary as string,
    });

    // Weekly exam handling (Saturday)
    let examResult: Record<string, unknown> | null = null;
    if (session.session_type === "weekly_exam") {
      const lastSofiaTurn = [...transcript].reverse().find((m) => m.role === "assistant");
      if (lastSofiaTurn) {
        examResult = extractExamResult(lastSofiaTurn.content);
        if (examResult) {
          await saveWeeklyExam({
            user_id: session.user_id,
            level: session.level,
            week_number: session.week_number,
            exam: examResult,
          });

          if (examResult.recommendation === "advance") {
            // Advance to next week (or next level)
            const next = nextWeekFor(session.level, session.week_number);
            await updateStudentProfile(session.user_id, {
              current_level: next.level,
              current_week: next.week,
              current_day: "Monday",
            });
          }
        }
      }
    }

    return NextResponse.json({
      report,
      examResult,
      durationSeconds: durationSec,
    });
  } catch (e) {
    console.error("conversation/end error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}

function nextWeekFor(level: string, week: number): { level: string; week: number } {
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  if (week < 12) return { level, week: week + 1 };
  const idx = levels.indexOf(level);
  if (idx < 0 || idx >= levels.length - 1) return { level, week };
  return { level: levels[idx + 1], week: 1 };
}
