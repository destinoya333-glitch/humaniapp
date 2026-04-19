import { NextRequest, NextResponse } from "next/server";

const LA_BASE = "https://api.liveavatar.com";
const API_KEY = process.env.LIVEAVATAR_API_KEY!;

// Default avatar if none selected
const DEFAULT_AVATAR_ID = "7299c55d-1f45-482d-915c-e5efdc9dd266"; // Elenora Fitness Coach 2 — tank top, full body

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const maxDuration: number = Math.min(body.max_duration ?? 300, 300);
  const avatarId: string = body.avatar_id ?? DEFAULT_AVATAR_ID;

  // Step 1: create LITE session token
  const tokenRes = await fetch(`${LA_BASE}/v1/sessions/token`, {
    method: "POST",
    headers: { "X-API-KEY": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      avatar_id: avatarId,
      mode: "LITE",
      max_session_duration: maxDuration,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    return NextResponse.json({ error: "token_failed", detail: err }, { status: tokenRes.status });
  }

  const tokenData = await tokenRes.json();
  const sessionToken: string = tokenData.data.session_token;
  const sessionId: string = tokenData.data.session_id;

  // Step 2: start the session
  const startRes = await fetch(`${LA_BASE}/v1/sessions/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({}));
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
