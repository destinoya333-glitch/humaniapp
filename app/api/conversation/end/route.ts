/**
 * POST /api/conversation/end
 * Body: { session_id }
 * Returns: { report, phaseProgress?, processed, durationSeconds }
 *
 * Finalizes a conversation under the Método Cuna:
 *   1. Generate Shadow Coach JSON report from the transcript
 *   2. Extract <phase_progress> from Sofia's last turn (if present)
 *   3. Run processSessionEnd which dispatches to:
 *        - mse_personal_dictionary (words used in real context)
 *        - mse_visceral_milestones (milestone unlocked)
 *        - mse_real_life_missions  (today's mission completed)
 *        - mse_novel_chapters      (current chapter completed)
 *        - mse_student_profiles    (tiempo_de_boca + recurring_errors merge)
 *        - mse_phase_progress      (when ready_to_advance and validated server-side)
 *   4. Persist transcript + duration via closeSession
 */
import { NextRequest, NextResponse } from "next/server";
import { closeSession, getTranscript } from "@/lib/miss-sofia-voice/db";
import {
  extractPhaseProgress,
  generateShadowCoachReport,
} from "@/lib/miss-sofia-voice/ai/claude";
import {
  processSessionEnd,
  type ShadowCoachReport,
} from "@/lib/miss-sofia-voice/shadow-coach";
import { createClient } from "@supabase/supabase-js";

type SessionRow = {
  id: string;
  user_id: string;
  session_type: string;
  started_at: string;
};

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: sessionRaw } = await supabase
      .from("mse_sessions")
      .select("id, user_id, session_type, started_at")
      .eq("id", session_id)
      .single();
    const session = sessionRaw as SessionRow | null;
    if (!session) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    const transcript = await getTranscript(session_id);
    const durationSec = Math.round(
      (Date.now() - new Date(session.started_at).getTime()) / 1000
    );

    // 1. Shadow Coach JSON report from the full transcript
    const reportRaw = await generateShadowCoachReport(transcript);
    const report: ShadowCoachReport = (reportRaw as ShadowCoachReport) ?? {
      session_summary: "(report generation failed)",
      highlights: [],
      errors_detected: [],
      new_vocabulary_introduced: [],
      vocabulary_used_in_real_context: [],
      personal_facts_learned: [],
    };

    // 2. <phase_progress> from Sofia's last assistant turn (optional)
    const lastSofiaTurn = [...transcript].reverse().find((m) => m.role === "assistant");
    const phaseProgress = lastSofiaTurn
      ? extractPhaseProgress(lastSofiaTurn.content)
      : null;

    // 3. Persist session metadata + report
    await closeSession(session_id, report as Record<string, unknown>, durationSec);

    // 4. Process the report — close the learning loop
    const processed = await processSessionEnd({
      userId: session.user_id,
      report,
      phaseProgress,
      sessionSummary: report.session_summary ?? "",
    });

    return NextResponse.json({
      report,
      phaseProgress,
      processed,
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
