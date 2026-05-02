import { NextResponse } from "next/server";
import { issueChoferTrackerToken } from "@/lib/ecodrive/tracker-token";

const noStore = { "Cache-Control": "no-store" };
const TRACKER_BASE_URL = "https://ecodriveplus.com/track-chofer";

// GET /api/ecodrive/tracker/issue-link?chofer_id=619&secret=<shared>
// Endpoint interno usado por el bot n8n para obtener un link firmado HMAC.
// Autenticacion via shared secret (mismo ECODRIVE_TRACKER_SECRET).
export async function GET(req: Request) {
  const expected = process.env.ECODRIVE_TRACKER_SECRET || "";
  const url = new URL(req.url);
  const provided = url.searchParams.get("secret") || "";
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const choferIdRaw = url.searchParams.get("chofer_id");
  const choferId = Number(choferIdRaw);
  if (!Number.isFinite(choferId) || choferId <= 0) {
    return NextResponse.json({ error: "bad_chofer_id" }, { status: 400, headers: noStore });
  }
  const token = issueChoferTrackerToken(choferId);
  return NextResponse.json(
    { link: `${TRACKER_BASE_URL}/${token}`, token, chofer_id: choferId },
    { headers: noStore }
  );
}
