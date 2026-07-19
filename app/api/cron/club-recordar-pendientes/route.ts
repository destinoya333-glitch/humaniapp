/**
 * Cron SEMANAL: le recuerda por WhatsApp a quien pagó membresías pero le faltan
 * elegir su(s) número(s) (pass activo sin ticket, comprado hace +24h).
 *
 * Schedule (vercel.json): lunes 10am Lima → "0 15 * * 1".
 * Auth: header Authorization: Bearer <CRON_SECRET>.
 *
 * ⚠️ Requiere una plantilla Meta APROBADA `club_elegir_numero` (es):
 *    {{1}} nombre · {{2}} cantidad pendiente · {{3}} link
 * Sin plantilla aprobada, Meta rechaza el envío fuera de la ventana 24h.
 */
import { NextRequest, NextResponse } from "next/server";
import { getClubClient } from "@/lib/ecodrive/club";
import { sendTemplate, isMetaConfigured } from "@/lib/ecodrive/wa-send";

export const dynamic = "force-dynamic";

const TEMPLATE = process.env.CLUB_RECORDATORIO_TEMPLATE || "club_elegir_numero";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isMetaConfigured()) return NextResponse.json({ ok: false, error: "meta no configurado" });

  const sb = getClubClient();
  const base = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const link = `${base}/ecodriveplus/club/mi-cuenta`;
  const hace24h = new Date(Date.now() - 24 * 3600_000).toISOString();

  // Membresías activas compradas hace +24h
  const { data: passes } = await sb
    .from("club_pass")
    .select("id, miembro_id, created_at")
    .eq("estado", "activo")
    .lt("created_at", hace24h);
  const all = (passes ?? []) as { id: string; miembro_id: string }[];
  if (all.length === 0) return NextResponse.json({ ok: true, recordados: 0 });

  // Cuáles ya tienen número (ticket)
  const { data: tickets } = await sb
    .from("club_tickets")
    .select("pass_id")
    .in("pass_id", all.map((p) => p.id));
  const conNumero = new Set((tickets ?? []).map((t) => t.pass_id as string));

  // Pendientes por miembro
  const porMiembro = new Map<string, number>();
  for (const p of all) {
    if (!conNumero.has(p.id)) porMiembro.set(p.miembro_id, (porMiembro.get(p.miembro_id) ?? 0) + 1);
  }
  if (porMiembro.size === 0) return NextResponse.json({ ok: true, recordados: 0 });

  // Datos de contacto
  const ids = Array.from(porMiembro.keys());
  const { data: miembros } = await sb
    .from("club_miembros")
    .select("id, nombre, whatsapp")
    .in("id", ids);

  let enviados = 0;
  for (const m of (miembros ?? []) as { id: string; nombre: string; whatsapp: string }[]) {
    const pend = porMiembro.get(m.id) ?? 0;
    if (!m.whatsapp || pend <= 0) continue;
    try {
      await sendTemplate(m.whatsapp, TEMPLATE, "es", [
        (m.nombre || "").split(" ")[0] || "",
        String(pend),
        link,
      ]);
      enviados++;
    } catch (e) {
      console.warn("[cron/recordar-pendientes] envío falló", m.id, (e as Error).message);
    }
  }

  return NextResponse.json({ ok: true, pendientes_miembros: porMiembro.size, recordados: enviados });
}
