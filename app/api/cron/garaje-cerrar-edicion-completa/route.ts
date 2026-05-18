import { NextRequest, NextResponse } from "next/server";
import { getGarajeClient } from "@/lib/ecodrive/garaje";
import { sendText, isMetaConfigured } from "@/lib/ecodrive/wa-send";

export const dynamic = "force-dynamic";

const ADMIN_WHATSAPP = process.env.GARAJE_ADMIN_WHATSAPP || "51998102258";

/**
 * Cron: chequea ediciones abiertas que llegaron a su meta_tickets y las cierra
 * automaticamente. Notifica al admin (Percy) para coordinar el sorteo presencial.
 *
 * Schedule sugerido en vercel.json o crons.json: cada 5 min.
 *  { "path": "/api/cron/garaje-cerrar-edicion-completa", "schedule": "STAR/5 * * * *" }
 *
 * Auth: header Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sb = getGarajeClient();

  const { data: abiertas, error } = await sb
    .from("garaje_ediciones")
    .select("id,numero_edicion,nombre,meta_tickets,premio_descripcion")
    .eq("estado", "abierta");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cerradas: Array<{ id: string; numero: number; vendidos: number }> = [];

  for (const ed of abiertas ?? []) {
    const { count } = await sb
      .from("garaje_tickets")
      .select("id", { count: "exact", head: true })
      .eq("edicion_id", ed.id)
      .eq("estado", "confirmado");
    const vendidos = count ?? 0;
    const meta = Number(ed.meta_tickets ?? 3000);

    if (vendidos >= meta) {
      const { error: upErr } = await sb
        .from("garaje_ediciones")
        .update({
          estado: "cerrada",
          cerrada_at: new Date().toISOString(),
        })
        .eq("id", ed.id);
      if (upErr) {
        console.warn("[cerrar-edicion] update failed", ed.id, upErr.message);
        continue;
      }
      cerradas.push({ id: ed.id, numero: ed.numero_edicion, vendidos });

      // Notificar al admin
      if (isMetaConfigured()) {
        const msg =
          `🚨 GARAJE — Edicion #${ed.numero_edicion} COMPLETA\n` +
          `Premio: ${ed.nombre}\n` +
          `Tickets vendidos: ${vendidos} / ${meta}\n` +
          `Estado: cerrada (lista para sorteo)\n\n` +
          `Coordina notario + fedatario para el sorteo presencial.\n` +
          `Panel: https://ecodriveplus.com/admin/garaje`;
        try {
          await sendText(ADMIN_WHATSAPP, msg);
        } catch (e) {
          console.warn("[cerrar-edicion] notify admin falló", e);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    revisadas: abiertas?.length ?? 0,
    cerradas: cerradas.length,
    detalle: cerradas,
    at: new Date().toISOString(),
  });
}
