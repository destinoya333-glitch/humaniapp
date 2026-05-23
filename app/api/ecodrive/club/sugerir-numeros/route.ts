import { NextRequest, NextResponse } from "next/server";
import { getClubClient, getRandomAvailableNumbers } from "@/lib/ecodrive/club";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const edicionId = req.nextUrl.searchParams.get("edicion_id");
  const count = Number(req.nextUrl.searchParams.get("count") || "5");
  if (!edicionId) return NextResponse.json({ error: "edicion_id required" }, { status: 400 });

  const sb = getClubClient();
  const { data: ed, error } = await sb
    .from("club_ediciones")
    .select("meta_tickets,estado")
    .eq("id", edicionId)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  if (ed.estado !== "abierta")
    return NextResponse.json({ error: "edicion no abierta" }, { status: 400 });

  const numeros = await getRandomAvailableNumbers(sb, edicionId, ed.meta_tickets, Math.min(count, 10));
  return NextResponse.json({ ok: true, numeros });
}
