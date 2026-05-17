/**
 * POST /api/sofia-review/dismiss
 * Body: { card_id, user_id }
 *
 * Marca la card como descartada (dismissed_at = now()). No la borra.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { card_id, user_id } = await req.json();
    if (!card_id || !user_id) {
      return NextResponse.json({ error: "card_id and user_id required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from("mse_review_cards")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", card_id)
      .eq("user_id", user_id)
      .is("dismissed_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
