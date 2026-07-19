import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendImage, sendText, sendTemplate, isMetaConfigured } from "@/lib/ecodrive/wa-send";

function publicBase(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
}

export async function notifyTicketReady(opts: {
  req: NextRequest;
  whatsapp: string;
  nombre: string;
  ticketId: string;
  numeroCorrelativo: number;
  edicionNombre: string;
}): Promise<void> {
  if (!isMetaConfigured()) return;
  const base = publicBase(opts.req);
  const imageUrl = `${base}/api/ecodrive/club/ticket-image/${opts.ticketId}`;
  const caption =
    `¡Listo, ${opts.nombre.split(" ")[0] ?? ""}! Tu boleto #${String(
      opts.numeroCorrelativo,
    ).padStart(4, "0")} para ${opts.edicionNombre} está confirmado. ` +
    `Guarda esta imagen — es tu comprobante oficial. ` +
    `Sorteo presencial en Trujillo con notario y fedatario. Suerte 🍀`;
  try {
    await sendImage(opts.whatsapp, imageUrl, caption);
  } catch (e) {
    console.warn("[club/activar] sendImage falló, fallback a texto", e);
    try {
      await sendText(
        opts.whatsapp,
        `Tu boleto #${String(opts.numeroCorrelativo).padStart(4, "0")} de ${opts.edicionNombre} fue confirmado. ` +
          `Mira tu boleto: ${imageUrl}`,
      );
    } catch (e2) {
      console.warn("[club/activar] sendText fallback también falló", e2);
    }
  }
}

export async function notifyPassReady(opts: {
  req: NextRequest;
  whatsapp: string;
  nombre: string;
  fechaFin: string;
  numeroPass: number;
  ticketBonusId?: string | null;
  ticketBonusNumero?: number | null;
}): Promise<void> {
  if (!isMetaConfigured()) return;
  const base = publicBase(opts.req);
  const primerNombre = opts.nombre.split(" ")[0] ?? "";

  // Paso 1: Template Meta APPROVED para abrir/refrescar la ventana 24h
  // (necesario porque el socio nunca habló con el bot antes de pagar)
  try {
    await sendTemplate(
      opts.whatsapp,
      "club_pass_confirmado_v2",
      "es",
      [primerNombre, opts.fechaFin], // {{1}} nombre, {{2}} fecha_fin
    );
  } catch (e) {
    console.warn("[club/activar] sendTemplate club_pass_confirmado_v2 falló", e);
    return; // sin template no abrimos ventana, no podemos seguir
  }

  // Paso 2: Dentro de la ventana 24h (recién abierta), mandar imagen del boleto bonus + link a mi-cuenta
  const lines = [`Tu Membresía anual N° ${opts.numeroPass} ya está activa.`];
  if (opts.ticketBonusId && opts.ticketBonusNumero) {
    lines.push(``, `Tu primer Número de Socio: #${String(opts.ticketBonusNumero).padStart(4, "0")}.`);
  }
  lines.push(``, `Mirá tu cuenta: ${base}/ecodriveplus/club/mi-cuenta`);
  try {
    if (opts.ticketBonusId) {
      const imageUrl = `${base}/api/ecodrive/club/ticket-image/${opts.ticketBonusId}`;
      await sendImage(opts.whatsapp, imageUrl, lines.join("\n"));
    } else {
      await sendText(opts.whatsapp, lines.join("\n"));
    }
  } catch (e) {
    console.warn("[club/activar] follow-up image/text falló (template SI se envió)", e);
  }
}

export type ReservaActivable = {
  id: string;
  edicion_id: string;
  modalidad: string;
  numero_correlativo: number;
  dni: string;
  whatsapp: string;
  nombre: string;
  tipo_perfil: string;
  precio_esperado: number;
};

/**
 * Activa la Membresía (Pass anual) a partir de una reserva ya pagada.
 * Reusable por cualquier pasarela (Culqi tarjeta/Yape). Idempotente por
 * `payment_intent_id`: si ya se activó con ese id, devuelve el pass existente.
 *
 * Efecto: crea/recupera el miembro, inserta el club_pass, registra el pago,
 * genera el ticket bonus (si la edición está abierta), borra la reserva,
 * actualiza total_gastado y notifica por WhatsApp.
 */
export async function activarPassDesdeReserva(opts: {
  sb: SupabaseClient;
  req: NextRequest;
  reserva: ReservaActivable;
  monto: number;
  metodo: string; // "culqi" | "yape" | ...
  paymentIntentId: string;
}): Promise<{
  ok: boolean;
  duplicate?: boolean;
  pass_id?: string;
  fecha_fin?: string;
  numero_pass?: number;
  numero_correlativo?: number;
  error?: string;
}> {
  const { sb, req, reserva, monto, metodo, paymentIntentId } = opts;

  // Idempotencia: mismo cargo => no re-activar
  const { data: yaPass } = await sb
    .from("club_pass")
    .select("id,fecha_fin,numero_pass_en_dni")
    .eq("payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (yaPass) {
    return {
      ok: true,
      duplicate: true,
      pass_id: yaPass.id,
      fecha_fin: yaPass.fecha_fin,
      numero_pass: yaPass.numero_pass_en_dni,
      numero_correlativo: reserva.numero_correlativo,
    };
  }

  // Miembro (por DNI)
  let { data: miembro } = await sb.from("club_miembros").select("*").eq("dni", reserva.dni).maybeSingle();
  if (!miembro) {
    const ins = await sb
      .from("club_miembros")
      .insert({
        nombre: reserva.nombre,
        dni: reserva.dni,
        whatsapp: reserva.whatsapp,
        tipo_perfil: reserva.tipo_perfil,
      })
      .select("*")
      .single();
    miembro = ins.data;
  }
  if (!miembro) return { ok: false, error: "fallo crear miembro" };

  const fechaFin = new Date();
  fechaFin.setFullYear(fechaFin.getFullYear() + 1);
  const { count: passCount } = await sb
    .from("club_pass")
    .select("id", { count: "exact", head: true })
    .eq("miembro_id", miembro.id);

  const { data: pass, error } = await sb
    .from("club_pass")
    .insert({
      miembro_id: miembro.id,
      numero_pass_en_dni: (passCount ?? 0) + 1,
      precio_pagado: monto,
      fecha_fin: fechaFin.toISOString().slice(0, 10),
      estado: "activo",
      payment_method: metodo,
      payment_intent_id: paymentIntentId,
    })
    .select("id,fecha_fin,numero_pass_en_dni")
    .single();
  if (error || !pass) return { ok: false, error: error?.message ?? "fallo crear pass" };

  await sb.from("club_pagos").insert({
    tipo: "pass",
    pass_id: pass.id,
    miembro_id: miembro.id,
    metodo,
    monto,
    estado: "confirmado",
    raw_payload: { payment_intent_id: paymentIntentId, metodo },
  });

  // Ticket bonus (primer número de socio) si la edición sigue abierta
  let ticketBonusId: string | null = null;
  let ticketBonusNumero: number | null = null;
  if (reserva.edicion_id) {
    const { data: ed } = await sb.from("club_ediciones").select("estado").eq("id", reserva.edicion_id).single();
    if (ed?.estado === "abierta") {
      const { data: maxNum } = await sb
        .from("club_tickets")
        .select("numero_correlativo")
        .eq("edicion_id", reserva.edicion_id)
        .order("numero_correlativo", { ascending: false })
        .limit(1)
        .maybeSingle();
      const next = (maxNum?.numero_correlativo ?? 0) + 1;
      const { data: bonus } = await sb
        .from("club_tickets")
        .insert({
          edicion_id: reserva.edicion_id,
          numero_correlativo: next,
          miembro_id: miembro.id,
          origen: "pass_auto",
          pass_id: pass.id,
          estado: "confirmado",
          paid_at: new Date().toISOString(),
        })
        .select("id,numero_correlativo")
        .single();
      if (bonus) {
        ticketBonusId = bonus.id;
        ticketBonusNumero = bonus.numero_correlativo;
      }
    }
  }

  await sb.from("club_reservas").delete().eq("id", reserva.id);
  await sb
    .from("club_miembros")
    .update({ total_gastado: Number(miembro.total_gastado) + monto })
    .eq("id", miembro.id);

  await notifyPassReady({
    req,
    whatsapp: reserva.whatsapp,
    nombre: reserva.nombre,
    fechaFin: pass.fecha_fin,
    numeroPass: pass.numero_pass_en_dni,
    ticketBonusId,
    ticketBonusNumero,
  });

  return {
    ok: true,
    pass_id: pass.id,
    fecha_fin: pass.fecha_fin,
    numero_pass: pass.numero_pass_en_dni,
    numero_correlativo: reserva.numero_correlativo,
  };
}
