import { NextRequest, NextResponse } from "next/server";
import { getClubClient } from "@/lib/ecodrive/club";
import { sendImage, sendText, isMetaConfigured } from "@/lib/ecodrive/wa-send";

export const dynamic = "force-dynamic";

function publicBase(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
}

async function notifyTicketReady(opts: {
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
    console.warn("[club/confirmar-yape] sendImage falló, fallback a texto", e);
    try {
      await sendText(
        opts.whatsapp,
        `Tu boleto #${String(opts.numeroCorrelativo).padStart(4, "0")} de ${opts.edicionNombre} fue confirmado. ` +
          `Mira tu boleto: ${imageUrl}`,
      );
    } catch (e2) {
      console.warn("[club/confirmar-yape] sendText fallback también falló", e2);
    }
  }
}

async function notifyPassReady(opts: {
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
  const lines = [
    `¡Bienvenido al Club EcoDrive+, ${opts.nombre.split(" ")[0] ?? ""}!`,
    ``,
    `Tu Pass anual N° ${opts.numeroPass} está activo hasta ${opts.fechaFin}. Participas en TODOS los sorteos del año.`,
  ];
  if (opts.ticketBonusId && opts.ticketBonusNumero) {
    lines.push(``, `Tu primer boleto: #${String(opts.ticketBonusNumero).padStart(4, "0")}.`);
  }
  lines.push(``, `Ver tu cuenta: ${base}/ecodriveplus/club/mi-cuenta`);
  try {
    if (opts.ticketBonusId) {
      const imageUrl = `${base}/api/ecodrive/club/ticket-image/${opts.ticketBonusId}`;
      await sendImage(opts.whatsapp, imageUrl, lines.join("\n"));
    } else {
      await sendText(opts.whatsapp, lines.join("\n"));
    }
  } catch (e) {
    console.warn("[club/confirmar-yape] notifyPass falló", e);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { op_id, monto, mensaje, glosa, telefono_emisor } = body as {
    op_id?: string;
    monto?: number;
    mensaje?: string;
    glosa?: string;
    telefono_emisor?: string;
  };
  if (!op_id || !monto)
    return NextResponse.json({ error: "op_id y monto requeridos" }, { status: 400 });

  const sb = getClubClient();

  let numero: number | null = null;
  const refMatch = (glosa || mensaje || "").match(/CLUB[-\s]?(\d+)/i);
  if (refMatch) numero = Number(refMatch[1]);

  let reserva: { id: string; edicion_id: string; modalidad: string; numero_correlativo: number; dni: string; whatsapp: string; nombre: string; tipo_perfil: string; precio_esperado: number } | null = null;

  if (numero) {
    const { data } = await sb
      .from("club_reservas")
      .select("id,edicion_id,modalidad,numero_correlativo,dni,whatsapp,nombre,tipo_perfil,precio_esperado")
      .eq("numero_correlativo", numero)
      .gt("expira_en", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) reserva = data;
  }
  if (!reserva && telefono_emisor) {
    const tel = telefono_emisor.replace(/\D/g, "").slice(-9);
    const { data } = await sb
      .from("club_reservas")
      .select("id,edicion_id,modalidad,numero_correlativo,dni,whatsapp,nombre,tipo_perfil,precio_esperado")
      .like("whatsapp", `%${tel}%`)
      .gt("expira_en", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data && Math.abs(Number(data.precio_esperado) - monto) < 0.5) reserva = data;
  }

  if (!reserva) {
    await sb.from("club_pagos").insert({
      tipo: "ticket",
      metodo: "yape",
      monto,
      estado: "iniciado",
      raw_payload: body,
    });
    return NextResponse.json({ ok: false, matched: false, reason: "reserva no encontrada" });
  }

  if (Math.abs(Number(reserva.precio_esperado) - monto) > 0.5) {
    return NextResponse.json(
      { ok: false, matched: false, reason: `monto no coincide: esperado ${reserva.precio_esperado}, recibido ${monto}` },
      { status: 400 }
    );
  }

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
  if (!miembro) return NextResponse.json({ error: "fallo crear miembro" }, { status: 500 });

  // Idempotencia: si ya existe un ticket con este op_id Yape, no duplicar.
  const { data: yaExiste } = await sb
    .from("club_tickets")
    .select("id,numero_correlativo")
    .eq("payment_intent_id", op_id)
    .maybeSingle();
  if (yaExiste) {
    return NextResponse.json({
      ok: true,
      matched: true,
      ticket_id: yaExiste.id,
      numero_correlativo: yaExiste.numero_correlativo,
      duplicate: true,
    });
  }

  // Edicion info para captions del boleto
  const { data: edInfo } = await sb
    .from("club_ediciones")
    .select("nombre")
    .eq("id", reserva.edicion_id)
    .maybeSingle();
  const edicionNombre = edInfo?.nombre ?? "Edicion #1 - BYD Yuan Pro 2023";

  if (reserva.modalidad === "ticket") {
    const { data: tk, error } = await sb
      .from("club_tickets")
      .insert({
        edicion_id: reserva.edicion_id,
        numero_correlativo: reserva.numero_correlativo,
        miembro_id: miembro.id,
        origen: "ticket_suelto",
        precio_pagado: monto,
        payment_intent_id: op_id,
        estado: "confirmado",
        paid_at: new Date().toISOString(),
      })
      .select("id,numero_correlativo")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await sb.from("club_pagos").insert({
      tipo: "ticket",
      ticket_id: tk.id,
      miembro_id: miembro.id,
      metodo: "yape",
      monto,
      estado: "confirmado",
      raw_payload: body,
    });
    await sb.from("club_reservas").delete().eq("id", reserva.id);
    await sb
      .from("club_miembros")
      .update({ total_gastado: Number(miembro.total_gastado) + monto })
      .eq("id", miembro.id);

    // Envia el boleto al WhatsApp del titular (fire-and-forget OK)
    await notifyTicketReady({
      req,
      whatsapp: reserva.whatsapp,
      nombre: reserva.nombre,
      ticketId: tk.id,
      numeroCorrelativo: tk.numero_correlativo,
      edicionNombre,
    });

    return NextResponse.json({
      ok: true,
      matched: true,
      ticket_id: tk.id,
      numero_correlativo: tk.numero_correlativo,
    });
  }

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
      payment_method: "yape",
      payment_intent_id: op_id,
      yape_op_id: op_id,
    })
    .select("id,fecha_fin,numero_pass_en_dni")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from("club_pagos").insert({
    tipo: "pass",
    pass_id: pass.id,
    miembro_id: miembro.id,
    metodo: "yape",
    monto,
    estado: "confirmado",
    raw_payload: body,
  });

  let ticketBonusId: string | null = null;
  let ticketBonusNumero: number | null = null;
  if (reserva.edicion_id) {
    const { data: ed } = await sb
      .from("club_ediciones")
      .select("estado")
      .eq("id", reserva.edicion_id)
      .single();
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

  return NextResponse.json({
    ok: true,
    matched: true,
    pass_id: pass.id,
    fecha_fin: pass.fecha_fin,
    numero_pass: pass.numero_pass_en_dni,
  });
}
