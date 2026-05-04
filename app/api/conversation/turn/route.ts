/**
 * POST /api/conversation/turn
 * Body: multipart/form-data with `session_id`, `audio` (audio Blob), and optional `elapsed_seconds`
 * Returns: { text, audioBase64?, secondsRemaining, warningCue? }
 *
 * Single conversational turn: STT -> Claude -> TTS.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  appendToTranscript,
  getStudentProfile,
  getTodayUsage,
  getTranscript,
  getUser,
  incrementUsage,
} from "@/lib/miss-sofia-voice/db";
import { callMissSofia } from "@/lib/miss-sofia-voice/ai/claude";
import { whisperSTT } from "@/lib/miss-sofia-voice/ai/whisper";
import { cleanTextForTTS } from "@/lib/miss-sofia-voice/ai/elevenlabs";
import { synthesizeAsBase64 } from "@/lib/miss-sofia-voice/ai/tts-router";
import { getFreeTierStatus, hasSecondsAvailable, secondsRemainingToday } from "@/lib/miss-sofia-voice/tier";
import { createClient } from "@supabase/supabase-js";

// Warn user when 30 seconds remain in their daily limit (limited tier only)
const WARNING_BUFFER_SECONDS = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sessionId = formData.get("session_id") as string;
    const audioFile = formData.get("audio") as File | null;
    const textFallback = formData.get("text") as string | null;
    const turnDurationSec = parseFloat((formData.get("duration_seconds") as string) ?? "0") || 0;

    if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });

    // Load session to get user_id
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: session } = await supabase
      .from("mse_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();
    if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

    const [user, profile] = await Promise.all([
      getUser(session.user_id),
      getStudentProfile(session.user_id),
    ]);
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

    const tierStatus = getFreeTierStatus({
      plan: user.plan,
      cunaStartedAt: profile?.cuna_started_at ?? null,
    });

    // Tier limit check
    const usage = await getTodayUsage(user.id);
    let warningCue: string | null = null;
    if (!hasSecondsAvailable({ status: tierStatus, secondsUsedToday: usage.seconds_used })) {
      return NextResponse.json(
        {
          error: tierStatus.state === "blocked" ? "trial_expired" : "daily_limit_reached",
          tier: tierStatus,
          upgradeUrl: "/sofia-upgrade",
        },
        { status: 402 }
      );
    }
    if (tierStatus.state === "limited") {
      const remaining = secondsRemainingToday({ status: tierStatus, secondsUsedToday: usage.seconds_used });
      if (remaining <= WARNING_BUFFER_SECONDS) {
        warningCue = "freemium_30s_warning";
      }
    }

    // STT
    let userText: string;
    if (audioFile) {
      userText = await whisperSTT(audioFile, audioFile.type);
    } else if (textFallback) {
      userText = textFallback;
    } else {
      return NextResponse.json({ error: "audio or text required" }, { status: 400 });
    }
    if (!userText.trim()) {
      return NextResponse.json({
        text: "Hmm, I didn't catch that. Can you say it again?",
        userText: "",
      });
    }

    // Append user turn
    await appendToTranscript(sessionId, { role: "user", content: userText });

    // Call Sofia with full transcript
    const transcript = await getTranscript(sessionId);
    const responseText = await callMissSofia(transcript);

    // Append Sofia turn (raw, with tags if any — needed for /end Shadow Coach analysis)
    await appendToTranscript(sessionId, { role: "assistant", content: responseText });

    // Strip system tags from text shown to user — Sofia sometimes leaks
    // <session_report>/<phase_progress>/<exam_result> in conversational turns.
    const cleanText = cleanTextForTTS(responseText);

    // TTS routed by user plan (premium → ElevenLabs Sofia, regular/free → OpenAI Nova)
    const { audioBase64, audioContentType } = await synthesizeAsBase64({
      text: cleanText,
      plan: user.plan,
      context: "chat",
    });

    // Track usage
    await incrementUsage(user.id, turnDurationSec);
    const newUsage = usage.seconds_used + turnDurationSec;

    const remaining = secondsRemainingToday({ status: tierStatus, secondsUsedToday: newUsage });
    return NextResponse.json({
      userText,
      text: cleanText,
      audioBase64,
      audioContentType,
      tier: tierStatus,
      secondsRemaining: Number.isFinite(remaining) ? remaining : null,
      warningCue,
    });
  } catch (e) {
    console.error("conversation/turn error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
