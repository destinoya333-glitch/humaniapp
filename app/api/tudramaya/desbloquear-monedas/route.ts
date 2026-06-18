/** POST /api/tudramaya/desbloquear-monedas — gasta monedas para abrir un cap. */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { desbloquearConMonedas } from "@/lib/tudramaya/monedas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { serie_id, episodio } = await req.json();
    if (!serie_id || episodio == null) {
      return NextResponse.json({ ok: false, error: "datos incompletos" }, { status: 400 });
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "no_auth" }, { status: 401 });
    const r = await desbloquearConMonedas({ userId: user.id, serieId: serie_id, episodio: Number(episodio) });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ ok: false, error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}
