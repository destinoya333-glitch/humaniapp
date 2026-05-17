/**
 * Review Card Extractor — Método APA dentro de Cuna.
 *
 * Toma el transcript de una sesión y le pide a Claude que extraiga
 * 3-5 correcciones de alta calidad estilo Teacher Poli (Article Use,
 * Word Choice, Verb Tense, etc.). NO afecta al master prompt: Sofia
 * sigue conversando con afecto sin interrumpir; las correcciones se
 * presentan al usuario después en el tab "Revisión".
 */
import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6").trim();

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

export type ReviewCategory =
  | "article_use"
  | "word_choice"
  | "verb_tense"
  | "pronunciation"
  | "word_order"
  | "preposition"
  | "subject_verb_agreement";

export type ReviewCard = {
  category: ReviewCategory;
  user_phrase: string;
  correction: string;
  explanation_es: string;
  severity: 1 | 2 | 3;
};

type Transcript = Array<{ role: "user" | "assistant"; content: string }>;

const VALID_CATEGORIES: ReadonlySet<ReviewCategory> = new Set<ReviewCategory>([
  "article_use",
  "word_choice",
  "verb_tense",
  "pronunciation",
  "word_order",
  "preposition",
  "subject_verb_agreement",
]);

function isValidCategory(c: unknown): c is ReviewCategory {
  return typeof c === "string" && VALID_CATEGORIES.has(c as ReviewCategory);
}

const EXTRACTOR_PROMPT = `Eres un coach de inglés que analiza transcripts de conversaciones entre un estudiante hispanohablante y Miss Sofia (tutora IA).

Tu tarea: extraer las 3 a 5 correcciones MÁS IMPORTANTES de lo que dijo el estudiante. Estilo Teacher Poli — categorías estrictas + explicación en español natural.

REGLAS:
1. Solo del rol "user" — nunca corrijas a Sofia.
2. Ignora errores triviales (typos, mayúsculas) y muletillas naturales ("uhm", "you know").
3. NUNCA corrijas spanglish intencional o code-switch en niveles bajos (fase 0-1) — eso es parte del Método Cuna.
4. Prioriza patrones repetitivos del estudiante sobre slips aislados.
5. Si no hay correcciones de calidad, devuelve array vacío. NO inventes.
6. Severity: 1 = matiz; 2 = error que afecta naturalidad; 3 = error que afecta comprensión.

CATEGORÍAS (usar EXACTAMENTE estos códigos):
- article_use: a/an/the mal usado u omitido
- word_choice: palabra existe pero hay opción más natural
- verb_tense: tiempo verbal incorrecto
- pronunciation: aplica solo si transcript tiene marca fonética (ej. "[mispronounced]")
- word_order: orden de palabras no natural
- preposition: preposición incorrecta
- subject_verb_agreement: concordancia sujeto-verbo

FORMATO DE SALIDA — JSON dentro de <review_cards>...</review_cards>:
[
  {
    "category": "article_use",
    "user_phrase": "frase exacta del estudiante",
    "correction": "versión nativa",
    "explanation_es": "explicación clara en 1-2 frases en español",
    "severity": 2
  }
]

Si no hay nada que corregir, devuelve: <review_cards>[]</review_cards>`;

export async function extractReviewCards(
  transcript: Transcript,
  phase: number
): Promise<ReviewCard[]> {
  if (!transcript || transcript.length === 0) return [];

  const userTurns = transcript.filter((t) => t.role === "user");
  if (userTurns.length === 0) return [];

  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: EXTRACTOR_PROMPT,
    messages: [
      {
        role: "user",
        content: `Estudiante en Fase Cuna ${phase}. Transcript:\n${JSON.stringify(
          transcript
        )}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return [];

  const m = text.text.match(/<review_cards>([\s\S]*?)<\/review_cards>/);
  if (!m) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(m[1].trim());
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const cards: ReviewCard[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (!isValidCategory(o.category)) continue;
    if (typeof o.user_phrase !== "string" || o.user_phrase.trim().length === 0) continue;
    if (typeof o.correction !== "string" || o.correction.trim().length === 0) continue;
    if (typeof o.explanation_es !== "string" || o.explanation_es.trim().length === 0) continue;
    const sev = typeof o.severity === "number" ? Math.round(o.severity) : 2;
    const severity = (sev < 1 ? 1 : sev > 3 ? 3 : sev) as 1 | 2 | 3;

    cards.push({
      category: o.category,
      user_phrase: o.user_phrase.trim().slice(0, 500),
      correction: o.correction.trim().slice(0, 500),
      explanation_es: o.explanation_es.trim().slice(0, 800),
      severity,
    });
  }
  return cards.slice(0, 5);
}

/**
 * Define a single English word in the context of a sentence.
 * Used by tap-to-define in the conversation view.
 */
export async function defineWord(opts: {
  word: string;
  context: string;
  nativeLanguage?: "es" | "pt";
}): Promise<{
  meaning_es: string;
  example_1: string;
  example_2: string;
} | null> {
  const lang = opts.nativeLanguage ?? "es";
  const langName = lang === "es" ? "español" : "portugués";

  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 400,
    system: `Eres un diccionario contextual. Te dan una palabra en inglés y la frase donde apareció. Devuelves:
1. Significado en ${langName} (1 línea, máx 80 chars), específico al contexto.
2. Dos ejemplos en inglés naturales (uno informal, uno formal).

FORMATO JSON dentro de <define>...</define>:
{ "meaning_es": "...", "example_1": "...", "example_2": "..." }`,
    messages: [
      {
        role: "user",
        content: `Palabra: "${opts.word}"\nContexto: "${opts.context}"`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  const m = text.text.match(/<define>([\s\S]*?)<\/define>/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1].trim()) as Record<string, unknown>;
    if (
      typeof parsed.meaning_es === "string" &&
      typeof parsed.example_1 === "string" &&
      typeof parsed.example_2 === "string"
    ) {
      return {
        meaning_es: parsed.meaning_es,
        example_1: parsed.example_1,
        example_2: parsed.example_2,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}
