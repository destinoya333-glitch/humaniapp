/**
 * POST /api/sofia-flows/pronunciation
 *
 * Receives the submit of WhatsApp Flow #5 — Test pronunciación.
 *
 * Body:
 *   {
 *     user_id?: string,           // optional but used for logging if provided
 *     target_phrase: string,      // what Sofia asked them to say
 *     audio_base64: string,       // student's recording
 *     audio_mime?: string         // e.g. 'audio/webm', 'audio/ogg'
 *   }
 *
 * Pipeline:
 *   1. Decode audio
 *   2. Whisper STT (Groq) → transcription
 *   3. Claude scoring against target_phrase → score 0-100 + executive feedback
 *
 * Returns:
 *   { score, transcription, target_phrase, feedback_es }
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { whisperSTT } from "@/lib/miss-sofia-voice/ai/whisper";

export const runtime = "nodejs";
export const maxDuration = 30;

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6").trim();
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 MB — pronunciation snippets are short

let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _anthropic;
}

const SCORING_SYSTEM_PROMPT = `You are Miss Sofia, a professional English teacher scoring a Spanish-speaking
adult student's pronunciation attempt.

Compare the student's transcription to the target phrase. Score 0-100 based on:
- How close their transcription is to the target (allow minor word substitutions of similar meaning)
- Likely pronunciation issues inferred from common Spanish-speaker mistakes when transcription is partial
- Completeness of the attempt

Output ONLY a JSON object inside <score> tags:

<score>
{
  "score": 0-100,
  "feedback_es": "1 short sentence in Spanish, professional adult-to-adult tone, no pet names, max 140 chars"
}
</score>

Score brackets:
- 90-100 → near-native attempt
- 70-89  → understandable, minor issues
- 50-69  → understandable but several issues
- 30-49  → partially understandable
- 0-29   → mostly unintelligible or very different from target

Feedback rules:
- NEVER use "mi amor", "linda", "campeón", "superstar", "cariño".
- Be precise about what to improve OR celebrate clearly when good.
- Examples: "Excelente. La 'th' te salió natural." / "Casi. Trabaja la 'r' suave del inglés." / "Muy bien, solo una vocal corta de pulir."`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetPhrase: string | undefined = body.target_phrase;
    const audioBase64: string | undefined = body.audio_base64;
    const audioMime: string | undefined = body.audio_mime;

    if (!targetPhrase || !targetPhrase.trim()) {
      return NextResponse.json({ error: "target_phrase required" }, { status: 400 });
    }
    if (!audioBase64) {
      return NextResponse.json({ error: "audio_base64 required" }, { status: 400 });
    }

    let audioBuffer: Buffer;
    try {
      audioBuffer = Buffer.from(audioBase64, "base64");
    } catch {
      return NextResponse.json({ error: "invalid base64" }, { status: 400 });
    }
    if (audioBuffer.length === 0) {
      return NextResponse.json({ error: "empty audio" }, { status: 400 });
    }
    if (audioBuffer.length > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "audio too large", limitBytes: MAX_AUDIO_BYTES },
        { status: 413 }
      );
    }

    // 1. Whisper STT
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: audioMime ?? "audio/webm" });
    const transcription = (await whisperSTT(blob, audioMime)).trim();

    if (!transcription) {
      return NextResponse.json({
        score: 0,
        transcription: "",
        target_phrase: targetPhrase.trim(),
        feedback_es: "No pude escuchar bien el audio. Inténtalo de nuevo en un lugar más silencioso.",
      });
    }

    // 2. Claude scoring
    const userMsg = `Target phrase: "${targetPhrase.trim()}"
Student transcription: "${transcription}"

Output the JSON inside <score> tags.`;

    const resp = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 200,
      system: SCORING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    });

    const text = resp.content.find((b) => b.type === "text");
    const raw = text && text.type === "text" ? text.text : "";
    const m = raw.match(/<score>([\s\S]*?)<\/score>/);
    let score = 50;
    let feedback = "Sigue practicando.";
    if (m) {
      try {
        const parsed = JSON.parse(m[1].trim()) as { score?: number; feedback_es?: string };
        if (typeof parsed.score === "number") score = Math.max(0, Math.min(100, Math.round(parsed.score)));
        if (typeof parsed.feedback_es === "string" && parsed.feedback_es.trim()) {
          feedback = parsed.feedback_es.trim().slice(0, 200);
        }
      } catch {
        // fall through with defaults
      }
    }

    return NextResponse.json({
      score,
      transcription,
      target_phrase: targetPhrase.trim(),
      feedback_es: feedback,
    });
  } catch (e) {
    console.error("sofia-flows/pronunciation error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
