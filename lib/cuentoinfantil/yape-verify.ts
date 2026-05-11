/**
 * TuCuentoYa — Verificación de pago Yape.
 *
 * Reusa el patrón de TuDestinoYa: el cliente envía captura del Yape por
 * WhatsApp, Claude Vision extrae monto + referencia + fecha. Si el monto
 * matchea (con margen de S/0.50 para overpay), se acredita la recarga / VIP.
 *
 * Para captura de pantalla local: usamos el mismo módulo de claude-vision
 * de wa-flows-platform (ya integrado).
 */
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "./db";
import { acreditarRecarga, type PackRecarga, PACK_PRECIOS } from "./wallet";
import { activarVIP, type PlanVIP, PRECIO_VIP } from "./db";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const YAPE_NUMERO = (process.env.TCI_YAPE_NUMERO ?? "998 102 258").trim();
const YAPE_NOMBRE = (process.env.TCI_YAPE_NOMBRE ?? "Percy Roj*").trim();

export type ResultadoYape = {
  detectado: boolean;
  monto?: number;
  referencia?: string;
  fecha?: string;
  destinatario_ok?: boolean;
  motivo_rechazo?: string;
};

const VISION_PROMPT = `Eres un verificador de pagos Yape (Perú). Analiza la captura de pantalla y extrae:

1. ¿Es una captura de Yape válida? (no foto random)
2. Monto pagado (en soles, número)
3. Destinatario / nombre del receptor
4. Número de operación / referencia
5. Fecha y hora del pago

DESTINATARIO ESPERADO: ${YAPE_NOMBRE} (o variantes: "Percy R*", "Percy Roj*", "Percy Rojas")
NÚMERO ESPERADO: ${YAPE_NUMERO}

Responde EN JSON:
{
  "es_yape_valido": true/false,
  "monto": 18,
  "destinatario": "Percy R*",
  "destinatario_ok": true,
  "referencia": "12345678",
  "fecha": "2026-05-11 14:30",
  "motivo_rechazo": null
}

Si NO es captura Yape o destinatario incorrecto, marca es_yape_valido=false con motivo.`;

export async function verificarCapturaYape(
  imageBuffer: Buffer,
  imageMime: string,
): Promise<ResultadoYape> {
  try {
    const r = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMime as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: imageBuffer.toString("base64"),
              },
            },
            { type: "text", text: VISION_PROMPT },
          ],
        },
      ],
    });

    const textBlock = r.content.find((c) => c.type === "text");
    const txt = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const match = txt.match(/\{[\s\S]*\}/);
    if (!match) return { detectado: false, motivo_rechazo: "No pude extraer JSON" };

    const parsed = JSON.parse(match[0]) as {
      es_yape_valido: boolean;
      monto?: number;
      destinatario?: string;
      destinatario_ok?: boolean;
      referencia?: string;
      fecha?: string;
      motivo_rechazo?: string;
    };

    if (!parsed.es_yape_valido) {
      return {
        detectado: false,
        motivo_rechazo: parsed.motivo_rechazo ?? "Captura no válida",
      };
    }

    return {
      detectado: true,
      monto: parsed.monto,
      referencia: parsed.referencia,
      fecha: parsed.fecha,
      destinatario_ok: parsed.destinatario_ok ?? false,
    };
  } catch (e) {
    return { detectado: false, motivo_rechazo: (e as Error).message };
  }
}

/**
 * Identifica qué concepto matchea el monto pagado (recarga X, VIP Y, cuento Z).
 */
export function identificarConcepto(monto: number): {
  tipo: "recarga" | "vip" | "cuento_suelto" | "desconocido";
  pack?: PackRecarga;
  plan_vip?: PlanVIP;
  duracion?: 2 | 3 | 5;
  monto_esperado?: number;
} {
  // Tolerancia ±S/0.50 (cliente puede pagar de más o tipo de cambio Yape)
  const tol = 0.5;

  // Recargas
  for (const [pack, cfg] of Object.entries(PACK_PRECIOS) as Array<
    [PackRecarga, (typeof PACK_PRECIOS)[PackRecarga]]
  >) {
    if (Math.abs(monto - cfg.precio) <= tol) {
      return { tipo: "recarga", pack, monto_esperado: cfg.precio };
    }
  }

  // VIPs
  for (const [plan, precio] of Object.entries(PRECIO_VIP) as Array<[PlanVIP, number]>) {
    if (Math.abs(monto - precio) <= tol) {
      return { tipo: "vip", plan_vip: plan, monto_esperado: precio };
    }
  }

  // Cuentos sueltos
  if (Math.abs(monto - 2) <= tol) return { tipo: "cuento_suelto", duracion: 2, monto_esperado: 2 };
  if (Math.abs(monto - 3) <= tol) return { tipo: "cuento_suelto", duracion: 3, monto_esperado: 3 };
  if (Math.abs(monto - 5) <= tol) return { tipo: "cuento_suelto", duracion: 5, monto_esperado: 5 };

  return { tipo: "desconocido" };
}

/**
 * Aplica el pago según el concepto identificado.
 */
export async function aplicarPago(opts: {
  celular: string;
  monto: number;
  referencia?: string;
  captura_url?: string;
}): Promise<{
  ok: boolean;
  mensaje: string;
  tipo?: string;
}> {
  const concepto = identificarConcepto(opts.monto);

  // Registrar el pago primero (siempre)
  await supabase.from("tci_yape_pagos").insert({
    celular: opts.celular,
    concepto:
      concepto.tipo === "recarga"
        ? `recarga_${concepto.pack}`
        : concepto.tipo === "vip"
        ? concepto.plan_vip
        : concepto.tipo === "cuento_suelto"
        ? `suelto_${concepto.duracion}min`
        : "desconocido",
    monto_esperado: concepto.monto_esperado ?? opts.monto,
    monto_pagado: opts.monto,
    referencia: opts.referencia ?? null,
    captura_url: opts.captura_url ?? null,
    validado_por: "claude_vision",
    validado: concepto.tipo !== "desconocido",
  });

  if (concepto.tipo === "recarga" && concepto.pack) {
    const res = await acreditarRecarga({
      celular: opts.celular,
      pack: concepto.pack,
      yape_ref: opts.referencia,
      captura_url: opts.captura_url,
    });
    return {
      ok: true,
      mensaje:
        `✅ Recarga *${concepto.pack}* acreditada (S/${PACK_PRECIOS[concepto.pack].precio}).\n` +
        `Saldo: *S/${res.nuevo_balance}* + ${res.bonus_acreditado} cuentos bonus 🎁`,
      tipo: "recarga",
    };
  }

  if (concepto.tipo === "vip" && concepto.plan_vip) {
    await activarVIP({
      celular: opts.celular,
      plan: concepto.plan_vip,
      monto_pagado: opts.monto,
      yape_ref: opts.referencia,
    });
    const label = concepto.plan_vip.replace(/_/g, " ").toUpperCase();
    return {
      ok: true,
      mensaje: `🌟 *${label}* activado. ¡Disfruta tus cuentos!`,
      tipo: "vip",
    };
  }

  if (concepto.tipo === "cuento_suelto") {
    return {
      ok: true,
      mensaje: `✅ Pago recibido (S/${opts.monto}). Tu cuento se está generando 🦊`,
      tipo: "cuento_suelto",
    };
  }

  return {
    ok: false,
    mensaje:
      `Recibí tu Yape de *S/${opts.monto}* pero no coincide con ningún plan. ` +
      `Por favor, revisa el monto o escríbenos para asistencia.`,
    tipo: "desconocido",
  };
}
