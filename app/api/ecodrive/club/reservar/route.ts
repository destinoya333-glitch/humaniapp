import { NextRequest, NextResponse } from "next/server";
import {
  getClubClient,
  normalizeWhatsapp,
  isValidDni,
  pricingFor,
  type Modalidad,
  type TipoPerfil,
} from "@/lib/ecodrive/club";

export const dynamic = "force-dynamic";

const RESERVA_TTL_MIN = 15;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    edicion_id,
    modalidad,
    dni,
    whatsapp,
    nombre,
    tipo_perfil,
    numero_correlativo,
    metodo_pago_preferido,
  } = body as {
    edicion_id?: string;
    modalidad?: Modalidad;
    dni?: string;
    whatsapp?: string;
    nombre?: string;
    tipo_perfil?: TipoPerfil;
    numero_correlativo?: number;
    metodo_pago_preferido?: "yape" | "niubiz";
  };

  // Programa full-membresía: solo aceptamos Pass anual. El ticket suelto se descontinuó
  // (requería autorización MINCETUR Form. 002; el Pass se ampara en DS 006-2000-ITINCI Art. 2 inc. b).
  if (modalidad !== "pass")
    return NextResponse.json({ error: "solo se vende Club Pass anual" }, { status: 400 });
  if (!isValidDni(dni || ""))
    return NextResponse.json({ error: "DNI invalido (8 digitos)" }, { status: 400 });
  const wa = normalizeWhatsapp(whatsapp || "");
  if (!wa) return NextResponse.json({ error: "whatsapp invalido" }, { status: 400 });
  if (!nombre || nombre.trim().length < 3)
    return NextResponse.json({ error: "nombre invalido" }, { status: 400 });
  const perfil: TipoPerfil = (tipo_perfil ?? "publico") as TipoPerfil;

  const sb = getClubClient();

  let edId = edicion_id;
  if (!edId) {
    const { data: actual } = await sb.rpc("club_edicion_actual");
    edId = actual?.[0]?.edicion_id;
  }

  if (modalidad === "pass") {
    const { data: prog } = await sb.from("club_programa").select("pass_cap_por_dni").single();
    const cap = prog?.pass_cap_por_dni ?? 9;

    // Cap por edicion vigente: contar tickets confirmados + reservas activas del mismo DNI
    // en la edicion que se esta vendiendo. Se resetea automaticamente al cerrar la edicion
    // (los tickets quedan vinculados a esa edicion). En la practica = "X por mes" si cada
    // edicion dura ~1 mes.
    const { data: miembro } = await sb.from("club_miembros").select("id").eq("dni", dni!).maybeSingle();
    let used = 0;
    if (miembro?.id) {
      const { count: tCount } = await sb
        .from("club_tickets")
        .select("id", { count: "exact", head: true })
        .eq("miembro_id", miembro.id)
        .eq("edicion_id", edId!)
        .eq("estado", "confirmado");
      used += tCount ?? 0;
    }
    const { count: rCount } = await sb
      .from("club_reservas")
      .select("id", { count: "exact", head: true })
      .eq("dni", dni!)
      .eq("edicion_id", edId!)
      .gt("expira_en", new Date().toISOString());
    used += rCount ?? 0;

    if (used >= cap) {
      return NextResponse.json(
        { error: `limite alcanzado: max ${cap} Pass por DNI en la edicion vigente (tenes ${used})` },
        { status: 400 }
      );
    }
  }

  let numero = numero_correlativo;
  if (!numero) {
    const { data: ed } = await sb
      .from("club_ediciones")
      .select("meta_tickets")
      .eq("id", edId!)
      .single();
    const meta = ed?.meta_tickets ?? 3000;
    for (let i = 0; i < 20; i++) {
      numero = 1 + Math.floor(Math.random() * meta);
      const { data: tk } = await sb
        .from("club_tickets")
        .select("id")
        .eq("edicion_id", edId!)
        .eq("numero_correlativo", numero)
        .maybeSingle();
      const { data: rv } = await sb
        .from("club_reservas")
        .select("id")
        .eq("edicion_id", edId!)
        .eq("numero_correlativo", numero)
        .gt("expira_en", new Date().toISOString())
        .maybeSingle();
      if (!tk && !rv) break;
    }
  }

  const { precio, descripcion, descuento_lealtad } = await pricingFor(sb, modalidad, perfil, edId, dni);
  const expira = new Date(Date.now() + RESERVA_TTL_MIN * 60_000).toISOString();

  const { data: reserva, error } = await sb
    .from("club_reservas")
    .insert({
      edicion_id: edId,
      numero_correlativo: numero,
      modalidad,
      whatsapp: wa,
      dni,
      nombre: nombre.trim(),
      tipo_perfil: perfil,
      precio_esperado: precio,
      expira_en: expira,
      metodo_pago_preferido,
    })
    .select("id,numero_correlativo,expira_en,precio_esperado")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const yape = `https://yape.com.pe/?qr=ecodriveplus&monto=${precio}&ref=GAR-${reserva.numero_correlativo}`;
  return NextResponse.json({
    ok: true,
    reserva_id: reserva.id,
    numero_correlativo: reserva.numero_correlativo,
    precio: Number(reserva.precio_esperado),
    descripcion,
    descuento_lealtad: descuento_lealtad ?? 0,
    expira_en: reserva.expira_en,
    pagar: {
      yape: {
        celular_destino: "998102258",
        monto: Number(reserva.precio_esperado),
        glosa: `CLUB-${reserva.numero_correlativo}`,
        qr_url: yape,
      },
      niubiz_form_url: `/ecodriveplus/club/pagar?reserva=${reserva.id}`,
    },
  });
}
