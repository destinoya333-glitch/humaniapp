// Cron Club — anuncia milestones (500/1000/1500/2000/2500 Números de Socio vendidos)
// vía template Meta `club_progreso_milestone_v2` a todos los socios activos.
//
// IMPORTANTE: NO activo en vercel.json todavía. Se activa cuando Percy diga OK.
// Para test manual: GET /api/cron/club-progreso-milestone?dry=1
//
// Auth: header Authorization: Bearer <CRON_SECRET>
// Param dry=1 = dry-run (lista lo que enviaría pero no envía)

import { NextRequest, NextResponse } from "next/server";
import { getClubClient } from "@/lib/ecodrive/club";
import { sendTemplate, isMetaConfigured } from "@/lib/ecodrive/wa-send";

export const dynamic = "force-dynamic";

// Milestones que disparan anuncio (lower-bound asc)
const MILESTONES = [500, 1000, 1500, 2000, 2500];

function roundDownMilestone(vendidos: number): number {
  let last = 0;
  for (const m of MILESTONES) if (vendidos >= m) last = m;
  return last;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}` && !req.nextUrl.searchParams.get("dry")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const sb = getClubClient();

  // Ediciones abiertas
  const { data: ediciones, error } = await sb
    .from("club_ediciones")
    .select("id,numero_edicion,nombre,meta_tickets,ultimo_milestone_anunciado")
    .eq("estado", "abierta");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: Array<{ edicion: number; vendidos: number; milestone: number; previo: number; enviados: number }> = [];

  for (const ed of ediciones ?? []) {
    const { count: vendidos = 0 } = await sb
      .from("club_tickets")
      .select("id", { count: "exact", head: true })
      .eq("edicion_id", ed.id)
      .eq("estado", "confirmado");

    const milestoneActual = roundDownMilestone(vendidos ?? 0);
    const previo = Number(ed.ultimo_milestone_anunciado ?? 0);
    if (milestoneActual <= previo) {
      result.push({ edicion: ed.numero_edicion, vendidos: vendidos ?? 0, milestone: milestoneActual, previo, enviados: 0 });
      continue;
    }

    // Cruzó milestone: traer todos los socios con Pass activo
    const { data: socios } = await sb
      .from("club_miembros")
      .select("id,whatsapp,nombre,club_pass!inner(id)")
      .eq("club_pass.estado", "activo");

    let enviados = 0;
    if (!dry && isMetaConfigured()) {
      const faltan = Math.max(Number(ed.meta_tickets ?? 3000) - (vendidos ?? 0), 0);
      for (const s of socios ?? []) {
        try {
          await sendTemplate(
            s.whatsapp,
            "club_progreso_milestone_v2",
            "es",
            [String(vendidos ?? 0), String(ed.meta_tickets ?? 3000), ed.nombre ?? "BYD Yuan Pro 2023", String(faltan)],
          );
          enviados++;
          // throttle suave para no pegar contra rate limit Meta (250 msg/seg Tier 2)
          await new Promise((r) => setTimeout(r, 50));
        } catch (e) {
          console.warn(`[club-progreso-milestone] envío a ${s.whatsapp} falló:`, e);
        }
      }
      // Marcar milestone como anunciado
      await sb.from("club_ediciones").update({ ultimo_milestone_anunciado: milestoneActual }).eq("id", ed.id);
    }

    result.push({ edicion: ed.numero_edicion, vendidos: vendidos ?? 0, milestone: milestoneActual, previo, enviados });
  }

  return NextResponse.json({ ok: true, dry, ediciones: result, at: new Date().toISOString() });
}
