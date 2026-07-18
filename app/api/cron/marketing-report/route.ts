/**
 * GET /api/cron/marketing-report
 * Arma el reporte de efectividad y se lo manda a Percy por el bot ActivosYA
 * (WhatsApp). Por defecto resumen semanal; ?modo=hoy para diario.
 *
 * OJO ventana 24h de WhatsApp: el texto libre solo llega si Percy escribió al
 * bot en las últimas 24h. Para push garantizado fuera de ventana hay que usar
 * un template aprobado (pendiente Fase 2 — ver docs/marketing/VENTANA_PUBLICIDAD.md).
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}.
 */
import { NextRequest, NextResponse } from "next/server";
import { topPosts, resumenGlobal, mejorHora } from "@/lib/marketing/db";
import { fetchGA4Summary } from "@/lib/marketing/ga4";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PERCY_PHONE = "51998102258"; // personal de Percy

const REDES_EMOJI: Record<string, string> = { facebook: "🔵", instagram: "🟣", tiktok: "⚫" };

function recorta(s: string | null, n = 40): string {
  if (!s) return "(sin texto)";
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n) + "…" : clean;
}

async function enviarWA(phone: string, body: string): Promise<boolean> {
  // Enviar DESDE el número de DestinoYa hacia el personal de Percy.
  const token = process.env.META_DESTINOYA_ACCESS_TOKEN;
  const phoneId = process.env.META_DESTINOYA_PHONE_ID;
  if (!token || !phoneId) {
    console.warn("[marketing-report] WA no configurado");
    return false;
  }
  const res = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body, preview_url: false },
    }),
  });
  return res.ok;
}

const TEMPLATE = "reporte_publicidad";
const TEMPLATE_LANG = "es";

// Limpia un valor para variable de plantilla: sin saltos de línea ni espacios dobles.
function tplVar(s: string): string {
  return (s || "—").replace(/\s+/g, " ").trim().slice(0, 120) || "—";
}

/**
 * Envía el reporte vía plantilla aprobada (llega SIN ventana de 24h).
 * 4 variables: {{1}} rango, {{2}} posts, {{3}} alcance, {{4}} mejor publicación.
 */
async function enviarPlantilla(phone: string, vars: [string, string, string, string]): Promise<boolean> {
  const token = process.env.META_DESTINOYA_ACCESS_TOKEN;
  const phoneId = process.env.META_DESTINOYA_PHONE_ID;
  if (!token || !phoneId) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: TEMPLATE,
          language: { code: TEMPLATE_LANG },
          components: [
            {
              type: "body",
              parameters: vars.map((v) => ({ type: "text", text: tplVar(v) })),
            },
          ],
        },
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      console.warn("[marketing-report] plantilla falló:", JSON.stringify(j?.error || j).slice(0, 200));
    }
    return res.ok;
  } catch (e) {
    console.error("[marketing-report] plantilla error:", (e as Error).message);
    return false;
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const modo = req.nextUrl.searchParams.get("modo") === "hoy" ? "hoy" : "semana";

  const [resumen, mejores, peores, horas, ga4] = await Promise.all([
    resumenGlobal(),
    topPosts(3, "mejores"),
    topPosts(2, "peores"),
    mejorHora(),
    fetchGA4Summary(7),
  ]);

  if (resumen.totalPosts === 0) {
    const msg = "📊 *Ventana de Publicidad*\nAún no hay datos. Conecta el token de Meta (ECODRIVE_MARKETING_TOKEN) y corre el sync.";
    const sent = await enviarWA(PERCY_PHONE, msg);
    return NextResponse.json({ ok: true, enviado: sent, posts: 0 });
  }

  const lines: string[] = [];
  lines.push(`📊 *EFECTIVIDAD — reporte ${modo === "hoy" ? "de hoy" : "semanal"}*`);
  lines.push(`Posts analizados: ${resumen.totalPosts} · Alcance: ${resumen.alcanceTotal.toLocaleString("es-PE")}`);
  for (const [red, r] of Object.entries(resumen.porRed)) {
    lines.push(`${REDES_EMOJI[red] || "•"} ${red}: ${r.posts} posts · ${r.alcance.toLocaleString("es-PE")} alcance`);
  }
  lines.push("");
  lines.push("🏆 *Mejores:*");
  mejores.forEach((p, i) =>
    lines.push(`${i + 1}. ${REDES_EMOJI[p.red] || "•"} score ${p.score} — "${recorta(p.caption)}"`),
  );
  if (peores.length) {
    lines.push("");
    lines.push("⚠️ *A mejorar:*");
    peores.forEach((p) => lines.push(`• ${REDES_EMOJI[p.red] || "•"} score ${p.score} — "${recorta(p.caption)}"`));
  }
  if (horas.length) {
    const top = horas.slice(0, 3).map((h) => `${String(h.hora).padStart(2, "0")}:00`).join(", ");
    lines.push("");
    lines.push(`⏰ Mejores horas (engagement): ${top}`);
  }
  if (ga4) {
    lines.push("");
    lines.push(`🌐 *Web (${ga4.rango}):* ${ga4.usuarios} usuarios · ${ga4.sesiones} sesiones · ${ga4.conversiones} conversiones`);
  }
  lines.push("");
  lines.push("_Responde aquí para pedir más detalle o programar un post (Fase 2)._");

  const body = lines.join("\n");

  // 1) Plantilla aprobada → llega SIEMPRE, sin depender de la ventana de 24h.
  const mejor = mejores[0];
  const rango = modo === "hoy" ? "hoy" : "esta semana";
  const viaPlantilla = await enviarPlantilla(PERCY_PHONE, [
    rango,
    String(resumen.totalPosts),
    resumen.alcanceTotal.toLocaleString("es-PE"),
    recorta(mejor?.caption ?? "", 80),
  ]);

  // 2) Texto libre con el detalle completo (solo entra si la ventana está abierta).
  const viaTexto = await enviarWA(PERCY_PHONE, body);

  return NextResponse.json({
    ok: true,
    enviado: viaPlantilla || viaTexto,
    via: viaPlantilla ? "plantilla" : viaTexto ? "texto" : "ninguno",
    posts: resumen.totalPosts,
  });
}
