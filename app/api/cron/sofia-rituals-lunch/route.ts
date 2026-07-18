/**
 * GET /api/cron/sofia-rituals-lunch
 * Dispara ritual LUNCH (Vercel cron a 16 UTC = 11:00 AM Lima).
 * Redirige al endpoint principal con ?slot=lunch.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://activosya.com";
  const r = await fetch(`${base}/api/cron/sofia-rituals-tick?slot=lunch`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await r.json();
  return NextResponse.json({ ...data, slot: "lunch" });
}
