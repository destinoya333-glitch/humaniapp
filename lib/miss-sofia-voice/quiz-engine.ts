/**
 * Quiz Engine — mini-quiz post-pasaje estilo Teacher Poli.
 *
 * Genera 5 preguntas: 3 multiple-choice + 2 open-ended sobre el pasaje.
 * Las open-ended se puntúan con Claude después (judgePotentialMatch).
 */
import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6").trim();

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

export type QuizMC = {
  type: "mc";
  question: string;
  options: string[];
  correct_index: number;
  explanation_es?: string;
};
export type QuizOpen = {
  type: "open";
  question: string;
  expected_keywords: string[];
  model_answer: string;
};
export type QuizQuestion = QuizMC | QuizOpen;

const QUIZ_PROMPT = `You are generating a 5-question quiz about a short English passage.
Format: exactly 3 multiple-choice (mc) + 2 open-ended (open).

RULES:
1. Multiple choice: 4 options each, only ONE correct, others plausible but wrong.
2. Open questions: short answers (1-3 sentences). Include 3-5 expected_keywords.
3. Questions should test COMPREHENSION, not memorization of trivia.
4. Questions in ENGLISH.

OUTPUT FORMAT — strict JSON array inside <quiz>...</quiz>:
[
  { "type": "mc", "question": "...", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation_es": "..." },
  { "type": "mc", "question": "...", "options": [...], "correct_index": 2, "explanation_es": "..." },
  { "type": "mc", "question": "...", "options": [...], "correct_index": 1, "explanation_es": "..." },
  { "type": "open", "question": "...", "expected_keywords": ["...", "..."], "model_answer": "..." },
  { "type": "open", "question": "...", "expected_keywords": ["...", "..."], "model_answer": "..." }
]`;

export async function generateQuiz(passageBodyEn: string, title: string): Promise<QuizQuestion[]> {
  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: QUIZ_PROMPT,
    messages: [
      {
        role: "user",
        content: `Title: ${title}\n\nPassage:\n${passageBodyEn}\n\nGenerate the quiz.`,
      },
    ],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("quiz-engine: empty response");
  const m = text.text.match(/<quiz>([\s\S]*?)<\/quiz>/);
  const raw = (m ? m[1] : text.text).trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("quiz-engine: parse failed");
  }
  if (!Array.isArray(parsed)) throw new Error("quiz-engine: not array");
  const valid: QuizQuestion[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    if (q.type === "mc") {
      if (
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correct_index === "number" &&
        q.correct_index >= 0 &&
        q.correct_index < 4
      ) {
        valid.push({
          type: "mc",
          question: q.question,
          options: q.options.map((o) => String(o)),
          correct_index: q.correct_index,
          explanation_es: typeof q.explanation_es === "string" ? q.explanation_es : undefined,
        });
      }
    } else if (q.type === "open") {
      if (
        typeof q.question === "string" &&
        Array.isArray(q.expected_keywords) &&
        typeof q.model_answer === "string"
      ) {
        valid.push({
          type: "open",
          question: q.question,
          expected_keywords: q.expected_keywords.map((k) => String(k)).slice(0, 8),
          model_answer: q.model_answer,
        });
      }
    }
  }
  if (valid.length === 0) throw new Error("quiz-engine: no valid questions");
  return valid.slice(0, 5);
}

/**
 * Score open-ended answer 0-100 against model + keywords.
 */
export async function scoreOpenAnswer(opts: {
  question: string;
  modelAnswer: string;
  expectedKeywords: string[];
  studentAnswer: string;
}): Promise<{ score: number; feedback_es: string }> {
  // Si el estudiante no respondió → 0
  if (!opts.studentAnswer.trim()) {
    return { score: 0, feedback_es: "No respondiste — sin problema, intenta la próxima." };
  }

  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 400,
    system: `You score an open-ended English answer 0-100. Output ONLY JSON inside <score>...</score>:
{ "score": 0-100, "feedback_es": "1-2 lines in Spanish: what was right, what to improve" }
Consider: coverage of expected keywords + alignment with model answer + English correctness.`,
    messages: [
      {
        role: "user",
        content: `Question: ${opts.question}
Expected keywords: ${opts.expectedKeywords.join(", ")}
Model answer: ${opts.modelAnswer}
Student answer: ${opts.studentAnswer}`,
      },
    ],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return { score: 0, feedback_es: "No pude evaluar." };
  const m = text.text.match(/<score>([\s\S]*?)<\/score>/);
  const raw = (m ? m[1] : text.text).trim();
  try {
    const parsed = JSON.parse(raw) as { score?: number; feedback_es?: string };
    const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 0)));
    const feedback = typeof parsed.feedback_es === "string" ? parsed.feedback_es : "—";
    return { score, feedback_es: feedback };
  } catch {
    return { score: 0, feedback_es: "No pude evaluar." };
  }
}
