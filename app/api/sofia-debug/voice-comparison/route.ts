/**
 * GET /api/sofia-debug/voice-comparison
 *
 * Genera el MISMO texto representativo del Método Cuna con ambos motores
 * de TTS y sube los audios al bucket público sofia-tts/voice-comparison/
 * para que el equipo pueda comparar y decidir.
 *
 * Voces generadas:
 *   - elevenlabs-sofia.mp3        (voz actual — la "magia")
 *   - openai-nova.mp3             (voz propuesta — femenina suave)
 *   - openai-shimmer.mp3          (voz propuesta — femenina cálida)
 *
 * Costos comparativos:
 *   - ElevenLabs: ~$0.18/min de voz (plan Creator $22)
 *   - OpenAI TTS-1: ~$0.011/min de voz
 *
 * Borrar después de la decisión.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { elevenLabsTTS } from "@/lib/miss-sofia-voice/ai/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "sofia-tts";
const PATH_PREFIX = "voice-comparison";

const COMPARISON_TEXT = `Hola Percy. Hoy es tu primer día en el método Cuna.
No vamos a estudiar inglés. Vamos a vivirlo.
Just listen. No need to speak yet — your brain is already learning.
Today you went to work, you had lunch with your sister, and you felt tired but proud.
Mañana sigue tu historia.`;

async function openaiTTS(text: string, voice: "nova" | "shimmer" | "alloy"): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice,
      response_format: "mp3",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI TTS error ${res.status}: ${err.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");

  const results: Record<string, { url: string | null; error?: string; cost_per_min?: string }> = {};

  // 1. ElevenLabs Sofia (voz actual)
  try {
    const tts = await elevenLabsTTS(COMPARISON_TEXT);
    const path = `${PATH_PREFIX}/elevenlabs-sofia.mp3`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, tts.audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    results["elevenlabs_sofia"] = error
      ? { url: null, error: error.message }
      : {
          url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`,
          cost_per_min: "$0.165 (Creator $22) / $0.124 (Scale $330)",
        };
  } catch (e) {
    results["elevenlabs_sofia"] = { url: null, error: (e as Error).message };
  }

  // 2. OpenAI Nova (femenina joven, energética)
  try {
    const buf = await openaiTTS(COMPARISON_TEXT, "nova");
    if (!buf) {
      results["openai_nova"] = {
        url: null,
        error: "OPENAI_API_KEY no está seteada en Vercel. Setéala y vuelve a llamar.",
      };
    } else {
      const path = `${PATH_PREFIX}/openai-nova.mp3`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
        contentType: "audio/mpeg",
        upsert: true,
      });
      results["openai_nova"] = error
        ? { url: null, error: error.message }
        : {
            url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`,
            cost_per_min: "$0.011",
          };
    }
  } catch (e) {
    results["openai_nova"] = { url: null, error: (e as Error).message };
  }

  // 3. OpenAI Shimmer (femenina madura, cálida — más cercana a Sofia)
  try {
    const buf = await openaiTTS(COMPARISON_TEXT, "shimmer");
    if (!buf) {
      results["openai_shimmer"] = {
        url: null,
        error: "OPENAI_API_KEY no está seteada en Vercel.",
      };
    } else {
      const path = `${PATH_PREFIX}/openai-shimmer.mp3`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
        contentType: "audio/mpeg",
        upsert: true,
      });
      results["openai_shimmer"] = error
        ? { url: null, error: error.message }
        : {
            url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`,
            cost_per_min: "$0.011",
          };
    }
  } catch (e) {
    results["openai_shimmer"] = { url: null, error: (e as Error).message };
  }

  return NextResponse.json({
    text_used: COMPARISON_TEXT,
    audios: results,
    note: "Compara los 3 audios. ElevenLabs Sofia es la voz actual. Las dos OpenAI son las propuestas para chat normal (manteniendo ElevenLabs en momentos hero).",
  });
}
