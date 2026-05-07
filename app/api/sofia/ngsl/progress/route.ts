/**
 * GET /api/sofia/ngsl/progress?user_id=...
 *
 * Devuelve el progreso NGSL por tier para mostrar en /sofia-chat el sticker
 * "X/100 palabras del 80% del inglés".
 *
 * Counter directo al pitch de Mario Montes ("Memoriza 100 palabras del 80%"):
 * Sofia mide cuántas USAS, no cuántas memorizaste.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserNgslProgress } from "@/lib/miss-sofia-voice/ngsl";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }
  const progress = await getUserNgslProgress(userId);
  return NextResponse.json({ ok: true, user_id: userId, progress });
}
