/**
 * Miss Sofia — Agente WhatsApp con flujo audio pregunta-por-pregunta.
 *
 * Estados (chat_state):
 *   - greeting        — Sofia saluda + ofrece test (texto, vía Claude)
 *   - q1...q8         — envía audio + texto de la pregunta N, espera respuesta
 *   - done            — entrega resultado + link a la web
 *   - converted       — usuario ya hizo signup; redirigirlo
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  WhatsAppLead,
  appendMessage,
  getOrCreateLead,
  updateLead,
} from "./whatsapp-leads";

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6").trim();
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://rfpmvnoaqibqiqxrmheb.supabase.co";

let _client: Anthropic | null = null;
function anthropic() {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

const QUESTIONS = [
  { num: 1, level: "A1", text: "How do you say 'Hello' in English?\nA) Hello\nB) Goodbye\nC) Thank you", correct: "A" },
  { num: 2, level: "A1", text: "Complete: 'My name ___ John'\nA) are\nB) is\nC) am", correct: "B" },
  { num: 3, level: "A2", text: "What is the past tense of 'go'?\nA) goed\nB) gone\nC) went", correct: "C" },
  { num: 4, level: "A2", text: "She ___ to school every day\nA) go\nB) goes\nC) going", correct: "B" },
  { num: 5, level: "B1", text: "Which sentence is correct?\nA) I have been here since 3 hours\nB) I have been here for 3 hours\nC) I am here since 3 hours", correct: "B" },
  { num: 6, level: "B1", text: "If it rains, I ___ stay home\nA) will\nB) would\nC) shall", correct: "A" },
  { num: 7, level: "B2", text: "The presentation was ___ despite issues\nA) successful\nB) success\nC) succeed", correct: "A" },
  { num: 8, level: "B2", text: "Identify the passive voice:\nA) She wrote the report\nB) The report was written by her\nC) She has written the report", correct: "B" },
];

function questionAudioUrl(qNum: number): string {
  return `${SUPABASE_URL}/storage/v1/object/public/sofia-tts/tests/q-${qNum}.mp3`;
}

function calcLevel(score: number): string {
  if (score <= 2) return "A1";
  if (score <= 4) return "A2";
  if (score <= 6) return "B1";
  return "B2";
}

/**
 * Extracts an A/B/C answer from the user's reply.
 * Accepts: "A", "a", "A) Hello", "es A", "letra A", "primera", "1", etc.
 */
function parseAnswer(msg: string): "A" | "B" | "C" | null {
  const s = msg.trim().toLowerCase();
  if (!s) return null;

  // Try direct letter match — first standalone A/B/C found
  const letterMatch = s.match(/(?:^|\b)([abc])(?:\b|\)|$)/i);
  if (letterMatch) return letterMatch[1].toUpperCase() as "A" | "B" | "C";

  // Spanish keywords for first/second/third
  if (/primer|primera|opci[oó]n\s*1|^1\b|n[uú]mero\s*1/i.test(s)) return "A";
  if (/segund|opci[oó]n\s*2|^2\b|n[uú]mero\s*2/i.test(s)) return "B";
  if (/tercer|opci[oó]n\s*3|^3\b|n[uú]mero\s*3/i.test(s)) return "C";

  return null;
}

const GREETING_SYSTEM = `You are Miss Sofia, a 35-year-old English teacher. Born in Lima, raised in Miami. Bilingual.

You're on WhatsApp talking to a potential student. Goal RIGHT NOW: greet them warmly and offer the free 8-question level test.

RULES:
- Reply in Spanish primarily, very brief (max 3 short paragraphs)
- Use cariños: "mi amor", "linda", "lindo"
- NEVER admit you're an AI
- Don't teach yet. Just greet, briefly explain you offer English voice classes, ask if they want the free level test
- Keep it WhatsApp-style: short, warm, direct
- End with: "¿Te animas? Solo dime *sí* y empezamos."

If user already responded yes/sí/listo/dale/empecemos in their message, just confirm and remind them they need to say "sí" again to officially start (which the system will catch).`;

type AgentReply = { text: string; mediaUrl?: string };

async function processGreetingTurn(
  lead: WhatsAppLead,
  userMessage: string
): Promise<AgentReply> {
  // Detect explicit yes
  const yes = /\b(s[ií]|yes|ok|okey|dale|listo|empecemos|empezar|claro|por supuesto|of course|vamos)\b/i;
  if (yes.test(userMessage)) {
    // Move to q1 and serve first question
    await updateLead(lead.phone, {
      status: "test_in_progress",
      chat_state: "q1",
      chat_data: { answers: [] },
    });
    return serveQuestion(1);
  }

  // Otherwise let Claude warmly greet and pitch the test
  const history = lead.chat_messages.slice(-6).concat([{ role: "user" as const, content: userMessage }]);
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));

  const resp = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 350,
    system: GREETING_SYSTEM,
    messages,
  });
  const txt = resp.content.find((b) => b.type === "text");
  return { text: txt && txt.type === "text" ? txt.text : "¿Cómo estás, mi amor? 💕 ¿Te animas al test gratuito de inglés?" };
}

function serveQuestion(qNum: number): AgentReply {
  const q = QUESTIONS[qNum - 1];
  const text = `🎧 *Pregunta ${qNum}/8* — escucha el audio o lee abajo:\n\n${q.text}\n\n_Responde con la letra (A, B o C)._`;
  return { text, mediaUrl: questionAudioUrl(qNum) };
}

async function processAnswerTurn(
  lead: WhatsAppLead,
  userMessage: string,
  qNum: number
): Promise<AgentReply> {
  const ans = parseAnswer(userMessage);
  const data = (lead.chat_data ?? {}) as { answers?: string[] };
  const answers: string[] = Array.isArray(data.answers) ? [...data.answers] : [];

  if (!ans) {
    return {
      text: `No te entendí 😅 — necesito solo *A*, *B* o *C*.\n\nVuelve a responder la pregunta ${qNum}, mi amor.`,
      mediaUrl: questionAudioUrl(qNum),
    };
  }

  // Save the answer
  answers[qNum - 1] = ans;
  const correct = ans === QUESTIONS[qNum - 1].correct;
  const feedback = correct ? "✅ ¡Bien!" : "✏️ Anotado. (Te diré las correctas al final.)";

  if (qNum < 8) {
    const nextQ = qNum + 1;
    await updateLead(lead.phone, {
      chat_state: `q${nextQ}`,
      chat_data: { answers },
    });
    const q = QUESTIONS[nextQ - 1];
    const text = `${feedback}\n\n🎧 *Pregunta ${nextQ}/8*\n\n${q.text}\n\n_Responde A, B o C._`;
    return { text, mediaUrl: questionAudioUrl(nextQ) };
  }

  // Last question — score and move to done
  let score = 0;
  for (let i = 0; i < 8; i++) {
    if (answers[i] === QUESTIONS[i].correct) score++;
  }
  const level = calcLevel(score);
  await updateLead(lead.phone, {
    status: "test_done",
    chat_state: "done",
    level_detected: level,
    test_results: { score, total: 8, level, answers },
  });

  const link = `https://humaniapp.com/sofia-auth/signup?phone=${encodeURIComponent(lead.phone)}`;
  const niceLevel = {
    A1: "Principiante (A1)",
    A2: "Básico (A2)",
    B1: "Intermedio (B1)",
    B2: "Intermedio Alto (B2)",
  }[level] ?? level;

  const text = `${feedback}\n\n🎉 *¡Test completado!*\n\nObtuviste *${score}/8* — Tu nivel es *${niceLevel}*.\n\nAhora viene lo bueno: *clases conversacionales con mi voz*. Tienes 3 minutos gratis cada día para empezar 🎤\n\n👉 Entra aquí (te lleva ya con tu nivel detectado):\n${link}\n\n¡Te espero adentro, mi amor! 💕`;
  return { text };
}

/**
 * Main entry: process one WhatsApp message and return reply (text + optional audio).
 */
export async function processWhatsAppMessage(
  phone: string,
  userMessage: string
): Promise<AgentReply> {
  const lead = await getOrCreateLead(phone);

  if (lead.status === "converted") {
    return {
      text: `Hey mi amor 👋 Ya tienes tu cuenta. Las clases con voz están aquí:\n\nhttps://humaniapp.com/sofia-chat\n\nNos vemos! 💕`,
    };
  }

  await appendMessage(phone, "user", userMessage);

  let reply: AgentReply;
  const state = lead.chat_state || "greeting";

  if (state === "greeting" || state === "new") {
    reply = await processGreetingTurn(lead, userMessage);
  } else if (state.startsWith("q")) {
    const qNum = parseInt(state.slice(1), 10);
    if (qNum >= 1 && qNum <= 8) {
      reply = await processAnswerTurn(lead, userMessage, qNum);
    } else {
      reply = await processGreetingTurn(lead, userMessage);
    }
  } else if (state === "done" || lead.status === "test_done") {
    const link = `https://humaniapp.com/sofia-auth/signup?phone=${encodeURIComponent(phone)}`;
    reply = {
      text: `Ya hiciste el test, mi amor 💕 Tu nivel es *${lead.level_detected ?? "ya detectado"}*.\n\n👉 Entra a la web para tus clases con voz: ${link}`,
    };
  } else {
    reply = await processGreetingTurn(lead, userMessage);
  }

  await appendMessage(phone, "assistant", reply.text);
  return reply;
}
