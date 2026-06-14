/**
 * POST /api/tudramaya/yape-intent
 * Crea un pago PENDIENTE antes de que el usuario yapee, para que el
 * auto-detect de MacroDroid pueda casarlo por monto. Devuelve el número
 * Yape a mostrar. (El respaldo manual es subir la captura a /yape-capture.)
 *
 * Body: { user_id?, serie_id, tier, episodio?, celular? }
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/tudramaya/db";
import { PRECIOS, type Tier } from "@/lib/tudramaya/precios";

export const runtime = "nodejs";

const YAPE_NUMERO = (process.env.TDY_YAPE_NUMERO ?? process.env.TCI_YAPE_NUMERO ?? "998 102 258").trim();

export async function POST(req: NextRequest) {
  try {
    const { user_id, serie_id, tier, episodio, celular } = await req.json();
    if (!serie_id) return NextResponse.json({ error: "serie_id requerido" }, { status: 400 });
    if (!tier || !(tier in PRECIOS)) return NextResponse.json({ error: "tier inválido" }, { status: 400 });

    const monto = PRECIOS[tier as Tier];

    const { data: pago } = await supabase
      .from("tdy_pagos")
      .insert({
        user_id: user_id ?? null,
        celular: celular ?? null,
        serie_id,
        tier,
        episodio: episodio ?? null,
        monto_esperado: monto,
        metodo: "yape",
        estado: "pendiente",
      })
      .select("id")
      .single();

    return NextResponse.json({ ok: true, pago_id: pago?.id ?? null, yape_numero: YAPE_NUMERO, monto });
  } catch (e) {
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}
