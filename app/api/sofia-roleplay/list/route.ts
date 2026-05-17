/**
 * GET /api/sofia-roleplay/list?user_id=...
 * Devuelve los escenarios role play disponibles según la fase del usuario.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentProfile } from "@/lib/miss-sofia-voice/db";
import { getRoleplaysForPhase } from "@/lib/miss-sofia-voice/roleplay-scenarios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  const profile = await getStudentProfile(userId);
  if (!profile) return NextResponse.json({ error: "profile not found" }, { status: 404 });

  const scenarios = getRoleplaysForPhase(profile.current_phase).map((s) => ({
    id: s.id,
    emoji: s.emoji,
    title_es: s.title_es,
    blurb_es: s.blurb_es,
    difficulty: s.difficulty,
    min_phase: s.min_phase,
  }));

  return NextResponse.json({
    phase: profile.current_phase,
    scenarios,
  });
}
