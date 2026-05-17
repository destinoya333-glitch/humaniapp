/**
 * POST /api/sofia-quiz/score
 * Body: {
 *   user_id, passage_id,
 *   questions: QuizQuestion[],
 *   answers: Array<{ type: "mc" | "open", value: number | string }>,
 *   capsule_session_id?
 * }
 *
 * Califica el quiz. MC = exact match con correct_index. Open = Claude score 0-100.
 * Guarda en mse_quiz_results y devuelve breakdown.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  scoreOpenAnswer,
  type QuizQuestion,
} from "@/lib/miss-sofia-voice/quiz-engine";

export const maxDuration = 60;

type Answer = { type: "mc" | "open"; value: number | string };
type ScoreItem = {
  type: "mc" | "open";
  correct?: boolean;
  score: number;
  feedback_es?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { user_id, passage_id, questions, answers, capsule_session_id } = (await req.json()) as {
      user_id: string;
      passage_id?: string;
      questions: QuizQuestion[];
      answers: Answer[];
      capsule_session_id?: string;
    };

    if (!user_id || !Array.isArray(questions) || !Array.isArray(answers)) {
      return NextResponse.json({ error: "bad payload" }, { status: 400 });
    }

    const scores: ScoreItem[] = [];
    let totalAchievable = 0;
    let totalEarned = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const a = answers[i];
      if (!q || !a) {
        scores.push({ type: q?.type ?? "mc", score: 0 });
        totalAchievable += 100;
        continue;
      }
      if (q.type === "mc" && a.type === "mc") {
        const correct = a.value === q.correct_index;
        scores.push({ type: "mc", correct, score: correct ? 100 : 0 });
        totalAchievable += 100;
        totalEarned += correct ? 100 : 0;
      } else if (q.type === "open" && a.type === "open") {
        const { score, feedback_es } = await scoreOpenAnswer({
          question: q.question,
          modelAnswer: q.model_answer,
          expectedKeywords: q.expected_keywords,
          studentAnswer: String(a.value ?? ""),
        });
        scores.push({ type: "open", score, feedback_es });
        totalAchievable += 100;
        totalEarned += score;
      } else {
        scores.push({ type: q.type, score: 0 });
        totalAchievable += 100;
      }
    }

    const totalScore = totalAchievable === 0 ? 0 : Math.round((totalEarned / totalAchievable) * 100);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from("mse_quiz_results").insert({
      user_id,
      capsule_session_id: capsule_session_id ?? null,
      passage_id: passage_id ?? null,
      questions,
      answers,
      scores,
      total_score: totalScore,
    });

    // Update capsule session if provided
    if (capsule_session_id) {
      await supabase
        .from("mse_capsule_sessions")
        .update({
          quiz_completed_at: new Date().toISOString(),
          quiz_score: totalScore,
        })
        .eq("id", capsule_session_id);
    }

    return NextResponse.json({ total_score: totalScore, scores });
  } catch (e) {
    console.error("quiz/score error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
