/**
 * NGSL (New General Service List) tracker.
 *
 * Cuenta palabras del top 100/500/1000 NGSL que el user REALMENTE usó
 * en su vida real (audio transcrito o texto enviado). El counter directo
 * a Mario Montes: él te enseña a memorizar, Sofia mide cuándo las usas.
 *
 * Hook intended:
 *   - Después de transcribir un audio del user con Whisper → recordNgslUsage(userId, transcript, context)
 *   - Después de procesar un texto del user en chat → recordNgslUsage(userId, text, context)
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (_supabase) return _supabase;
  _supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return _supabase;
}

// Cache en memoria de la lista NGSL para evitar pegarle a la DB en cada mensaje.
let _ngslCache: Map<string, { id: number; tier: number }> | null = null;
let _ngslCacheLoadedAt = 0;
const NGSL_CACHE_TTL_MS = 60 * 60 * 1000;

async function loadNgslMap(): Promise<Map<string, { id: number; tier: number }>> {
  const now = Date.now();
  if (_ngslCache && now - _ngslCacheLoadedAt < NGSL_CACHE_TTL_MS) return _ngslCache;
  const { data } = await db().from("mse_ngsl_words").select("id, word, tier");
  _ngslCache = new Map();
  for (const row of data ?? []) {
    _ngslCache.set(String(row.word).toLowerCase(), { id: row.id as number, tier: row.tier as number });
  }
  _ngslCacheLoadedAt = now;
  return _ngslCache;
}

const TOKEN_RE = /[A-Za-z']+/g;

/**
 * Extrae palabras NGSL únicas presentes en un texto.
 * Lemmatización mínima: lowercase + strip apostrophes ("don't" → "dont" no matchea,
 * pero "I'm" → matchea "i" via tokenization).
 */
export async function extractNgslHits(
  text: string
): Promise<Array<{ word: string; word_id: number; tier: number }>> {
  if (!text || !text.trim()) return [];
  const map = await loadNgslMap();
  const seen = new Set<number>();
  const out: Array<{ word: string; word_id: number; tier: number }> = [];
  const tokens = text.toLowerCase().match(TOKEN_RE) ?? [];
  for (const raw of tokens) {
    const w = raw.replace(/'/g, "");
    const hit = map.get(w);
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id);
      out.push({ word: w, word_id: hit.id, tier: hit.tier });
    }
  }
  return out;
}

/**
 * Registra el uso de palabras NGSL detectadas en el texto del user.
 * Idempotente por (user_id, word_id): incrementa uses_count si ya existe.
 *
 * No-op si el user no existe (silencioso para no romper el flujo de chat).
 */
export async function recordNgslUsage(opts: {
  userId: string;
  text: string;
  context?: string;
}): Promise<{ recorded: number; new_words: number }> {
  const hits = await extractNgslHits(opts.text);
  if (hits.length === 0) return { recorded: 0, new_words: 0 };

  const supabase = db();
  const nowIso = new Date().toISOString();
  const contextSnippet = (opts.context ?? opts.text).slice(0, 280);

  // Trae las filas existentes para distinguir new_words vs incrementos.
  const { data: existing } = await supabase
    .from("mse_user_ngsl_usage")
    .select("word_id")
    .eq("user_id", opts.userId)
    .in(
      "word_id",
      hits.map((h) => h.word_id)
    );
  const existingIds = new Set((existing ?? []).map((r) => r.word_id as number));

  const newRows = hits.filter((h) => !existingIds.has(h.word_id));
  const updateRows = hits.filter((h) => existingIds.has(h.word_id));

  let newCount = 0;
  if (newRows.length > 0) {
    const { error } = await supabase.from("mse_user_ngsl_usage").insert(
      newRows.map((h) => ({
        user_id: opts.userId,
        word_id: h.word_id,
        uses_count: 1,
        first_used_at: nowIso,
        last_used_at: nowIso,
        last_context: contextSnippet,
      }))
    );
    if (!error) newCount = newRows.length;
  }

  // Increment uses_count para palabras ya conocidas. Para evitar N round-trips
  // en mensajes largos, batch en una sola query via RPC.
  if (updateRows.length > 0) {
    const { error: rpcErr } = await supabase.rpc("mse_bump_ngsl_usage", {
      p_user_id: opts.userId,
      p_word_ids: updateRows.map((h) => h.word_id),
      p_context: contextSnippet,
    });
    if (rpcErr) {
      // Fallback: update manual sin batch (uses_count no se incrementa).
      await Promise.all(
        updateRows.map((h) =>
          supabase
            .from("mse_user_ngsl_usage")
            .update({ last_used_at: nowIso, last_context: contextSnippet })
            .eq("user_id", opts.userId)
            .eq("word_id", h.word_id)
        )
      );
    }
  }

  return { recorded: hits.length, new_words: newCount };
}

export type NgslTierProgress = {
  tier: 1 | 2 | 3;
  label: string;
  used: number;
  total: number;
  pct: number;
  coverage_text_pct: number; // estimación: tier1=50, tier2=75, tier3=80
};

const TIER_LABELS: Record<number, { label: string; cov: number }> = {
  1: { label: "Top 100 — el 50% del inglés cotidiano", cov: 50 },
  2: { label: "Top 500 — el 75% del inglés cotidiano", cov: 75 },
  3: { label: "Top 1000 — el 80% del inglés cotidiano", cov: 80 },
};

/**
 * Devuelve el progreso del user por tier NGSL.
 * Útil para el dashboard y el sticker de "67/100 palabras del 80%".
 */
export async function getUserNgslProgress(userId: string): Promise<NgslTierProgress[]> {
  const supabase = db();
  const [{ data: totals }, { data: used }] = await Promise.all([
    supabase.from("mse_ngsl_words").select("tier"),
    supabase
      .from("mse_user_ngsl_usage")
      .select("word_id, mse_ngsl_words!inner(tier)")
      .eq("user_id", userId),
  ]);

  const totalByTier: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const r of totals ?? []) totalByTier[r.tier as number] = (totalByTier[r.tier as number] ?? 0) + 1;

  const usedByTier: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const r of used ?? []) {
    const tier = (r as unknown as { mse_ngsl_words: { tier: number } }).mse_ngsl_words.tier;
    usedByTier[tier] = (usedByTier[tier] ?? 0) + 1;
  }

  const out: NgslTierProgress[] = [];
  for (const tier of [1, 2, 3] as const) {
    const total = totalByTier[tier] ?? 0;
    const u = usedByTier[tier] ?? 0;
    out.push({
      tier,
      label: TIER_LABELS[tier].label,
      used: u,
      total,
      pct: total > 0 ? Math.round((u / total) * 100) : 0,
      coverage_text_pct: TIER_LABELS[tier].cov,
    });
  }
  return out;
}
