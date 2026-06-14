/**
 * POST /api/tudramaya/evento
 * Registra una métrica de visualización (play | complete | compartir | ...).
 * Sirve para medir RETENCIÓN, la señal clave de validación del piloto.
 *
 * Body: { user_id?, episodio_id?, tipo, metadata? }
 */
import { NextRequest, NextResponse } from "next/server";
import { registrarEvento } from "@/lib/tudramaya/db";

export const runtime = "nodejs";

const TIPOS = new Set([
  "play",
  "complete",
  "compartir",
  "paywall_visto",
  "checkout_iniciado",
]);

export async function POST(req: NextRequest) {
  try {
    const { user_id, episodio_id, tipo, metadata } = await req.json();
    if (!tipo || !TIPOS.has(tipo)) {
      return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
    }
    await registrarEvento({ userId: user_id ?? null, episodioId: episodio_id ?? null, tipo, metadata });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}
