/**
 * GET /api/novel/latest?user_id=<uuid>
 * Returns: { chapter | null }
 *
 * Returns the student's latest novel chapter (whether completed or not).
 * Use this to render the current chapter card in the app UI.
 */
import { NextRequest, NextResponse } from "next/server";
import { getLatestChapter } from "@/lib/miss-sofia-voice/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id query param required" }, { status: 400 });
  }
  try {
    const chapter = await getLatestChapter(userId);
    return NextResponse.json({ chapter });
  } catch (e) {
    console.error("novel/latest error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
