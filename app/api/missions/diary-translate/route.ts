/**
 * POST /api/missions/diary-translate
 *
 * Pipeline para la misión p0_diary_in_spanish (y similares):
 *   1. Recibe audio en español del estudiante
 *   2. Whisper STT → transcript en español
 *   3. Claude narrador → transforma en relato 2da persona en inglés simple,
 *      ajustado a la fase del estudiante (vocabulario y estructuras de la fase)
 *   4. ElevenLabs TTS con voz de Sofia → audio en inglés
 *   5. Sube el audio narrado a sofia-tts/diary/<userId>/<date>.mp3
 *   6. Marca la misión como completada con evidence_url = audio español original
 *      y evidence_text = narración en inglés
 *
 * Body (JSON):
 *   {
 *     user_id: string,
 *     audio_base64: string,
 *     audio_mime?: string  (default 'audio/webm')
 *   }
 *
 * Returns:
 *   {
 *     ok,
 *     transcription_es,           // lo que dijo el estudiante en español
 *     narration_en,               // texto narrado en inglés
 *     narration_audio_url,        // URL del MP3 narrado (público)
 *     mission_completed: boolean
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import {
  completeTodayMission,
  getStudentProfile,
  getTodayMission,
  getUser,
  recordWordLearned,
} from "@/lib/miss-sofia-voice/db";
import { whisperSTT } from "@/lib/miss-sofia-voice/ai/whisper";
import { cleanTextForTTS, elevenLabsTTS } from "@/lib/miss-sofia-voice/ai/elevenlabs";
import type { CunaPhase } from "@/lib/miss-sofia-voice/phase-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6").trim();
const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB — el diario puede ser hasta 90 seg

const NARRATOR_BUCKET = "sofia-tts";
const NARRATOR_PATH_PREFIX = "diary";

let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _anthropic;
}

// Vocabulario y estructura por fase — el narrador respeta el nivel de input comprensible (i+1)
const PHASE_NARRATOR_GUIDE: Record<CunaPhase, string> = {
  0: "ULTRA simple. Solo vocabulario básico (be, have, do, go, eat, sleep, work, home, family, friend, day, today, yesterday, tired, happy, hungry, late, early, good, bad). Frases de 3-6 palabras max. Tiempo: presente simple y past simple. NO usar conditionals, modal verbs (would/could/should), perfect tenses. Mucha repetición. Length: 60-90 segundos al narrar = ~120-180 palabras.",
  1: "Simple. Vocabulario ~150 palabras. Frases de 4-8 palabras. Presente y pasado simples. Conectores básicos (and, but, then). Length: 90-120 segundos = 150-220 palabras.",
  2: "Telegráfico-natural. Vocabulario ~300 palabras. Frases de 5-10 palabras. Permite future con 'going to'. Conectores: and, but, because, so, then, after.",
  3: "Natural pero simple. Vocabulario ~600 palabras. Frases completas. Todos los tiempos básicos. Modal verbs simples (can, should).",
  4: "Natural rica. Vocabulario ~1200 palabras. Idiomas comunes. Conditionals.",
  5: "Sin restricción. Idioms, slang, registros formales/informales según contexto.",
};

const NARRATOR_SYSTEM_PROMPT = `You are Miss Sofia, narrating back the student's day to them in English.
You take what they said in Spanish and re-tell it to them as a short, warm
2nd-person narrative in English, adjusted to their CURRENT PHASE language level.

CRITICAL RULES:
1. Re-narrate in 2nd person ("Today you went to work...", "You felt tired...").
   This is intimate and helps the student hear THEIR life in English.
2. RESPECT the phase language guide — use ONLY structures and vocabulary
   appropriate for that phase. If you go above i+1, the student stops absorbing.
3. Short, calm, warm. Like a friend re-telling your day at a coffee.
4. NO greetings, no openings like "Today..." each time. Flow naturally.
5. Output ONLY the narration text. No commentary, no JSON, no tags.

Output: just the English narration. Plain text. Max ~250 words.`;

function extensionFromMime(mime: string | undefined): string {
  if (!mime) return "webm";
  const base = mime.split(";")[0].trim().toLowerCase();
  const sub = base.split("/")[1] ?? "";
  if (["mpeg", "mp3"].includes(sub)) return "mp3";
  if (sub === "ogg") return "ogg";
  if (sub === "webm") return "webm";
  if (["wav", "x-wav"].includes(sub)) return "wav";
  return "webm";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId: string | undefined = body.user_id;
    const audioBase64: string | undefined = body.audio_base64;
    const audioMime: string = body.audio_mime ?? "audio/webm";

    if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    if (!audioBase64) return NextResponse.json({ error: "audio_base64 required" }, { status: 400 });

    let buffer: Buffer;
    try {
      buffer = Buffer.from(audioBase64, "base64");
    } catch {
      return NextResponse.json({ error: "invalid base64" }, { status: 400 });
    }
    if (buffer.length === 0) {
      return NextResponse.json({ error: "empty audio" }, { status: 400 });
    }
    if (buffer.length > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "audio too large", limitBytes: MAX_AUDIO_BYTES }, { status: 413 });
    }

    const [user, profile] = await Promise.all([getUser(userId), getStudentProfile(userId)]);
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
    if (!profile) return NextResponse.json({ error: "profile not found" }, { status: 404 });

    // 1. Whisper STT español
    const blob = new Blob([new Uint8Array(buffer)], { type: audioMime });
    const transcriptionEs = (await whisperSTT(blob, audioMime)).trim();
    if (!transcriptionEs) {
      return NextResponse.json({
        ok: false,
        error: "empty_transcription",
        message: "No pude escuchar bien tu audio. Intenta de nuevo en un lugar más silencioso.",
      });
    }

    // 2. Claude narrador → texto en inglés ajustado a la fase
    const phase = profile.current_phase;
    const userMsg = `Phase: ${phase}
Phase guide: ${PHASE_NARRATOR_GUIDE[phase]}
Student name: ${user.name}
Student city: ${user.city ?? "(unknown)"}

What the student said in Spanish:
"${transcriptionEs}"

Re-narrate to them in English (2nd person, warm, phase-appropriate). Output the narration only.`;

    const resp = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: NARRATOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = resp.content.find((b) => b.type === "text");
    const narrationEn = text && text.type === "text" ? text.text.trim() : "";
    if (!narrationEn) {
      return NextResponse.json({ ok: false, error: "narration_failed" }, { status: 500 });
    }

    // 3. ElevenLabs TTS — narración en inglés con voz de Sofia
    let narrationAudioUrl: string | null = null;
    try {
      if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_MISS_SOFIA_VOICE_ID) {
        const tts = await elevenLabsTTS(cleanTextForTTS(narrationEn));
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const today = new Date().toISOString().slice(0, 10);
        const path = `${NARRATOR_PATH_PREFIX}/${userId}/${today}.mp3`;
        const { error: uploadError } = await supabase
          .storage.from(NARRATOR_BUCKET)
          .upload(path, tts.audioBuffer, {
            contentType: tts.contentType,
            upsert: true,
          });
        if (!uploadError) {
          const { data: pub } = supabase.storage.from(NARRATOR_BUCKET).getPublicUrl(path);
          narrationAudioUrl = pub.publicUrl;
        } else {
          console.error("diary upload failed:", uploadError);
        }
      }
    } catch (e) {
      console.error("diary TTS failed:", e);
    }

    // 4. Marcar misión como completada (si la de hoy es la del diario)
    let missionCompleted = false;
    const todayMission = await getTodayMission(userId);
    if (todayMission && !todayMission.completed_at) {
      await completeTodayMission({
        userId,
        evidenceUrl: narrationAudioUrl ?? undefined,
        evidenceText: `ES: ${transcriptionEs}\n\nEN: ${narrationEn}`,
      });
      missionCompleted = true;
    }

    // 5. Recordar palabras nuevas del narrador en el diccionario personal
    // (palabras claves que aparecen en la narración inglés y son relevantes)
    const keyWords = extractKeyWords(narrationEn).slice(0, 8);
    for (const word of keyWords) {
      await recordWordLearned({
        userId,
        word,
        context: `Narración del diario del día (${transcriptionEs.slice(0, 80)}...)`,
        phase,
      });
    }

    return NextResponse.json({
      ok: true,
      transcription_es: transcriptionEs,
      narration_en: narrationEn,
      narration_audio_url: narrationAudioUrl,
      mission_completed: missionCompleted,
      words_added_to_dictionary: keyWords.length,
    });
  } catch (e) {
    console.error("missions/diary-translate error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Extracts notable words from the English narration (lowercase, deduped, no stopwords).
 * Used to seed the personal dictionary with words tied to today's diary moment.
 */
function extractKeyWords(text: string): string[] {
  const STOPWORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from", "had",
    "has", "have", "he", "her", "him", "his", "i", "in", "is", "it", "its", "of",
    "on", "or", "she", "that", "the", "their", "they", "this", "to", "was", "we",
    "were", "will", "with", "you", "your", "today", "yesterday", "tomorrow",
    "yes", "no", "but", "so", "if", "when", "then", "all", "some", "any",
    "my", "me", "us", "our", "what", "where", "who", "how", "why",
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s']/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return Array.from(new Set(words));
}
