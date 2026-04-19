import { NextRequest, NextResponse } from "next/server";

const LA_BASE = "https://api.liveavatar.com";
const API_KEY = process.env.LIVEAVATAR_API_KEY!;

// Default Sofía avatar (Anastasia Sitting Portrait — female, warm look)
const DEFAULT_AVATAR_ID = "b475a5c1-c6a9-45d1-9f86-79b97cf0091f";
// "Welcome to LiveAvatar" context — we override language to Spanish
const DEFAULT_CONTEXT_ID = "28783467-c466-4094-bdc6-9545c02aa014";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const avatarId: string = body.avatar_id ?? DEFAULT_AVATAR_ID;
  const contextId: string = body.context_id ?? DEFAULT_CONTEXT_ID;
  const sandbox: boolean = body.sandbox ?? false;

  const res = await fetch(`${LA_BASE}/v2/embeddings`, {
    method: "POST",
    headers: {
      "X-API-KEY": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      avatar_id: avatarId,
      context_id: contextId,
      default_language: "es",
      is_sandbox: sandbox,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: "LiveAvatar error", detail: data },
      { status: res.status }
    );
  }

  return NextResponse.json({
    url: data.data?.url ?? null,
    script: data.data?.script ?? null,
  });
}
