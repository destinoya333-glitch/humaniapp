/** GET /api/tudramaya/perfil — perfil + billetera del usuario logueado. */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/tudramaya/monedas";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ user: null });
    const perfil = await getPerfil(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email }, perfil });
  } catch (e) {
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}
