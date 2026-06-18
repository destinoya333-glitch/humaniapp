/** POST /api/tudramaya/checkin — check-in diario (gana monedas según racha). */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkin } from "@/lib/tudramaya/monedas";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
    const r = await checkin(user.id);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}
