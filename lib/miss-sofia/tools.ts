import { actualizarAlumno, crearTest, guardarResultadoTest, registrarPago } from "./db";

// Preguntas del test de nivel
const TEST_PREGUNTAS = [
  { id: 1, nivel: "A1", pregunta: "How do you say 'Hello' in English?", opciones: ["A) Hello", "B) Goodbye", "C) Thank you"], correcta: "A" },
  { id: 2, nivel: "A1", pregunta: "Complete: 'My name ___ John'", opciones: ["A) are", "B) is", "C) am"], correcta: "B" },
  { id: 3, nivel: "A2", pregunta: "What is the past tense of 'go'?", opciones: ["A) goed", "B) gone", "C) went"], correcta: "C" },
  { id: 4, nivel: "A2", pregunta: "Choose the correct: 'She ___ to school every day'", opciones: ["A) go", "B) goes", "C) going"], correcta: "B" },
  { id: 5, nivel: "B1", pregunta: "Which sentence is correct?", opciones: ["A) I have been here since 3 hours", "B) I have been here for 3 hours", "C) I am here since 3 hours"], correcta: "B" },
  { id: 6, nivel: "B1", pregunta: "Complete: 'If it rains, I ___ stay home'", opciones: ["A) will", "B) would", "C) shall"], correcta: "A" },
  { id: 7, nivel: "B2", pregunta: "Choose the best word: 'The presentation was ___ despite technical issues'", opciones: ["A) successful", "B) success", "C) succeed"], correcta: "A" },
  { id: 8, nivel: "B2", pregunta: "Identify the passive voice: ", opciones: ["A) She wrote the report", "B) The report was written by her", "C) She has written the report"], correcta: "B" },
];

function calcularNivel(puntaje: number): string {
  if (puntaje <= 2) return "A1";
  if (puntaje <= 4) return "A2";
  if (puntaje <= 6) return "B1";
  return "B2";
}

export const sofiasTools = [
  {
    name: "iniciar_test_nivel",
    description: "Inicia el test de nivel para el alumno. Devuelve las preguntas del test.",
    input_schema: {
      type: "object",
      properties: {
        tenant_id: { type: "string" },
        alumno_id: { type: "string" }
      },
      required: ["tenant_id", "alumno_id"]
    }
  },
  {
    name: "evaluar_test",
    description: "Evalúa las respuestas del test y determina el nivel del alumno",
    input_schema: {
      type: "object",
      properties: {
        test_id: { type: "string" },
        alumno_id: { type: "string" },
        respuestas: {
          type: "array",
          description: "Array de respuestas: ['A','C','B',...]",
          items: { type: "string" }
        }
      },
      required: ["test_id", "alumno_id", "respuestas"]
    }
  },
  {
    name: "mostrar_planes",
    description: "Muestra los planes disponibles según el nivel detectado del alumno",
    input_schema: {
      type: "object",
      properties: {
        tenant_id: { type: "string" },
        nivel: { type: "string", description: "Nivel detectado: A1, A2, B1, B2" }
      },
      required: ["tenant_id", "nivel"]
    }
  },
  {
    name: "registrar_pago",
    description: "Registra el pago del alumno y activa su plan",
    input_schema: {
      type: "object",
      properties: {
        tenant_id: { type: "string" },
        alumno_id: { type: "string" },
        plan: { type: "string", enum: ["basico", "intermedio", "avanzado", "completo"] },
        metodo: { type: "string", enum: ["yape", "culqi", "stripe"] },
        referencia: { type: "string" }
      },
      required: ["tenant_id", "alumno_id", "plan", "metodo"]
    }
  },
  {
    name: "consultar_progreso",
    description: "Consulta el progreso actual del alumno: semana, nivel, plan activo",
    input_schema: {
      type: "object",
      properties: {
        alumno_id: { type: "string" }
      },
      required: ["alumno_id"]
    }
  }
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ejecutarTool(toolName: string, toolInput: Record<string, unknown>, context: { supabase: any }): Promise<string> {
  const { supabase } = context;

  switch (toolName) {
    case "iniciar_test_nivel": {
      const test = await crearTest(toolInput.tenant_id as string, toolInput.alumno_id as string);
      await actualizarAlumno(toolInput.alumno_id as string, { estado: "test_pendiente" });

      const preguntasTexto = TEST_PREGUNTAS.map((p, i) =>
        `${i + 1}. ${p.pregunta}\n   ${p.opciones.join(" | ")}`
      ).join("\n\n");

      return JSON.stringify({
        test_id: test.id,
        total_preguntas: TEST_PREGUNTAS.length,
        instruccion: "El alumno debe responder con las letras: A, B o C para cada pregunta",
        preguntas: preguntasTexto
      });
    }

    case "evaluar_test": {
      const respuestas = toolInput.respuestas as string[];
      let correctas = 0;
      const detalle = TEST_PREGUNTAS.map((p, i) => {
        const correcto = respuestas[i]?.toUpperCase() === p.correcta;
        if (correcto) correctas++;
        return { pregunta: i + 1, correcto };
      });

      const nivel = calcularNivel(correctas);
      await guardarResultadoTest(toolInput.test_id as string, correctas, nivel, detalle);
      await actualizarAlumno(toolInput.alumno_id as string, {
        nivel_detectado: nivel,
        nivel_actual: nivel,
        estado: "test_completado"
      });

      return JSON.stringify({ puntaje: correctas, total: 8, nivel_detectado: nivel });
    }

    case "mostrar_planes": {
      const { data: tenant } = await supabase
        .from("sofia_tenants")
        .select("nombre_profesora, precio_basico, precio_intermedio, precio_avanzado, precio_completo, yape_numero, yape_nombre")
        .eq("id", toolInput.tenant_id)
        .single();

      const nivel = toolInput.nivel as string;
      let planesRecomendados = "";

      if (nivel === "A1" || nivel === "A2") {
        planesRecomendados = `⭐ RECOMENDADO PARA TI (Nivel ${nivel}):
📚 Plan Básico A1→A2: $${tenant.precio_basico} pago único (4 meses)

También disponibles:
📗 Plan Intermedio B1→B2: $${tenant.precio_intermedio} (5 meses)
📘 Plan Avanzado C1→C2: $${tenant.precio_avanzado} (6 meses)
🎓 Plan Completo 15 meses: $${tenant.precio_completo}`;
      } else if (nivel === "B1" || nivel === "B2") {
        planesRecomendados = `⭐ RECOMENDADO PARA TI (Nivel ${nivel}):
📗 Plan Intermedio B1→B2: $${tenant.precio_intermedio} pago único (5 meses)

También disponibles:
📘 Plan Avanzado C1→C2: $${tenant.precio_avanzado} (6 meses)
🎓 Plan Completo 15 meses: $${tenant.precio_completo}`;
      }

      return JSON.stringify({
        planes: planesRecomendados,
        yape: `${tenant.yape_numero} (${tenant.yape_nombre})`,
        profesora: tenant.nombre_profesora
      });
    }

    case "registrar_pago": {
      const montos: Record<string, number> = { basico: 45, intermedio: 75, avanzado: 140, completo: 220 };
      const monto = montos[toolInput.plan as string] || 0;

      await registrarPago({
        tenant_id: toolInput.tenant_id,
        alumno_id: toolInput.alumno_id,
        plan: toolInput.plan,
        monto_usd: monto,
        metodo: toolInput.metodo,
        referencia: toolInput.referencia,
        estado: "confirmado"
      });

      await actualizarAlumno(toolInput.alumno_id as string, {
        plan_activo: toolInput.plan,
        estado: "activo",
        semana_actual: 1
      });

      return JSON.stringify({ ok: true, plan: toolInput.plan, monto_usd: monto });
    }

    case "consultar_progreso": {
      const { data } = await supabase
        .from("sofia_alumnos")
        .select("nombre, nivel_actual, plan_activo, semana_actual, estado")
        .eq("id", toolInput.alumno_id)
        .single();
      return JSON.stringify(data);
    }

    default:
      return JSON.stringify({ error: `Herramienta desconocida: ${toolName}` });
  }
}
