/**
 * GET /api/sofia-passage/suggestions?user_id=...
 *
 * Devuelve sugerencias de tópicos por fase + dificultad permitida.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentProfile } from "@/lib/miss-sofia-voice/db";
import { suggestedTopicsForPhase } from "@/lib/miss-sofia-voice/passage-engine";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }
  const profile = await getStudentProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }
  const phase = profile.current_phase;
  return NextResponse.json({
    phase,
    suggestions: suggestedTopicsForPhase(phase),
    allowed_difficulties: phase <= 1 ? ["easy", "medium"] : ["easy", "medium", "hard"],
  });
}
