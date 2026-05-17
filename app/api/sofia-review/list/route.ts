/**
 * GET /api/sofia-review/list?user_id=...&limit=20&include_dismissed=0
 *
 * Lista las review cards APA del usuario, ordenadas por created_at desc.
 * Por defecto solo devuelve las no descartadas (dismissed_at IS NULL).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const includeDismissed = searchParams.get("include_dismissed") === "1";

  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let q = supabase
    .from("mse_review_cards")
    .select("id, session_id, category, user_phrase, correction, explanation_es, severity, created_at, dismissed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!includeDismissed) {
    q = q.is("dismissed_at", null);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cards: data ?? [] });
}
