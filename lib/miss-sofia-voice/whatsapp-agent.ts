/**
 * Miss Sofia — Agente WhatsApp simplificado (entrada al funnel).
 *
 * Flujo:
 *   1. greeting — saluda y ofrece test de nivel gratuito
 *   2. test_in_progress — envía 8 preguntas, recibe respuestas formato "A,B,C,A,B,C,A,B"
 *   3. test_done — anuncia nivel detectado + manda link a la web app
 *   4. converted — ya migró a la web; redirige a la web
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  WhatsAppLead,
  appendMessage,
  getOrCreateLead,
  updateLead,
} from "./whatsapp-leads";

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6").trim();
let _client: Anthropic | null = null;
function anthropic() {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

const TEST_QUESTIONS = [
  { id: 1, level: "A1", q: "How do you say 'Hello' in English?", opt: "A) Hello   B) Goodbye   C) Thank you", correct: "A" },
  { id: 2, level: "A1", q: "Complete: 'My name ___ John'", opt: "A) are   B) is   C) am", correct: "B" },
  { id: 3, level: "A2", q: "Past tense of 'go'?", opt: "A) goed   B) gone   C) went", correct: "C" },
  { id: 4, level: "A2", q: "'She ___ to school every day'", opt: "A) go   B) goes   C) going", correct: "B" },
  { id: 5, level: "B1", q: "Which sentence is correct?", opt: "A) I have been here since 3 hours   B) I have been here for 3 hours   C) I am here since 3 hours", correct: "B" },
  { id: 6, level: "B1", q: "'If it rains, I ___ stay home'", opt: "A) will   B) would   C) shall", correct: "A" },
  { id: 7, level: "B2", q: "'The presentation was ___ despite issues'", opt: "A) successful   B) success   C) succeed", correct: "A" },
  { id: 8, level: "B2", q: "Identify the passive voice:", opt: "A) She wrote the report   B) The report was written by her   C) She has written the report", correct: "B" },
];

function calcLevel(score: number): string {
  if (score <= 2) return "A1";
  if (score <= 4) return "A2";
  if (score <= 6) return "B1";
  return "B2";
}

function testQuestionsText(): string {
  return TEST_QUESTIONS
    .map((q, i) => `${i + 1}. ${q.q}\n   ${q.opt}`)
    .join("\n\n");
}

const SYSTEM_PROMPT = `You are Miss Sofia, a 35-year-old English teacher. You're warm, playful, motivating. Born in Lima, raised in Miami. Bilingual.

You're talking to potential students on WhatsApp. Your ONLY goals here are:
1. Greet them warmly (in Spanish primarily, brief)
2. Get them to take the free 8-question level test
3. After the test, hand off to the web app for real voice conversation classes

CRITICAL RULES:
- KEEP REPLIES SHORT — WhatsApp style, max 2-3 short paragraphs
- Use Spanish primarily on WhatsApp (default mode here is español)
- Use cariños naturally: "mi amor", "linda/lindo", "campeón/campeona"
- NEVER admit you're an AI. If asked: "Soy Sofia, tu profesora 💕"
- Do NOT teach English on WhatsApp. The real classes are on the web app.
- The test is ALREADY pre-built. When the user agrees, just paste the questions.
- After test results, ALWAYS push them to the web app with the link.

Web app link format: https://humaniapp.com/sofia-auth/signup?phone={PHONE}
(Replace {PHONE} with the actual phone number when sending)

Available tools:
- start_test: shows the 8-question level test
- evaluate_test: receives answers like "A,B,C,A,B,C,A,B", returns level
- send_to_web: tells the user to go to the web app with their phone pre-filled
`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "start_test",
    description: "Show the 8-question level test to the student. Call this when they accept to take the test.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "evaluate_test",
    description: "Evaluate the student's test answers (8 letters A/B/C separated by commas) and return their CEFR level.",
    input_schema: {
      type: "object" as const,
      properties: {
        answers: {
          type: "string",
          description: "8 letters like 'A,B,C,A,B,C,A,B' or 'ABCABCAB'",
        },
      },
      required: ["answers"],
    },
  },
  {
    name: "send_to_web",
    description: "Send the student to the web app to start their actual voice classes. Use after they finished the test.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  lead: WhatsAppLead
): Promise<string> {
  switch (name) {
    case "start_test": {
      await updateLead(lead.phone, { status: "test_in_progress", chat_state: "test_pending" });
      return JSON.stringify({
        ok: true,
        instruction:
          "Test started. Show the 8 questions to the student. Tell them to reply with the 8 letters in order, like 'A,B,C,A,B,C,A,B'.",
        questions: testQuestionsText(),
      });
    }
    case "evaluate_test": {
      const answers = String(input.answers ?? "").toUpperCase().replace(/[^ABC]/g, "");
      if (answers.length < 8) {
        return JSON.stringify({
          ok: false,
          error: "Need 8 answers. Ask the user to send them in format A,B,C,A,B,C,A,B.",
        });
      }
      let correct = 0;
      const detail: Array<{ q: number; correct: boolean }> = [];
      for (let i = 0; i < 8; i++) {
        const ok = answers[i] === TEST_QUESTIONS[i].correct;
        if (ok) correct++;
        detail.push({ q: i + 1, correct: ok });
      }
      const level = calcLevel(correct);
      await updateLead(lead.phone, {
        status: "test_done",
        chat_state: "test_done",
        level_detected: level,
        test_results: { score: correct, total: 8, level, detail, raw_answers: answers },
      });
      return JSON.stringify({
        ok: true,
        score: correct,
        total: 8,
        level_detected: level,
        instruction: `Tell the student their score is ${correct}/8 and their level is ${level}. Then call send_to_web.`,
      });
    }
    case "send_to_web": {
      const link = `https://humaniapp.com/sofia-auth/signup?phone=${encodeURIComponent(lead.phone)}`;
      return JSON.stringify({
        ok: true,
        link,
        instruction:
          "Send a SHORT message congratulating them and inviting to web for voice classes (3 min free daily). Include the link at the end. Use the link verbatim.",
      });
    }
    default:
      return JSON.stringify({ error: "unknown tool" });
  }
}

/**
 * Process one incoming WhatsApp message and return the bot's reply text.
 */
export async function processWhatsAppMessage(
  phone: string,
  userMessage: string
): Promise<string> {
  const lead = await getOrCreateLead(phone);

  // If already converted, gentle redirect
  if (lead.status === "converted") {
    return `Hey mi amor 👋 Ya tienes tu cuenta. Las clases con voz están aquí:\n\nhttps://humaniapp.com/sofia-chat\n\nNos vemos! 💕`;
  }

  await appendMessage(phone, "user", userMessage);
  const history = lead.chat_messages.slice(-10).concat([
    { role: "user" as const, content: userMessage },
  ]);

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Add lead context as a system suffix
  const ctx = `Current lead state: status=${lead.status}, level_detected=${lead.level_detected ?? "none"}, phone=${phone}.`;
  const fullSystem = `${SYSTEM_PROMPT}\n\n${ctx}`;

  let response = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 600,
    system: fullSystem,
    tools: TOOLS,
    messages,
  });

  // Handle tool-use loop
  let safetyLimit = 4;
  while (response.stop_reason === "tool_use" && safetyLimit-- > 0) {
    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") break;
    const toolResult = await executeToolCall(
      toolBlock.name,
      toolBlock.input as Record<string, unknown>,
      lead
    );
    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: toolBlock.id, content: toolResult },
      ],
    });
    response = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: fullSystem,
      tools: TOOLS,
      messages,
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  const reply =
    textBlock && textBlock.type === "text"
      ? textBlock.text
      : "¿Me repites? No te entendí bien, mi amor.";

  await appendMessage(phone, "assistant", reply);
  return reply;
}
