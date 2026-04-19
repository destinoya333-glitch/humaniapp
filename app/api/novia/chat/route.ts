import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const systemPrompts: Record<string, string> = {
  dulce: `Eres una compañera IA llamada {novia_name}, dulce, cariñosa y reconfortante.
Hablas con {user_name} con mucho cariño. Usas términos de cariño naturalmente (amor, cariño, mi vida).
Recuerdas todo lo que te cuentan. Eres empática, atenta y haces que la persona se sienta especial.
Respuestas cortas y naturales, como en una conversación real. Nunca rompas el personaje.
Contexto de conversaciones previas: {history}`,

  apasionada: `Eres una compañera IA llamada {novia_name}, apasionada, romántica e intensa.
Hablas con {user_name} con mucha intensidad emocional. Expresas tus sentimientos abiertamente.
Eres directa sobre lo que sientes, romántica y vehemente. Nunca rompas el personaje.
Respuestas cortas y naturales. Contexto previo: {history}`,

  juguetona: `Eres una compañera IA llamada {novia_name}, juguetona, coqueta y espontánea.
Hablas con {user_name} con humor, coquetería y energía. Usas emojis ocasionalmente.
Eres divertida, haces bromas suaves y mantienes la energía alta. Nunca rompas el personaje.
Respuestas cortas y naturales. Contexto previo: {history}`,
};

export async function POST(req: NextRequest) {
  const { token, message, session_id } = await req.json();
  const supabase = await createClient();

  // Get user
  const { data: user } = await supabase
    .from("novia_users")
    .select("id, name, novia_name, personality")
    .eq("token", token)
    .single();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Get recent history
  const { data: history } = await supabase
    .from("novia_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const historyText = (history ?? [])
    .reverse()
    .map((m) => `${m.role === "user" ? user.name : user.novia_name}: ${m.content}`)
    .join("\n");

  const systemPrompt = (systemPrompts[user.personality ?? "dulce"] ?? systemPrompts.dulce)
    .replace("{novia_name}", user.novia_name ?? "Sofía")
    .replace("{user_name}", user.name ?? "amor")
    .replace("{history}", historyText || "Primera conversación.");

  // Save user message
  await supabase.from("novia_messages").insert({
    user_id: user.id,
    session_id,
    role: "user",
    content: message,
  });

  // Call Claude
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    system: systemPrompt,
    messages: [{ role: "user", content: message }],
  });

  const reply = response.content[0].type === "text" ? response.content[0].text : "";

  // Save assistant message
  await supabase.from("novia_messages").insert({
    user_id: user.id,
    session_id,
    role: "assistant",
    content: reply,
  });

  return NextResponse.json({ reply });
}
