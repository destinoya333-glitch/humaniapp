/**
 * Claude client — calls Anthropic API with master prompt.
 */
import Anthropic from "@anthropic-ai/sdk";
import { MISS_SOFIA_MASTER_PROMPT } from "../master-prompt";

const CLAUDE_MODEL = (process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6").trim();

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

export type ConversationMessage = { role: "user" | "assistant"; content: string };

export async function callMissSofia(messages: ConversationMessage[]): Promise<string> {
  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 600,
    system: MISS_SOFIA_MASTER_PROMPT,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return "";
  return text.text;
}

/**
 * Generate Shadow Coach report from a transcript.
 * Returns parsed JSON if found in <session_report> tags.
 */
export async function generateShadowCoachReport(
  transcript: ConversationMessage[]
): Promise<Record<string, unknown> | null> {
  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1200,
    system:
      "You are analyzing a conversation transcript. Output ONLY a JSON object inside <session_report> tags following the exact format from the Miss Sofia spec. No other text.",
    messages: [
      {
        role: "user",
        content: `Analyze this conversation and generate the session_report JSON:\n${JSON.stringify(
          transcript
        )}`,
      },
    ],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  const m = text.text.match(/<session_report>([\s\S]*?)<\/session_report>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim());
  } catch {
    return null;
  }
}

/**
 * Extract <exam_result> from Sofia's last message (Saturday only).
 */
export function extractExamResult(text: string): Record<string, unknown> | null {
  const m = text.match(/<exam_result>([\s\S]*?)<\/exam_result>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim());
  } catch {
    return null;
  }
}
