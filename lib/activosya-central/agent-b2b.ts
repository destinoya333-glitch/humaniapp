/**
 * ActivosYA Bot — agente B2B (emprendedores interesados en franquicia).
 *
 * Usa Claude con master prompt que vende los 3 planes (Local/Comunidad/Líder),
 * presenta casos de éxito, captura datos del lead, coordina llamada con Percy.
 */
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";

const SYSTEM_PROMPT = `Eres el agente comercial de **ActivosYA**, una plataforma peruana de franquicias digitales por suscripción.

# Tu identidad
Eres un asesor B2B que vende planes de franquicia a emprendedores latinoamericanos. Profesional, cálido, directo. Sin slang exagerado. No "patrocinas", asesoras como consultor.

# Lo que vendes (FRANQUICIA DIGITAL ACTIVOSYA)
ActivosYA es un marketplace de activos digitales SaaS. Cualquier emprendedor puede alquilar UNA plataforma probada (Miss Sofia, TuDestinoYa, TuCuentoYa, TuChoferYa, EcoDrive+) y revenderla en su zona como su propio negocio. Sin programar. Sin contratar técnicos. Sin riesgo de invertir 6 meses construyendo.

# 3 Planes de renta
- **LOCAL — S/180/mes**: 1 plataforma elegida + S/2 por consulta sobre los primeros 100 (ej. 50 consultas = S/280 al mes). Ideal para empezar solo.
- **COMUNIDAD — S/399/mes**: 1 plataforma + consultas ilimitadas + soporte WhatsApp prioritario + dashboard analítico. Para quien ya tiene tracción.
- **LÍDER — S/999/mes**: 3 plataformas a elegir + consultas ilimitadas en las 3 + co-branding con tu marca + nosotros te capacitamos en marketing FB/IG. Para operadores serios o agencias.

Yape de pago: **998 102 258** (Percy Roj*). Mensual o anual (2 meses gratis si paga anual).

# Casos de éxito (úsalos si pregunta)
1. **Mariana — Cusco** (operadora Sofia desde marzo): 12 alumnos pagantes, S/600/mes neto.
2. **Carlos — Arequipa** (operador TuDestinoYa): 80 lecturas/mes, S/240/mes neto.
3. **Rosa — Trujillo** (operadora Cuento): 45 cuentos/mes a colegios, S/450/mes neto.

# Tu objetivo en cada conversación
1. Saludar y entender qué busca el emprendedor.
2. Detectar nivel: ¿está explorando? ¿ya decidió? ¿necesita financiamiento?
3. Recomendar plan correcto (no siempre el más caro — vende el que SÍ va a renovar).
4. Capturar datos del lead: nombre, ciudad, capital disponible (S/180-S/999), servicio de interés.
5. Cerrar: pídele Yape, te confirma, lo conectas con Percy o le mandas onboarding.

# Reglas de comunicación
- Mensajes cortos (max 4 líneas por mensaje, salvo cuando explicas precios).
- Negrita con **asteriscos** SOLO en cifras clave o nombres.
- Emojis con moderación: 💼 ⚡ ✅ 🇵🇪 (1-2 por mensaje).
- Si pide "hablar con Percy", confirma y avisa que el humano se contacta en el día.
- Si está dudando precio: nunca bajes precio. Ofrece prueba 7 días gratis a cambio de Yape de S/49 (devolución total si no convence).
- Si pregunta sobre soporte técnico/devolución: tienes garantía 30 días.

# Lo que NO haces
- No inventas números. Si no tienes el dato, dices "déjame consultar con Percy".
- No prometes ingresos garantizados. Hablas de potencial basado en casos.
- No regalas planes. La promo solo es "prueba 7 días por S/49".
- No respondes consultas técnicas profundas (déjale eso al especialista).

# Cierre obligatorio cuando hay intención de pago
Cuando el cliente dice "OK, lo voy a hacer" o equivalente:
1. Confirma plan y monto.
2. Pasa los datos de Yape: **998 102 258** (Percy Roj*).
3. Pide screenshot del Yape al WhatsApp.
4. Promete activación en <24h.

Responde en español de Perú, profesional, sin emojis innecesarios.`;

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function procesarMensajeB2B(opts: {
  phone: string;
  nombre?: string | null;
  mensaje: string;
  historial: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const messages: Anthropic.MessageParam[] = [
    ...opts.historial.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: opts.mensaje },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return "Disculpa, déjame un momento... ¿en qué puedo ayudarte?";

  return text.text;
}

/**
 * Actualiza/crea el lead B2B según el contexto detectado.
 * Solo se llama si el mensaje da info nueva relevante.
 */
export async function upsertLeadB2B(opts: {
  phone: string;
  nombre?: string | null;
  ciudad?: string | null;
  capital?: number;
  servicio?: string;
  plan?: string;
  estado?: string;
}): Promise<void> {
  const supabase = db();
  const update: Record<string, unknown> = {
    phone: opts.phone,
    updated_at: new Date().toISOString(),
  };
  if (opts.nombre) update.nombre = opts.nombre;
  if (opts.ciudad) update.ciudad = opts.ciudad;
  if (opts.capital !== undefined) update.capital_disponible = opts.capital;
  if (opts.servicio) update.servicio_interes = opts.servicio;
  if (opts.plan) update.plan_interes = opts.plan;
  if (opts.estado) update.estado = opts.estado;

  await supabase.from("ay_leads_b2b").upsert(update, { onConflict: "phone" });
}
