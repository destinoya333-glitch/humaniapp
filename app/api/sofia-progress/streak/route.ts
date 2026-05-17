/**
 * GET /api/sofia-progress/streak?user_id=...&days=90
 *
 * Devuelve sesiones por día de los últimos N días para heatmap.
 * Cuenta tanto mse_sessions (conversaciones) como mse_capsule_sessions
 * (cápsulas APA) — cada una pesa 1.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type DayCount = { date: string; count: number };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const days = Math.min(180, Math.max(7, parseInt(searchParams.get("days") ?? "90", 10) || 90));
  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Sesiones de voz
  const { data: sessions } = await supabase
    .from("mse_sessions")
    .select("started_at")
    .eq("user_id", userId)
    .gte("started_at", since);

  // Cápsulas APA
  const { data: capsules } = await supabase
    .from("mse_capsule_sessions")
    .select("started_at")
    .eq("user_id", userId)
    .gte("started_at", since);

  const dayMap = new Map<string, number>();
  function bump(iso: string | null | undefined) {
    if (!iso) return;
    const d = iso.slice(0, 10); // YYYY-MM-DD
    dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
  }
  (sessions ?? []).forEach((s) => bump((s as { started_at: string }).started_at));
  (capsules ?? []).forEach((s) => bump((s as { started_at: string }).started_at));

  // Build array de los últimos `days` días, ordenados ascendente
  const today = new Date();
  const result: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    result.push({ date: iso, count: dayMap.get(iso) ?? 0 });
  }

  // Compute current streak (días consecutivos con al menos 1 sesión desde hoy hacia atrás)
  let streak = 0;
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].count > 0) streak++;
    else break;
  }

  return NextResponse.json({
    days: result,
    current_streak: streak,
    total_sessions: result.reduce((acc, d) => acc + d.count, 0),
  });
}
