/**
 * POST /api/novel/next
 * Body: { user_id: string }
 * Returns: { chapter, generated: boolean }
 *
 * Generates the next novel chapter for the student.
 * If the latest chapter is not yet completed, returns it instead of creating a new one
 * (the student must finish the current chapter before unlocking the next).
 */
import { NextRequest, NextResponse } from "next/server";
import { generateNextChapter } from "@/lib/miss-sofia-voice/novel-engine";
import { getLatestChapter } from "@/lib/miss-sofia-voice/db";

export const runtime = "nodejs";
export const maxDuration = 60; // chapter generation + TTS can take ~30s

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const before = await getLatestChapter(user_id);
    const chapter = await generateNextChapter(user_id);
    const generated = !before || chapter.id !== before.id;

    return NextResponse.json({ chapter, generated });
  } catch (e) {
    console.error("novel/next error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
