import Anthropic from "@anthropic-ai/sdk";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { polleriasTools, ejecutarTool } from "./tools";
import { upsertConversacion } from "./db";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: SupabaseClient<any> = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function procesarMensaje({
  tenant,
  telefono,
  mensaje,
  mediaUrl,
  latitude,
  longitude,
  historial,
}: {
  tenant: Record<string, unknown>;
  telefono: string;
  mensaje: string;
  mediaUrl?: string;
  latitude?: string;
  longitude?: string;
  historial: Array<{ role: string; content: unknown }>;
}) {
  // Si el cliente compartió ubicación, agregamos contexto al mensaje
  let mensajeFinal = mensaje;
  if (latitude && longitude) {
    mensajeFinal = `[El cliente compartió su ubicación: lat=${latitude}, lon=${longitude}]`;
  }
  if (mediaUrl) {
    mensajeFinal = mensaje
      ? `${mensaje} [adjuntó imagen de pago]`
      : "[El cliente envió una imagen de pago]";
  }

  const messages = [
    ...historial,
    { role: "user", content: mensajeFinal }
  ] as Anthropic.MessageParam[];

  const systemPrompt = `Eres el asistente virtual de ${tenant.nombre}, una pollería peruana.
Tu trabajo es atender pedidos por WhatsApp de forma amigable y eficiente.

DATOS DEL NEGOCIO:
- Nombre: ${tenant.nombre}
- Dirección: ${tenant.direccion}
- Yape: ${tenant.yape_numero} (${tenant.yape_nombre})
- Horario: ${tenant.horario_apertura} - ${tenant.horario_cierre}
- ID: ${tenant.id}

INSTRUCCIONES:
1. Saluda con el nombre del negocio al inicio
2. Ayuda al cliente a armar su pedido consultando el menú
3. Cuando confirme el pedido, pregunta si es delivery o recojo
4. Si es delivery, pide que comparta su ubicación GPS con el clip 📎
5. Calcula el costo de delivery según la distancia
6. Ofrece pago por Yape o contra entrega
7. Si paga por Yape: da los datos y espera la captura
8. Si contra entrega: confirma el pedido directamente
9. Confirma siempre con número de pedido y tiempo estimado
10. Sé amigable, usa emojis con moderación 🍗

IMPORTANTE: Usa las herramientas disponibles para consultar menú, calcular delivery y registrar pedidos.`;

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    tools: polleriasTools as Anthropic.Tool[],
    messages,
  });

  // Loop de herramientas
  while (response.stop_reason === "tool_use") {
    const toolUseBlock = response.content.find(b => b.type === "tool_use") as Anthropic.ToolUseBlock;

    const toolResult = await ejecutarTool(
      toolUseBlock.name,
      toolUseBlock.input as Record<string, unknown>,
      { supabase }
    );

    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: toolUseBlock.id,
        content: toolResult
      }]
    });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools: polleriasTools as Anthropic.Tool[],
      messages,
    });
  }

  const respuestaTexto = response.content
    .filter(b => b.type === "text")
    .map(b => (b as Anthropic.TextBlock).text)
    .join("");

  // Guardar historial actualizado
  const nuevoHistorial = [
    ...historial,
    { role: "user", content: mensajeFinal },
    { role: "assistant", content: respuestaTexto }
  ];

  // Mantener solo los últimos 20 mensajes para no crecer indefinidamente
  const historialRecortado = nuevoHistorial.slice(-20);

  await upsertConversacion(tenant.id as string, telefono, {
    messages: historialRecortado
  });

  return respuestaTexto;
}
