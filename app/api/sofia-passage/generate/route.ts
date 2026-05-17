/**
 * POST /api/sofia-passage/generate
 * Body: { user_id, topic, difficulty? }
 *
 * Genera (o recupera del cache) un pasaje APA para el tema dado.
 * Phase se infiere del perfil del usuario; difficulty default "easy" en
 * fase 0-1, "medium" en fase 2-3, "hard" en fase 4-5.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentProfile, getUser } from "@/lib/miss-sofia-voice/db";
import {
  getOrGeneratePassage,
  suggestedTopicsForPhase,
  type Difficulty,
} from "@/lib/miss-sofia-voice/passage-engine";

export const maxDuration = 60;

function defaultDifficulty(phase: number): Difficulty {
  if (phase <= 1) return "easy";
  if (phase <= 3) return "medium";
  return "hard";
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, topic, difficulty } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
    if (typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json({ error: "topic required" }, { status: 400 });
    }
    const profile = await getStudentProfile(user_id);
    if (!profile) {
      return NextResponse.json({ error: "profile not found" }, { status: 404 });
    }
    const user = await getUser(user_id);

    const phase = profile.current_phase;
    const allowedDifficulties: Difficulty[] = ["easy", "medium", "hard"];
    let diff: Difficulty = defaultDifficulty(phase);
    if (
      typeof difficulty === "string" &&
      allowedDifficulties.includes(difficulty as Difficulty)
    ) {
      // En fase 0-1, no permitir "hard" — caps a "medium"
      if (phase <= 1 && difficulty === "hard") diff = "medium";
      else diff = difficulty as Difficulty;
    }

    const passage = await getOrGeneratePassage({
      topic: topic.trim(),
      phase,
      difficulty: diff,
      plan: user?.plan,
    });

    return NextResponse.json({
      passage,
      phase,
      suggestions: suggestedTopicsForPhase(phase),
    });
  } catch (e) {
    console.error("passage/generate error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
