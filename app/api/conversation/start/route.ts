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
  getMonthUsageSeconds,
  getStudentProfile,
  getTodayUsage,
  getUser,
} from "@/lib/miss-sofia-voice/db";
import {
  buildCunaContext,
  contextAsFirstUserMessage,
} from "@/lib/miss-sofia-voice/context-builder";
import { callMissSofia } from "@/lib/miss-sofia-voice/ai/claude";
import { cleanTextForTTS } from "@/lib/miss-sofia-voice/ai/elevenlabs";
import { synthesizeAsBase64 } from "@/lib/miss-sofia-voice/ai/tts-router";
import { getRoleplayById } from "@/lib/miss-sofia-voice/roleplay-scenarios";
import {
  getEffectivePlanForVoice,
  getFreeTierStatus,
  hasSecondsAvailable,
  premiumVoiceQuota,
  secondsRemainingToday,
} from "@/lib/miss-sofia-voice/tier";

export async function POST(req: NextRequest) {
  try {
    const { user_id, roleplay_id } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    // Resolver roleplay si se pidió uno
    const roleplay =
      typeof roleplay_id === "string" && roleplay_id.length > 0
        ? getRoleplayById(roleplay_id)
        : null;

    const user = await getUser(user_id);
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

    // Ensure profile exists (Cuna defaults set automatically by schema).
    await ensureStudentProfile(user_id);
    const profile = await getStudentProfile(user_id);

    const tierStatus = getFreeTierStatus({
      plan: user.plan,
      cunaStartedAt: profile?.cuna_started_at ?? null,
    });

    const usage = await getTodayUsage(user_id);

    if (!hasSecondsAvailable({ status: tierStatus, secondsUsedToday: usage.seconds_used })) {
      return NextResponse.json(
        {
          error: tierStatus.state === "blocked" ? "trial_expired" : "daily_limit_reached",
          tier: tierStatus,
          secondsUsed: usage.seconds_used,
          upgradeUrl: "/sofia-upgrade",
        },
        { status: 402 }
      );
    }

    // Build full Cuna context: phase, ritual slot, mission, novel, dictionary,
    // visceral milestones. This is what Sofia will react to.
    const ctx = await buildCunaContext(user_id);

    const session = await createSession({
      user_id,
      // session_type encodea el roleplay si aplica — /turn lo lee para reinyectar overlay
      session_type: roleplay ? `roleplay:${roleplay.id}` : ctx.ritual_slot,
    });

    let firstUserMsg: string;
    let openingText: string;

    if (roleplay) {
      // En roleplay, Sofia entra DIRECTO en personaje con opener_en — sin llamar a Claude.
      // Esto preserva el guion y ahorra una llamada API en el arranque.
      firstUserMsg = `[ROLEPLAY ${roleplay.id} — student opens chat. Sofia is in character. Stay in role.]`;
      openingText = roleplay.opener_en;
    } else {
      // Flujo Cuna normal: contexto → Sofia genera apertura
      firstUserMsg = contextAsFirstUserMessage(ctx);
      openingText = await callMissSofia([{ role: "user", content: firstUserMsg }]);
    }

    await appendToTranscript(session.id, { role: "user", content: firstUserMsg });
    // Append raw response (with tags if any) for Shadow Coach to analyze later
    await appendToTranscript(session.id, { role: "assistant", content: openingText });

    // Strip system tags from text shown to user.
    const cleanOpening = cleanTextForTTS(openingText);

    // Premium voice cap (45 min/mes ElevenLabs, después switch a Nova)
    const monthSecondsUsed = await getMonthUsageSeconds(user_id);
    const effectivePlan = getEffectivePlanForVoice({
      plan: user.plan,
      monthSecondsUsed,
    });

    // TTS routed by EFFECTIVE plan
    const { audioBase64, audioContentType } = await synthesizeAsBase64({
      text: cleanOpening,
      plan: effectivePlan,
      context: "chat",
    });

    const remaining = secondsRemainingToday({ status: tierStatus, secondsUsedToday: usage.seconds_used });
    const premiumQuota = user.plan === "premium" ? premiumVoiceQuota(monthSecondsUsed) : null;
    return NextResponse.json({
      sessionId: session.id,
      text: cleanOpening,
      audioBase64,
      audioContentType,
      tier: tierStatus,
      premiumVoiceQuota: premiumQuota,
      secondsRemaining: Number.isFinite(remaining) ? remaining : null,
      context: {
        phase: ctx.current_phase,
        phase_day: ctx.phase_day,
        ritual_slot: ctx.ritual_slot,
        mission_title: ctx.today_mission?.title ?? null,
        novel_chapter: ctx.novel?.current_chapter_number ?? null,
        roleplay: roleplay
          ? { id: roleplay.id, title_es: roleplay.title_es, emoji: roleplay.emoji }
          : null,
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
