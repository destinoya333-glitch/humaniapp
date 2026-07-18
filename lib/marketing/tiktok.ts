// =====================================================================
// Ventana de Publicidad — Motor de métricas TikTok (Display API v2)
//
// Lee la lista de videos del usuario conectado y sus métricas (vistas, likes,
// comentarios, compartidos) desde open.tiktokapis.com. El token vive en
// marketing_credentials (red='tiktok') y se refresca solo cuando expira.
//
// Si no hay token guardado (TikTok no conectado aún), devuelve [] sin romper.
// =====================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedPost } from "./meta";

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/";

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

type Cred = { access_token: string; refresh_token: string | null; access_expires_at: string | null };

/** Devuelve un access_token válido, refrescándolo si expiró. null si no hay conexión. */
async function getValidToken(): Promise<string | null> {
  const { data } = await db()
    .from("marketing_credentials")
    .select("access_token, refresh_token, access_expires_at")
    .eq("provider", "tiktok")
    .order("updated_at", { ascending: false })
    .limit(1);
  const cred = (data?.[0] as Cred | undefined) ?? null;
  if (!cred?.access_token) return null;

  const expired = cred.access_expires_at ? new Date(cred.access_expires_at).getTime() < Date.now() + 60_000 : false;
  if (!expired) return cred.access_token;

  // Refrescar
  if (!cred.refresh_token) return cred.access_token; // sin refresh, probamos el actual
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return cred.access_token;

  try {
    const r = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: cred.refresh_token,
      }),
    });
    const t = await r.json();
    if (t.access_token) {
      await db()
        .from("marketing_credentials")
        .update({
          access_token: t.access_token,
          refresh_token: t.refresh_token || cred.refresh_token,
          access_expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("provider", "tiktok");
      return t.access_token;
    }
  } catch (e) {
    console.error("[marketing/tiktok] refresh falló:", (e as Error).message);
  }
  return cred.access_token;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

/** Jala los videos del usuario conectado y los normaliza. */
export async function fetchTikTokVideos(maxCount = 20): Promise<NormalizedPost[]> {
  const token = await getValidToken();
  if (!token) return [];

  const fields = "id,title,video_description,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count";
  try {
    const r = await fetch(`${VIDEO_LIST_URL}?fields=${fields}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: maxCount }),
      cache: "no-store",
    });
    const j = await r.json();
    if (j?.error && j.error.code !== "ok") {
      console.warn("[marketing/tiktok] video/list:", j.error.message || JSON.stringify(j.error));
    }
    const videos = j?.data?.videos ?? [];
    return videos.map((v: any): NormalizedPost => ({
      red: "tiktok",
      post_id: String(v.id),
      tipo: "video",
      permalink: v.share_url ?? null,
      caption: v.title || v.video_description || null,
      thumbnail_url: v.cover_image_url ?? null,
      publicado_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
      alcance: num(v.view_count), // TikTok no expone "reach"; usamos vistas como proxy
      impresiones: num(v.view_count),
      likes: num(v.like_count),
      comentarios: num(v.comment_count),
      compartidos: num(v.share_count),
      guardados: 0,
      clics: 0,
      video_views: num(v.view_count),
      raw: { tiktok: v },
    }));
  } catch (e) {
    console.error("[marketing/tiktok] fetch error:", (e as Error).message);
    return [];
  }
}
