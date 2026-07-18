// =====================================================================
// Ventana de Publicidad — Fase 2: generación de copy + publicación
//
// Flujo (vía bot de WhatsApp, ver bot.ts):
//   1. Percy: "publica <idea>"  → genera copy con Claude, encola en
//      marketing_cola (estado pendiente_aprobacion), responde preview.
//   2. Percy: "aprobar"         → toma el último pendiente, publica en FB
//      (Graph API) y marca publicado.
//   3. Percy: "rechazar"        → descarta el último pendiente.
//
// Publicación: Facebook Page vía Graph API (token de página). Instagram y
// TikTok quedan como TODO (IG requiere imagen alojada; TikTok requiere
// Content Posting API en producción).
// =====================================================================
import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getMetaConfig, resolveAssets } from "./meta";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

const SYSTEM = `Eres el redactor de marketing de EcoDrive+, app de movilidad en Trujillo, Perú.
Marca: color naranja, cercana, jergas peruanas suaves (ya pe, manyas, di), emojis con medida.
Tagline: "Mejorando familias, transformando ciudades".
Escribe un post para redes sociales (Facebook/Instagram) a partir de la idea del usuario.
Reglas: 1 a 4 líneas, gancho al inicio, 1 llamado a la acción, 3-5 hashtags al final.
NO inventes promociones, precios ni fechas que el usuario no haya dado.
Responde SOLO con el texto del post, sin comillas ni explicaciones.`;

/** Genera el copy de un post a partir de una idea. */
export async function generarCopy(idea: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: SYSTEM,
    messages: [{ role: "user", content: `Idea: ${idea}` }],
  });
  const txt = msg.content.find((c) => c.type === "text");
  return txt && "text" in txt ? txt.text.trim() : "";
}

/** Crea un borrador pendiente de aprobación. Devuelve {id, caption}. */
export async function encolarPost(
  idea: string,
  redes: string[] = ["facebook"],
  marca = "ecodrive",
): Promise<{ id: number; caption: string } | null> {
  const caption = await generarCopy(idea);
  if (!caption) return null;
  const { data, error } = await db()
    .from("marketing_cola")
    .insert({ marca, redes, caption, estado: "pendiente_aprobacion", creado_por: "ia" })
    .select("id, caption")
    .single();
  if (error) {
    console.error("[marketing/publish] encolar:", error.message);
    return null;
  }
  return { id: data.id, caption: data.caption };
}

/** Devuelve el último post pendiente de aprobación (o null). */
export async function ultimoPendiente(): Promise<{ id: number; caption: string; redes: string[] } | null> {
  const { data } = await db()
    .from("marketing_cola")
    .select("id, caption, redes")
    .eq("estado", "pendiente_aprobacion")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

/** Publica un texto en la Página de Facebook. Devuelve el post id o null. */
async function publicarFacebook(caption: string): Promise<string | null> {
  const base = getMetaConfig();
  if (!base) return null;
  const cfg = await resolveAssets(base);
  if (!cfg.pageId || !cfg.pageToken) return null;
  try {
    const r = await fetch(`https://graph.facebook.com/v22.0/${cfg.pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: caption, access_token: cfg.pageToken }),
    });
    const j = await r.json();
    if (j.id) return j.id;
    console.warn("[marketing/publish] FB:", JSON.stringify(j.error || j).slice(0, 150));
    return null;
  } catch (e) {
    console.error("[marketing/publish] FB error:", (e as Error).message);
    return null;
  }
}

/** Aprueba y publica el post pendiente. Devuelve resultado legible. */
export async function aprobarYPublicar(aprobadoPor = "percy"): Promise<string> {
  const pend = await ultimoPendiente();
  if (!pend) return "No hay ningún post pendiente de aprobación. Escribe *publica <idea>* primero.";

  const publicados: Record<string, string> = {};
  const fallidos: string[] = [];

  if (pend.redes.includes("facebook")) {
    const id = await publicarFacebook(pend.caption);
    if (id) publicados.facebook = id;
    else fallidos.push("facebook");
  }
  // IG y TikTok: pendientes (requieren imagen alojada / Content Posting API).
  for (const r of pend.redes) {
    if (r !== "facebook" && !publicados[r]) fallidos.push(r);
  }

  const publicado = Object.keys(publicados).length > 0;
  await db()
    .from("marketing_cola")
    .update({
      estado: publicado ? "publicado" : "error",
      aprobado_por: aprobadoPor,
      publicado_ids: publicados,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pend.id);

  if (!publicado) {
    return `⚠️ No se pudo publicar (${fallidos.join(", ")}). Revisa el token de la página.`;
  }
  let msg = `✅ Publicado en: ${Object.keys(publicados).join(", ")}`;
  if (fallidos.length) msg += `\n⏳ Pendiente en: ${fallidos.join(", ")} (aún no automatizado).`;
  return msg;
}

/** Rechaza (descarta) el post pendiente. */
export async function rechazarPendiente(): Promise<string> {
  const pend = await ultimoPendiente();
  if (!pend) return "No hay ningún post pendiente.";
  await db().from("marketing_cola").update({ estado: "rechazado" }).eq("id", pend.id);
  return "🗑️ Post descartado. Escribe *publica <idea>* para crear otro.";
}
