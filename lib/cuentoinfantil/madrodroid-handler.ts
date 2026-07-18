/**
 * TuCuentoYa — Handler MacroDroid para auto-detect Yape.
 *
 * Llamado por /api/destinoya/madrodroid cuando MacroDroid dispara webhook
 * con un Yape recibido. Detecta si el monto corresponde a TuCuentoYa
 * (cuento suelto, recarga wallet o VIP) y procesa el pago automático.
 *
 * Estrategia de matching:
 *  - Buscar conversación TuCuentoYa en `esperando_pago` con `monto_esperado`
 *    igual al monto del Yape (más confiable)
 *  - Fallback: cliente con conversación activa <60min cuyo monto encaje
 */
import { supabase, getConversacion, upsertConversacion, getOrCreateCliente, crearPedido, type EstadoConv } from "./db";
import { aplicarPago } from "./yape-verify";
import { generarCuento } from "./generator";
import { sendText, uploadAndSendMedia } from "./meta-cloud-sender";

const MONTOS_VALIDOS = new Set([2, 3, 5, 15, 18, 30, 50, 100, 180, 300]);

export type ResultadoMacrodroid = {
  matched: boolean;
  action?: string;
  celular?: string;
  detail?: string;
};

/**
 * Procesa un Yape recibido y determina si corresponde a TuCuentoYa.
 * Si SÍ corresponde, aplica el pago y dispara acciones (generar cuento, activar VIP, etc.).
 * Si NO corresponde, retorna matched=false para que el endpoint madrodroid siga
 * con su flujo normal de DestinoYa.
 */
export async function procesarYapeTuCuentoYa(opts: {
  monto: number;
  operacion: string;
  nombre_remitente?: string | null;
  celular_hint?: string | null;
}): Promise<ResultadoMacrodroid> {
  const { monto, operacion } = opts;

  if (!MONTOS_VALIDOS.has(monto)) {
    return { matched: false };
  }

  // ─── IDEMPOTENCIA: si esta `operacion` ya fue procesada, no la cobramos otra vez ───
  if (operacion) {
    const { data: yaProcesado } = await supabase
      .from("tci_yape_pagos")
      .select("id")
      .eq("referencia", operacion)
      .limit(1)
      .maybeSingle();
    if (yaProcesado) {
      return { matched: false }; // ya cobrado, dejar pasar al resto del flujo
    }
  }

  // ─── ÚNICO MATCH PERMITIDO: conversación en `esperando_pago` <15 min con monto_esperado EXACTO ───
  // No usamos fallbacks de nombre/celular_hint porque crean falsos positivos cuando el
  // mismo cliente tiene flujos paralelos (Cuento + Destino).
  const desde15min = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: convs } = await supabase
    .from("tci_conversaciones")
    .select("celular, estado, contexto, ultimo_mensaje_at")
    .eq("estado", "esperando_pago")
    .gte("ultimo_mensaje_at", desde15min)
    .order("ultimo_mensaje_at", { ascending: false })
    .limit(20);

  let conv: { celular: string; contexto: Record<string, unknown> } | null = null;

  for (const c of (convs ?? []) as Array<{
    celular: string;
    contexto: Record<string, unknown>;
  }>) {
    const esperado = Number(c.contexto?.monto_esperado ?? 0);
    // Tolerante: acepta monto pagado >= esperado (excedente queda como wallet bonus)
    // PERO no aceptar diferencias mayores a 2x el esperado (evita false-positive en montos altos).
    if (esperado > 0 && monto >= esperado && monto <= esperado * 2) {
      conv = c;
      break;
    }
  }

  // Sin match estricto → NO procesar en TuCuentoYa, dejar que siga a DestinoYa u otros
  if (!conv) {
    return { matched: false };
  }

  const celular = conv.celular;

  // ─── 2. Aplicar el pago (recarga / VIP / suelto) ─────────────────────────
  const aplicado = await aplicarPago({
    celular,
    monto,
    referencia: operacion,
  });

  if (!aplicado.ok) {
    return {
      matched: true,
      action: "rechazado",
      celular,
      detail: aplicado.mensaje,
    };
  }

  // Notificar al cliente
  await sendText(celular, aplicado.mensaje).catch(() => {});

  // ─── 3. Si es cuento suelto Y la conversación tiene escenario listo, generar ────
  if (aplicado.tipo === "cuento_suelto") {
    const ctx = conv.contexto;
    if (ctx?.hijo && ctx?.escenario && ctx?.duracion) {
      const cliente = await getOrCreateCliente(celular);
      const hijo = ctx.hijo as { nombre: string; edad?: number; genero?: "m" | "f" };
      const escenario = ctx.escenario as string;
      const duracion = ctx.duracion as 2 | 3 | 5;
      const rol = (ctx.rol_pidiente as string) ?? "papa";

      const pedido = await crearPedido({
        cliente_id: cliente.id,
        celular,
        duracion_min: duracion,
        escenario,
        personajes: [
          { nombre: hijo.nombre, rol_en_cuento: "protagonista" },
          { nombre: rol, rol_en_cuento: rol },
        ],
        prompt_input: escenario,
        monto,
        fuente_pago: "yape_directo",
      });

      await upsertConversacion(celular, {
        estado: "generando" as EstadoConv,
        contexto: { ...ctx, pedido_id: pedido.id },
      });

      await sendText(
        celular,
        `🦮 Perfecto, *${hijo.nombre}* va a vivir su aventura. Generando el cuento... dame ~60 seg ✨`,
      ).catch(() => {});

      // Generar cuento + enviar audio
      const gen = await generarCuento({
        pedido_id: pedido.id,
        contexto: {
          duracion_min: duracion,
          hijo,
          acompanantes: [
            {
              nombre: rol,
              rol: rol as "papa" | "mama" | "abuelo" | "abuela" | "tio" | "hermano" | "mascota" | "otro",
            },
          ],
          escenario,
          prompt_original: escenario,
        },
        mezclar_ambient: false,
      });

      if (gen.ok && gen.audio_url) {
        try {
          const r = await fetch(gen.audio_url);
          if (r.ok) {
            const buf = Buffer.from(await r.arrayBuffer());
            await uploadAndSendMedia({
              to: celular,
              buffer: buf,
              mimeType: "audio/mpeg",
              filename: `${gen.titulo ?? "cuento"}.mp3`,
            });
          }
        } catch (e) {
          console.error("[macrodroid-cuento upload audio]", (e as Error).message);
        }
        await sendText(
          celular,
          `🎉 *${gen.titulo}*\n\n${gen.texto_cuento?.slice(0, 800) ?? ""}\n\n_Para otro cuento, escribe *menú*_ 🦮`,
        ).catch(() => {});
        await upsertConversacion(celular, { estado: "entregado" as EstadoConv });
      } else {
        await sendText(
          celular,
          `😔 Tuve un problema generando tu cuento: ${gen.error ?? "error"}. Escribe *menú* para intentar de nuevo.`,
        ).catch(() => {});
      }

      return {
        matched: true,
        action: "cuento_generado",
        celular,
        detail: `Pedido ${pedido.id} status=${gen.ok ? "entregado" : "fallido"}`,
      };
    }

    // Caso: pagó suelto pero conversación no tiene escenario completo.
    // Recupera el dinero acreditandolo a wallet para que cliente pueda gastarlo.
    const clienteActual = await getOrCreateCliente(celular);
    const nuevoBalance = (clienteActual.wallet_balance ?? 0) + monto;
    await supabase
      .from("tci_clientes")
      .update({ wallet_balance: nuevoBalance, last_seen: new Date().toISOString() })
      .eq("celular", celular);

    await sendText(
      celular,
      `🦮 ¡Recibí tu Yape de S/${monto}!\n\n` +
        `Te lo acredité a tu billetera (saldo actual: *S/${nuevoBalance.toFixed(2)}*).\n\n` +
        `Escríbeme *menú* y armamos tu cuento — el saldo se descuenta cuando confirmes.`,
    ).catch(() => {});

    return {
      matched: true,
      action: "acreditado_a_wallet",
      celular,
      detail: `Saldo nuevo: S/${nuevoBalance.toFixed(2)}`,
    };
  }

  // Recarga wallet o VIP — el aplicarPago ya envió mensaje al cliente
  return {
    matched: true,
    action: aplicado.tipo ?? "aplicado",
    celular,
  };
}

/**
 * Notifica al admin Percy desde el canal TuCuentoYa.
 */
export async function notifyPercyCuento(body: string): Promise<void> {
  // Redirige a ActivosYA central (que es ahora el único canal de notifs a Percy)
  try {
    const { notifyActivosYA } = await import("@/lib/activosya-central/notify");
    // Detecta tipo según contenido
    let tipo: "yape_confirmado" | "cliente_nuevo" | "cuento_generado" | "error_bot" = "yape_confirmado";
    if (/error|falla/i.test(body)) tipo = "error_bot";
    else if (/cuento.*list|generad/i.test(body)) tipo = "cuento_generado";
    else if (/nuevo cliente|registr/i.test(body)) tipo = "cliente_nuevo";
    await notifyActivosYA({ tipo, servicio: "cuento", mensaje_corto: body });
    return;
  } catch (e) {
    console.error("[notifyPercyCuento->ay]", (e as Error).message);
  }
}
