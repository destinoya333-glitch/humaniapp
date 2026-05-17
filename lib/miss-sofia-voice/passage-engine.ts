/**
 * Passage Engine — genera pasajes APA "Adquirir" por tema/fase/dificultad.
 *
 * Cache compartido entre usuarios (sha1 cache_key). Solo se regenera si
 * no existe el row. TTS = OpenAI Nova (no hero) para mantener costo bajo;
 * cualquier usuario con plan premium puede tener "premium variant" futuro.
 *
 * El pasaje viene con cuerpo en inglés + traducción al español + word_timings
 * placeholder (timings reales se computan con script de alignment futuro).
 */
import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { cleanTextForTTS } from "./ai/elevenlabs";
import { synthesizeForPlan } from "./ai/tts-router";
import type { CunaPhase } from "./phase-engine";

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6").trim();
const PASSAGE_BUCKET = "sofia-tts";
const PASSAGE_PATH_PREFIX = "passages";

export type Difficulty = "easy" | "medium" | "hard";

export type Passage = {
  id: string;
  cache_key: string;
  topic: string;
  phase: number;
  difficulty: Difficulty;
  title: string;
  body_en: string;
  body_es: string;
  audio_url: string | null;
  word_timings: Array<{ word: string; start_ms: number; end_ms: number }> | null;
  word_count: number;
  created_at: string;
  use_count: number;
};

let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _anthropic;
}

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function cacheKey(topic: string, phase: number, difficulty: Difficulty): string {
  const normalized = `${topic.toLowerCase().trim()}|p${phase}|d${difficulty}`;
  return createHash("sha1").update(normalized).digest("hex").slice(0, 24);
}

// =====================================================================
// Prompt engineering por fase + dificultad
// =====================================================================

const PHASE_WORD_TARGETS: Record<CunaPhase, { easy: [number, number]; medium: [number, number]; hard: [number, number] }> = {
  0: { easy: [40, 60],   medium: [50, 70],   hard: [60, 80]   },
  1: { easy: [50, 80],   medium: [70, 100],  hard: [90, 120]  },
  2: { easy: [70, 100],  medium: [100, 140], hard: [130, 180] },
  3: { easy: [100, 140], medium: [130, 180], hard: [170, 220] },
  4: { easy: [120, 160], medium: [160, 220], hard: [200, 280] },
  5: { easy: [140, 200], medium: [200, 300], hard: [280, 400] },
};

const PHASE_GRAMMAR_GUIDE: Record<CunaPhase, string> = {
  0: "Vocabulario ~50 palabras. Solo presente simple. Frases de 4-6 palabras. Sin clauses.",
  1: "Vocabulario ~150 palabras. Presente simple + presente continuo. Frases de 5-8 palabras.",
  2: "Vocabulario ~300 palabras. + Pasado simple. Frases de 6-12 palabras. Conectores básicos (and, but).",
  3: "Vocabulario ~600 palabras. + Futuro + presente perfecto. Frases con because, so, when.",
  4: "Vocabulario ~1200 palabras. Todos los tiempos. Conditionals 1-2. Passive voice. Modals.",
  5: "Sin restricción. Idioms, slang medido, registros.",
};

const PASSAGE_SYSTEM_PROMPT = `You are an English passage writer for Miss Sofia, an AI tutor using the Método Cuna.
Given a topic, a Cuna phase (0-5) and a difficulty (easy/medium/hard), write a passage that:

1. Is informative, engaging — like a Wikipedia intro but warmer.
2. Matches EXACTLY the word count target given.
3. Matches the grammar/vocabulary guide for the phase.
4. NEVER mentions Sofia, the platform, the student, or the learning process. It's a passage ABOUT the topic.
5. Spanish translation must be NATURAL — not literal. Same meaning, native Spanish.

OUTPUT FORMAT — strict JSON only, no commentary, no fences:
{
  "title": "Title in English (max 70 chars)",
  "body_en": "The passage in English, single paragraph.",
  "body_es": "Spanish translation, same meaning, natural register, single paragraph."
}`;

async function generatePassageScript(opts: {
  topic: string;
  phase: CunaPhase;
  difficulty: Difficulty;
}): Promise<{ title: string; body_en: string; body_es: string }> {
  const range = PHASE_WORD_TARGETS[opts.phase][opts.difficulty];

  const userMsg = `Topic: "${opts.topic}"
Phase: ${opts.phase}
Difficulty: ${opts.difficulty}
Word count target: ${range[0]}-${range[1]} words in body_en
Grammar guide: ${PHASE_GRAMMAR_GUIDE[opts.phase]}

Output ONLY the JSON.`;

  const resp = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: PASSAGE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });
  const text = resp.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("passage-engine: empty response");
  }
  const raw = text.text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(raw) as { title?: string; body_en?: string; body_es?: string };
  if (!parsed.title || !parsed.body_en || !parsed.body_es) {
    throw new Error("passage-engine: missing fields");
  }
  return {
    title: parsed.title.slice(0, 100),
    body_en: parsed.body_en,
    body_es: parsed.body_es,
  };
}

async function synthesizeAndUploadPassage(opts: {
  cacheKey: string;
  bodyEn: string;
  plan: string | null | undefined;
}): Promise<string | null> {
  const tts = await synthesizeForPlan({
    text: cleanTextForTTS(opts.bodyEn),
    plan: opts.plan ?? "free",
    context: "chat",
  });
  if (!tts) return null;

  const path = `${PASSAGE_PATH_PREFIX}/${opts.cacheKey}.mp3`;
  const { error } = await supabase()
    .storage.from(PASSAGE_BUCKET)
    .upload(path, tts.audioBuffer, {
      contentType: tts.contentType,
      upsert: true,
    });
  if (error) {
    console.error("passage-engine: upload failed:", error);
    return null;
  }
  const { data: pub } = supabase().storage.from(PASSAGE_BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

// =====================================================================
// Public API
// =====================================================================

export async function getOrGeneratePassage(opts: {
  topic: string;
  phase: CunaPhase;
  difficulty: Difficulty;
  plan?: string | null;
}): Promise<Passage> {
  const key = cacheKey(opts.topic, opts.phase, opts.difficulty);
  const sb = supabase();

  // Cache lookup
  const { data: hit } = await sb
    .from("mse_passages")
    .select("*")
    .eq("cache_key", key)
    .maybeSingle();

  if (hit) {
    // increment use count async (fire and forget)
    sb.from("mse_passages")
      .update({ use_count: (hit as { use_count: number }).use_count + 1 })
      .eq("cache_key", key)
      .then(() => {});
    return hit as unknown as Passage;
  }

  // Generate
  const generated = await generatePassageScript({
    topic: opts.topic,
    phase: opts.phase,
    difficulty: opts.difficulty,
  });

  const audioUrl = await synthesizeAndUploadPassage({
    cacheKey: key,
    bodyEn: generated.body_en,
    plan: opts.plan,
  });

  const wordCount = generated.body_en.split(/\s+/).filter(Boolean).length;

  const row = {
    cache_key: key,
    topic: opts.topic.trim().slice(0, 200),
    phase: opts.phase,
    difficulty: opts.difficulty,
    title: generated.title,
    body_en: generated.body_en,
    body_es: generated.body_es,
    audio_url: audioUrl,
    word_timings: null,
    word_count: wordCount,
    use_count: 1,
  };

  const { data: inserted, error } = await sb
    .from("mse_passages")
    .insert(row)
    .select("*")
    .single();

  if (error || !inserted) {
    // Si falló la inserción (probable race con otro request mismo key), reintentar lookup
    const { data: fallback } = await sb
      .from("mse_passages")
      .select("*")
      .eq("cache_key", key)
      .maybeSingle();
    if (fallback) return fallback as unknown as Passage;
    throw new Error(`passage-engine: insert failed: ${error?.message ?? "unknown"}`);
  }

  return inserted as unknown as Passage;
}

// =====================================================================
// Topic suggestions por fase — para alimentar TopicPicker
// =====================================================================

export function suggestedTopicsForPhase(phase: CunaPhase): string[] {
  const base = {
    0: ["my morning routine", "food I love", "my family", "colors I see today", "weather right now"],
    1: ["a walk in the park", "my favorite breakfast", "how I take the bus", "music I like", "weekend plans"],
    2: ["history of pizza", "world cup 2002", "amazon rainforest", "olympic games", "history of coffee"],
    3: ["history of Greece", "first moon landing", "the silk road", "evolution of money", "story of the internet"],
    4: ["climate change basics", "renewable energy", "history of medicine", "future of work", "AI in daily life"],
    5: ["quantum physics intro", "behavioral economics", "philosophy of mind", "history of cryptography", "modernist literature"],
  } as const;
  return [...base[phase as 0]];
}
