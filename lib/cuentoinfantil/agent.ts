/**
 * TuCuentoYa — Agente conversacional.
 *
 * Máquina de estados explícita (no Claude tool-use) porque el flujo es lineal
 * y predecible. Claude se usa para:
 *  - Interpretar texto/audio libre del cliente (extracción semántica)
 *  - Generar el cuento final (lib/cuentoinfantil/generator.ts)
 *
 * Estados:
 *   inicio → recolectando_hijo → recolectando_escenario →
 *   recolectando_duracion → confirmando_pedido → esperando_pago →
 *   generando → entregado
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  getOrCreateCliente,
  getConversacion,
  upsertConversacion,
  resetConversacion,
  getVIPActivo,
  crearPedido,
  type EstadoConv,
} from "./db";
import { CHAT_SYSTEM_PROMPT } from "./prompts";
import { resumenWallet, intentarCobrar, PRECIO_CUENTO, reclamarPromoPrimerCuentoGratis } from "./wallet";
import { generarCuento, normalizarDuracion } from "./generator";
import type { OperadorContexto } from "@/lib/activosya/operadores";
import type { ContextoCuento } from "./prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ════════════════════════════════════════════════════════════
// EXTRACTOR SEMÁNTICO — Claude interpreta el mensaje del cliente
// ════════════════════════════════════════════════════════════
type ExtraccionMensaje = {
  intent:
    | "saludo"
    | "dar_nombre_hijo"
    | "dar_rol_propio"
    | "dar_escenario"
    | "elegir_duracion"
    | "confirmar"
    | "cancelar"
    | "ver_precios"
    | "ver_vip"
    | "recargar"
    | "ayuda"
    | "otro";
  nombre_hijo?: string;
  edad_hijo?: number;
  genero_hijo?: "m" | "f";
  rol_pidiente?: "papa" | "mama" | "abuelo" | "abuela" | "tio" | "otro";
  escenario_descripcion?: string;
  duracion?: 2 | 3 | 5;
  texto_libre?: string;
};

const EXTRACTOR_PROMPT = `Eres un extractor semántico para TuCuentoYa. El cliente envía un mensaje y tú debes interpretar la intención y extraer datos estructurados.

Devuelve JSON estricto:
{
  "intent": "saludo|dar_nombre_hijo|dar_rol_propio|dar_escenario|elegir_duracion|confirmar|cancelar|ver_precios|ver_vip|recargar|ayuda|otro",
  "nombre_hijo": "Mateo",
  "edad_hijo": 5,
  "genero_hijo": "m",
  "rol_pidiente": "papa",
  "escenario_descripcion": "Bosque con lobo que quiere comer al hijo, el papá lo salva",
  "duracion": 3,
  "texto_libre": "transcribe literal lo que el cliente dijo si no encaja en intent"
}

Solo incluye los campos que el cliente mencionó. NO inventes datos.`;

async function extraerMensaje(
  texto: string,
  estado: EstadoConv,
): Promise<ExtraccionMensaje> {
  try {
    const r = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: EXTRACTOR_PROMPT,
      messages: [
        { role: "user", content: `Estado actual: ${estado}\n\nMensaje del cliente: "${texto}"` },
      ],
    });
    const tb = r.content.find((c) => c.type === "text");
    const raw = tb && "text" in tb ? tb.text : "{}";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return { intent: "otro", texto_libre: texto };
    return JSON.parse(m[0]) as ExtraccionMensaje;
  } catch {
    return { intent: "otro", texto_libre: texto };
  }
}

// ════════════════════════════════════════════════════════════
// PROCESAR MENSAJE PRINCIPAL
// ════════════════════════════════════════════════════════════
export type ResultadoProcesar = {
  reply?: string;
  reply_chunks?: string[];
  audio_pedido_id?: string;
  imagen_url?: string;
};

export async function procesarMensaje(opts: {
  telefono: string;
  mensaje: string;
  operador?: OperadorContexto | null;
  imageBuffer?: Buffer;
  imageMime?: string;
}): Promise<ResultadoProcesar> {
  const { telefono, mensaje, operador } = opts;

  const cliente = await getOrCreateCliente(telefono, operador?.tenant_id);
  let conv = await getConversacion(telefono);

  if (!conv) {
    await upsertConversacion(telefono, { estado: "inicio", contexto: {} });
    conv = { celular: telefono, estado: "inicio", contexto: {}, ultimo_mensaje_at: "", updated_at: "" };
  }

  const ctx = (conv.contexto ?? {}) as Record<string, unknown>;
  const estado: EstadoConv = (conv.estado as EstadoConv) ?? "inicio";

  // Comandos universales
  const lower = mensaje.toLowerCase().trim();
  if (/^(menu|menú|inicio|empezar|cancelar|reset)$/i.test(lower)) {
    await resetConversacion(telefono);
    return { reply: replyBienvenida(cliente.nombre ?? cliente.nombre_papa) };
  }

  if (/^(precios|tarifas|cuánto|cuanto cuesta)$/i.test(lower)) {
    return { reply: replyPrecios() };
  }

  if (/^(vip|premium|suscripci)/i.test(lower)) {
    return { reply: replyVIP() };
  }

  if (/^(recarga|recargar|wallet|saldo)$/i.test(lower)) {
    const w = await resumenWallet(telefono);
    return { reply: replyRecarga(w.balance, w.bonus) };
  }

  // Extrae intent + datos del mensaje
  const extr = await extraerMensaje(mensaje, estado);

  // ─── ESTADO: inicio ─────────────────────────────────────────────
  if (estado === "inicio") {
    if (extr.intent === "ver_precios") return { reply: replyPrecios() };
    if (extr.intent === "ver_vip") return { reply: replyVIP() };

    // Si ya viene con todo en un solo mensaje, intentar avanzar
    if (extr.nombre_hijo) {
      ctx.hijo = {
        nombre: extr.nombre_hijo,
        edad: extr.edad_hijo,
        genero: extr.genero_hijo,
      };
      if (extr.rol_pidiente) ctx.rol_pidiente = extr.rol_pidiente;
      if (extr.escenario_descripcion) ctx.escenario = extr.escenario_descripcion;
      if (extr.duracion) ctx.duracion = extr.duracion;

      await upsertConversacion(telefono, { contexto: ctx });

      if (!ctx.escenario) {
        await upsertConversacion(telefono, { estado: "recolectando_escenario" });
        return {
          reply: `¡Genial! Un cuento para *${extr.nombre_hijo}* 🦊\n\n¿Dónde quieres que ocurra la historia? Cuéntame el escenario o trama (ej: "un bosque con un lobo y su papá lo salva", "una nave espacial", "una sirena en el mar"). Puedes mandarme texto o audio.`,
        };
      }
      if (!ctx.duracion) {
        await upsertConversacion(telefono, { estado: "recolectando_duracion" });
        return { reply: replyElegirDuracion() };
      }
      return await confirmarPedido(telefono, ctx);
    }

    await upsertConversacion(telefono, { estado: "recolectando_hijo" });
    return { reply: replyBienvenida(cliente.nombre ?? cliente.nombre_papa) };
  }

  // ─── ESTADO: recolectando_hijo ──────────────────────────────────
  if (estado === "recolectando_hijo") {
    if (!extr.nombre_hijo) {
      return {
        reply: `¿Cómo se llama tu peque? 🦊 Y si quieres, dime también su edad y si es niño o niña.`,
      };
    }
    ctx.hijo = {
      nombre: extr.nombre_hijo,
      edad: extr.edad_hijo,
      genero: extr.genero_hijo,
    };
    if (extr.rol_pidiente) ctx.rol_pidiente = extr.rol_pidiente;
    await upsertConversacion(telefono, {
      contexto: ctx,
      estado: "recolectando_escenario",
    });
    return {
      reply: `Anotado: *${extr.nombre_hijo}*${extr.edad_hijo ? ` (${extr.edad_hijo} años)` : ""} 🦊\n\nAhora cuéntame: ¿dónde se desarrolla el cuento? ¿Quiénes salen además de ${extr.nombre_hijo}? (papá, mamá, abuela, mascota...).\n\nEjemplo: _"En un bosque, llega un lobo y yo (su papá) llego a salvarlo"_`,
    };
  }

  // ─── ESTADO: recolectando_escenario ─────────────────────────────
  if (estado === "recolectando_escenario") {
    const escenario =
      extr.escenario_descripcion ||
      (extr.intent === "dar_escenario" ? extr.texto_libre : "") ||
      mensaje;

    if (!escenario || escenario.length < 10) {
      return {
        reply: `Necesito un poco más de detalle. Cuéntame: ¿dónde ocurre? ¿qué pasa? ¿quién es el villano (si hay)? ¿quién más sale en el cuento?`,
      };
    }

    ctx.escenario = escenario;
    if (extr.rol_pidiente && !ctx.rol_pidiente) ctx.rol_pidiente = extr.rol_pidiente;

    await upsertConversacion(telefono, {
      contexto: ctx,
      estado: "recolectando_duracion",
    });
    return { reply: replyElegirDuracion() };
  }

  // ─── ESTADO: recolectando_duracion ──────────────────────────────
  if (estado === "recolectando_duracion") {
    const dur = extr.duracion ?? normalizarDuracion(mensaje);
    if (!dur) {
      return { reply: replyElegirDuracion() };
    }
    ctx.duracion = dur;
    await upsertConversacion(telefono, { contexto: ctx, estado: "confirmando_pedido" });
    return await confirmarPedido(telefono, ctx);
  }

  // ─── ESTADO: confirmando_pedido ─────────────────────────────────
  if (estado === "confirmando_pedido") {
    if (extr.intent === "confirmar" || /^(si|sí|ya|vamos|dale|listo|confirmo|ok)$/i.test(lower)) {
      return await intentarCobrarYGenerar(telefono, ctx);
    }
    if (extr.intent === "cancelar" || /^(no|cancela|cancelar)$/i.test(lower)) {
      await resetConversacion(telefono);
      return { reply: `Cancelado. Cuando quieras otro cuento, escríbeme *menú* 🦊` };
    }
    return await confirmarPedido(telefono, ctx);
  }

  // ─── ESTADO: esperando_pago ─────────────────────────────────────
  if (estado === "esperando_pago") {
    return {
      reply:
        `Estoy esperando tu Yape de S/${ctx.monto_esperado ?? "?"} a *998 102 258*. ` +
        `Cuando lo detectemos, genero tu cuento automáticamente 🦊\n\n` +
        `Si ya pagaste, envíame la captura.`,
    };
  }

  if (estado === "generando") {
    return {
      reply: `🦊 Tu cuento se está generando, dame unos 60 segundos más... ✨`,
    };
  }

  // Fallback
  return { reply: replyBienvenida(cliente.nombre ?? cliente.nombre_papa) };
}

// ════════════════════════════════════════════════════════════
// HELPERS DE FLUJO
// ════════════════════════════════════════════════════════════
async function confirmarPedido(
  telefono: string,
  ctx: Record<string, unknown>,
): Promise<ResultadoProcesar> {
  const hijo = ctx.hijo as { nombre: string; edad?: number; genero?: string } | undefined;
  const escenario = ctx.escenario as string | undefined;
  const duracion = ctx.duracion as 2 | 3 | 5 | undefined;

  if (!hijo || !escenario || !duracion) {
    await upsertConversacion(telefono, { estado: "recolectando_hijo" });
    return { reply: `Me faltan datos. Vamos de nuevo: ¿cómo se llama tu peque?` };
  }

  const precio = PRECIO_CUENTO[duracion];

  await upsertConversacion(telefono, { estado: "confirmando_pedido" });
  return {
    reply:
      `🦊 *Confirmemos el cuento*\n\n` +
      `Protagonista: *${hijo.nombre}*${hijo.edad ? ` (${hijo.edad} años)` : ""}\n` +
      `Escenario: ${escenario.slice(0, 200)}\n` +
      `Duración: *${duracion} minutos*\n` +
      `Precio: *S/${precio}*\n\n` +
      `Responde *SÍ* para generar tu cuento, o *NO* para cancelar.`,
  };
}

async function intentarCobrarYGenerar(
  telefono: string,
  ctx: Record<string, unknown>,
): Promise<ResultadoProcesar> {
  const hijo = ctx.hijo as { nombre: string; edad?: number; genero?: "m" | "f" };
  const escenario = ctx.escenario as string;
  const duracion = ctx.duracion as 2 | 3 | 5;
  const rol = (ctx.rol_pidiente as string) ?? "papa";

  // 1. ¿VIP activo?
  const vip = await getVIPActivo(telefono);
  let fuente_pago: "wallet" | "bonus" | "vip_estrella" | "vip_magico" | "gratis" | "yape_directo" =
    "yape_directo";

  if (vip?.activo && (vip.cuentos_disponibles ?? 0) > 0) {
    fuente_pago = vip.plan?.startsWith("magico") ? "vip_magico" : "vip_estrella";
  } else {
    // 2. ¿Promo primer cuento gratis (solo 2 min)?
    if (duracion === 2 && process.env.TCI_PROMO_PRIMER_CUENTO_GRATIS === "true") {
      const promo = await reclamarPromoPrimerCuentoGratis(telefono);
      if (promo.otorgado) fuente_pago = "gratis";
    }

    // 3. Si aún no resuelto, intentar wallet
    if (fuente_pago === "yape_directo") {
      const cobro = await intentarCobrar({ celular: telefono, duracion });
      if (cobro.ok) {
        fuente_pago = cobro.fuente === "bonus" ? "bonus" : "wallet";
      }
    }

    // 4. Si NADA alcanza → pedir Yape directo
    if (fuente_pago === "yape_directo") {
      const precio = PRECIO_CUENTO[duracion];
      ctx.monto_esperado = precio;
      await upsertConversacion(telefono, {
        contexto: ctx,
        estado: "esperando_pago",
      });
      return {
        reply:
          `🦊 No tienes saldo suficiente.\n\n` +
          `Yapea *S/${precio}* a *998 102 258* (Percy Roj*) y envíame la captura.\n\n` +
          `O recarga tu wallet con bonus 🎁 (escribe *recarga*).`,
      };
    }
  }

  // Crear pedido
  const cliente = await getOrCreateCliente(telefono);
  const pedido = await crearPedido({
    cliente_id: cliente.id,
    celular: telefono,
    duracion_min: duracion,
    escenario,
    personajes: [
      { nombre: hijo.nombre, rol_en_cuento: "protagonista" },
      { nombre: rol, rol_en_cuento: rol },
    ],
    prompt_input: escenario,
    monto: PRECIO_CUENTO[duracion],
    fuente_pago,
  });

  await upsertConversacion(telefono, {
    estado: "generando",
    contexto: { ...ctx, pedido_id: pedido.id },
  });

  // Disparar generación en background (el caller maneja el envío del audio)
  return {
    audio_pedido_id: pedido.id,
    reply: `🦊 ¡Perfecto! Estoy creando el cuento de *${hijo.nombre}*... Dame ~60 segundos ✨`,
  };
}

// ════════════════════════════════════════════════════════════
// REPLIES PRECANNED
// ════════════════════════════════════════════════════════════
function replyBienvenida(nombreCliente?: string | null): string {
  return (
    `¡Hola${nombreCliente ? `, ${nombreCliente}` : ""}! 🦊 Soy *Coqui*, tu narrador de cuentos personalizados.\n\n` +
    `Te creo un cuento donde tu hijo(a) es el HÉROE 💫\n\n` +
    `Para empezar, cuéntame: *¿cómo se llama tu peque?* (y su edad si quieres).`
  );
}

function replyPrecios(): string {
  return (
    `📋 *Precios TuCuentoYa*\n\n` +
    `*Cuentos sueltos:*\n` +
    `🌙 2 min — S/2\n` +
    `🦊 3 min — S/3 ⭐ (más popular)\n` +
    `🐉 5 min — S/5\n\n` +
    `*Wallet recargable (con bonus):*\n` +
    `Chica S/15 → 6 cuentos\n` +
    `Media S/30 → 12 cuentos\n` +
    `Grande S/50 → 21 cuentos\n` +
    `Mágica S/100 → 45 cuentos\n\n` +
    `*VIP mensual (ahorro hasta 80%):*\n` +
    `🌟 Estrella S/18/mes → 20 cuentos\n` +
    `🪄 Mágico S/30/mes → 50 cuentos + música personalizada\n\n` +
    `Yape: *998 102 258* (Percy Roj*)\n` +
    `Promo: *primer cuento de 2 min GRATIS* 🎁`
  );
}

function replyVIP(): string {
  return (
    `🌟 *VIP TuCuentoYa*\n\n` +
    `*VIP Estrella — S/18/mes*\n` +
    `✓ 20 cuentos al mes (cualquier duración)\n` +
    `✓ Equivale a S/60 sueltos (ahorras 70%)\n` +
    `✓ Voces peruanas Camila + Alex\n` +
    `✓ Entrega prioritaria <60s\n\n` +
    `*VIP Mágico — S/30/mes*\n` +
    `✓ 50 cuentos al mes\n` +
    `✓ Música de fondo personalizada\n` +
    `✓ Hermanito gratis (2do niño protagonista)\n\n` +
    `*Anual* (2 meses gratis):\n` +
    `Estrella S/180 · Mágico S/300\n\n` +
    `Para activar, yapea a *998 102 258* y envíame la captura.`
  );
}

function replyRecarga(balance: number, bonus: number): string {
  return (
    `💰 *Tu Wallet*\n\n` +
    `Saldo: *S/${balance.toFixed(2)}*\n` +
    `Cuentos bonus: *${bonus}*\n\n` +
    `*Recargar (Yape a 998 102 258):*\n` +
    `S/15 → 5 cuentos + 1 bonus = 6 cuentos\n` +
    `S/30 → 10 + 2 bonus = 12 cuentos\n` +
    `S/50 → 16 + 5 bonus = 21 cuentos\n` +
    `S/100 → 33 + 12 bonus = 45 cuentos\n\n` +
    `Envíame la captura después de yapear.`
  );
}

function replyElegirDuracion(): string {
  return (
    `🦊 *¿De cuánto quieres el cuento?*\n\n` +
    `*2* — Cuento Dormir (2 min) — S/2\n` +
    `*3* — Cuento Aventura (3 min) — S/3 ⭐\n` +
    `*5* — Cuento Saga (5 min) — S/5\n\n` +
    `Responde *2*, *3* o *5*.`
  );
}

// re-export para uso desde el webhook
export { generarCuento };
