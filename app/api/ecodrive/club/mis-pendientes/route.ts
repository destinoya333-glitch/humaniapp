/**
 * GET /api/ecodrive/club/mis-pendientes?whatsapp=51...
 *
 * Devuelve las membresías PAGADAS a las que les falta elegir número (pass activo
 * sin ticket) para que el cliente las complete después (desde Mi Cuenta o el app).
 */
import { NextRequest, NextResponse } from "next/server";
import { getClubClient, normalizeWhatsapp } from "@/lib/ecodrive/club";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wa = normalizeWhatsapp(req.nextUrl.searchParams.get("whatsapp") || "");
  if (!wa) return NextResponse.json({ error: "whatsapp requerido" }, { status: 400 });
  const sb = getClubClient();

  const { data: miembro } = await sb.from("club_miembros").select("id").eq("whatsapp", wa).maybeSingle();
  if (!miembro?.id) return NextResponse.json({ ok: true, pendientes: 0, pass_ids: [], edicion: null });

  const { data: passes } = await sb
    .from("club_pass")
    .select("id")
    .eq("miembro_id", miembro.id)
    .eq("estado", "activo");
  const passIds = (passes ?? []).map((p) => p.id as string);
  if (passIds.length === 0) return NextResponse.json({ ok: true, pendientes: 0, pass_ids: [], edicion: null });

  const { data: tickets } = await sb
    .from("club_tickets")
    .select("pass_id")
    .in("pass_id", passIds);
  const conNumero = new Set((tickets ?? []).map((t) => t.pass_id as string));
  const pendientes = passIds.filter((id) => !conNumero.has(id));

  const { data: edRows } = await sb.rpc("club_edicion_actual");
  const ed = (edRows as { edicion_id?: string; nombre?: string; meta?: number }[] | null)?.[0] ?? null;

  return NextResponse.json({
    ok: true,
    pendientes: pendientes.length,
    pass_ids: pendientes,
    edicion: ed ? { edicion_id: ed.edicion_id, nombre: ed.nombre, meta: ed.meta } : null,
  });
}
