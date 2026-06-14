/**
 * TuDramaYa — acceso a datos (Supabase service-role).
 * Mismo patrón que lib/cuentoinfantil/db.ts: cliente con service-role para
 * escrituras de pago/acceso (ignora RLS). Las lecturas del catálogo también
 * pueden venir del cliente con anon-key vía RLS pública.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente perezoso: se crea en el PRIMER uso (request), no al importar el módulo.
// Evita "supabaseKey is required" durante el build cuando el entorno aún no
// tiene las variables (p.ej. en deploys de preview).
let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _client;
}

// Proxy para mantener el uso `supabase.from(...)` sin tocar a quienes lo importan.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getClient() as unknown as Record<string | symbol, unknown>;
    const v = c[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(c) : v;
  },
});

export type Serie = {
  id: string;
  slug: string;
  titulo: string;
  sinopsis: string | null;
  portada_url: string | null;
  total_caps: number;
  caps_gratis: number;
  precio_cap: number;
  precio_pack5: number;
  precio_full: number;
  estado: string;
};

export type Episodio = {
  id: string;
  serie_id: string;
  numero: number;
  titulo: string | null;
  sinopsis: string | null;
  video_url: string | null;
  miniatura_url: string | null;
  duracion_seg: number | null;
  gratis: boolean;
  publicado: boolean;
};

export async function getSeriePorSlug(slug: string): Promise<Serie | null> {
  const { data } = await supabase.from("tdy_series").select("*").eq("slug", slug).maybeSingle();
  return (data as Serie) ?? null;
}

export async function getSeries(): Promise<Serie[]> {
  const { data } = await supabase
    .from("tdy_series")
    .select("*")
    .eq("estado", "activo")
    .order("created_at", { ascending: true });
  return (data as Serie[]) ?? [];
}

export async function getSerieById(id: string): Promise<Serie | null> {
  const { data } = await supabase.from("tdy_series").select("*").eq("id", id).maybeSingle();
  return (data as Serie) ?? null;
}

export async function getEpisodios(serieId: string): Promise<Episodio[]> {
  const { data } = await supabase
    .from("tdy_episodios")
    .select("*")
    .eq("serie_id", serieId)
    .eq("publicado", true)
    .order("numero", { ascending: true });
  return (data as Episodio[]) ?? [];
}

export async function getEpisodioById(id: string): Promise<Episodio | null> {
  const { data } = await supabase.from("tdy_episodios").select("*").eq("id", id).maybeSingle();
  return (data as Episodio) ?? null;
}

export async function upsertUsuario(userId: string, celular?: string | null, nombre?: string | null) {
  await supabase
    .from("tdy_usuarios")
    .upsert(
      {
        user_id: userId,
        ...(celular ? { celular } : {}),
        ...(nombre ? { nombre } : {}),
        last_seen: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
}

/**
 * Genera una URL firmada (temporal) para reproducir un video del bucket privado.
 * `video_url` guarda el PATH dentro de tudramaya-video (ej. "casada/ep01.mp4").
 * Si ya es una URL http(s) completa, se devuelve tal cual.
 */
export async function signedVideoUrl(path: string | null, expiresSec = 7200): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from("tudramaya-video").createSignedUrl(path, expiresSec);
  return data?.signedUrl ?? null;
}

export async function registrarEvento(opts: {
  userId?: string | null;
  episodioId?: string | null;
  tipo: string;
  metadata?: Record<string, unknown>;
}) {
  await supabase.from("tdy_eventos").insert({
    user_id: opts.userId ?? null,
    episodio_id: opts.episodioId ?? null,
    tipo: opts.tipo,
    metadata: opts.metadata ?? {},
  });
}
