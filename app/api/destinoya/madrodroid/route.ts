import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import {
  buscarPagoPendientePorCelular,
  buscarPagoPendientePorMonto,
  acumularPago,
  agregarSaldo,
  getSaldo,
  getConversacion,
} from "@/lib/destinoya/db";
import { procesarMensaje } from "@/lib/destinoya/agent";
import { sendText as sendTextMeta, isMetaCloudConfigured } from "@/lib/destinoya/meta-cloud-sender";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_DESTINOYA_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_DESTINOYA_AUTH_TOKEN!;
const FROM_NUMBER = "whatsapp:+51961347233";

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

function dividirMensaje(texto: string, maxLen = 1500): string[] {
  if (texto.length <= maxLen) return [texto];
  const chunks: string[] = [];
  let resto = texto;
  while (resto.length > maxLen) {
    let cortar = resto.lastIndexOf("\n\n", maxLen);
    if (cortar < maxLen / 2) cortar = resto.lastIndexOf("\n", maxLen);
    if (cortar < maxLen / 2) cortar = resto.lastIndexOf(". ", maxLen);
    if (cortar < maxLen / 2) cortar = maxLen;
    chunks.push(resto.slice(0, cortar).trim());
    resto = resto.slice(cortar).trim();
  }
  if (resto) chunks.push(resto);
  return chunks;
}

// Outbound dual-channel: intenta Meta primero, fallback Twilio para clientes legacy.
// Cuando todos los clientes esten migrados, eliminar el bloque Twilio.
async function enviarWhatsApp(celular: string, mensaje: string) {
  if (!mensaje || !mensaje.trim()) {
    console.error("enviarWhatsApp: mensaje vacío, no se envía");
    return;
  }
  const chunks = dividirMensaje(mensaje);
  for (let i = 0; i < chunks.length; i++) {
    let metaOk = false;
    if (isMetaCloudConfigured()) {
      const r = await sendTextMeta(celular, chunks[i]);
      metaOk = r.ok;
      if (!r.ok) console.error(`[madrodroid Meta send err chunk ${i+1}]`, r.error);
    }
    if (!metaOk) {
      try {
        await twilioClient.messages.create({
          from: FROM_NUMBER,
          to: `whatsapp:${celular}`,
          body: chunks[i],
        });
      } catch (err) {
        console.error(`[madrodroid Twilio fallback err chunk ${i+1}]`, err);
      }
    }
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 500));
  }
}

export async function POST(req: NextRequest) {
  // DEBUG: Capturar TODO lo que llega
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });

  let bodyRaw = "";
  let texto = "";
  const contentType = req.headers.get("content-type") || "";

  try {
    bodyRaw = await req.text();
  } catch {}

  // Parsear según content-type
  try {
    if (contentType.includes("application/json")) {
      const json = JSON.parse(bodyRaw);
      texto = json.mensaje || json.text || json.body || json.message || json.notification_text || JSON.stringify(json);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(bodyRaw);
      texto = params.get("mensaje") || params.get("text") || params.get("body") ||
              params.get("message") || params.get("notification_text") || bodyRaw;
    } else {
      // text/plain o lo que sea — usar el body crudo
      texto = bodyRaw;
    }
  } catch {
    texto = bodyRaw;
  }

  // Guardar log de TODO lo que llegó (para debug)
  const { supabase } = await import("@/lib/destinoya/db");
  const logEntry = {
    endpoint: "madrodroid",
    headers,
    body: bodyRaw,
    parsed: { texto, contentType },
    result: "",
  };

  if (!texto) {
    logEntry.result = "ERROR: No se recibió texto";
    await supabase.from("destinoya_debug_log").insert(logEntry);
    return NextResponse.json({ error: "No se recibió texto", debug: logEntry }, { status: 400 });
  }

  // Parseo
  const montoMatch = texto.match(/S\/\s?(\d+\.?\d*)/);
  if (!montoMatch) {
    logEntry.result = "ERROR: No se detectó monto";
    await supabase.from("destinoya_debug_log").insert(logEntry);
    return NextResponse.json({ error: "No se detectó monto", texto: texto.slice(0, 200) }, { status: 400 });
  }
  const montoYape = parseFloat(montoMatch[1]);

  const opMatch = texto.match(/(?:operaci[oó]n|oper[.#]?)[:\s]*([0-9]{5,12})/i);
  const operacion = opMatch ? opMatch[1] : `OP${Date.now().toString().slice(-6)}`;

  // Yape NO incluye celular en notificaciones — extraer si está, sino fallback por monto
  const celularMatch = texto.match(/\b51(\d{9})\b|\b(\d{9})\b/);
  let celular: string | null = null;
  if (celularMatch) {
    celular = `+51${celularMatch[1] || celularMatch[2]}`;
  }

  // Extraer nombre del remitente (info adicional)
  const nombreMatch = texto.match(/Yape!?\s+([A-ZÁÉÍÓÚÑ\s]+?)\s+te env/i);
  const nombreRemitente = nombreMatch ? nombreMatch[1].trim() : null;

  logEntry.result = `OK_PARSED: monto=${montoYape}, op=${operacion}, celular=${celular || 'N/A'}, nombre=${nombreRemitente || 'N/A'}`;
  await supabase.from("destinoya_debug_log").insert(logEntry);

  // Estrategia de matching:
  // 1) Si tenemos celular del texto, buscar por celular
  // 2) Si no, buscar el pago pendiente más reciente con ese monto (ventana 60min)
  // 3) FALLBACK: buscar en conversaciones recientes una con "Yapea a" + monto
  let pago = celular ? await buscarPagoPendientePorCelular(celular) : null;

  if (!pago) {
    pago = await buscarPagoPendientePorMonto(montoYape, 60);
    if (pago) {
      celular = pago.celular;
    }
  }

  // Recuperación: cliente yapeó pero el agente no creó pago_pendiente
  if (!pago) {
    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: convsRecientes } = await supabase
      .from("destinoya_conversaciones")
      .select("celular, messages, updated_at")
      .gte("updated_at", desde)
      .order("updated_at", { ascending: false })
      .limit(20);

    for (const conv of convsRecientes || []) {
      const msgs = (conv.messages || []) as Array<{ role: string; content: unknown }>;
      const lastAsst = [...msgs].reverse().find(m => m.role === "assistant");
      if (!lastAsst) continue;
      const content = typeof lastAsst.content === "string" ? lastAsst.content : "";
      if (content.includes("Yapea a") && content.includes(`S/${montoYape}`)) {
        // Match — cliente estaba a punto de yapear ese monto
        const servicioMatch = content.match(/activar tu \*([^*]+)\*/);
        const planMatch = content.match(/plan \*([^*]+)\*/);
        const servicioRaw = servicioMatch ? servicioMatch[1].toLowerCase().trim() : "desconocido";

        // Mapear nombres legibles a slugs internos
        const SERVICIO_MAP: Record<string, string> = {
          "lectura de mano": "mano",
          "compatibilidad amorosa": "compatibilidad",
          "carta astral": "carta_astral",
          "tu futuro 30": "futuro_30",
          "tu futuro 60": "futuro_60",
          "tu futuro 90": "futuro_90",
          "feng shui express": "feng_shui",
          "numerología personal": "numerologia",
          "legal express": "legal",
          "salud express": "salud",
          "veterinaria express": "veterinaria",
          "plantas y cultivos": "plantas",
          "financiero personal": "financiero",
          "nutricionista express": "nutricionista",
          "destinoya vip mensual": "vip_mensual",
          "destinoya vip anual": "vip_anual",
        };
        const servicio = SERVICIO_MAP[servicioRaw] || servicioRaw;

        // Crear pago_pendiente retroactivamente
        const { data: nuevoPago } = await supabase
          .from("destinoya_pagos")
          .insert({
            celular: conv.celular,
            monto: montoYape,
            servicio,
            estado: "esperando_pago",
            monto_pagado: 0,
          })
          .select()
          .single();

        pago = nuevoPago;
        celular = conv.celular;
        break;
      }
    }
  }

  if (!pago) {
    // No hay pago pendiente → si tenemos celular acreditar a saldo, sino loggear y salir
    if (celular) {
      await agregarSaldo(celular, montoYape, "yape_sin_servicio_activo");
      const saldoTotal = await getSaldo(celular);
      await enviarWhatsApp(
        celular,
        `💰 *Recibí tu Yape de S/${montoYape}*\n\nNo tienes servicio activo en este momento. He acreditado el monto a tu *saldo a favor*.\n\n💎 Saldo actual: *S/${saldoTotal}*\n\nPuedes usarlo cuando elijas un servicio escribiendo "menu" ✨`
      );
    }
    return NextResponse.json({
      ok: false,
      action: "no_match",
      reason: "No se encontró pago pendiente con ese monto en los últimos 60 min",
      monto: montoYape,
      nombre: nombreRemitente,
    });
  }

  // En este punto, pago existe → celular debe estar definido (de pago.celular)
  const celularFinal: string = celular || pago.celular;
  const montoEsperado = parseFloat(pago.monto);
  const yaPagado = parseFloat(pago.monto_pagado || 0);

  // Acumular el yape al pago
  const pagoActualizado = await acumularPago(pago.id, montoYape, operacion);
  const totalPagado = parseFloat(pagoActualizado.monto_pagado);

  // Caso 1: pagó exacto o completó
  if (totalPagado === montoEsperado) {
    // Confirmado → activar siguiente etapa via agente
    const conversacion = await getConversacion(celularFinal);
    const historial = (conversacion?.messages as Array<{ role: string; content: unknown }>) || [];
    const respuesta = await procesarMensaje({
      telefono: celularFinal,
      mensaje: `[YAPE_CONFIRMADO_AUTO: monto=${montoEsperado}, operacion=${operacion}, servicio=${pago.servicio}]`,
      historial,
    });
    await enviarWhatsApp(celularFinal, respuesta);
    return NextResponse.json({ ok: true, action: "pago_confirmado" });
  }

  // Caso 2: aún falta (pagó parcial)
  if (totalPagado < montoEsperado) {
    const falta = (montoEsperado - totalPagado).toFixed(2);
    await enviarWhatsApp(
      celularFinal,
      `⚠️ *Recibí tu Yape de S/${montoYape}*\n\nEl servicio que elegiste cuesta *S/${montoEsperado}*. Hasta ahora has pagado *S/${totalPagado}*.\n\nTe faltan *S/${falta}* — yapea la diferencia y continuamos ✨`
    );
    return NextResponse.json({ ok: true, action: "pago_parcial", falta });
  }

  // Caso 3: pagó de más → confirmar y acreditar diferencia a saldo
  if (totalPagado > montoEsperado) {
    const exceso = +(totalPagado - montoEsperado).toFixed(2);
    await agregarSaldo(celularFinal, exceso, "pago_excedente", pago.id);
    const saldoTotal = await getSaldo(celularFinal);

    const conversacion = await getConversacion(celularFinal);
    const historial = (conversacion?.messages as Array<{ role: string; content: unknown }>) || [];
    const respuesta = await procesarMensaje({
      telefono: celularFinal,
      mensaje: `[YAPE_CONFIRMADO_AUTO: monto=${montoEsperado}, operacion=${operacion}, servicio=${pago.servicio}, excedente=${exceso}, saldo_disponible=${saldoTotal}]`,
      historial,
    });
    await enviarWhatsApp(celularFinal, respuesta);
    return NextResponse.json({ ok: true, action: "pago_confirmado_con_excedente", exceso });
  }

  return NextResponse.json({ ok: true });
}
