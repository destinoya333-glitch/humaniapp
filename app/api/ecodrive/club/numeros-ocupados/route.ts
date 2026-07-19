import { NextRequest, NextResponse } from "next/server";
import { getClubClient } from "@/lib/ecodrive/club";

export const dynamic = "force-dynamic";

/**
 * Devuelve los números YA ocupados de una edición (boletos emitidos + reservas
 * activas), para pintar la cartilla de selección (libres vs ocupados).
 */
export async function GET(req: NextRequest) {
  const edicionId = req.nextUrl.searchParams.get("edicion_id");
  if (!edicionId) return NextResponse.json({ error: "edicion_id required" }, { status: 400 });

  const sb = getClubClient();
  const [{ data: tickets }, { data: reservas }, { data: ed }] = await Promise.all([
    sb.from("club_tickets").select("numero_correlativo").eq("edicion_id", edicionId),
    sb
      .from("club_reservas")
      .select("numero_correlativo")
      .eq("edicion_id", edicionId)
      .gt("expira_en", new Date().toISOString()),
    sb.from("club_ediciones").select("meta_tickets").eq("id", edicionId).maybeSingle(),
  ]);

  const ocupados = Array.from(
    new Set<number>([
      ...(tickets ?? []).map((t) => t.numero_correlativo as number),
      ...(reservas ?? []).map((r) => r.numero_correlativo as number),
    ]),
  ).sort((a, b) => a - b);

  return NextResponse.json({
    ok: true,
    ocupados,
    meta: (ed as { meta_tickets?: number } | null)?.meta_tickets ?? 3000,
  });
}
