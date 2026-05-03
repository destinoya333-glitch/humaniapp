/**
 * POST /api/conversation/start
 * Body: { user_id: string }
 * Returns: { sessionId, audioBase64?, audioContentType?, text, secondsRemaining, context }
 *
 * Initializes a new conversation under the Método Cuna.
 * Loads student profile + current phase + ritual slot + today's mission +
 * latest novel chapter, generates Sofia's opening message, optionally
 * synthesizes voice via ElevenLabs.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  appendToTranscript,
  createSession,
  ensureStudentProfile,
  getTodayUsage,
  getUser,
} from "@/lib/miss-sofia-voice/db";
import {
  buildCunaContext,
  contextAsFirstUserMessage,
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

    // Ensure profile exists (Cuna defaults set automatically by schema).
    await ensureStudentProfile(user_id);

    // Build full Cuna context: phase, ritual slot, mission, novel, dictionary,
    // visceral milestones. This is what Sofia will react to.
    const ctx = await buildCunaContext(user_id);

    const session = await createSession({
      user_id,
      session_type: ctx.ritual_slot,
    });

    // Generate Sofia's opening turn.
    const firstUserMsg = contextAsFirstUserMessage(ctx);
    const openingText = await callMissSofia([{ role: "user", content: firstUserMsg }]);

    await appendToTranscript(session.id, { role: "user", content: firstUserMsg });
    // Append raw response (with tags if any) for Shadow Coach to analyze later
    await appendToTranscript(session.id, { role: "assistant", content: openingText });

    // Strip system tags from text shown to user.
    const cleanOpening = cleanTextForTTS(openingText);

    // Optional voice synthesis.
    let audioBase64: string | null = null;
    let audioContentType: string | null = null;
    try {
      if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_MISS_SOFIA_VOICE_ID) {
        const tts = await elevenLabsTTS(cleanOpening);
        audioBase64 = tts.audioBuffer.toString("base64");
        audioContentType = tts.contentType;
      }
    } catch (e) {
      console.error("TTS error:", e);
    }

    return NextResponse.json({
      sessionId: session.id,
      text: cleanOpening,
      audioBase64,
      audioContentType,
      secondsRemaining:
        user.plan === "free"
          ? Math.max(0, FREE_TIER_DAILY_SECONDS - usage.seconds_used)
          : null,
      context: {
        phase: ctx.current_phase,
        phase_day: ctx.phase_day,
        ritual_slot: ctx.ritual_slot,
        mission_title: ctx.today_mission?.title ?? null,
        novel_chapter: ctx.novel?.current_chapter_number ?? null,
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
