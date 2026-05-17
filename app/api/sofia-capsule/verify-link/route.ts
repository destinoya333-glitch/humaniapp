/**
 * GET /api/sofia-capsule/verify-link?topic=...&difficulty=...&u=...&exp=...&sig=...
 *
 * Verifica la firma HMAC de un link de cápsula que vino por WhatsApp.
 * Si OK: devuelve { ok: true, userId, topic, difficulty } y el frontend
 * puede arrancar la cápsula sin que el usuario re-elija tema.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCapsulePayload } from "@/lib/miss-sofia-voice/capsule-link";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") ?? "";
  const difficulty = (searchParams.get("difficulty") ?? "") as "easy" | "medium" | "hard";
  const userId = searchParams.get("u") ?? "";
  const exp = parseInt(searchParams.get("exp") ?? "0", 10);
  const sig = searchParams.get("sig") ?? "";

  if (!topic || !difficulty || !userId || !exp || !sig) {
    return NextResponse.json({ ok: false, error: "missing params" }, { status: 400 });
  }
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return NextResponse.json({ ok: false, error: "bad difficulty" }, { status: 400 });
  }

  const valid = verifyCapsulePayload(
    { topic, difficulty, userId, expiresAt: exp },
    sig
  );
  if (!valid) {
    return NextResponse.json({ ok: false, error: "invalid or expired signature" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, userId, topic, difficulty });
}
