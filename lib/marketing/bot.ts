// =====================================================================
// Ventana de Publicidad — Bot de status por WhatsApp (solo para Percy)
//
// Intercepta mensajes del número del admin y responde comandos de marketing:
//   status / reporte        → resumen de efectividad (FB+IG+TikTok [+GA4])
//   mejores                 → top publicaciones
//   peores                  → publicaciones a mejorar
//   horas                   → mejores horas para publicar
//   sync / actualizar       → fuerza la sincronización de métricas
//   ayuda / menu            → lista de comandos
//
// Devuelve null si el mensaje NO es para el bot de marketing (deja que el
// flujo normal del webhook lo procese).
// =====================================================================
import { topPosts, resumenGlobal, mejorHora } from "./db";
import { fetchAllMeta } from "./meta";
import { fetchTikTokVideos } from "./tiktok";
import { guardarPostConMetrica } from "./db";
import { fetchGA4Summary } from "./ga4";
import { encolarPost, aprobarYPublicar, rechazarPendiente } from "./publish";
import { descubrirMarcas } from "./brands";

// Números autorizados (E.164 sin +). Solo Percy.
const ADMINS = new Set(["51998102258", "51994810242"]);

export function isMarketingAdmin(fromDigits: string): boolean {
  return ADMINS.has(fromDigits.replace(/^\+/, ""));
}

const REDES_EMOJI: Record<string, string> = { facebook: "🔵", instagram: "🟣", tiktok: "⚫" };

function recorta(s: string | null, n = 45): string {
  if (!s) return "(sin texto)";
  const c = s.replace(/\s+/g, " ").trim();
  return c.length > n ? c.slice(0, n) + "…" : c;
}

const AYUDA = [
  "🎛️ *Centro de Marketing* — comandos:",
  "",
  "📊 *status* — resumen de efectividad",
  "🏆 *mejores* — top publicaciones",
  "⚠️ *peores* — posts a mejorar",
  "⏰ *horas* — mejores horas para publicar",
  "🔄 *sync* — actualizar métricas ahora",
  "🌐 *web* — tráfico de la web (GA4)",
  "🏢 *marcas* — marcas/redes que leo",
  "",
  "✍️ *publica <idea>* — la IA crea el post y te lo muestra",
  "✅ *aprobar* — publica el post pendiente",
  "🗑️ *rechazar* — descarta el post pendiente",
  "",
  "❓ *ayuda* — este menú",
].join("\n");

/**
 * Procesa un comando de marketing. Devuelve el texto a responder, o null si
 * el texto no es un comando de marketing (para no secuestrar conversación normal).
 */
export async function handleMarketingCommand(text: string): Promise<string | null> {
  const t = text.trim().toLowerCase();

  // Gatillo explícito o palabras clave. Si no coincide, devolvemos null.
  const esComando =
    /^(mkt|marketing|status|reporte|mejores|peores|horas|sync|sincroniz|actualiz|web|marcas|ayuda marketing|menu marketing|publicidad|publica|publicar|aprobar|aprueba|rechazar|rechaza)\b/.test(
      t,
    );
  if (!esComando) return null;

  // Quitar prefijo "mkt" / "marketing" si lo usó
  const cmd = t.replace(/^(mkt|marketing)\s+/, "").trim();

  if (/^(ayuda|menu|help)/.test(cmd) || cmd === "marketing" || cmd === "publicidad") {
    return AYUDA;
  }

  // ─── FASE 2: publicar con aprobación ──────────────────────────────────────
  if (/^(publica|publicar)\b/.test(cmd)) {
    // Tomar la idea del TEXTO ORIGINAL (preserva mayúsculas/acentos)
    const idea = text.trim().replace(/^(mkt|marketing)\s+/i, "").replace(/^(publica|publicar)\s*/i, "").trim();
    if (!idea) return "✍️ Dime qué publicar. Ej: *publica promo de viajes seguros este fin de semana*";
    const r = await encolarPost(idea, ["facebook"]);
    if (!r) return "⚠️ No pude generar el post. Intenta de nuevo.";
    return [
      "✍️ *Post listo para revisar* (Facebook):",
      "",
      r.caption,
      "",
      "Responde *aprobar* para publicar o *rechazar* para descartar.",
    ].join("\n");
  }

  if (/^(aprobar|aprueba)\b/.test(cmd)) {
    return await aprobarYPublicar("percy");
  }

  if (/^(rechazar|rechaza)\b/.test(cmd)) {
    return await rechazarPendiente();
  }

  if (/^marcas/.test(cmd)) {
    const ms = await descubrirMarcas();
    if (!ms.length) return "No detecto marcas. Revisa el token de marketing.";
    const lines = ["🏢 *Marcas detectadas* (páginas que leo):", ""];
    ms.forEach((m) => lines.push(`• ${m.nombre} → ${m.marca}${m.igId ? " (+IG)" : ""}`));
    lines.push("", "_Asigna más páginas al robot en Meta y aparecerán solas._");
    return lines.join("\n");
  }

  if (/^(sync|sincroniz|actualiz)/.test(cmd)) {
    const { posts } = await fetchAllMeta();
    const tk = await fetchTikTokVideos();
    let n = 0;
    for (const p of [...posts, ...tk]) if (await guardarPostConMetrica(p)) n++;
    return `🔄 Sincronización lista.\n${n} publicaciones actualizadas (Meta: ${posts.length} · TikTok: ${tk.length}).\n\nEscribe *status* para ver el resumen.`;
  }

  if (/^mejores/.test(cmd)) {
    const top = await topPosts(5, "mejores");
    if (!top.length) return "Aún no hay datos. Escribe *sync* para traer métricas.";
    const lines = ["🏆 *Mejores publicaciones:*", ""];
    top.forEach((p, i) =>
      lines.push(`${i + 1}. ${REDES_EMOJI[p.red] || "•"} score *${p.score}* · ${p.alcance.toLocaleString("es-PE")} alc.\n   "${recorta(p.caption)}"`),
    );
    return lines.join("\n");
  }

  if (/^peores/.test(cmd)) {
    const bot = await topPosts(5, "peores");
    if (!bot.length) return "Aún no hay datos. Escribe *sync* primero.";
    const lines = ["⚠️ *Publicaciones a mejorar:*", ""];
    bot.forEach((p) =>
      lines.push(`• ${REDES_EMOJI[p.red] || "•"} score *${p.score}* — "${recorta(p.caption)}"`),
    );
    return lines.join("\n");
  }

  if (/^horas/.test(cmd)) {
    const h = await mejorHora();
    if (!h.length) return "Aún no hay datos suficientes. Escribe *sync* primero.";
    const top = h.slice(0, 5).map((x) => `${String(x.hora).padStart(2, "0")}:00 (${x.engagementProm} eng.)`);
    return "⏰ *Mejores horas para publicar (Lima):*\n\n" + top.join("\n");
  }

  if (/^web/.test(cmd)) {
    const ga4 = await fetchGA4Summary(28);
    if (!ga4) return "🌐 GA4 aún no está conectado. (Lo activamos cuando se resuelva el acceso.)";
    return [
      `🌐 *Web (${ga4.rango}):*`,
      `Usuarios: ${ga4.usuarios.toLocaleString("es-PE")}`,
      `Sesiones: ${ga4.sesiones.toLocaleString("es-PE")}`,
      `Conversiones: ${ga4.conversiones.toLocaleString("es-PE")}`,
    ].join("\n");
  }

  // status / reporte (default)
  const [resumen, mejores, horas, ga4] = await Promise.all([
    resumenGlobal(),
    topPosts(3, "mejores"),
    mejorHora(),
    fetchGA4Summary(7),
  ]);
  if (resumen.totalPosts === 0) {
    return "📊 Aún no hay datos. Escribe *sync* para traer las métricas de tus redes.";
  }
  const lines = ["📊 *STATUS DE MARKETING*", `${resumen.totalPosts} posts · ${resumen.alcanceTotal.toLocaleString("es-PE")} de alcance`, ""];
  for (const [red, r] of Object.entries(resumen.porRed)) {
    lines.push(`${REDES_EMOJI[red] || "•"} ${red}: ${r.posts} posts · ${r.alcance.toLocaleString("es-PE")} alc.`);
  }
  if (mejores[0]) {
    lines.push("", `🏆 Mejor: "${recorta(mejores[0].caption)}" (score ${mejores[0].score})`);
  }
  if (horas[0]) {
    lines.push(`⏰ Mejor hora: ${String(horas[0].hora).padStart(2, "0")}:00`);
  }
  if (ga4) {
    lines.push("", `🌐 Web 7d: ${ga4.usuarios} usuarios · ${ga4.conversiones} conv.`);
  }
  lines.push("", "_Escribe *ayuda* para ver todos los comandos._");
  return lines.join("\n");
}
