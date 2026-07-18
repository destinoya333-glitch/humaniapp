import { NextRequest, NextResponse } from "next/server";
import {
  buscarPagoPendientePorCelular,
  buscarPagoPendientePorMonto,
  acumularPago,
  agregarSaldo,
  getSaldo,
  getConversacion,
  activarVIP,
} from "@/lib/destinoya/db";
import { procesarMensaje } from "@/lib/destinoya/agent";
import { sendText as sendTextMeta } from "@/lib/destinoya/meta-cloud-sender";
import { sendDestinoFlow, type DestinoFlowKey } from "@/lib/destinoya/flow-sender";

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

// Notif admin Percy (+51 998 102 258) cuando hay actividad de pago relevante.
// Envia desde canal TuDestinoYa (+51 980 423 754) para mantener branding consistente.
async function notifyPercy(body: string): Promise<void> {
  // Redirige a ActivosYA central (canal unificado de notifs)
  try {
    const { notifyActivosYA } = await import("@/lib/activosya-central/notify");
    let tipo: "yape_confirmado" | "cliente_nuevo" | "consulta_vip" | "error_bot" = "yape_confirmado";
    if (/error|falla/i.test(body)) tipo = "error_bot";
    else if (/VIP|premium|plan/i.test(body)) tipo = "consulta_vip";
    else if (/nuevo cliente|registro|primera vez/i.test(body)) tipo = "cliente_nuevo";
    await notifyActivosYA({ tipo, servicio: "destinoya", mensaje_corto: body });
  } catch (e) {
    console.error("[notifyPercy->ay]", (e as Error).message);
  }
}

// Outbound: Meta Cloud only (Twilio eliminado 2026-05-10).
async function enviarWhatsApp(celular: string, mensaje: string) {
  if (!mensaje || !mensaje.trim()) {
    console.error("enviarWhatsApp: mensaje vacío, no se envía");
    return;
  }
  const chunks = dividirMensaje(mensaje);
  for (let i = 0; i < chunks.length; i++) {
    const r = await sendTextMeta(celular, chunks[i]);
    if (!r.ok) console.error(`[madrodroid Meta send err chunk ${i+1}]`, r.error);
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

  // Wrap todo en try/catch para que excepciones no devuelvan 500 mudas
  try {
    return await handlePost(req, headers, bodyRaw, contentType, texto);
  } catch (err) {
    const { supabase } = await import("@/lib/destinoya/db");
    const errMsg = (err as Error).message || String(err);
    const errStack = (err as Error).stack?.slice(0, 800) || "";
    await supabase.from("destinoya_debug_log").insert({
      endpoint: "madrodroid",
      headers,
      body: bodyRaw,
      parsed: { contentType, error: errMsg, stack: errStack },
      result: `EXCEPTION: ${errMsg.slice(0, 200)}`,
    }).then(() => {}, () => {});
    // Notif al admin: error inesperado en endpoint critico de pagos
    await notifyPercy(
      `🚨 *Error endpoint madrodroid* (pagos Yape)\n\n` +
      `Mensaje: ${errMsg.slice(0, 300)}\n` +
      `Body recibido: ${bodyRaw.slice(0, 200)}\n` +
      `Time: ${new Date().toISOString().slice(0, 19)} UTC\n\n` +
      `_Un pago Yape pudo haber quedado sin procesar — revisar logs Vercel._`
    );
    return NextResponse.json({ ok: false, error: "internal", msg: errMsg }, { status: 200 });
  }
}

async function handlePost(
  req: NextRequest,
  headers: Record<string, string>,
  bodyRaw: string,
  contentType: string,
  textoIn: string,
): Promise<NextResponse> {
  let texto = textoIn;

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

  // ─── Fan-out a Miss Sofia ───────────────────────────────────────
  // El MacroDroid del operador postea SOLO a este endpoint (DestinoYa),
  // pero Miss Sofia comparte la MISMA cuenta Yape (998 102 258). Por eso
  // reenviamos la notificación íntegra a su validador cuando el monto
  // corresponde a un plan Sofia (30/89/299/799). Cada servicio matchea
  // contra su propia tabla, así que no hay cruce de datos (un S/39 de
  // ChoferYa no activa Sofia salvo que exista un pago Sofia pendiente).
  // AISLADO: cualquier fallo aquí se traga y NUNCA afecta el flujo DestinoYa.
  if ([30, 89, 299, 799].includes(montoYape)) {
    try {
      const origin = `https://${req.headers.get("host") || "activosya.com"}`;
      await fetch(`${origin}/api/sofia/macrodroid`, {
        method: "POST",
        headers: { "content-type": contentType || "text/plain" },
        body: bodyRaw,
      });
    } catch (e) {
      console.error("[madrodroid: fan-out a sofia]", (e as Error).message);
    }
  }

  // ─── TuChoferYa: ¿es pago de RENTA CHOFER (S/.39/79/149)? ───
  // Evaluado ANTES que operador para no confundir (los montos son disjuntos).
  if ([39, 79, 149].includes(montoYape)) {
    try {
      const {
        buscarChoferYaPendientePorMontoRenta,
        activarChoferYaPorPagoRenta,
        PLANES_CHOFERYA,
      } = await import("@/lib/activosya/choferya");
      const choferPendiente = await buscarChoferYaPendientePorMontoRenta(
        montoYape,
        240,
        nombreRemitente
      );
      if (choferPendiente) {
        const activacion = await activarChoferYaPorPagoRenta({
          tenant_id: choferPendiente.tenant_id,
          chofer_id: choferPendiente.chofer_id,
          monto_pen: montoYape,
          yape_operacion: operacion,
          yape_remitente_nombre: nombreRemitente,
        });

        const planInfo = PLANES_CHOFERYA[choferPendiente.plan];
        const panelUrl = `https://mi.choferya.activosya.com?token=${activacion.macrodroid_token}`;
        const perfilUrl = `https://chofer.activosya.com/c/${choferPendiente.slug}`;
        const venceLabel = new Date(activacion.subscription_until).toLocaleDateString("es-PE", {
          day: "2-digit",
          month: "long",
        });

        const choferMsg =
          `🚖 *¡TuChoferYa ACTIVADO, ${choferPendiente.name.split(" ")[0]}!*\n\n` +
          `Recibimos tu Yape de S/. ${montoYape} ✅\n` +
          `Plan ${planInfo.label} activo hasta el ${venceLabel} 📅\n\n` +
          `*🔗 Tu página pública:*\n${perfilUrl}\n\n` +
          `*🛠️ Tu panel personal:*\n${panelUrl}\n\n` +
          `*Primeros pasos (10 min):*\n` +
          `1️⃣ Configura tus tarifas planas (Centro→Aeropuerto, etc.)\n` +
          `2️⃣ Define tus horarios disponibles por día\n` +
          `3️⃣ Descarga tu QR y pégalo en el auto\n` +
          `4️⃣ Pídele a tus pasajeros frecuentes que reserven por ahí\n\n` +
          `_Tus pasajeros te yapearán 100% a tu cuenta. Sin comisión por viaje. Tu renta se cobra el día 1 de cada mes._\n\n` +
          `🚀 TuChoferYa — Tu propia agencia de taxi`;

        try {
          const META_TOKEN =
            process.env.META_CHOFERYA_ACCESS_TOKEN ||
            process.env.ECODRIVE_META_ACCESS_TOKEN ||
            "";
          const PHONE_OUT =
            process.env.META_CHOFERYA_PHONE_ID || "1044803088721236";
          await fetch(`https://graph.facebook.com/v22.0/${PHONE_OUT}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: choferPendiente.whatsapp_personal,
              type: "text",
              text: { body: choferMsg },
            }),
          });
          // Notif Percy via ActivosYA central
          const { notifyActivosYA } = await import("@/lib/activosya-central/notify");
          await notifyActivosYA({
            tipo: "plan_activado",
            servicio: "choferya",
            monto: montoYape,
            cliente_nombre: choferPendiente.name,
            cliente_phone: choferPendiente.whatsapp_personal,
            detalle: { plan: planInfo.label, slug: choferPendiente.slug, yape_op: operacion, vence: venceLabel },
          });
        } catch (e) {
          console.error("[madrodroid: WhatsApp activación choferya]", (e as Error).message);
        }

        await supabase.from("destinoya_debug_log").insert({
          endpoint: "madrodroid",
          headers,
          body: bodyRaw,
          parsed: { texto, contentType, monto: montoYape },
          result: `CHOFERYA_ACTIVADO: ${choferPendiente.tenant_id} plan=${choferPendiente.plan}`,
        });

        return NextResponse.json({
          ok: true,
          action: "choferya_activado",
          tenant_id: choferPendiente.tenant_id,
          chofer_id: choferPendiente.chofer_id,
          plan: choferPendiente.plan,
          monto: montoYape,
        });
      }
    } catch (e) {
      console.error("[madrodroid: detección renta choferya]", (e as Error).message);
      // No bloquear flujo de pagos de alumnos si esto falla
    }
  }

  // ─── ActivosYA Franquicia: ¿es pago de RENTA OPERADOR? ───
  // Si el monto coincide con un plan (S/.500/1200/2500) Y hay un operador
  // pendiente_onboarding registrado en las últimas 4h con ese mismo monto,
  // activar la cuenta del operador y mandarle WhatsApp con kit de bienvenida.
  // Esto se evalúa ANTES de tratarlo como pago de alumno DestinoYa.
  if ([500, 1200, 2500].includes(montoYape)) {
    try {
      const { buscarOperadorPendientePorMontoRenta, activarOperadorPorPagoRenta, PLANES, ACTIVOS_FRANQUICIABLES } =
        await import("@/lib/activosya/operadores");
      const opPendiente = await buscarOperadorPendientePorMontoRenta(montoYape, 240, nombreRemitente);
      if (opPendiente) {
        const activacion = await activarOperadorPorPagoRenta({
          operador_id: opPendiente.id,
          monto_pen: montoYape,
          yape_operacion: operacion,
          yape_remitente_nombre: nombreRemitente,
        });

        const planInfo = PLANES[opPendiente.plan];
        const setupUrl = `https://activosya.com/operador/setup?token=${activacion.macrodroid_token}`;
        const referralUrls = activacion.asset_slugs
          .map((slug) => {
            const info = ACTIVOS_FRANQUICIABLES[slug as keyof typeof ACTIVOS_FRANQUICIABLES];
            const path = slug === "tudestinoya" ? "r" : "sofia/r";
            return `${info?.icon ?? "•"} ${info?.name ?? slug}: https://activosya.com/${path}/${activacion.referral_code}`;
          })
          .join("\n");

        const opMsg =
          `🎉 *¡Cuenta ACTIVADA, ${opPendiente.name.split(" ")[0]}!*\n\n` +
          `Recibimos tu Yape de S/. ${montoYape} ✅\n` +
          `Plan ${planInfo.label} activo hasta el ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("es-PE", { day: "2-digit", month: "long" })} 📅\n\n` +
          `*🔗 Tus links únicos de referido:*\n${referralUrls}\n\n` +
          `*🛠️ Completa tu setup técnico (5 min):*\n${setupUrl}\n\n` +
          `Ahí encuentras:\n` +
          `• Plantilla MacroDroid lista para tu Android\n` +
          `• Tutorial 3 min de instalación\n` +
          `• Material de marketing (flyers, scripts)\n` +
          `• Cómo registrar tu chip WhatsApp Business\n\n` +
          `*Próximo paso:* envíanos foto del chip dedicado para WhatsApp al *+51 998 102 258* y te lo activamos en Meta Cloud (10 min).\n\n` +
          `🚀 ActivosYA — Empieza a vender HOY`;

        try {
          const META_TOKEN = process.env.ECODRIVE_META_ACCESS_TOKEN || "";
          await fetch(`https://graph.facebook.com/v22.0/1044803088721236/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: opPendiente.whatsapp_personal,
              type: "text",
              text: { body: opMsg },
            }),
          });

          // Notif Percy via ActivosYA central
          const { notifyActivosYA } = await import("@/lib/activosya-central/notify");
          await notifyActivosYA({
            tipo: "plan_activado",
            servicio: "activosya",
            monto: montoYape,
            cliente_nombre: opPendiente.name,
            cliente_phone: opPendiente.whatsapp_personal,
            detalle: { plan: planInfo.label, yape_op: operacion, falta_chip: true },
          });
        } catch (e) {
          console.error("[madrodroid: activación operador]", (e as Error).message);
        }

        await supabase.from("destinoya_debug_log").insert({
          endpoint: "madrodroid",
          headers,
          body: bodyRaw,
          parsed: { texto, contentType, monto: montoYape },
          result: `OPERADOR_ACTIVADO: ${opPendiente.id} (${opPendiente.name}) plan=${opPendiente.plan}`,
        });

        return NextResponse.json({
          ok: true,
          action: "operador_activado",
          operador_id: opPendiente.id,
          plan: opPendiente.plan,
          monto: montoYape,
        });
      }
    } catch (e) {
      console.error("[madrodroid: detección renta operador]", (e as Error).message);
      // No bloquear el flujo de pagos de alumnos si esto falla
    }
  }

  // ─── TuDramaYa: ¿es pago de drama (S/1, S/3.30, S/12)? ────────────
  // Se evalúa ANTES que TuCuentoYa para que el S/3.30 no caiga en la
  // tolerancia ±0.50 del S/3 del cuento. Solo matchea si hay un pago
  // tdy_pagos pendiente con ese monto exacto.
  try {
    const { procesarYapeTuDramaYa } = await import("@/lib/tudramaya/macrodroid-handler");
    const tdyResult = await procesarYapeTuDramaYa({ monto: montoYape, operacion });
    if (tdyResult.matched) {
      await supabase.from("destinoya_debug_log").insert({
        endpoint: "madrodroid",
        headers,
        body: bodyRaw,
        parsed: { texto, contentType, monto: montoYape },
        result: `TUDRAMAYA_${tdyResult.action}: ${tdyResult.user_id ?? ""} ${tdyResult.detail ?? ""}`,
      });
      await notifyPercy(
        `🎬 *TuDramaYa pago detectado*\n\n` +
          `Usuario: ${tdyResult.user_id ?? "?"}\n` +
          `Acción: ${tdyResult.action}\n` +
          `Monto: S/${montoYape}\n` +
          `Operación: ${operacion}` +
          (tdyResult.detail ? `\n${tdyResult.detail}` : "")
      );
      return NextResponse.json({ ok: true, action: `tudramaya_${tdyResult.action}`, monto: montoYape });
    }
  } catch (e) {
    console.error("[madrodroid: detección TuDramaYa]", (e as Error).message);
    // No bloquear — sigue al resto del router
  }

  // ─── TuCuentoYa: ¿es pago de cuento / wallet / VIP? ───────────────
  // Antes del flujo de alumno DestinoYa: si hay conversación TuCuentoYa
  // esperando ese monto, procesar aquí y retornar.
  try {
    const { procesarYapeTuCuentoYa, notifyPercyCuento } = await import(
      "@/lib/cuentoinfantil/madrodroid-handler"
    );
    const tcResult = await procesarYapeTuCuentoYa({
      monto: montoYape,
      operacion,
      nombre_remitente: nombreRemitente,
      celular_hint: celular,
    });
    if (tcResult.matched) {
      await supabase.from("destinoya_debug_log").insert({
        endpoint: "madrodroid",
        headers,
        body: bodyRaw,
        parsed: { texto, contentType, monto: montoYape },
        result: `TUCUENTOYA_${tcResult.action}: ${tcResult.celular} ${tcResult.detail ?? ""}`,
      });
      await notifyPercyCuento(
        `🐕 *TuCuentoYa pago detectado*\n\n` +
          `Cliente: ${tcResult.celular}\n` +
          `Acción: ${tcResult.action}\n` +
          `Monto: S/${montoYape}\n` +
          `Operación: ${operacion}\n` +
          (tcResult.detail ? `\n${tcResult.detail}` : ""),
      );
      return NextResponse.json({
        ok: true,
        action: `tucuentoya_${tcResult.action}`,
        celular: tcResult.celular,
        monto: montoYape,
      });
    }
  } catch (e) {
    console.error("[madrodroid: detección TuCuentoYa]", (e as Error).message);
    // No bloquear si falla — sigue al flujo DestinoYa abajo
  }

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
    // Servicio formato: "categoria:Sub-Servicio" (ej "esoterico:Compatibilidad Amorosa")
    const servicioStr = String(pago.servicio || "");
    const [categoria, subServicioRaw] = servicioStr.includes(":")
      ? servicioStr.split(":", 2)
      : ["", servicioStr];
    const subServicio = subServicioRaw || "tu lectura";

    // ─── VIP: activación inmediata, no requiere Flow datos ───
    if (categoria === "vip") {
      const planVip = subServicio === "vip_anual" || /anual/i.test(subServicio) ? "anual" : "mensual";
      try {
        const vip = await activarVIP(celularFinal, planVip);
        const fechaVenc = vip?.fecha_vencimiento
          ? new Date(vip.fecha_vencimiento).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })
          : "";
        await enviarWhatsApp(
          celularFinal,
          `✅ *¡VIP ${planVip === "anual" ? "Anual" : "Mensual"} activado!* 💎\n\n` +
          `Pago confirmado: *S/${montoEsperado}*\n` +
          `Tu acceso ilimitado vence el *${fechaVenc}* ⭐\n\n` +
          `A partir de ahora, todos los servicios (Esotérico, Profesional, Rápidas) son ilimitados — solo escribe *menu* y empieza ✨`
        );
        await notifyPercy(
          `💎 *VIP ${planVip === "anual" ? "Anual" : "Mensual"} activado*\n` +
          `Cliente: ${celularFinal}\n` +
          `Monto: S/${montoEsperado}\n` +
          `Vence: ${fechaVenc}\n` +
          `Op Yape: ${operacion}\n` +
          `${nombreRemitente ? `De: ${nombreRemitente}\n` : ""}`
        );
      } catch (e) {
        console.error("[madrodroid VIP err]", (e as Error).message);
        await enviarWhatsApp(
          celularFinal,
          `✅ *Pago VIP confirmado: S/${montoEsperado}* — pero tuve un problema activando tu cuenta. Te contacto en minutos para arreglarlo manualmente 🙏`
        );
      }
      return NextResponse.json({ ok: true, action: "vip_activado", plan: planVip });
    }

    // Determinar Flow de datos a enviar (null = sin Flow, mantener chat)
    let flowDatos: DestinoFlowKey | null = null;
    let mensajeChatFallback: string | null = null;
    if (categoria === "esoterico") {
      if (/mano/i.test(subServicio)) {
        flowDatos = null;
        mensajeChatFallback = `📸 Ahora envíame una *foto clara de tu palma derecha* para tu lectura 🖐️\n\nAsegúrate que se vean bien las líneas ✨`;
      } else if (/compatibilidad/i.test(subServicio)) {
        flowDatos = "datos_compatibilidad";
      } else if (/carta astral/i.test(subServicio)) {
        flowDatos = "datos_carta_astral";
      } else if (/feng shui/i.test(subServicio)) {
        flowDatos = "datos_feng_shui";
      } else if (/futuro/i.test(subServicio)) {
        // "Tu Futuro 30/60/90" necesita nombre + fecha + ciudad.
        // datos_numerologia NO tiene ciudad → usamos datos_carta_astral que sí la tiene.
        flowDatos = "datos_carta_astral";
      } else if (/numerolog/i.test(subServicio)) {
        flowDatos = "datos_numerologia";
      } else {
        flowDatos = "datos_numerologia";
      }
    } else if (categoria === "profesional") {
      flowDatos = "datos_profesional";
    } else if (categoria === "rapidas") {
      // Caso especial: CV requiere documento (no Flow simple)
      if (/cv|curriculum|curr[ií]culo|hoja de vida/i.test(subServicio)) {
        flowDatos = null;
        mensajeChatFallback =
          `📄 Para tu *${subServicio}* tienes 2 opciones:\n\n` +
          `*A)* Si ya tienes un CV (en Word o PDF), envíamelo por chat — lo mejoro y te devuelvo una versión optimizada.\n\n` +
          `*B)* Si quieres crear uno desde cero, escribe *NUEVO* y te haré preguntas para armarlo.\n\n` +
          `_Después te preguntaré si lo quieres recibir en Word o PDF._`;
      } else {
        flowDatos = "datos_rapidas";
      }
    }

    // Mensaje 1 — confirmación corta
    await enviarWhatsApp(
      celularFinal,
      `✅ *¡Pago confirmado!* S/${montoEsperado} 💫`
    );
    await notifyPercy(
      `💰 *Pago confirmado* — S/${montoEsperado}\n` +
      `Cliente: ${celularFinal}\n` +
      `Servicio: ${categoria}:${subServicio}\n` +
      `Op Yape: ${operacion}\n` +
      `${nombreRemitente ? `De: ${nombreRemitente}\n` : ""}`
    );
    await new Promise((r) => setTimeout(r, 700));

    // Mensaje 2 — Flow datos o chat fallback
    if (flowDatos) {
      const r = await sendDestinoFlow({
        phone: celularFinal,
        flowKey: flowDatos,
        userIdOrPhone: celularFinal,
      });
      if (!r.ok) {
        // Fallback chat si el Flow falla
        await enviarWhatsApp(
          celularFinal,
          `Tuve un problema mostrando el formulario. Por favor envíame tus datos por chat 🙏`
        );
      }
    } else if (mensajeChatFallback) {
      await enviarWhatsApp(celularFinal, mensajeChatFallback);
    }

    return NextResponse.json({ ok: true, action: "pago_confirmado" });
  }

  // Caso 2: aún falta (pagó parcial)
  if (totalPagado < montoEsperado) {
    const falta = (montoEsperado - totalPagado).toFixed(2);
    await enviarWhatsApp(
      celularFinal,
      `⚠️ *Recibí tu Yape de S/${montoYape}*\n\nEl servicio que elegiste cuesta *S/${montoEsperado}*. Hasta ahora has pagado *S/${totalPagado}*.\n\nTe faltan *S/${falta}* — yapea la diferencia y continuamos ✨`
    );
    await notifyPercy(
      `⚠️ *Pago parcial* — recibido S/${montoYape} de S/${montoEsperado}\n` +
      `Cliente: ${celularFinal}\n` +
      `Servicio: ${pago.servicio}\n` +
      `Le faltan: S/${falta}\n` +
      `Op Yape: ${operacion}`
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
