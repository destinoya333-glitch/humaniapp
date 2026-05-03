/**
 * Generates BeConfident-style 3-block feedback for a student's response.
 *
 * Output format:
 *   🎯 score/100 — label
 *   📝 Cómo mejorar — original → corrected
 *   💡 Consejos — Spanish teacher advice
 */
import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6").trim();

let _client: Anthropic | null = null;
function anthropic() {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

export type FeedbackAnalysis = {
  score: number; // 0..100
  score_label: string; // Spanish, BeConfident-style
  score_emoji: string;
  improvements: Array<{ original: string; corrected: string; note?: string }>;
  advice: string; // Spanish teacher advice (1-2 sentences)
  next_prompt_hint?: string; // optional natural follow-up so Sofia can continue conversation
};

const SYSTEM_PROMPT = `You are Miss Sofia, a 35-year-old peruana-americana English teacher giving structured feedback on a student's English response.

Your output MUST be valid JSON inside <feedback> tags, with no other text outside the tags. Schema:

<feedback>
{
  "score": 0-100,
  "score_label": "string in Spanish, max 6 words",
  "score_emoji": "single emoji",
  "improvements": [
    {"original": "what student said wrong", "corrected": "fixed version", "note": "short Spanish explanation"}
  ],
  "advice": "1-2 sentence teacher advice in Spanish (professional, warm but adult-to-adult, max 200 chars)",
  "next_prompt_hint": "1 sentence in English suggesting a natural follow-up question (max 100 chars)"
}
</feedback>

Score brackets (label suggestions, vary the wording):
- 0-30  → "Vamos a mejorar 💪" / "Respira y prueba otra vez"
- 31-60 → "Bien, pulamos juntos ✨" / "Vamos por buen camino"
- 61-85 → "Muy bien 🌟" / "Excelente trabajo"
- 86-100 → "Increíble 🎉" / "Perfecto"

Rules:
- improvements: list at MOST 3 items. If response is fluent, list ZERO items.
- For perfect responses, score 90-100 and improvements empty array.
- Spanish speakers' typical errors: missing articles, wrong verb tense, "have" vs "be" age, plural agreement, subject pronouns dropped.
- Keep improvements bilingual: original in English, corrected in English, note in Spanish.
- advice should be SHORT, professional, and actionable. Address the student as an adult — NO pet names ("mi amor", "linda", "campeón", "superstar"). Use their first name only when it adds warmth.
- Output JSON ONLY inside <feedback> tags — no preamble, no markdown fences.`;

export async function analyzeResponse(opts: {
  userLevel: string;
  taskPrompt: string; // what the student was asked to say/answer
  userResponse: string; // what they actually said (transcribed if audio)
}): Promise<FeedbackAnalysis> {
  const userMessage = `Student level: ${opts.userLevel}
Task they were given: "${opts.taskPrompt}"
Their response (English): "${opts.userResponse}"

Analyze and return the feedback JSON.`;

  const resp = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = resp.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  const m = raw.match(/<feedback>([\s\S]*?)<\/feedback>/);
  const jsonStr = m ? m[1].trim() : raw.trim();

  try {
    const parsed = JSON.parse(jsonStr) as FeedbackAnalysis;
    return {
      score: clamp(parsed.score ?? 0, 0, 100),
      score_label: parsed.score_label ?? "Vamos a mejorar",
      score_emoji: parsed.score_emoji ?? "💪",
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : [],
      advice: parsed.advice ?? "",
      next_prompt_hint: parsed.next_prompt_hint,
    };
  } catch {
    // Fallback if Claude didn't return valid JSON
    return {
      score: 50,
      score_label: "Vamos a mejorar",
      score_emoji: "💪",
      improvements: [],
      advice: "No pude analizar tu respuesta. Inténtalo de nuevo.",
    };
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/**
 * Renders a FeedbackAnalysis object as a WhatsApp-formatted message
 * matching BeConfident's 3-block layout.
 */
export function renderFeedbackMessage(fb: FeedbackAnalysis): string {
  const parts: string[] = [];

  // Block 1: score-card
  parts.push(`🎯 *${fb.score}/100* — ${fb.score_label} ${fb.score_emoji}`);

  // Block 2: improvements (only if any)
  if (fb.improvements.length > 0) {
    const lines = fb.improvements
      .map(
        (imp) =>
          `~${escapeForWa(imp.original)}~ → *${escapeForWa(imp.corrected)}*${imp.note ? `\n  _${escapeForWa(imp.note)}_` : ""}`
      )
      .join("\n\n");
    parts.push(`📝 *Cómo mejorar:*\n${lines}`);
  } else if (fb.score >= 85) {
    parts.push(`📝 *Cómo mejorar:* nada que corregir, sigue así ✨`);
  }

  // Block 3: advice
  if (fb.advice) {
    parts.push(`💡 *Consejos:*\n${fb.advice}`);
  }

  return parts.join("\n\n");
}

function escapeForWa(s: string): string {
  // WhatsApp uses *, _, ~ for formatting — escape them in user content
  return s.replace(/[*_~]/g, "");
}
