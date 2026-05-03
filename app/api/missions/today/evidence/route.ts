/**
 * POST /api/missions/today/evidence
 *
 * Body (JSON):
 *   {
 *     user_id: string,
 *     evidence_type: 'audio' | 'photo' | 'text',
 *     content_base64?: string,   // for audio/photo, base64-encoded payload
 *     content_mime?: string,     // e.g., 'audio/webm', 'image/jpeg'
 *     text?: string              // for evidence_type='text'
 *   }
 *
 * Returns:
 *   { ok, mission, evidence_url? }
 *
 * Behavior:
 *   - Validates today's mission exists for the user.
 *   - For audio/photo: uploads to sofia-evidence bucket (private) under
 *     `<userId>/<YYYY-MM-DD>/<random>.<ext>` and stores public-via-signed-URL.
 *   - For text: stores directly in evidence_text column.
 *   - Marks the mission as completed.
 *
 * Storage path is opinionated: keeps each user's evidence isolated by date,
 * which makes it trivial to retrieve all evidence for any given day.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { completeTodayMission, getTodayMission } from "@/lib/miss-sofia-voice/db";

export const runtime = "nodejs";

const EVIDENCE_BUCKET = "sofia-evidence";
const MAX_PAYLOAD_BYTES = 25 * 1024 * 1024; // 25 MB, well under WhatsApp/Twilio media limits

const EXT_BY_MIME: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function pickExtension(mime: string | undefined, fallback: string): string {
  if (!mime) return fallback;
  return EXT_BY_MIME[mime.toLowerCase()] ?? fallback;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId: string | undefined = body.user_id;
    const evidenceType: string | undefined = body.evidence_type;

    if (!userId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
    if (!evidenceType || !["audio", "photo", "text"].includes(evidenceType)) {
      return NextResponse.json(
        { error: "evidence_type must be one of: audio, photo, text" },
        { status: 400 }
      );
    }

    const mission = await getTodayMission(userId);
    if (!mission) {
      return NextResponse.json(
        { error: "no_mission_today", message: "El estudiante aún no tiene misión asignada hoy. Llamar /api/conversation/start primero." },
        { status: 404 }
      );
    }
    if (mission.completed_at) {
      return NextResponse.json(
        { error: "already_completed", mission },
        { status: 409 }
      );
    }

    let evidenceUrl: string | undefined;
    let evidenceText: string | undefined;

    if (evidenceType === "text") {
      const text: string | undefined = body.text;
      if (!text || !text.trim()) {
        return NextResponse.json({ error: "text required for evidence_type=text" }, { status: 400 });
      }
      evidenceText = text.trim().slice(0, 5000);
    } else {
      const contentBase64: string | undefined = body.content_base64;
      const contentMime: string | undefined = body.content_mime;
      if (!contentBase64) {
        return NextResponse.json(
          { error: "content_base64 required for evidence_type=audio|photo" },
          { status: 400 }
        );
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(contentBase64, "base64");
      } catch {
        return NextResponse.json({ error: "invalid base64" }, { status: 400 });
      }

      if (buffer.length === 0) {
        return NextResponse.json({ error: "empty payload" }, { status: 400 });
      }
      if (buffer.length > MAX_PAYLOAD_BYTES) {
        return NextResponse.json(
          { error: "payload_too_large", limitBytes: MAX_PAYLOAD_BYTES },
          { status: 413 }
        );
      }

      const ext = pickExtension(contentMime, evidenceType === "audio" ? "ogg" : "jpg");
      const path = `${userId}/${todayIsoDate()}/${randomSuffix()}.${ext}`;

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error: uploadError } = await supabase
        .storage.from(EVIDENCE_BUCKET)
        .upload(path, buffer, {
          contentType: contentMime ?? (evidenceType === "audio" ? "audio/ogg" : "image/jpeg"),
          upsert: false,
        });
      if (uploadError) {
        console.error("evidence upload failed:", uploadError);
        return NextResponse.json(
          { error: "upload_failed", message: uploadError.message },
          { status: 500 }
        );
      }

      // Bucket is private — return a signed URL valid for 7 days. Sufficient
      // for the bot to fetch + analyze, and for the student to review.
      const { data: signed, error: signError } = await supabase
        .storage.from(EVIDENCE_BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signError) {
        console.error("evidence signed url failed:", signError);
        // Not fatal — store the path itself so we can sign on demand later.
        evidenceUrl = `${EVIDENCE_BUCKET}://${path}`;
      } else {
        evidenceUrl = signed?.signedUrl ?? `${EVIDENCE_BUCKET}://${path}`;
      }
    }

    await completeTodayMission({
      userId,
      evidenceUrl,
      evidenceText,
    });

    const updatedMission = await getTodayMission(userId);

    return NextResponse.json({
      ok: true,
      mission: updatedMission,
      evidence_url: evidenceUrl ?? null,
    });
  } catch (e) {
    console.error("missions/today/evidence error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
