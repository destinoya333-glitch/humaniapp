import { NextRequest, NextResponse } from "next/server";

const LA_BASE = "https://api.liveavatar.com";
const API_KEY = process.env.LIVEAVATAR_API_KEY!;

// Anastasia Sitting Portrait — female, warm look
const AVATAR_ID = "b475a5c1-c6a9-45d1-9f86-79b97cf0091f";
// "Welcome to LiveAvatar" context (default, overridden to Spanish)
const CONTEXT_ID = "28783467-c466-4094-bdc6-9545c02aa014";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const maxDuration: number = body.max_duration ?? 1800;

  const res = await fetch(`${LA_BASE}/v2/embeddings`, {
    method: "POST",
    headers: {
      "X-API-KEY": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      avatar_id: AVATAR_ID,
      context_id: CONTEXT_ID,
      default_language: "es",
      max_session_duration: maxDuration,
      is_sandbox: false,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: "embed_failed", detail: data },
      { status: res.status }
    );
  }

  return NextResponse.json({
    url: data.data?.url ?? null,
  });
}
