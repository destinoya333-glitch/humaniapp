import { NextRequest, NextResponse } from "next/server";
import { getClubClient } from "@/lib/ecodrive/club";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function adminOk(req: NextRequest): boolean {
  const token = (req.headers.get("x-club-admin") || req.nextUrl.searchParams.get("token") || "").trim();
  const env = (process.env.CLUB_ADMIN_TOKEN || "").trim();
  return !!token && !!env && token === env;
}

export async function GET(req: NextRequest) {
  if (!adminOk(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const action = req.nextUrl.searchParams.get("action") || "stats";
  const sb = getClubClient();

  if (action === "stats") {
    const { data: actual } = await sb.rpc("club_edicion_actual");
    const ed = actual?.[0];
    if (!ed) return NextResponse.json({ ok: true, edicion: null });

    const { data: mix } = await sb
      .from("club_tickets")
      .select("origen,miembro_id,club_miembros(tipo_perfil)")
      .eq("edicion_id", ed.edicion_id)
      .eq("estado", "confirmado");

    const counts = { ticket_suelto: 0, pass_auto: 0, pass_bonus: 0, publico: 0, interno_pasajero: 0, interno_conductor: 0 };
    (mix ?? []).forEach((t: { origen: keyof typeof counts; club_miembros: { tipo_perfil: keyof typeof counts } | { tipo_perfil: keyof typeof counts }[] | null }) => {
      counts[t.origen] = (counts[t.origen] ?? 0) + 1;
      const tp = Array.isArray(t.club_miembros) ? t.club_miembros[0]?.tipo_perfil : t.club_miembros?.tipo_perfil;
      if (tp) counts[tp] = (counts[tp] ?? 0) + 1;
    });
    return NextResponse.json({ ok: true, edicion: ed, mix: counts });
  }

  if (action === "miembros") {
    const { data, error } = await sb
      .from("club_miembros")
      .select("id,nombre,dni,whatsapp,tipo_perfil,total_gastado,ediciones_consumidas,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, miembros: data });
  }

  if (action === "ediciones") {
    const { data, error } = await sb
      .from("club_ediciones")
      .select("*")
      .order("numero_edicion", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ediciones: data });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  if (!adminOk(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const sb = getClubClient();

  if (action === "edicion.abrir") {
    const { edicion_id } = body;
    if (!edicion_id) return NextResponse.json({ error: "edicion_id required" }, { status: 400 });
    const { data, error } = await sb
      .from("club_ediciones")
      .update({ estado: "abierta", abierta_at: new Date().toISOString() })
      .eq("id", edicion_id)
      .select("id,estado,abierta_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, edicion: data });
  }

  if (action === "edicion.cerrar") {
    const { edicion_id } = body;
    const { data, error } = await sb
      .from("club_ediciones")
      .update({ estado: "cerrada", cerrada_at: new Date().toISOString() })
      .eq("id", edicion_id)
      .select("id,estado,cerrada_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, edicion: data });
  }

  if (action === "edicion.sortear") {
    const { edicion_id, numero_ganador } = body as { edicion_id?: string; numero_ganador?: number };
    if (!edicion_id) return NextResponse.json({ error: "edicion_id required" }, { status: 400 });
    if (!numero_ganador || !Number.isInteger(numero_ganador) || numero_ganador < 1)
      return NextResponse.json({ error: "numero_ganador required (el que extrajo el notario del anfora)" }, { status: 400 });

    let btcHash = "";
    try {
      const r = await fetch("https://blockchain.info/q/latesthash");
      btcHash = (await r.text()).trim();
    } catch {
      btcHash = "no-disponible";
    }

    const { data: ganadorTicket } = await sb
      .from("club_tickets")
      .select("id,numero_correlativo,miembro_id")
      .eq("edicion_id", edicion_id)
      .eq("numero_correlativo", numero_ganador)
      .eq("estado", "confirmado")
      .maybeSingle();

    if (!ganadorTicket)
      return NextResponse.json({ error: `el numero ${numero_ganador} no existe o no fue vendido en esta edicion` }, { status: 400 });

    await sb.from("club_tickets").update({ estado: "no_ganador" }).eq("edicion_id", edicion_id).eq("estado", "confirmado");
    await sb.from("club_tickets").update({ estado: "ganador" }).eq("id", ganadorTicket.id);

    const { data: ed } = await sb
      .from("club_ediciones")
      .update({
        estado: "sorteada",
        sorteo_at: new Date().toISOString(),
        numero_ganador: ganadorTicket.numero_correlativo,
        miembro_ganador_id: ganadorTicket.miembro_id,
        seed_random: btcHash,
      })
      .eq("id", edicion_id)
      .select("*")
      .single();

    return NextResponse.json({
      ok: true,
      edicion: ed,
      ganador: { ticket_id: ganadorTicket.id, numero: ganadorTicket.numero_correlativo, miembro_id: ganadorTicket.miembro_id },
      btc_timestamp_hash: btcHash,
    });
  }

  if (action === "edicion.crear") {
    const { nombre, premio_descripcion, premio_valor, meta_tickets } = body;
    const { data: maxNum } = await sb
      .from("club_ediciones")
      .select("numero_edicion")
      .order("numero_edicion", { ascending: false })
      .limit(1)
      .maybeSingle();
    const next = (maxNum?.numero_edicion ?? 0) + 1;
    const { data, error } = await sb
      .from("club_ediciones")
      .insert({
        numero_edicion: next,
        nombre,
        premio_descripcion,
        premio_valor_referencial: premio_valor,
        meta_tickets: meta_tickets ?? 3000,
        estado: "borrador",
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, edicion: data });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
