/**
 * POST /api/conversation/start
 * Body: { user_id: string }
 * Returns: { sessionId, audioUrl?, text, secondsRemaining }
 *
 * Initializes a new conversation. Loads student profile + curriculum context,
 * generates Sofia's opening message, optionally synthesizes voice via ElevenLabs.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  ensureStudentProfile,
  getCurriculumSession,
  getTodayUsage,
  getUser,
  appendToTranscript,
} from "@/lib/miss-sofia-voice/db";
import {
  buildSessionContext,
  contextAsFirstUserMessage,
  getCurrentDayName,
} from "@/lib/miss-sofia-voice/context-builder";
import { callMissSofia } from "@/lib/miss-sofia-voice/ai/claude";
import { cleanTextForTTS, elevenLabsTTS } from "@/lib/miss-sofia-voice/ai/elevenlabs";

const FREE_TIER_DAILY_SECONDS = parseInt(process.env.FREE_TIER_DAILY_SECONDS ?? "180", 10);

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const user = await getUser(user_id);
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

    // Free tier daily limit check
    const usage = await getTodayUsage(user_id);
    if (user.plan === "free" && usage.seconds_used >= FREE_TIER_DAILY_SECONDS) {
      return NextResponse.json(
        {
          error: "daily_limit_reached",
          upgradeUrl: "/upgrade",
          secondsUsed: usage.seconds_used,
          dailyLimit: FREE_TIER_DAILY_SECONDS,
        },
        { status: 402 }
      );
    }

    const profile = await ensureStudentProfile(user_id);

    // Override day from server clock if reasonable; otherwise use profile.current_day
    const today = getCurrentDayName();
    const sessionDay = today; // always use real current day
    const curriculum = await getCurriculumSession(
      profile.current_level,
      profile.current_week,
      sessionDay
    );
    if (!curriculum) {
      return NextResponse.json(
        { error: `no curriculum found for ${profile.current_level} W${profile.current_week} ${sessionDay}` },
        { status: 500 }
      );
    }

    const ctx = buildSessionContext(user, profile, curriculum.week, curriculum.daily);

    const session = await createSession({
      user_id,
      level: profile.current_level,
      week_number: profile.current_week,
      day_name: sessionDay,
      session_type: curriculum.daily.session_type,
    });

    // Generate Sofia's opening
    const firstUserMsg = contextAsFirstUserMessage(ctx);
    const openingText = await callMissSofia([{ role: "user", content: firstUserMsg }]);

    // Persist as initial assistant turn (without the context message — that's metadata)
    await appendToTranscript(session.id, { role: "user", content: firstUserMsg });
    await appendToTranscript(session.id, { role: "assistant", content: openingText });

    // Optional voice synthesis (skip if ElevenLabs not configured)
    let audioBase64: string | null = null;
    let audioContentType: string | null = null;
    try {
      if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_MISS_SOFIA_VOICE_ID) {
        const tts = await elevenLabsTTS(cleanTextForTTS(openingText));
        audioBase64 = tts.audioBuffer.toString("base64");
        audioContentType = tts.contentType;
      }
    } catch (e) {
      // TTS failure shouldn't break the session
      console.error("TTS error:", e);
    }

    return NextResponse.json({
      sessionId: session.id,
      text: openingText,
      audioBase64,
      audioContentType,
      secondsRemaining:
        user.plan === "free"
          ? Math.max(0, FREE_TIER_DAILY_SECONDS - usage.seconds_used)
          : null,
      context: {
        level: profile.current_level,
        week: profile.current_week,
        day: sessionDay,
        sessionType: curriculum.daily.session_type,
        topic: curriculum.week.topic,
      },
    });
  } catch (e) {
    console.error("conversation/start error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
