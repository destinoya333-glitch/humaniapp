/**
 * POST /api/ecodrive/club/asignar-numero
 *
 * Asigna (o CAMBIA) el número elegido a una membresía ya pagada. Respeta el número
 * que elige el cliente (opción A): crea el boleto con ESE número (candado UNIQUE en
 * BD → si otro lo tomó, error 409 y elige otro). Al asignar, manda el boleto por
 * WhatsApp. Si la membresía ya tenía un número (cambiar), libera el anterior.
 *
 * Body: { pass_id, numero, edicion_id }
 */
import { NextRequest, NextResponse } from "next/server";
import { getClubClient } from "@/lib/ecodrive/club";
import { notifyTicketReady } from "@/lib/ecodrive/club-activar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { pass_id, numero, edicion_id } = body as {
    pass_id?: string;
    numero?: number;
    edicion_id?: string;
  };
  if (!pass_id || !edicion_id || !Number.isFinite(Number(numero))) {
    return NextResponse.json({ error: "pass_id, edicion_id y numero requeridos" }, { status: 400 });
  }
  const n = Math.floor(Number(numero));
  const sb = getClubClient();

  // Membresía + miembro
  const { data: pass } = await sb
    .from("club_pass")
    .select("id, miembro_id, precio_pagado, estado")
    .eq("id", pass_id)
    .maybeSingle();
  if (!pass || pass.estado !== "activo") {
    return NextResponse.json({ error: "membresía no válida" }, { status: 404 });
  }
  const { data: miembro } = await sb
    .from("club_miembros")
    .select("nombre, whatsapp")
    .eq("id", pass.miembro_id)
    .maybeSingle();
  const { data: ed } = await sb
    .from("club_ediciones")
    .select("nombre, estado")
    .eq("id", edicion_id)
    .maybeSingle();
  if (!ed || ed.estado !== "abierta") {
    return NextResponse.json({ error: "la edición no está abierta" }, { status: 400 });
  }
  if (n < 1) return NextResponse.json({ error: "número inválido" }, { status: 400 });

  // ¿Esta membresía ya tenía un ticket en esta edición?
  const { data: prev } = await sb
    .from("club_tickets")
    .select("id, numero_correlativo")
    .eq("pass_id", pass_id)
    .eq("edicion_id", edicion_id)
    .maybeSingle();
  if (prev && prev.numero_correlativo === n) {
    return NextResponse.json({ ok: true, numero: n, ticket_id: prev.id, sinCambio: true });
  }
  if (prev) {
    // Cambiar: liberamos el número anterior
    await sb.from("club_tickets").delete().eq("id", prev.id);
  }

  // Crear el boleto con el número ELEGIDO
  const { data: ticket, error } = await sb
    .from("club_tickets")
    .insert({
      edicion_id,
      numero_correlativo: n,
      miembro_id: pass.miembro_id,
      pass_id,
      origen: "elegido",
      estado: "confirmado",
      precio_pagado: pass.precio_pagado,
      paid_at: new Date().toISOString(),
    })
    .select("id, numero_correlativo")
    .single();

  if (error || !ticket) {
    // 23505 = unique_violation → número ya ocupado
    const ocupado = (error as { code?: string } | null)?.code === "23505";
    return NextResponse.json(
      { error: ocupado ? `El número ${n} ya fue tomado. Elegí otro.` : error?.message ?? "no se pudo asignar" },
      { status: ocupado ? 409 : 500 },
    );
  }

  // Marca la edición donde se consumió el beneficio (para tracking de pendientes)
  await sb
    .from("club_pass")
    .update({ beneficio_consumido_en_edicion: edicion_id })
    .eq("id", pass_id);

  // Boleto por WhatsApp (imagen)
  if (miembro?.whatsapp) {
    await notifyTicketReady({
      req,
      whatsapp: miembro.whatsapp,
      nombre: miembro.nombre ?? "",
      ticketId: ticket.id,
      numeroCorrelativo: ticket.numero_correlativo,
      edicionNombre: ed.nombre,
    }).catch((e) => console.warn("[club/asignar-numero] notify falló", e));
  }

  return NextResponse.json({ ok: true, numero: ticket.numero_correlativo, ticket_id: ticket.id });
}
