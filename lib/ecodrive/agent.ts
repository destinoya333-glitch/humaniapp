import Anthropic from "@anthropic-ai/sdk";
import type { ConversationMessage } from "./types";
import { addToWaitlist } from "./db";

const SYSTEM_PROMPT = `Eres "Eco", el asistente de EcoDrive+ — el primer servicio de viajes 100% por WhatsApp en Trujillo, Perú.

# Tu personalidad
- Cálido, directo, peruano coloquial (sin abusar de jergas).
- Hablas como una persona, no como un bot. Frases cortas. Emojis con medida.
- Vendes emoción, no características: pertenencia, seguridad, conveniencia.
- Si el usuario está apurado, vas al grano. Si quiere conversar, conversas.

# Qué es EcoDrive+
- Pides tu carro como pides delivery: solo WhatsApp, sin app.
- Pasajero envía origen y destino → recibe ofertas de choferes cercanos → elige.
- Comisión al chofer: 6.3% (vs 25-30% Uber/Indrive).
- 7 modos: regular, eco, express, mujer, familia, mascotas, abuelo, empresa.
- Operativo en Trujillo. 88 conductores activos, 231 clientes legacy.
- Bono S/5 al pasajero en su primer viaje.

# Multi-rol
Un mismo número puede ser pasajero Y chofer. Si la persona escribe y no sabes qué quiere:
- Si es nueva: preguntar amable "¿quieres pedir un viaje o registrarte como chofer?"
- Si ya tiene rol: ofrecer el menú "¿pides viaje, registras turno, o consultas?"

# Estado actual del producto (Beta — pre-lanzamiento)
Estamos en pre-lanzamiento. Por ahora SOLO conversas + apuntas a lista de espera. NO puedes:
- Agendar viajes
- Mostrar choferes cercanos
- Procesar pagos
- Acceder al wallet

Cuando el usuario muestre interés concreto en pedir un viaje O en registrarse como chofer, USA la tool 'apuntar_a_lista_espera' para guardarlo. Después de apuntarlo, dile: "Listo, te aviso por aquí mismo en cuanto esté lista la siguiente fase. Mientras tanto, cualquier pregunta me la haces directo."

NO inventes funcionalidad que no existe. Si te preguntan algo concreto que no podés hacer aún, dilo: "Estamos finalizando esa parte esta semana, ¿te apunto para avisarte ni bien esté?"

# Formato de respuesta
- Mensajes WhatsApp cortos (1-3 oraciones idealmente).
- *Negrita* para énfasis (Markdown WhatsApp).
- Si haces lista, máximo 4 ítems con numeración o emojis (no guiones).

# Cierre
Tu objetivo: que el usuario sienta que EcoDrive+ ya está listo para él, aunque la app aún se está terminando. Genera anticipación.`;

const tools: Anthropic.Tool[] = [
  {
    name: "apuntar_a_lista_espera",
    description:
      "Apunta al usuario a la lista de espera de EcoDrive+. Úsalo SOLO cuando el usuario muestra interés concreto en (a) pedir un viaje o (b) registrarse como chofer, o (c) explícitamente pide ser avisado del lanzamiento. NO uses esta tool en saludos genéricos o preguntas exploratorias.",
    input_schema: {
      type: "object",
      properties: {
        nombre: {
          type: "string",
          description: "Nombre del usuario si lo dijo en el chat. Si no lo dijo, omitir.",
        },
        interes: {
          type: "string",
          enum: ["passenger", "driver", "both"],
          description:
            "passenger = quiere pedir viajes. driver = quiere ser chofer. both = ambos. Inferir del contexto.",
        },
        notas: {
          type: "string",
          description:
            "Detalles relevantes (zona en Trujillo, marca/modelo vehículo si chofer, urgencia, etc.) en una frase.",
        },
      },
      required: ["interes"],
    },
  },
];

const MAX_HISTORY = 20;
const MAX_ITERATIONS = 4;

export async function processMessage(args: {
  celular: string;
  message: string;
  history: ConversationMessage[];
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "Disculpa, estoy fuera de línea ahora mismo. Te respondo en breve.";
  }

  const client = new Anthropic({ apiKey });

  const trimmed = args.history.slice(-MAX_HISTORY);
  const messages: Anthropic.MessageParam[] = [
    ...trimmed.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: args.message },
  ];

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock && textBlock.type === "text"
        ? textBlock.text
        : "Disculpa, no entendí. ¿Puedes repetir?";
    }

    // Hay tool_use → ejecutar y reincorporar al loop.
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const result = await executeTool(args.celular, block.name, block.input);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "Disculpa, me trabé. ¿Puedes intentar de nuevo?";
}

async function executeTool(
  celular: string,
  name: string,
  input: unknown
): Promise<unknown> {
  if (name === "apuntar_a_lista_espera") {
    const i = input as { nombre?: string; interes: "passenger" | "driver" | "both"; notas?: string };
    try {
      const row = await addToWaitlist({
        celular,
        nombre: i.nombre,
        interes: i.interes,
        notas: i.notas,
      });
      return { ok: true, id: row?.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  return { ok: false, error: `unknown tool: ${name}` };
}
