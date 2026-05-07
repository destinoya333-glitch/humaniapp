/**
 * POST /api/sofia/shadowing
 *
 * Shadowing fonema-por-fonema barato. Usa Whisper (ya pagamos) + Haiku 4.5
 * con catálogo de patrones L1 hispano → da feedback específico tipo
 * "dijiste 'sirty' en vez de 'thirty', la 'th' es lengua entre dientes".
 *
 * Costo por intento: ~$0.001 (Whisper Groq ~$0.00009 + Haiku ~$0.0009).
 *
 * Body:
 *   {
 *     target: string,             // lo que Sofia pidió que repita ("thirty", "I have been working")
 *     audio_base64: string,       // grabación del user
 *     audio_mime?: string,        // 'audio/webm' default
 *     attempt_number?: number     // opcional, para escalar feedback en intentos repetidos
 *   }
 *
 * Returns:
 *   {
 *     ok: true,
 *     score: 0-100,
 *     matched: bool,              // transcripción == target (ignorando case/punct)
 *     transcription: string,
 *     target: string,
 *     feedback_es: string,        // 1 frase, tono adulto, español
 *     l1_pattern: string | null   // patrón L1 detectado si aplica (e.g. "th_to_s")
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { whisperSTT } from "@/lib/miss-sofia-voice/ai/whisper";

export const runtime = "nodejs";
export const maxDuration = 30;

const HAIKU_MODEL = (process.env.CLAUDE_HAIKU_MODEL ?? "claude-haiku-4-5-20251001").trim();
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _anthropic;
}

const SHADOWING_SYSTEM_PROMPT = `You are Miss Sofia, a professional English teacher giving instant
shadowing feedback to a Spanish-speaking adult. You hear what they actually
said (Whisper transcription) and compare it to the target word/phrase.

You know the typical L1 Spanish→English pronunciation pitfalls. Detect
which one happened (if any) and give ONE precise actionable correction.

L1 patterns to detect (return the key in 'l1_pattern' if it applies):
- "th_to_s_or_t"      → /θ/ replaced with /s/ or /t/. Ej target "think" → heard "sink"/"tink"
- "v_to_b"            → /v/ replaced with /b/. Ej target "very" → heard "berry"
- "h_silenced"        → /h/ silenced. Ej target "house" → heard "ouse"
- "sh_to_ch"          → /ʃ/ replaced with /tʃ/. Ej target "she" → heard "che"
- "z_to_s"            → /z/ replaced with /s/. Ej target "zoo" → heard "soo"
- "vowel_short_long"  → /ɪ/ vs /iː/ confusion. Ej target "ship" → heard "sheep"
- "j_y_swap"          → /dʒ/ vs /j/. Ej target "yes" → heard "jes"
- "schwa_full"        → schwa /ə/ pronounced as full vowel. Ej target "about" → heard "abowt"
- "final_consonant"   → final consonant dropped. Ej target "cat" → heard "ca"
- "epenthesis_e"      → 'e' added before sC clusters. Ej target "Spain" → heard "espain"
- "r_rolled"          → English /ɹ/ pronounced as Spanish trill /r/.
- "wrong_word"        → user said a completely different word
- "matched"           → transcription matches target (or near-perfect)

Score brackets:
- 95-100 → matched or near-perfect
- 80-94  → understandable, one minor pattern
- 60-79  → understandable but multiple issues
- 40-59  → barely understandable
- 0-39   → very different from target

Output ONLY a JSON object inside <result> tags:

<result>
{
  "score": 0-100,
  "l1_pattern": "th_to_s_or_t" | "v_to_b" | ... | null,
  "feedback_es": "1 short sentence in Spanish, professional adult tone, max 140 chars. NEVER use 'mi amor', 'linda', 'cariño'. Be precise and actionable. Include the specific tip if you detected a pattern."
}
</result>

Examples of good feedback:
- "Perfecto, esa 'th' te salió natural." (matched)
- "Casi. Dijiste 'sirty' — para 'thirty', saca la lengua entre los dientes y sopla suave."
- "Cerca. La 'v' inglesa toca el labio inferior con los dientes, no es la 'b' suave del español."
- "Te comiste la 'h' inicial. En inglés se aspira: 'house', con aire."`;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9'\s]/g, "").replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const target: string | undefined = body.target;
    const audioBase64: string | undefined = body.audio_base64;
    const audioMime: string | undefined = body.audio_mime;

    if (!target || !target.trim()) {
      return NextResponse.json({ error: "target required" }, { status: 400 });
    }
    if (!audioBase64) {
      return NextResponse.json({ error: "audio_base64 required" }, { status: 400 });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    if (audioBuffer.length === 0) {
      return NextResponse.json({ error: "empty audio" }, { status: 400 });
    }
    if (audioBuffer.length > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "audio too large", limitBytes: MAX_AUDIO_BYTES },
        { status: 413 }
      );
    }

    const blob = new Blob([new Uint8Array(audioBuffer)], { type: audioMime ?? "audio/webm" });
    const transcription = (await whisperSTT(blob, audioMime)).trim();

    if (!transcription) {
      return NextResponse.json({
        ok: true,
        score: 0,
        matched: false,
        transcription: "",
        target: target.trim(),
        feedback_es: "No te escuché bien. Graba en un lugar más silencioso e inténtalo de nuevo.",
        l1_pattern: null,
      });
    }

    const matched = normalize(transcription) === normalize(target);

    // Atajo: si matchea exacto, evitamos llamar a Claude (ahorro 70% del costo).
    if (matched) {
      return NextResponse.json({
        ok: true,
        score: 100,
        matched: true,
        transcription,
        target: target.trim(),
        feedback_es: "Perfecto. Esa pronunciación te salió natural.",
        l1_pattern: "matched",
      });
    }

    const userMsg = `Target: "${target.trim()}"
Student transcription (what Whisper heard): "${transcription}"

Detect the L1 Spanish pattern (or 'wrong_word' if completely different) and output the JSON inside <result> tags.`;

    const resp = await anthropic().messages.create({
      model: HAIKU_MODEL,
      max_tokens: 250,
      system: SHADOWING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    });

    const text = resp.content.find((b) => b.type === "text");
    const raw = text && text.type === "text" ? text.text : "";
    const m = raw.match(/<result>([\s\S]*?)<\/result>/);
    let score = 50;
    let feedback = "Casi. Inténtalo de nuevo escuchando bien el modelo.";
    let pattern: string | null = null;
    if (m) {
      try {
        const parsed = JSON.parse(m[1].trim()) as {
          score?: number;
          feedback_es?: string;
          l1_pattern?: string | null;
        };
        if (typeof parsed.score === "number") {
          score = Math.max(0, Math.min(100, Math.round(parsed.score)));
        }
        if (typeof parsed.feedback_es === "string" && parsed.feedback_es.trim()) {
          feedback = parsed.feedback_es.trim().slice(0, 200);
        }
        if (parsed.l1_pattern && parsed.l1_pattern !== "matched") {
          pattern = parsed.l1_pattern;
        }
      } catch {
        // fall through with defaults
      }
    }

    return NextResponse.json({
      ok: true,
      score,
      matched,
      transcription,
      target: target.trim(),
      feedback_es: feedback,
      l1_pattern: pattern,
    });
  } catch (e) {
    console.error("sofia/shadowing error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "sofia/shadowing",
    method: "POST",
    cost_per_attempt_usd: 0.001,
    uses: ["whisper-groq-large-v3-turbo", HAIKU_MODEL],
    body_schema: {
      target: "string",
      audio_base64: "string",
      audio_mime: "string (optional)",
    },
  });
}
