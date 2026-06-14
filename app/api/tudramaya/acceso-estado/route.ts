/**
 * POST /api/tudramaya/acceso-estado
 * Devuelve si el usuario ya tiene acceso a (serie, numero). Lo usa el muro de
 * pago para sondear tras el Yape y desbloquear automático cuando MacroDroid
 * confirma el pago (sin que el usuario recargue).
 *
 * Body: { user_id, serie_id, numero }
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccesos, accesosCubren } from "@/lib/tudramaya/accesos";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { user_id, serie_id, numero } = await req.json();
    if (!user_id || !serie_id || numero == null) {
      return NextResponse.json({ desbloqueado: false });
    }
    const accesos = await getAccesos(user_id, serie_id);
    return NextResponse.json({ desbloqueado: accesosCubren(accesos, Number(numero)) });
  } catch {
    return NextResponse.json({ desbloqueado: false });
  }
}
