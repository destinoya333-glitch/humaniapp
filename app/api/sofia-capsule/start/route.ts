/**
 * POST /api/sofia-capsule/start
 * Body: { user_id, passage_id }
 *
 * Crea una mse_capsule_sessions y devuelve el id. Es la entrada al ciclo APA.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { user_id, passage_id } = await req.json();
    if (!user_id || !passage_id) {
      return NextResponse.json({ error: "user_id and passage_id required" }, { status: 400 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabase
      .from("mse_capsule_sessions")
      .insert({ user_id, passage_id })
      .select("id")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
    }
    return NextResponse.json({ capsule_session_id: (data as { id: string }).id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
