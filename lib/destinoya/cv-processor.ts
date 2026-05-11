/**
 * Procesador de CV — extrae texto de Word/PDF + mejora con Claude.
 */
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import type { CVData } from "./cv-generator";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function extractTextFromDocument(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword") ||
    mimeType.includes("docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  // Para PDFs usamos Claude vision (más confiable que pdf-parse para PDFs escaneados/complejos)
  if (mimeType.includes("pdf")) {
    const base64 = buffer.toString("base64");
    const r = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            { type: "text", text: "Extrae todo el texto del CV en este PDF, manteniendo la estructura. Solo el texto, sin comentarios." },
          ],
        },
      ],
    });
    const textBlock = r.content.find((b) => b.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text : "";
  }
  // Plano
  return buffer.toString("utf-8");
}

const PROMPT_MEJORAR_CV = `Eres un experto en CVs profesionales latinoamericanos. Recibirás un CV crudo y debes:

1. Identificar y mejorar redacción (verbos de acción, logros cuantificados)
2. Reorganizar para óptima presentación profesional
3. Añadir un resumen profesional si falta
4. Detectar y corregir errores ortográficos/gramaticales

Devuelve SOLO un JSON válido con esta estructura exacta:
{
  "nombre_completo": "string",
  "email": "string opcional",
  "telefono": "string opcional",
  "ciudad": "string opcional",
  "resumen_profesional": "string 3-4 líneas — siempre incluir",
  "experiencia": [
    {"empresa": "string", "cargo": "string", "fechas": "MM/AAAA - MM/AAAA o presente", "descripcion": "string con bullets separados por • con logros cuantificados"}
  ],
  "educacion": [
    {"institucion": "string", "grado": "string", "fechas": "AAAA - AAAA"}
  ],
  "habilidades": ["array de skills"],
  "idiomas": ["array de idiomas con nivel: 'Inglés intermedio'"]
}

NO añadas markdown, NO añadas comentarios, SOLO el JSON.`;

const PROMPT_NUEVO_CV = `Eres un experto en CVs profesionales. El cliente te dará información en texto libre (puede ser bullets, párrafos, o respuestas a preguntas). Estructura un CV profesional completo en formato JSON con la misma estructura.

Si falta información:
- Si falta resumen → genera uno basado en lo que tengas (3-4 líneas)
- Si falta sección → omítela del JSON

Estructura JSON requerida (igual que el otro prompt):
{
  "nombre_completo": "string",
  "email": "string opcional",
  "telefono": "string opcional",
  "ciudad": "string opcional",
  "resumen_profesional": "string 3-4 líneas",
  "experiencia": [{"empresa","cargo","fechas","descripcion"}],
  "educacion": [{"institucion","grado","fechas"}],
  "habilidades": [],
  "idiomas": []
}

SOLO el JSON.`;

export async function mejorarCVConClaude(
  cvText: string,
  modo: "mejorar" | "nuevo" = "mejorar",
): Promise<CVData> {
  const systemPrompt = modo === "mejorar" ? PROMPT_MEJORAR_CV : PROMPT_NUEVO_CV;
  const r = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      { role: "user", content: cvText },
    ],
  });
  const block = r.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text : "{}";
  // Extract JSON (a veces Claude envuelve en ```json...```)
  let jsonStr = text.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) jsonStr = fence[1].trim();
  // Encontrar primer { y último }
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start >= 0 && end > start) jsonStr = jsonStr.slice(start, end + 1);
  let parsed: CVData;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Claude CV JSON:", text.slice(0, 500));
    throw new Error(`Claude no devolvió JSON válido: ${(e as Error).message}`);
  }
  // Defaults
  parsed.experiencia = parsed.experiencia || [];
  parsed.educacion = parsed.educacion || [];
  return parsed;
}
