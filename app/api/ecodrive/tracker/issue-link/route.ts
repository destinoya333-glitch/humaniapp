/**
 * GET /api/ecodrive/tracker/issue-link?chofer_id=<uuid>&secret=<shared>
 *
 * Genera link firmado HMAC para que el chofer abra su PWA tracker.
 * Auth por shared secret. El bot/admin lo manda por WhatsApp al chofer.
 *
 * Backward-compat: si el chofer_id es numerico (legacy bigint), busca por legacy_user_id.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { issueChoferTrackerToken } from "@/lib/ecodrive/tracker-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const TRACKER_BASE_URL = "https://ecodriveplus.com/track-chofer";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: Request) {
  const expected = process.env.ECODRIVE_TRACKER_SECRET || "";
  const url = new URL(req.url);
  const provided = url.searchParams.get("secret") || "";
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const choferIdRaw = url.searchParams.get("chofer_id") || "";
  if (!choferIdRaw) {
    return NextResponse.json({ error: "missing_chofer_id" }, { status: 400, headers: noStore });
  }

  const sb = db();
  const isNumeric = /^\d+$/.test(choferIdRaw);
  const query = isNumeric
    ? sb.from("eco_choferes").select("id").eq("legacy_user_id", Number(choferIdRaw))
    : sb.from("eco_choferes").select("id").eq("id", choferIdRaw);

  const { data: chofer } = await query.maybeSingle();
  if (!chofer) {
    return NextResponse.json({ error: "chofer_not_found" }, { status: 404, headers: noStore });
  }
  const choferUuid = (chofer as { id: string }).id;

  const token = issueChoferTrackerToken(choferUuid);
  return NextResponse.json(
    { link: `${TRACKER_BASE_URL}/${token}`, token, chofer_id: choferUuid },
    { headers: noStore }
  );
}
