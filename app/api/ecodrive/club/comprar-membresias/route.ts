/**
 * POST /api/ecodrive/club/comprar-membresias
 *
 * Cobra N Membresías (Club Pass) de una sola vez con Culqi (tarjeta/Yape) y crea
 * N membresías SIN número asignado. El cliente elige sus N números DESPUÉS
 * (asignar-numero), respetando el número que elige (opción A). Precio: N × precio
 * unitario (el S/27 de lealtad se aplica por unidad si el DNI ya fue socio antes).
 *
 * Body: { token, email?, dni, nombre, whatsapp, tipo_perfil?, cantidad }
 * Devuelve: { ok, compra_id, miembro_id, edicion_id, cantidad, precio_unit, pass_ids }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getClubClient,
  normalizeWhatsapp,
  isValidDni,
  pricingFor,
  type TipoPerfil,
} from "@/lib/ecodrive/club";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, email, dni, nombre, whatsapp, tipo_perfil, cantidad } = body as {
    token?: string;
    email?: string;
    dni?: string;
    nombre?: string;
    whatsapp?: string;
    tipo_perfil?: TipoPerfil;
    cantidad?: number;
  };

  if (!token) return NextResponse.json({ error: "token requerido" }, { status: 400 });
  if (!isValidDni(dni || "")) return NextResponse.json({ error: "DNI inválido (8 dígitos)" }, { status: 400 });
  const wa = normalizeWhatsapp(whatsapp || "");
  if (!wa) return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
  if (!nombre || nombre.trim().length < 3) return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  const perfil: TipoPerfil = (tipo_perfil ?? "publico") as TipoPerfil;
  const qty = Math.max(1, Math.min(9, Math.floor(Number(cantidad) || 1)));

  const secret = process.env.CULQI_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Culqi no configurado" }, { status: 500 });

  const sb = getClubClient();

  // Edición vigente
  const { data: edRows } = await sb.rpc("club_edicion_actual");
  const edId = (edRows as { edicion_id?: string }[] | null)?.[0]?.edicion_id;
  if (!edId) return NextResponse.json({ error: "No hay una edición abierta" }, { status: 400 });

  // Cap por DNI: nº de membresías activas ya compradas + esta compra ≤ cap.
  const { data: prog } = await sb.from("club_programa").select("pass_cap_por_dni").single();
  const cap = (prog as { pass_cap_por_dni?: number } | null)?.pass_cap_por_dni ?? 9;
  const { data: miembroPrev } = await sb.from("club_miembros").select("id").eq("dni", dni!).maybeSingle();
  let yaTiene = 0;
  if (miembroPrev?.id) {
    const { count } = await sb
      .from("club_pass")
      .select("id", { count: "exact", head: true })
      .eq("miembro_id", miembroPrev.id)
      .eq("estado", "activo");
    yaTiene = count ?? 0;
  }
  if (yaTiene + qty > cap) {
    return NextResponse.json(
      { error: `Máximo ${cap} membresías por DNI (ya tenés ${yaTiene}).` },
      { status: 400 },
    );
  }

  // Precio unitario (aplica lealtad por unidad si corresponde)
  const { precio: precioUnit } = await pricingFor(sb, "pass", perfil, edId, dni);
  const total = Math.round(precioUnit * qty * 100) / 100;
  const emailCobro = email && String(email).includes("@") ? String(email).trim() : `club_${dni}@ecodriveplus.com`;

  // Cobro Culqi (un solo cargo por el total)
  let charge: { object?: string; id?: string; user_message?: string; merchant_message?: string; type?: string };
  try {
    const culqiRes = await fetch("https://api.culqi.com/v2/charges", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(total * 100),
        currency_code: "PEN",
        email: emailCobro,
        source_id: token,
        description: `EcoDrive+ Club — ${qty} Membresía${qty > 1 ? "s" : ""}`,
        metadata: { producto: "ecodrive_club_multi", dni, edicion_id: edId, cantidad: String(qty) },
      }),
    });
    charge = await culqiRes.json();
    if (!(culqiRes.ok && charge?.object === "charge" && charge?.id)) {
      return NextResponse.json(
        { error: charge?.user_message || charge?.merchant_message || "No se pudo procesar el pago." },
        { status: 402 },
      );
    }
  } catch (e) {
    console.error("[club/comprar-membresias] culqi:", e);
    return NextResponse.json({ error: "No se pudo contactar la pasarela de pago." }, { status: 502 });
  }

  // Idempotencia: si este cargo ya creó membresías, devolverlas
  const { data: yaPasses } = await sb
    .from("club_pass")
    .select("id,payment_intent_id")
    .like("payment_intent_id", `${charge.id}-%`);
  if (yaPasses && yaPasses.length > 0) {
    return NextResponse.json({
      ok: true,
      compra_id: charge.id,
      edicion_id: edId,
      cantidad: yaPasses.length,
      precio_unit: precioUnit,
      pass_ids: yaPasses.map((p) => p.id),
      duplicate: true,
    });
  }

  // Miembro (crear o recuperar)
  let { data: miembro } = await sb.from("club_miembros").select("*").eq("dni", dni!).maybeSingle();
  if (!miembro) {
    const ins = await sb
      .from("club_miembros")
      .insert({ nombre: nombre.trim(), dni, whatsapp: wa, tipo_perfil: perfil })
      .select("*")
      .single();
    miembro = ins.data;
  }
  if (!miembro) return NextResponse.json({ error: "No se pudo crear el miembro" }, { status: 500 });

  // Crear N membresías (sin número aún)
  const fechaFin = new Date();
  fechaFin.setFullYear(fechaFin.getFullYear() + 1);
  const { count: passBase } = await sb
    .from("club_pass")
    .select("id", { count: "exact", head: true })
    .eq("miembro_id", miembro.id);

  const passIds: string[] = [];
  for (let i = 0; i < qty; i++) {
    const { data: pass, error } = await sb
      .from("club_pass")
      .insert({
        miembro_id: miembro.id,
        numero_pass_en_dni: (passBase ?? 0) + 1 + i,
        precio_pagado: precioUnit,
        fecha_fin: fechaFin.toISOString().slice(0, 10),
        estado: "activo",
        payment_method: "culqi",
        payment_intent_id: `${charge.id}-${i}`,
      })
      .select("id")
      .single();
    if (error || !pass) {
      console.error("[club/comprar-membresias] fallo crear pass", error?.message);
      continue;
    }
    passIds.push(pass.id);
  }

  // Registrar el pago (total)
  await sb.from("club_pagos").insert({
    tipo: "pass",
    miembro_id: miembro.id,
    metodo: "culqi",
    monto: total,
    estado: "confirmado",
    raw_payload: { charge_id: charge.id, cantidad: qty, producto: "ecodrive_club_multi" },
  });
  await sb
    .from("club_miembros")
    .update({ total_gastado: Number(miembro.total_gastado ?? 0) + total })
    .eq("id", miembro.id);

  return NextResponse.json({
    ok: true,
    compra_id: charge.id,
    miembro_id: miembro.id,
    edicion_id: edId,
    cantidad: qty,
    precio_unit: precioUnit,
    pass_ids: passIds,
  });
}
