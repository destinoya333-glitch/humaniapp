import { NextRequest, NextResponse } from "next/server";
import { getClubClient, normalizeWhatsapp } from "@/lib/ecodrive/club";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wa = normalizeWhatsapp(req.nextUrl.searchParams.get("whatsapp") || "");
  if (!wa) return NextResponse.json({ error: "whatsapp required" }, { status: 400 });

  const sb = getClubClient();
  const { data: miembro } = await sb
    .from("club_miembros")
    .select("id,nombre,dni,whatsapp,tipo_perfil,total_gastado,ediciones_consumidas")
    .eq("whatsapp", wa)
    .maybeSingle();
  if (!miembro) return NextResponse.json({ ok: true, miembro: null, pass: [], tickets: [] });

  const { data: pass } = await sb
    .from("club_pass")
    .select("id,numero_pass_en_dni,fecha_inicio,fecha_fin,estado,ediciones_consumidas")
    .eq("miembro_id", miembro.id)
    .order("fecha_inicio", { ascending: false });

  const { data: tickets } = await sb
    .from("club_tickets")
    .select("id,numero_correlativo,origen,estado,paid_at,edicion_id,club_ediciones(numero_edicion,nombre,estado)")
    .eq("miembro_id", miembro.id)
    .order("paid_at", { ascending: false });

  return NextResponse.json({ ok: true, miembro, pass: pass ?? [], tickets: tickets ?? [] });
}
