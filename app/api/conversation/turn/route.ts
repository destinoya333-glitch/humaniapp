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
  getTodayUsage,
  getTranscript,
  getUser,
  incrementUsage,
} from "@/lib/miss-sofia-voice/db";
import { callMissSofia } from "@/lib/miss-sofia-voice/ai/claude";
import { whisperSTT } from "@/lib/miss-sofia-voice/ai/whisper";
import { cleanTextForTTS, elevenLabsTTS } from "@/lib/miss-sofia-voice/ai/elevenlabs";
import { createClient } from "@supabase/supabase-js";

const FREE_TIER_DAILY_SECONDS = parseInt(process.env.FREE_TIER_DAILY_SECONDS ?? "180", 10);
const FREE_TIER_WARNING_SECONDS = parseInt(process.env.FREE_TIER_WARNING_SECONDS ?? "150", 10);

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

    const user = await getUser(session.user_id);
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

    // Free tier limit check
    const usage = await getTodayUsage(user.id);
    let warningCue: string | null = null;
    if (user.plan === "free") {
      if (usage.seconds_used >= FREE_TIER_DAILY_SECONDS) {
        return NextResponse.json(
          { error: "daily_limit_reached", upgradeUrl: "/upgrade" },
          { status: 402 }
        );
      }
      if (usage.seconds_used >= FREE_TIER_WARNING_SECONDS) {
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
        text: "Hmm, I didn't catch that. Can you say it again, mi amor?",
        userText: "",
      });
    }

    // Append user turn
    await appendToTranscript(sessionId, { role: "user", content: userText });

    // Call Sofia with full transcript
    const transcript = await getTranscript(sessionId);
    const responseText = await callMissSofia(transcript);

    // Append Sofia turn
    await appendToTranscript(sessionId, { role: "assistant", content: responseText });

    // TTS
    let audioBase64: string | null = null;
    let audioContentType: string | null = null;
    try {
      if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_MISS_SOFIA_VOICE_ID) {
        const tts = await elevenLabsTTS(cleanTextForTTS(responseText));
        audioBase64 = tts.audioBuffer.toString("base64");
        audioContentType = tts.contentType;
      }
    } catch (e) {
      console.error("TTS error:", e);
    }

    // Track usage
    await incrementUsage(user.id, turnDurationSec);
    const newUsage = usage.seconds_used + turnDurationSec;

    return NextResponse.json({
      userText,
      text: responseText,
      audioBase64,
      audioContentType,
      secondsRemaining:
        user.plan === "free" ? Math.max(0, FREE_TIER_DAILY_SECONDS - newUsage) : null,
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
