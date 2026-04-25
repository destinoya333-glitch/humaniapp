/**
 * GET /api/sofia-progress?user_id=...
 * Returns student profile + last sessions + recent exams.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: user }, { data: profile }, { data: sessions }, { data: exams }, { data: usageRows }] =
    await Promise.all([
      supabase.from("mse_users").select("*").eq("id", userId).maybeSingle(),
      supabase.from("mse_student_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("mse_sessions")
        .select("id, level, week_number, day_name, session_type, duration_seconds, started_at, ended_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(10),
      supabase
        .from("mse_weekly_exams")
        .select("*")
        .eq("user_id", userId)
        .order("taken_at", { ascending: false })
        .limit(5),
      supabase
        .from("mse_daily_usage")
        .select("usage_date, seconds_used")
        .eq("user_id", userId)
        .order("usage_date", { ascending: false })
        .limit(7),
    ]);

  return NextResponse.json({
    user,
    profile,
    sessions: sessions ?? [],
    exams: exams ?? [],
    weeklyUsage: usageRows ?? [],
  });
}
