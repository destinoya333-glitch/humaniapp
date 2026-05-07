/**
 * Wrapper minimalista para llamar Claude Vision sobre una imagen.
 * Pensado para extraer datos estructurados de documentos peruanos
 * (DNI, licencia, SOAT, placas de carro).
 */

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

export type VisionExtraction = Record<string, string | number | boolean | null>;

export async function extractFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string,
  maxTokens = 800
): Promise<VisionExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const base64 = imageBuffer.toString("base64");
  const allowedMime = mimeType.toLowerCase().startsWith("image/")
    ? mimeType
    : "image/jpeg";

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: allowedMime, data: base64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });
  const json = (await resp.json()) as {
    content?: Array<{ type: string; text?: string }>;
    error?: unknown;
  };
  if (!resp.ok) {
    throw new Error(`Claude API error: ${JSON.stringify(json.error)}`);
  }
  const textBlock = json.content?.find((c) => c.type === "text");
  const text = textBlock?.text || "";

  // Esperamos JSON. Limpiamos posible code-fence ```json ... ```
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as VisionExtraction;
  } catch {
    return { _raw: text };
  }
}

const PROMPT_DNI =
  `Eres OCR de DNI peruano. Devuelve SOLO JSON con esta forma exacta sin markdown:\n` +
  `{"es_dni":true|false,"nombre_completo":"NOMBRES APELLIDOS","dni":"12345678","fecha_nacimiento":"YYYY-MM-DD","edad":30}\n` +
  `Si no es DNI peruano valido, es_dni=false y demas campos null. La fecha del DNI puede estar en formato DD/MM/YYYY.`;

const PROMPT_LICENCIA =
  `Eres OCR de licencia de conducir peruana. Devuelve SOLO JSON sin markdown:\n` +
  `{"es_licencia":true|false,"numero_licencia":"X12345678","categoria":"A-IIb","nombre":"NOMBRE","fecha_vencimiento":"YYYY-MM-DD"}\n` +
  `Si no es licencia valida, es_licencia=false.`;

const PROMPT_SELFIE =
  `¿Es una selfie / retrato claro de una persona viva (no foto de foto)? ` +
  `Responde SOLO JSON sin markdown: {"es_persona":true|false,"nitida":true|false,"genero_aparente":"M|F|desconocido"}`;

const PROMPT_CARRO =
  `Eres analista de fotos de vehiculos para una app de taxi en Peru. Devuelve SOLO JSON sin markdown:\n` +
  `{"es_vehiculo":true|false,"placa":"ABC-123","marca":"Toyota","modelo":"Yaris","color":"Blanco","anio_aproximado":"2018"}\n` +
  `Si no es un carro o no ves la placa: es_vehiculo=false.`;

const PROMPT_SOAT =
  `Eres OCR de poliza SOAT peruana (Seguro Obligatorio Accidentes de Transito). JSON sin markdown:\n` +
  `{"es_soat":true|false,"placa":"ABC-123","aseguradora":"Rimac","fecha_vencimiento":"YYYY-MM-DD"}\n` +
  `Si no es poliza SOAT valida: es_soat=false.`;

export const VISION_PROMPTS = {
  dni: PROMPT_DNI,
  licencia: PROMPT_LICENCIA,
  selfie: PROMPT_SELFIE,
  carro: PROMPT_CARRO,
  soat: PROMPT_SOAT,
} as const;
