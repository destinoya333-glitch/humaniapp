// Cron Club — alerta de urgencia cuando faltan ≤100 Números de Socio para completar la edición.
// Manda template `club_ultimos_100_v2` UNA SOLA VEZ por edición (flag `urgencia_anunciada`).
//
// IMPORTANTE: NO activo en vercel.json todavía. Se activa cuando Percy diga OK.
// Para test manual: GET /api/cron/club-ultimos-100?dry=1

import { NextRequest, NextResponse } from "next/server";
import { getClubClient } from "@/lib/ecodrive/club";
import { sendTemplate, isMetaConfigured } from "@/lib/ecodrive/wa-send";

export const dynamic = "force-dynamic";

const UMBRAL = 100; // si faltan <= 100, dispara alerta

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}` && !req.nextUrl.searchParams.get("dry")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const sb = getClubClient();

  const { data: ediciones, error } = await sb
    .from("club_ediciones")
    .select("id,numero_edicion,nombre,meta_tickets,urgencia_anunciada")
    .eq("estado", "abierta");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: Array<{ edicion: number; faltan: number; ya_anunciada: boolean; enviados: number }> = [];

  for (const ed of ediciones ?? []) {
    const { count: vendidos = 0 } = await sb
      .from("club_tickets")
      .select("id", { count: "exact", head: true })
      .eq("edicion_id", ed.id)
      .eq("estado", "confirmado");

    const meta = Number(ed.meta_tickets ?? 3000);
    const faltan = Math.max(meta - (vendidos ?? 0), 0);
    const yaAnunciada = Boolean(ed.urgencia_anunciada);

    if (faltan > UMBRAL || yaAnunciada) {
      result.push({ edicion: ed.numero_edicion, faltan, ya_anunciada: yaAnunciada, enviados: 0 });
      continue;
    }

    const { data: socios } = await sb
      .from("club_miembros")
      .select("id,whatsapp,nombre,club_pass!inner(id)")
      .eq("club_pass.estado", "activo");

    let enviados = 0;
    if (!dry && isMetaConfigured()) {
      for (const s of socios ?? []) {
        const primerNombre = (s.nombre || "").split(" ")[0] || "";
        try {
          await sendTemplate(
            s.whatsapp,
            "club_ultimos_100_v2",
            "es",
            [primerNombre, String(faltan), ed.nombre ?? "BYD Yuan Pro 2023"],
          );
          enviados++;
          await new Promise((r) => setTimeout(r, 50));
        } catch (e) {
          console.warn(`[club-ultimos-100] envío a ${s.whatsapp} falló:`, e);
        }
      }
      await sb.from("club_ediciones").update({ urgencia_anunciada: true }).eq("id", ed.id);
    }

    result.push({ edicion: ed.numero_edicion, faltan, ya_anunciada: yaAnunciada, enviados });
  }

  return NextResponse.json({ ok: true, dry, ediciones: result, at: new Date().toISOString() });
}
