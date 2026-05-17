/**
 * POST /api/sofia-quiz/generate
 * Body: { passage_id }
 *
 * Genera 5 preguntas (3 MC + 2 open) sobre el pasaje. NO se cachea —
 * cada cápsula puede tener variantes. Si necesitamos cache, guardar en
 * mse_passages.cached_quiz a futuro.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateQuiz } from "@/lib/miss-sofia-voice/quiz-engine";

export const maxDuration = 60;

type PassageRow = {
  id: string;
  title: string;
  body_en: string;
};

export async function POST(req: NextRequest) {
  try {
    const { passage_id } = await req.json();
    if (!passage_id) {
      return NextResponse.json({ error: "passage_id required" }, { status: 400 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: passageRaw } = await supabase
      .from("mse_passages")
      .select("id, title, body_en")
      .eq("id", passage_id)
      .single();
    const passage = passageRaw as PassageRow | null;
    if (!passage) {
      return NextResponse.json({ error: "passage not found" }, { status: 404 });
    }

    const questions = await generateQuiz(passage.body_en, passage.title);

    return NextResponse.json({
      passage_id,
      questions,
    });
  } catch (e) {
    console.error("quiz/generate error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
