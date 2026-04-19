import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ valid: false });

  const supabase = await createClient();

  const { data: user } = await supabase
    .from("novia_users")
    .select("id, name, novia_name")
    .eq("token", token)
    .single();

  if (!user) return NextResponse.json({ valid: false });

  const { data: session } = await supabase
    .from("novia_sessions")
    .select("id, minutes_total, minutes_used, expires_at")
    .eq("user_id", user.id)
    .eq("active", true)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!session) return NextResponse.json({ valid: false, reason: "sin_sesion_activa" });

  return NextResponse.json({
    valid: true,
    new_user: !user.name,
    minutes_remaining: session.minutes_total - session.minutes_used,
  });
}
