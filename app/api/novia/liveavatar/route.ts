import { NextRequest, NextResponse } from "next/server";

const LA_BASE = "https://api.liveavatar.com";
const API_KEY = process.env.LIVEAVATAR_API_KEY!;

// Anastasia Sitting Portrait — female, warm look
const AVATAR_ID = "b475a5c1-c6a9-45d1-9f86-79b97cf0091f";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const maxDuration: number = body.max_duration ?? 600; // 10 min default

  // Step 1: create session token in LITE mode
  const tokenRes = await fetch(`${LA_BASE}/v1/sessions/token`, {
    method: "POST",
    headers: { "X-API-KEY": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      avatar_id: AVATAR_ID,
      mode: "LITE",
      max_session_duration: maxDuration,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json();
    return NextResponse.json({ error: "token_failed", detail: err }, { status: tokenRes.status });
  }

  const tokenData = await tokenRes.json();
  const sessionId: string = tokenData.data.session_id;
  const sessionToken: string = tokenData.data.session_token;

  // Step 2: start the session
  const startRes = await fetch(`${LA_BASE}/v1/sessions/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!startRes.ok) {
    const err = await startRes.json();
    return NextResponse.json({ error: "start_failed", detail: err }, { status: startRes.status });
  }

  const startData = await startRes.json();
  const d = startData.data;

  return NextResponse.json({
    session_id: sessionId,
    livekit_url: d.livekit_url,
    livekit_token: d.livekit_client_token,
    ws_url: d.ws_url,
  });
}
