/**
 * POST /api/sofia-review/extract
 * Body: { session_id }
 *
 * Lee el transcript de mse_sessions, extrae 3-5 review cards APA via Claude,
 * y las inserta en mse_review_cards. Idempotente por session_id+user_phrase.
 *
 * Se invoca async (after()) desde /api/conversation/end, pero también
 * puede llamarse a mano para retroactivamente generar cards.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTranscript, getStudentProfile } from "@/lib/miss-sofia-voice/db";
import { extractReviewCards } from "@/lib/miss-sofia-voice/review-extractor";

export const maxDuration = 60;

type SessionRow = { id: string; user_id: string };

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
      .select("id, user_id")
      .eq("id", session_id)
      .single();
    const session = sessionRaw as SessionRow | null;
    if (!session) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    const profile = await getStudentProfile(session.user_id);
    const phase = profile?.current_phase ?? 0;

    const transcript = await getTranscript(session_id);
    const cards = await extractReviewCards(transcript, phase);

    if (cards.length === 0) {
      return NextResponse.json({ inserted: 0, cards: [] });
    }

    const rows = cards.map((c) => ({
      user_id: session.user_id,
      session_id: session.id,
      category: c.category,
      user_phrase: c.user_phrase,
      correction: c.correction,
      explanation_es: c.explanation_es,
      severity: c.severity,
    }));

    const { data, error } = await supabase
      .from("mse_review_cards")
      .insert(rows)
      .select("id, category, user_phrase, correction, explanation_es, severity, created_at");

    if (error) {
      console.error("review/extract insert error:", error);
      return NextResponse.json({ error: "insert_failed", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ inserted: data?.length ?? 0, cards: data ?? [] });
  } catch (e) {
    console.error("review/extract error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
