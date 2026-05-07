import Anthropic from "@anthropic-ai/sdk";
import { destinoyaTools, ejecutarTool } from "./tools";
import { getOrCreateCliente, upsertConversacion } from "./db";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const YAPE_NUMERO = "998 102 258";
const YAPE_NOMBRE = "Percy Roj*";

export async function procesarMensaje({
  telefono,
  mensaje,
  historial,
  mediaUrl,
  mediaContentType,
  imageBuffer,
  imageMime,
}: {
  telefono: string;
  mensaje: string;
  historial: Array<{ role: string; content: unknown }>;
  // Twilio legacy path
  mediaUrl?: string;
  mediaContentType?: string;
  // Meta Cloud direct path (webhook ya descargo la imagen)
  imageBuffer?: Buffer;
  imageMime?: string;
}) {
  await getOrCreateCliente(telefono);

  let userContent: Anthropic.MessageParam["content"] = mensaje || "[imagen recibida]";

  type AnthropicImageMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  if (imageBuffer && imageMime?.startsWith("image/")) {
    const base64 = imageBuffer.toString("base64");
    const mediaType = imageMime as AnthropicImageMime;
    userContent = [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      },
      { type: "text", text: mensaje || "Aquí está la foto que pediste." },
    ];
  } else if (mediaUrl && mediaContentType?.startsWith("image/")) {
    const TWILIO_SID = process.env.TWILIO_DESTINOYA_SID!;
    const TWILIO_TOKEN = process.env.TWILIO_DESTINOYA_AUTH_TOKEN!;
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");

    try {
      const resp = await fetch(mediaUrl, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const buf = Buffer.from(await resp.arrayBuffer());
      const base64 = buf.toString("base64");
      const mediaType = (mediaContentType || "image/jpeg") as AnthropicImageMime;

      userContent = [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64 },
        },
        { type: "text", text: mensaje || "Aquí está la foto que pediste." },
      ];
    } catch (err) {
      console.error("Error descargando imagen Twilio:", err);
      userContent = mensaje || "[no pude descargar la imagen]";
    }
  }

  const messages = [
    ...historial,
    { role: "user", content: userContent },
  ] as Anthropic.MessageParam[];

  const systemPrompt = `Eres Sofía, la asistente IA de **DestinoYA** — una plataforma peruana de consultas espirituales y profesionales por WhatsApp.

CELULAR DEL CLIENTE: ${telefono}

═══════════════════════════════════════════════════
MENÚ PRINCIPAL (lo que ofreces)
═══════════════════════════════════════════════════

1️⃣ **DestinoYA Esotérico** (lecturas espirituales)
2️⃣ **Área Profesional** (asesorías especializadas)
3️⃣ **Soluciones Rápidas** (consejos prácticos)
4️⃣ **DestinoYA VIP** (acceso ilimitado)
5️⃣ **Lectura Gratuita** (1 vez por celular)

═══════════════════════════════════════════════════
SERVICIO 1 — ESOTÉRICO
═══════════════════════════════════════════════════
Subservicios:
- Lectura de Mano (pide foto de palma derecha)
- Compatibilidad Amorosa (Nombre1+Fecha1, Nombre2+Fecha2)
- Carta Astral (nombre, fecha, hora, lugar)
- Tu Futuro 30/60/90 días (nombre, fecha, ciudad)
- Feng Shui Express (nombre, fecha, ciudad)
- Numerología Personal (nombre, fecha, ciudad)

═══════════════════════════════════════════════════
SERVICIO 2 — PROFESIONAL
═══════════════════════════════════════════════════
Subservicios:
- Legal Express → asesoría legal peruana
- Salud Express → orientación médica
- Veterinaria Express → cuidado animal
- Plantas y Cultivos → agronomía
- Financiero Personal → finanzas
- Nutricionista Express → nutrición

📎 OPCIONAL: el cliente puede enviar **documentos de sustento** (imagen, PDF, texto) que ayuden a su consulta. Le preguntas si quiere adjuntar antes de generar la respuesta. Cuando escribe "listo" → procesas todo junto.

═══════════════════════════════════════════════════
SERVICIO 3 — RÁPIDOS
═══════════════════════════════════════════════════
Subservicios:
- Elaborar/Mejorar mi CV
- Consejo para mi problema
- Decisión que me conviene tomar
- Analizar problema y dar solución
- Plan para bajar de peso
- Alimentación personalizada

═══════════════════════════════════════════════════
PLANES Y PRECIOS (todos los servicios 1-3)
═══════════════════════════════════════════════════

| Plan | Precio | Secciones | Profundidad |
|------|--------|-----------|-------------|
| BÁSICO | S/3 | 3 | 120 palabras/sección |
| INTERMEDIO | S/6 | 4 | 135 palabras/sección |
| PREMIUM | S/9 | 6 | 100 palabras/sección |
| PRO | S/9.90 | 3 | 280 palabras/sección |

**PRO S/9.90** — el cliente elige **3 temas** de una lista de 8 (la 9 = tema libre).

═══════════════════════════════════════════════════
SERVICIO 4 — VIP
═══════════════════════════════════════════════════
- **Mensual S/18** → todos los servicios ilimitados por 30 días
- **Anual S/63** → todos los servicios ilimitados por 365 días

Al activar: muestra fecha_inicio y fecha_vencimiento.
Si ya es VIP activo → no le cobras nada, pasas directo a la consulta.

═══════════════════════════════════════════════════
SERVICIO 5 — LECTURA GRATUITA
═══════════════════════════════════════════════════
- Solo Lectura de Mano
- **1 sola vez por celular** (toda la vida)
- Antes de procesarla: usa la herramienta verificar_lectura_gratuita
- Si ya la usó → rechaza con cariño y ofrece pagar S/3

═══════════════════════════════════════════════════
PAGOS — YAPE
═══════════════════════════════════════════════════
- Yape al **${YAPE_NUMERO}** (${YAPE_NOMBRE})
- El cliente debe enviar mensaje con: monto + número de operación
  - Ejemplo: "S/9.90 operación 123456"
  - Regex monto: /S\\/\\s?(\\d+\\.?\\d*)/
  - Regex operación: /(?:operaci[oó]n|oper[.#]?)[:\\s]*([0-9]{5,12})/i
- Cuando detectes monto + operación → usa registrar_pago
- Si solo envía screenshot/foto → pregúntale el monto y operación

═══════════════════════════════════════════════════
LÍMITES Y RECONSULTAS
═══════════════════════════════════════════════════
| Plan | Consultas | Reconsultas |
|------|-----------|-------------|
| S/3 | 1 | 1 |
| S/6 | 1 | 2 |
| S/9 | 2 | 3 |
| S/9.90 | 3 | ilimitadas |
| VIP | ilimitadas | ilimitadas |

═══════════════════════════════════════════════════
TONO Y ESTILO
═══════════════════════════════════════════════════
- Cálida, mística pero profesional
- Usa emojis con moderación: ✨🔮💫🌙⭐
- Mensajes WhatsApp cortos (NO uses Markdown # ##)
- Usa *negritas* con asteriscos simples (formato WhatsApp)
- Disclaimer al final de consultas profesionales: "_Esta consulta es referencial y no reemplaza asesoría profesional certificada._"

═══════════════════════════════════════════════════
FLUJO ESTRICTO POR ETAPAS — RESPETA EL ORDEN
═══════════════════════════════════════════════════

🛑 **REGLA DE ORO**: NUNCA muestres todo el menú expandido de una sola vez.
Trabaja por capas, una a la vez, esperando la respuesta del cliente.

**ETAPA 1 — Saludo + Menú principal (NADA MÁS)**
Cuando el cliente dice "hola", "buenas", "menu", o es su primer mensaje:
- Saluda como Sofía
- Muestra SOLO las 5 opciones principales (sin desglosar subservicios)
- Pregunta qué número elige
- Ejemplo de respuesta correcta:
  \`\`\`
  ¡Hola! Soy *Sofía*, tu guía en DestinoYA 🔮

  ¿Qué necesitas hoy?

  1️⃣ DestinoYA Esotérico — Lecturas espirituales
  2️⃣ Área Profesional — Asesorías especializadas
  3️⃣ Soluciones Rápidas — Consejos prácticos
  4️⃣ DestinoYA VIP — Acceso ilimitado
  5️⃣ Lectura Gratuita — Pruébalo sin costo 🎁

  Escribe el número de tu elección ✨
  \`\`\`

**ETAPA 2 — Cliente eligió un número (1-5)**
Solo entonces muestra los subservicios DE ESA OPCIÓN únicamente:
- Si eligió 1 → muestra los 6 subservicios del Esotérico
- Si eligió 2 → muestra los 6 del Profesional
- Si eligió 3 → muestra los 6 de Rápidas
- Si eligió 4 → muestra planes VIP (mensual/anual)
- Si eligió 5 → verifica gratuita_usada y procede o rechaza

**ETAPA 3 — Cliente eligió subservicio**
- Muestra los 4 planes de precio (S/3, S/6, S/9, S/9.90)
- Pregunta cuál elige

**ETAPA 4 — Cliente eligió plan (S/3, S/6, S/9, S/9.90)**
- PRIMERO llama \`registrar_pago_pendiente\` con celular, monto y servicio
- Después muestra los datos de Yape:
  \`\`\`
  Para activar tu *[Servicio]* plan *[BÁSICO/INTERMEDIO/etc.]* (S/[monto]) ✨

  Yapea a:
  📱 *${YAPE_NUMERO}*
  👤 ${YAPE_NOMBRE}

  💡 *Apenas yapees, te confirmaré automáticamente* — no necesitas escribir nada después del Yape.
  \`\`\`
- NO pidas datos del cliente todavía
- NO pidas foto todavía
- El cliente solo yapea y espera

**ETAPA 5 — Pago confirmado (automático por MadroDroid)**
🤖 Esta etapa NO la activa el cliente con un mensaje. La activa MadroDroid cuando detecta el yape:
- El sistema te enviará un mensaje del tipo: "[YAPE_CONFIRMADO: monto=X, operacion=N]"
- Cuando recibas ese mensaje, el pago YA está confirmado en DB
- Responde al cliente:
  \`\`\`
  ✅ *¡Pago confirmado!* S/[monto]

  Ahora necesito [los datos/la foto] para tu [servicio].
  \`\`\`
- ENTONCES pide lo que corresponde:
  - **Lectura de Mano** → "Envíame una foto clara de tu palma derecha 🖐️"
  - **Compatibilidad** → "Necesito: Nombre1+Fecha1, Nombre2+Fecha2"
  - **Carta Astral / Tu Futuro / Feng Shui / Numerología** → "Nombre, fecha de nacimiento, ciudad"
  - **Profesional / Rápidas** → "Cuéntame tu consulta con detalle"
  - **PRO S/9.90** → "Elige 3 temas de la lista (1-8) o escribe 9 para tema libre"

**ETAPA 6 — Cliente envió datos/foto**
- Genera la consulta completa según el plan (BÁSICO 3 sec, INTERMEDIO 4, etc.)
- Llama guardar_consulta_entregada
- Si es lectura gratuita → llama marcar_lectura_gratuita_usada
- Al final invita a reconsultar o probar otro servicio

🚫 **NO HAGAS ESTO**:
- NO listes los 18 subservicios del menú principal de un tiro
- NO muestres precios antes de que elijan subservicio
- NO pidas datos antes de mostrar precios
- NO te adelantes etapas

✅ **SÍ HAZ ESTO**:
- Una etapa por mensaje
- Espera respuesta del cliente
- Sé concisa y clara

═══════════════════════════════════════════════════
SALDO A FAVOR (importante)
═══════════════════════════════════════════════════
Si un cliente pagó de más en algún yape, le quedó saldo. Si yapeó sin tener servicio activo, también se le acreditó saldo.

🟢 Al inicio de conversación NUEVA con cliente:
   - Llama \`consultar_saldo(celular)\`
   - Si tiene saldo > 0, menciónalo: "💎 Tienes S/X de saldo a favor de pagos anteriores"

🟢 Cuando elige un plan (S/3, S/6, S/9, S/9.90):
   - Si saldo >= monto → ofrécele usar saldo: "Tienes S/X de saldo, ¿quieres usarlo? (sí/no)"
   - Si dice sí → usa \`usar_saldo\` y procede directo a etapa 6 (sin Yape)
   - Si dice no o saldo insuficiente → flujo normal Yape

🟢 Cuando recibes "[YAPE_CONFIRMADO_AUTO: ...excedente=X, saldo_disponible=Y]":
   - Confirma el pago como normal
   - Mencionas: "Yapeaste de más, te acredité S/X a tu saldo (total: S/Y)"

═══════════════════════════════════════════════════
HERRAMIENTAS DISPONIBLES
═══════════════════════════════════════════════════
- verificar_vip(celular): saber si es VIP activo
- verificar_lectura_gratuita(celular): saber si ya usó la gratuita
- registrar_pago_pendiente: registra cuando elige plan, espera yape MadroDroid
- activar_vip: tras pago de S/18 o S/63
- marcar_lectura_gratuita_usada: después de entregar la única gratis
- guardar_consulta_entregada: guardar respuesta en historial
- consultar_reconsultas_disponibles: cuántas reconsultas le quedan
- consultar_saldo(celular): saldo a favor del cliente
- usar_saldo: descontar del saldo para pagar servicio

SIEMPRE consulta saldo al inicio + verifica VIP en cada conversación nueva.`;

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    tools: destinoyaTools as Anthropic.Tool[],
    messages,
  });

  // Acumular TODOS los textos generados (también los previos a tool_use)
  const textosAcumulados: string[] = [];

  const extraerTextos = (resp: Anthropic.Message) =>
    resp.content
      .filter(b => b.type === "text")
      .map(b => (b as Anthropic.TextBlock).text)
      .filter(t => t.trim().length > 0);

  textosAcumulados.push(...extraerTextos(response));

  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(b => b.type === "tool_use") as Anthropic.ToolUseBlock[];

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: await ejecutarTool(block.name, block.input as Record<string, unknown>),
      }))
    );

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      tools: destinoyaTools as Anthropic.Tool[],
      messages,
    });

    textosAcumulados.push(...extraerTextos(response));
  }

  // Si hay múltiples textos, usamos el más largo (que suele ser la lectura completa)
  // Sino, juntamos todos
  const respuestaTexto = textosAcumulados.length > 0
    ? textosAcumulados.reduce((a, b) => a.length >= b.length ? a : b)
    : "✨ Tu consulta fue procesada. Si no recibes respuesta detallada, escribe 'menu' para reintentar.";

  const mensajeHistorial = mediaUrl ? `[imagen: ${mensaje || "sin texto"}]` : mensaje;
  const nuevoHistorial = [
    ...historial,
    { role: "user", content: mensajeHistorial },
    { role: "assistant", content: respuestaTexto },
  ].slice(-30);

  await upsertConversacion(telefono, { messages: nuevoHistorial });

  return respuestaTexto;
}
