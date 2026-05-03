/**
 * POST /api/novel/student-part
 *
 * Receives the student's audio recording of their character's line in the
 * current novel chapter. Uploads it, marks the chapter as completed, which
 * unlocks the next chapter (the student can call POST /api/novel/next next).
 *
 * Body (JSON):
 *   {
 *     user_id: string,
 *     audio_base64: string,
 *     audio_mime?: string             // default 'audio/webm'
 *   }
 *
 * Returns:
 *   { ok, chapter, student_part_url }
 *
 * Rules:
 *   - The latest chapter must exist and NOT be already completed.
 *   - Audio max 5 MB (chapter lines are short — under 30 sec usually).
 *   - Stored as public URL in `sofia-tts/novel/<userId>/chapter-<N>-student.mp3`.
 *     Public because the student should be able to share/replay it; this is
 *     their own voice and there's nothing sensitive in the line itself.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { completeChapter, getLatestChapter } from "@/lib/miss-sofia-voice/db";

export const runtime = "nodejs";

const NOVEL_BUCKET = "sofia-tts";
const NOVEL_PATH_PREFIX = "novel";
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT_BY_MIME: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId: string | undefined = body.user_id;
    const audioBase64: string | undefined = body.audio_base64;
    const audioMime: string = body.audio_mime ?? "audio/webm";

    if (!userId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
    if (!audioBase64) {
      return NextResponse.json({ error: "audio_base64 required" }, { status: 400 });
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(audioBase64, "base64");
    } catch {
      return NextResponse.json({ error: "invalid base64" }, { status: 400 });
    }
    if (buffer.length === 0) {
      return NextResponse.json({ error: "empty audio" }, { status: 400 });
    }
    if (buffer.length > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "audio too large", limitBytes: MAX_AUDIO_BYTES },
        { status: 413 }
      );
    }

    const chapter = await getLatestChapter(userId);
    if (!chapter) {
      return NextResponse.json(
        { error: "no_chapter", message: "El estudiante aún no tiene capítulos. Llamar POST /api/novel/next primero." },
        { status: 404 }
      );
    }
    if (chapter.completed_at) {
      return NextResponse.json(
        { error: "already_completed", chapter },
        { status: 409 }
      );
    }

    const ext = EXT_BY_MIME[audioMime.toLowerCase()] ?? "webm";
    const path = `${NOVEL_PATH_PREFIX}/${userId}/chapter-${chapter.chapter_number}-student.${ext}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: uploadError } = await supabase
      .storage.from(NOVEL_BUCKET)
      .upload(path, buffer, {
        contentType: audioMime,
        upsert: true, // student can re-record their line if not yet marked completed
      });
    if (uploadError) {
      console.error("novel/student-part upload failed:", uploadError);
      return NextResponse.json(
        { error: "upload_failed", message: uploadError.message },
        { status: 500 }
      );
    }

    const { data: pub } = supabase.storage.from(NOVEL_BUCKET).getPublicUrl(path);
    const studentPartUrl = pub.publicUrl;

    await completeChapter(chapter.id, studentPartUrl);

    // Re-fetch to return the up-to-date row including completed_at
    const updated = await getLatestChapter(userId);

    return NextResponse.json({
      ok: true,
      chapter: updated,
      student_part_url: studentPartUrl,
    });
  } catch (e) {
    console.error("novel/student-part error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
