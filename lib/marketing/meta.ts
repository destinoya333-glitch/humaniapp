// =====================================================================
// Ventana de Publicidad — Motor de métricas Meta (Facebook Page + Instagram)
//
// Lee insights vía Graph API y los normaliza a una forma común `PostMetric`.
// NO depende del token de WhatsApp. Usa ECODRIVE_MARKETING_TOKEN, un token de
// System User con scopes: pages_read_engagement, read_insights, pages_show_list,
// instagram_basic, instagram_manage_insights, business_management.
//
// Si el token no está configurado, las funciones devuelven [] sin romper
// (así el cron y la ventana funcionan aunque Meta aún no esté conectado).
// =====================================================================

const GRAPH = "https://graph.facebook.com/v22.0";

export type Red = "facebook" | "instagram" | "tiktok";

export type NormalizedPost = {
  red: Red;
  post_id: string;
  tipo: string | null;
  permalink: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  publicado_at: string | null; // ISO
  alcance: number;
  impresiones: number;
  likes: number;
  comentarios: number;
  compartidos: number;
  guardados: number;
  clics: number;
  video_views: number;
  raw: Record<string, unknown>;
};

export type MetaConfig = {
  token: string; // system user token (sirve para IG y para derivar el page token)
  pageId?: string;
  igId?: string;
  pageToken?: string; // token de Página (requerido por la "nueva experiencia de Páginas")
};

/** Lee la config de env. token vacío => devolvemos null y los fetchers no corren. */
export function getMetaConfig(): MetaConfig | null {
  const token = (process.env.ECODRIVE_MARKETING_TOKEN || "").trim();
  if (!token) return null;
  return {
    token,
    pageId: (process.env.ECODRIVE_FB_PAGE_ID || "").trim() || undefined,
    igId: (process.env.ECODRIVE_IG_ID || "").trim() || undefined,
  };
}

async function graph<T = any>(path: string, token: string): Promise<T | null> {
  try {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${GRAPH}/${path}${sep}access_token=${token}`, {
      // insights cambian poco intra-día; no cacheamos para tener el dato fresco del cron
      cache: "no-store",
    });
    const json = await res.json();
    if (json?.error) {
      console.warn(`[marketing/meta] ${path} -> ${json.error.message}`);
      return null;
    }
    return json as T;
  } catch (e) {
    console.error(`[marketing/meta] fetch fail ${path}:`, (e as Error).message);
    return null;
  }
}

/**
 * Resuelve pageId / igId / pageToken.
 * - Si ECODRIVE_FB_PAGE_ID está en env, lo usa (evita agarrar la página equivocada
 *   cuando el token administra varias páginas).
 * - Deriva el page access token (la "nueva experiencia de Páginas" lo exige para leer posts).
 * - Si no hay igId, lo toma del instagram_business_account de la página.
 */
export async function resolveAssets(cfg: MetaConfig): Promise<MetaConfig> {
  let pageId = cfg.pageId;
  // Si no vino por env, tomamos la primera página que tenga IG vinculado.
  if (!pageId) {
    const accts = await graph<{ data: any[] }>(
      "me/accounts?fields=id,name,instagram_business_account",
      cfg.token,
    );
    const withIg = accts?.data?.find((p) => p.instagram_business_account) || accts?.data?.[0];
    pageId = withIg?.id;
  }
  if (!pageId) return cfg;

  const page = await graph<{ access_token?: string; instagram_business_account?: { id: string } }>(
    `${pageId}?fields=access_token,instagram_business_account`,
    cfg.token,
  );
  return {
    ...cfg,
    pageId,
    pageToken: page?.access_token,
    igId: cfg.igId || page?.instagram_business_account?.id,
  };
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

// --- Facebook Page posts ----------------------------------------------
export async function fetchFacebookPosts(cfg: MetaConfig, limit = 25): Promise<NormalizedPost[]> {
  if (!cfg.pageId) return [];
  // En la "nueva experiencia de Páginas" se requiere el page access token.
  const token = cfg.pageToken || cfg.token;
  const fields = [
    "id",
    "created_time",
    "message",
    "permalink_url",
    "full_picture",
    "shares",
    "comments.summary(true).limit(0)",
    "reactions.summary(true).limit(0)",
    // post_impressions y post_engaged_users fueron deprecados en v22; solo estos siguen válidos.
    "insights.metric(post_impressions_unique,post_clicks,post_video_views)",
  ].join(",");
  const data = await graph<{ data: any[] }>(`${cfg.pageId}/posts?fields=${fields}&limit=${limit}`, token);
  if (!data?.data) return [];

  return data.data.map((p): NormalizedPost => {
    const ins: Record<string, number> = {};
    for (const m of p.insights?.data ?? []) ins[m.name] = num(m.values?.[0]?.value);
    return {
      red: "facebook",
      post_id: p.id,
      tipo: p.full_picture ? "photo" : "post",
      permalink: p.permalink_url ?? null,
      caption: p.message ?? null,
      thumbnail_url: p.full_picture ?? null,
      publicado_at: p.created_time ?? null,
      alcance: ins.post_impressions_unique ?? 0,
      impresiones: 0, // post_impressions deprecado en v22
      likes: num(p.reactions?.summary?.total_count),
      comentarios: num(p.comments?.summary?.total_count),
      compartidos: num(p.shares?.count),
      guardados: 0, // FB no expone saves a nivel post
      clics: ins.post_clicks ?? 0,
      video_views: ins.post_video_views ?? 0,
      raw: { insights: ins },
    };
  });
}

// --- Instagram media --------------------------------------------------
export async function fetchInstagramMedia(cfg: MetaConfig, limit = 25): Promise<NormalizedPost[]> {
  if (!cfg.igId) return [];
  const fields = [
    "id",
    "caption",
    "media_type",
    "media_product_type",
    "permalink",
    "thumbnail_url",
    "media_url",
    "timestamp",
    "like_count",
    "comments_count",
  ].join(",");
  const data = await graph<{ data: any[] }>(`${cfg.igId}/media?fields=${fields}&limit=${limit}`, cfg.token);
  if (!data?.data) return [];

  const out: NormalizedPost[] = [];
  for (const m of data.data) {
    const isReel = m.media_product_type === "REELS";
    // métricas de insight dependen del tipo de media
    // 'impressions' fue deprecado para media de IG creada desde jul-2024; usamos reach.
    const metrics = isReel
      ? "reach,saved,shares,total_interactions,ig_reels_video_view_total"
      : "reach,saved,shares,total_interactions";
    const ins = await graph<{ data: any[] }>(`${m.id}/insights?metric=${metrics}`, cfg.token);
    const im: Record<string, number> = {};
    for (const x of ins?.data ?? []) im[x.name] = num(x.values?.[0]?.value);
    out.push({
      red: "instagram",
      post_id: m.id,
      tipo: (m.media_product_type || m.media_type || "").toLowerCase() || null,
      permalink: m.permalink ?? null,
      caption: m.caption ?? null,
      thumbnail_url: m.thumbnail_url || m.media_url || null,
      publicado_at: m.timestamp ?? null,
      alcance: im.reach ?? 0,
      impresiones: im.impressions ?? 0,
      likes: num(m.like_count),
      comentarios: num(m.comments_count),
      compartidos: im.shares ?? 0,
      guardados: im.saved ?? 0,
      clics: 0,
      video_views: im.ig_reels_video_view_total ?? 0,
      raw: { insights: im },
    });
  }
  return out;
}

// --- Score de efectividad ---------------------------------------------
// Pondera señales de intención más alto: guardar/compartir > comentar > like.
export function computeEngagement(p: NormalizedPost): { engagement: number; rate: number; score: number } {
  const engagement = p.likes + p.comentarios * 3 + p.compartidos * 5 + p.guardados * 4;
  const rate = engagement / Math.max(p.alcance || p.impresiones || 1, 1);
  const score = Math.round(rate * 1000);
  return { engagement, rate: Number(rate.toFixed(4)), score };
}

/** Jala todo Meta (FB + IG) ya con assets resueltos. */
export async function fetchAllMeta(): Promise<{ posts: NormalizedPost[]; config: MetaConfig | null }> {
  const base = getMetaConfig();
  if (!base) return { posts: [], config: null };
  const cfg = await resolveAssets(base);
  const [fb, ig] = await Promise.all([fetchFacebookPosts(cfg), fetchInstagramMedia(cfg)]);
  return { posts: [...fb, ...ig], config: cfg };
}
