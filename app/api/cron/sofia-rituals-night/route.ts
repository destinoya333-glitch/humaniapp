/**
 * GET /api/cron/sofia-rituals-night
 * Dispara ritual NIGHT (Vercel cron a 0 UTC = 7:00 PM Lima dia previo).
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
  const r = await fetch(`${base}/api/cron/sofia-rituals-tick?slot=night`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await r.json();
  return NextResponse.json({ ...data, slot: "night" });
}
