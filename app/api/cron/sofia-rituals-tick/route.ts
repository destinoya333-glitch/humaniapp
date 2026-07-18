/**
 * GET /api/cron/sofia-rituals-tick
 *
 * Vercel cron — corre cada hora.
 * Para cada estudiante Cuna activo:
 *   - calcula el ritual_slot del momento
 *   - si NO ha recibido ese ritual hoy → genera guion (Claude) + audio (TTS) + envía WhatsApp
 *
 * Idempotente: marca cada envío en mse_daily_rituals_sent y skipea duplicados.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDueRituals, executeRitualForUser } from "@/lib/miss-sofia-voice/ritual-engine";
import type { RitualSlot } from "@/lib/miss-sofia-voice/phase-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — generación + TTS puede tardar

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Si viene ?slot=morning|lunch|night|bedtime forzamos ese slot
  // (permite tener 4 crons Vercel distintos cada uno fijando su slot)
  const url = new URL(req.url);
  const forcedSlot = url.searchParams.get("slot") as RitualSlot | null;

  const startedAt = new Date().toISOString();
  const due = await getDueRituals(undefined, forcedSlot ?? undefined);
  if (due.length === 0) {
    return NextResponse.json({
      ok: true,
      startedAt,
      due: 0,
      message: "No hay estudiantes elegibles para este slot",
    });
  }

  const results: Array<{
    user_id: string;
    name: string;
    ritual_slot: string;
    ok: boolean;
    wamid?: string;
    error?: string;
  }> = [];

  // Limitar concurrencia para no choquear TTS/API (procesamos secuencialmente)
  for (const ctx of due.slice(0, 20)) {
    const r = await executeRitualForUser(ctx);
    results.push({
      user_id: ctx.user_id,
      name: ctx.name,
      ritual_slot: ctx.ritual_slot,
      ok: r.ok,
      wamid: r.wamid,
      error: r.error,
    });
  }

  const ok_count = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    startedAt,
    due: due.length,
    processed: results.length,
    ok_count,
    failed: results.filter((r) => !r.ok),
    sample_results: results.slice(0, 5),
  });
}
