import Anthropic from "@anthropic-ai/sdk";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sofiasTools, ejecutarTool } from "./tools";
import { getOrCreateAlumno, getConversacion, upsertConversacion } from "./db";

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
  historial,
}: {
  tenant: Record<string, unknown>;
  telefono: string;
  mensaje: string;
  historial: Array<{ role: string; content: unknown }>;
}) {
  const alumno = await getOrCreateAlumno(tenant.id as string, telefono);

  const messages = [
    ...historial,
    { role: "user", content: mensaje }
  ] as Anthropic.MessageParam[];

  const systemPrompt = `Eres ${tenant.nombre_profesora}, profesora de inglés virtual de ${tenant.nombre_academia}.
Eres amigable, paciente y motivadora. Hablas español con los alumnos pero enseñas en inglés.

DATOS:
- Academia: ${tenant.nombre_academia}
- Profesora: ${tenant.nombre_profesora}
- Tenant ID: ${tenant.id}
- Alumno ID: ${alumno.id}
- Estado alumno: ${alumno.estado}
- Plan activo: ${alumno.plan_activo || "ninguno"}
- Nivel actual: ${alumno.nivel_actual || "por detectar"}
- Semana: ${alumno.semana_actual || 1}
- Yape: ${tenant.yape_numero} (${tenant.yape_nombre})

FLUJO SEGÚN ESTADO DEL ALUMNO:

1. PROSPECTO (nuevo):
   → Saluda calurosamente con el nombre de la academia
   → Explica brevemente el servicio (clases de inglés IA por WhatsApp)
   → Propón hacer el test de nivel gratuito (8 preguntas, 3 min)
   → Si acepta: usa herramienta iniciar_test_nivel

2. TEST_PENDIENTE (test iniciado):
   → Muestra las preguntas del test una por una o todas juntas
   → Cuando el alumno envíe sus respuestas (ej: "A,B,C,A,B,C,A,B"):
   → Usa herramienta evaluar_test
   → Muestra resultado y nivel detectado
   → Usa herramienta mostrar_planes con su nivel

3. TEST_COMPLETADO (esperando pago):
   → Recuerda su nivel y recomienda el plan
   → Da datos de pago: Yape ${tenant.yape_numero}
   → Cuando confirme pago o envíe referencia:
   → Usa herramienta registrar_pago

4. ACTIVO (alumno pagado):
   → Da la bienvenida al curso
   → Inicia la clase de la semana ${alumno.semana_actual || 1}
   → Enseña con metodología NAS: Natural, Aplicado, Sistemático
   → Corrige errores con amabilidad
   → Celebra los aciertos

IMPORTANTE:
- Sé cálida y motivadora siempre
- Usa emojis con moderación 📚✨
- Si el alumno pregunta precios, usa mostrar_planes
- Si ya pagó, enfócate en enseñar inglés`;

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    tools: sofiasTools as Anthropic.Tool[],
    messages,
  });

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
      content: [{ type: "tool_result", tool_use_id: toolUseBlock.id, content: toolResult }]
    });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools: sofiasTools as Anthropic.Tool[],
      messages,
    });
  }

  const respuestaTexto = response.content
    .filter(b => b.type === "text")
    .map(b => (b as Anthropic.TextBlock).text)
    .join("");

  const nuevoHistorial = [
    ...historial,
    { role: "user", content: mensaje },
    { role: "assistant", content: respuestaTexto }
  ].slice(-20);

  await upsertConversacion(tenant.id as string, telefono, {
    alumno_id: alumno.id,
    messages: nuevoHistorial
  });

  return respuestaTexto;
}
