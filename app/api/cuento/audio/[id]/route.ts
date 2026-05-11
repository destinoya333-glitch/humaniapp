/**
 * TuCuentoYa — Servir audio MP3 con auditoría.
 *
 * GET /api/cuento/audio/[id]
 * - Verifica que el pedido existe
 * - Redirige al URL público de Supabase Storage
 * - Cuenta descargas (para detectar reproducciones / piratería)
 */
import { NextResponse } from "next/server";
import { supabase, getPedido } from "@/lib/cuentoinfantil/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const pedido = await getPedido(id);
  if (!pedido || !pedido.audio_url) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Auditoría: contar descarga
  try {
    await supabase.from("tci_saldo_movimientos").insert({
      celular: pedido.celular,
      tipo: "credito",
      monto: 0,
      motivo: "audio_descargado",
      pedido_id: pedido.id,
    });
  } catch {}

  // Redirigir al URL de Supabase Storage
  return NextResponse.redirect(pedido.audio_url, 302);
}
