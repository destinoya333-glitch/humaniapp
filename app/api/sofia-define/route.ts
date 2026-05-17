/**
 * POST /api/sofia-define
 * Body: { word, context, user_id? }
 *
 * Define una palabra inglesa en el contexto donde apareció.
 * Si user_id viene, registra la palabra en mse_personal_dictionary
 * (idempotente: si ya existe, incrementa uses_count).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { defineWord } from "@/lib/miss-sofia-voice/review-extractor";
import { getStudentProfile, recordWordLearned } from "@/lib/miss-sofia-voice/db";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { word, context, user_id } = await req.json();
    if (typeof word !== "string" || !word.trim()) {
      return NextResponse.json({ error: "word required" }, { status: 400 });
    }
    const clean = word.trim().toLowerCase().replace(/[^a-z'\-]/g, "");
    if (!clean) {
      return NextResponse.json({ error: "invalid word" }, { status: 400 });
    }

    // Cache lookup primero
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const result = await defineWord({
      word: clean,
      context: typeof context === "string" ? context.slice(0, 400) : "",
    });

    if (!result) {
      return NextResponse.json({ error: "could not define" }, { status: 502 });
    }

    // Si tenemos user_id, registramos la palabra en diccionario personal.
    // Best-effort: si falla no rompemos la respuesta.
    if (typeof user_id === "string" && user_id.length > 0) {
      try {
        const profile = await getStudentProfile(user_id);
        if (profile) {
          await recordWordLearned({
            userId: user_id,
            word: clean,
            context: typeof context === "string" ? context.slice(0, 200) : "(tap-to-define)",
            phase: profile.current_phase,
          });
        }
      } catch (e) {
        console.error("define recordWordLearned failed:", e);
      }
    }

    return NextResponse.json({
      word: clean,
      meaning_es: result.meaning_es,
      example_1: result.example_1,
      example_2: result.example_2,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
