import { NextRequest, NextResponse } from "next/server";
import { getClubClient } from "@/lib/ecodrive/club";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") || "edicion-actual";
  const sb = getClubClient();

  if (action === "edicion-actual") {
    const { data, error } = await sb.rpc("club_edicion_actual");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, edicion: data?.[0] ?? null });
  }

  if (action === "historial") {
    const { data, error } = await sb.rpc("club_historial_ediciones");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ediciones: data ?? [] });
  }

  if (action === "ultimos-vendidos") {
    const { data, error } = await sb.rpc("club_ultimos_vendidos");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ultimos: data ?? [] });
  }

  if (action === "proxima-preview") {
    const { data, error } = await sb
      .from("club_ediciones")
      .select("id,numero_edicion,nombre,premio_descripcion,premio_valor_referencial,premio_fotos_urls,premio_video_url,meta_tickets,ticket_precio_publico,ticket_precio_interno,estado")
      .in("estado", ["borrador", "abierta"])
      .order("numero_edicion", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, edicion: data });
  }

  if (action === "programa") {
    const { data, error } = await sb.from("club_programa").select("*").limit(1).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, programa: data });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
