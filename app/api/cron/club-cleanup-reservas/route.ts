import { NextRequest, NextResponse } from "next/server";
import { getClubClient } from "@/lib/ecodrive/club";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sb = getClubClient();
  const { data, error } = await sb.rpc("club_cleanup_reservas_vencidas");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, borradas: data, at: new Date().toISOString() });
}
