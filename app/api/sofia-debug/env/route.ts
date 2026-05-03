/**
 * GET /api/sofia-debug/env
 *
 * Diagnostic endpoint that reports which critical env vars are SET (boolean
 * only — never returns the actual values).
 *
 * Used to quickly debug missing API keys in production. Delete after debug
 * is done.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    CLAUDE_MODEL: process.env.CLAUDE_MODEL || "(default: claude-sonnet-4-6)",
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    GROQ_WHISPER_MODEL: process.env.GROQ_WHISPER_MODEL || "(default: whisper-large-v3-turbo)",
    ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_MISS_SOFIA_VOICE_ID: !!process.env.ELEVENLABS_MISS_SOFIA_VOICE_ID,
    TWILIO_SOFIA_ACCOUNT_SID: !!process.env.TWILIO_SOFIA_ACCOUNT_SID,
    TWILIO_SOFIA_AUTH_TOKEN: !!process.env.TWILIO_SOFIA_AUTH_TOKEN,
    TWILIO_SOFIA_FROM: !!process.env.TWILIO_SOFIA_FROM,
    CRON_SECRET: !!process.env.CRON_SECRET,
    FREE_TIER_DAILY_SECONDS: process.env.FREE_TIER_DAILY_SECONDS ?? "(default: 180)",
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: required,
  });
}
