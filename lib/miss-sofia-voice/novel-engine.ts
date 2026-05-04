/**
 * Novel Engine — generador de capítulos personalizados de la novela del estudiante.
 *
 * Cada estudiante tiene SU propia novela continua donde es protagonista.
 * Setting: su ciudad real. Personajes secundarios: gente real de su vida
 * (familia, compañeros) cuando la conozcamos.
 *
 * Flujo:
 *   1. generateNextChapter(userId) → llama Claude con context del estudiante
 *      + último capítulo, recibe JSON con {title, script_full, cliffhanger,
 *      vocabulary_introduced, student_part_required}
 *   2. Sintetiza audio con ElevenLabs (Sofia voice) + sube a sofia-tts/novel/
 *   3. Inserta en mse_novel_chapters
 *   4. Retorna el NovelChapter completo
 *
 * El estudiante escucha el audio, después graba su línea (student_part_required)
 * y eso desbloquea el siguiente capítulo.
 */
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import {
  createChapter,
  getLatestChapter,
  getStudentProfile,
  getUser,
  type NovelChapter,
} from "./db";
import { cleanTextForTTS } from "./ai/elevenlabs";
import { synthesizeForPlan } from "./ai/tts-router";
import type { CunaPhase } from "./phase-engine";

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6").trim();
const NOVEL_BUCKET = "sofia-tts";
const NOVEL_PATH_PREFIX = "novel";

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

// =====================================================================
// Prompts por fase — el lenguaje sube de complejidad gradualmente
// =====================================================================

const PHASE_LANGUAGE_GUIDE: Record<CunaPhase, string> = {
  0: "ULTRA simple. Vocabulario ~50 palabras de inglés básico (be, have, go, eat, sleep, happy, tired, friend, family, food, day, night, work, home). Frases de 3-5 palabras. Mucho contexto en español narrado por Sofia entre líneas. La parte en inglés son apenas 2-3 frases sueltas.",
  1: "Simple. Vocabulario ~150 palabras (presente simple, sustantivos cotidianos). Frases de 4-7 palabras. 50% inglés, 50% español narrativo. Una frase en inglés debe poder repetirla un principiante.",
  2: "Telegráfico-natural. Vocabulario ~300 palabras (presente + pasado simple). Frases de 5-10 palabras. 70% inglés. Permite construcciones rotas pero comunicativas.",
  3: "Natural pero simple. Vocabulario ~600 palabras (presente, pasado, futuro, would). Frases completas con conectores básicos (and, but, because, so). 95% inglés. Cliffhangers emocionales.",
  4: "Natural rica. Vocabulario ~1200 palabras (todos los tiempos, conditionals, passive). Frases largas con clauses. Modismos comunes. 100% inglés.",
  5: "Sofisticada. Vocabulario sin restricción. Slang, ironía, idioms, registros. 100% inglés. El estudiante NARRA capítulos enteros.",
};

const NOVEL_SYSTEM_PROMPT = `You are the AI scriptwriter of "The Personal Novel" — an ongoing audio drama where the
LISTENER (a Spanish-speaking adult learning English) is the PROTAGONIST.

CRITICAL RULES:
1. The listener IS the protagonist. Use their real name, real city, real job.
2. Use real people from their life (family members, coworkers) ONLY if you have them in personal_facts. Otherwise invent secondary characters.
3. Each chapter is ~200-350 words of script (about 90-180 seconds when narrated).
4. Every chapter ENDS in a cliffhanger that makes the student want the next one.
5. Vocabulary level MUST match the phase language guide given.
6. The "student_part_required" is ONE short line (max 10 words) that the protagonist
   says — the student will record themselves saying this. Make it natural to the moment.
7. Recycle words from vocabulary_struggling naturally if provided.
8. Continue from previous_chapter_summary if provided.

OUTPUT FORMAT — strict JSON only, no commentary:
{
  "title": "Chapter title in English (max 60 chars)",
  "script_full": "Full chapter script. Sofia narrates. Mark protagonist's spoken line clearly with [PROTAGONIST]: prefix.",
  "student_part_required": "The single line the student records",
  "cliffhanger": "One sentence teaser for the next chapter (Spanish OK for emotional hook)",
  "vocabulary_introduced": ["word1", "word2", "word3"]
}`;

export type GeneratedChapter = {
  title: string;
  script_full: string;
  student_part_required: string;
  cliffhanger: string;
  vocabulary_introduced: string[];
};

// =====================================================================
// Claude generation
// =====================================================================

async function generateChapterScript(opts: {
  studentName: string;
  studentCity: string | null;
  studentProfession: string | null;
  studentMotivation: string | null;
  personalFacts: Record<string, unknown>;
  vocabularyStruggling: string[];
  phase: CunaPhase;
  chapterNumber: number;
  previousChapterSummary: string | null;
}): Promise<GeneratedChapter> {
  const userMsg = `Generate chapter ${opts.chapterNumber} of the personal novel for:
${JSON.stringify(
  {
    student: {
      name: opts.studentName,
      city: opts.studentCity,
      profession: opts.studentProfession,
      motivation: opts.studentMotivation,
      personal_facts: opts.personalFacts,
    },
    phase: opts.phase,
    language_guide: PHASE_LANGUAGE_GUIDE[opts.phase],
    chapter_number: opts.chapterNumber,
    previous_chapter_summary: opts.previousChapterSummary ?? "(this is chapter 1 — set the scene fresh)",
    vocabulary_to_recycle: opts.vocabularyStruggling.slice(0, 5),
  },
  null,
  2
)}

Output ONLY the JSON. No markdown fences.`;

  const resp = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: NOVEL_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = resp.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("novel-engine: empty response from Claude");
  }

  // Defensive parsing: strip markdown fences if Claude added them despite instruction
  const raw = text.text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed: GeneratedChapter;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`novel-engine: failed to parse JSON. Raw response: ${raw.slice(0, 500)}`);
  }

  // Validate required fields
  if (!parsed.title || !parsed.script_full || !parsed.student_part_required) {
    throw new Error(`novel-engine: missing required fields in response: ${JSON.stringify(parsed).slice(0, 300)}`);
  }
  if (!Array.isArray(parsed.vocabulary_introduced)) parsed.vocabulary_introduced = [];

  return parsed;
}

// =====================================================================
// TTS + Storage
// =====================================================================

async function synthesizeAndUpload(opts: {
  userId: string;
  chapterNumber: number;
  scriptForTTS: string;
  plan: string | null | undefined;
}): Promise<string | null> {
  // Capítulos novela = momento HERO → siempre ElevenLabs Sofia para mantener
  // la magia del producto (la novela es el activo central del Método Cuna).
  const tts = await synthesizeForPlan({
    text: cleanTextForTTS(opts.scriptForTTS),
    plan: opts.plan,
    context: "hero",
  });
  if (!tts) {
    console.error("novel-engine: no TTS engine configured, storing chapter without audio");
    return null;
  }

  const path = `${NOVEL_PATH_PREFIX}/${opts.userId}/chapter-${opts.chapterNumber}.mp3`;
  const { error } = await supabase()
    .storage.from(NOVEL_BUCKET)
    .upload(path, tts.audioBuffer, {
      contentType: tts.contentType,
      upsert: true,
    });
  if (error) {
    console.error("novel-engine: storage upload failed:", error);
    return null;
  }

  const { data: pub } = supabase().storage.from(NOVEL_BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

// =====================================================================
// Main entry — public API
// =====================================================================

/**
 * Generate the next chapter for a user. Idempotent-ish: if the latest chapter
 * is not yet completed (student didn't record their part), refuses to generate
 * a new one and returns the existing latest.
 *
 * Throws if user/profile not found.
 */
export async function generateNextChapter(userId: string): Promise<NovelChapter> {
  const [user, profile] = await Promise.all([getUser(userId), getStudentProfile(userId)]);
  if (!user) throw new Error(`novel-engine: user ${userId} not found`);
  if (!profile) throw new Error(`novel-engine: profile ${userId} not found`);

  const latest = await getLatestChapter(userId);

  // If there's an active (not completed) chapter, don't generate a new one.
  if (latest && latest.completed_at === null) {
    return latest;
  }

  const nextNumber = (latest?.chapter_number ?? 0) + 1;

  const generated = await generateChapterScript({
    studentName: user.name,
    studentCity: user.city,
    studentProfession: user.profession,
    studentMotivation: user.motivation,
    personalFacts: profile.personal_facts ?? {},
    vocabularyStruggling: profile.vocabulary_struggling ?? [],
    phase: profile.current_phase,
    chapterNumber: nextNumber,
    previousChapterSummary: latest?.cliffhanger ?? latest?.title ?? null,
  });

  const audioUrl = await synthesizeAndUpload({
    userId,
    chapterNumber: nextNumber,
    scriptForTTS: generated.script_full,
    plan: user.plan,
  });

  return await createChapter({
    user_id: userId,
    chapter_number: nextNumber,
    title: generated.title,
    script_full: generated.script_full,
    audio_url: audioUrl,
    student_part_required: generated.student_part_required,
    student_part_audio_url: null,
    phase_when_generated: profile.current_phase,
    cliffhanger: generated.cliffhanger,
    vocabulary_introduced: generated.vocabulary_introduced,
  });
}
