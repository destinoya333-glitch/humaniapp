// =====================================================================
// Ventana de Publicidad — capa de datos (Supabase)
// Upserts del cron + queries que alimentan el panel /admin/marketing.
// =====================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { computeEngagement, type NormalizedPost } from "./meta";

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

const hoyLima = () => {
  // 'YYYY-MM-DD' en zona Lima (UTC-5)
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

/** Upsert de un post + su métrica del día. Devuelve true si ok. */
export async function guardarPostConMetrica(p: NormalizedPost, marca = "ecodrive"): Promise<boolean> {
  const supabase = db();
  const { data: post, error: e1 } = await supabase
    .from("marketing_posts")
    .upsert(
      {
        red: p.red,
        post_id: p.post_id,
        marca,
        tipo: p.tipo,
        permalink: p.permalink,
        caption: p.caption,
        thumbnail_url: p.thumbnail_url,
        publicado_at: p.publicado_at,
        raw: p.raw,
      },
      { onConflict: "red,post_id" },
    )
    .select("uid")
    .single();
  if (e1 || !post) {
    console.error("[marketing/db] upsert post:", e1?.message);
    return false;
  }

  const { engagement, rate, score } = computeEngagement(p);
  const { error: e2 } = await supabase.from("marketing_metricas").upsert(
    {
      post_uid: post.uid,
      fecha: hoyLima(),
      alcance: p.alcance,
      impresiones: p.impresiones,
      likes: p.likes,
      comentarios: p.comentarios,
      compartidos: p.compartidos,
      guardados: p.guardados,
      clics: p.clics,
      video_views: p.video_views,
      engagement,
      engagement_rate: rate,
      score,
      raw: p.raw,
    },
    { onConflict: "post_uid,fecha" },
  );
  if (e2) {
    console.error("[marketing/db] upsert metrica:", e2.message);
    return false;
  }
  return true;
}

export type RankedPost = {
  uid: string;
  red: string;
  tipo: string | null;
  caption: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  publicado_at: string | null;
  alcance: number;
  engagement: number;
  score: number;
};

/** Top N posts por score usando la métrica más reciente de cada post. */
export async function topPosts(limit = 10, orden: "mejores" | "peores" = "mejores"): Promise<RankedPost[]> {
  const supabase = db();
  // Traemos las métricas recientes (último día capturado) unidas al post.
  const { data, error } = await supabase
    .from("marketing_metricas")
    .select("post_uid, fecha, alcance, engagement, score, marketing_posts(uid,red,tipo,caption,permalink,thumbnail_url,publicado_at)")
    .order("fecha", { ascending: false })
    .limit(500);
  if (error || !data) {
    console.error("[marketing/db] topPosts:", error?.message);
    return [];
  }
  // Quedarnos con la fila más reciente por post
  const seen = new Map<string, RankedPost>();
  for (const row of data as any[]) {
    if (seen.has(row.post_uid)) continue;
    const post = row.marketing_posts;
    if (!post) continue;
    seen.set(row.post_uid, {
      uid: post.uid,
      red: post.red,
      tipo: post.tipo,
      caption: post.caption,
      permalink: post.permalink,
      thumbnail_url: post.thumbnail_url,
      publicado_at: post.publicado_at,
      alcance: row.alcance,
      engagement: row.engagement,
      score: row.score,
    });
  }
  const arr = [...seen.values()].sort((a, b) =>
    orden === "mejores" ? b.score - a.score : a.score - b.score,
  );
  return arr.slice(0, limit);
}

export type ResumenGlobal = {
  totalPosts: number;
  alcanceTotal: number;
  engagementTotal: number;
  scorePromedio: number;
  porRed: Record<string, { posts: number; alcance: number; engagement: number }>;
};

export async function resumenGlobal(): Promise<ResumenGlobal> {
  const posts = await topPosts(500);
  const r: ResumenGlobal = {
    totalPosts: posts.length,
    alcanceTotal: 0,
    engagementTotal: 0,
    scorePromedio: 0,
    porRed: {},
  };
  for (const p of posts) {
    r.alcanceTotal += p.alcance;
    r.engagementTotal += p.engagement;
    r.porRed[p.red] ??= { posts: 0, alcance: 0, engagement: 0 };
    r.porRed[p.red].posts++;
    r.porRed[p.red].alcance += p.alcance;
    r.porRed[p.red].engagement += p.engagement;
  }
  r.scorePromedio = posts.length ? Math.round(posts.reduce((s, p) => s + p.score, 0) / posts.length) : 0;
  return r;
}

/** Mejor hora de publicación según engagement histórico (hora Lima). */
export async function mejorHora(): Promise<{ hora: number; engagementProm: number }[]> {
  const posts = await topPosts(500);
  const buckets: Record<number, { sum: number; n: number }> = {};
  for (const p of posts) {
    if (!p.publicado_at) continue;
    const h = new Date(new Date(p.publicado_at).getTime() - 5 * 60 * 60 * 1000).getUTCHours();
    buckets[h] ??= { sum: 0, n: 0 };
    buckets[h].sum += p.engagement;
    buckets[h].n++;
  }
  return Object.entries(buckets)
    .map(([h, b]) => ({ hora: Number(h), engagementProm: Math.round(b.sum / b.n) }))
    .sort((a, b) => b.engagementProm - a.engagementProm);
}
