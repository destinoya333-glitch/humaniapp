import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token, name, novia_name, personality } = await req.json();
  const supabase = await createClient();

  await supabase
    .from("novia_users")
    .update({ name, novia_name: novia_name || "Sofía", personality, last_seen: new Date().toISOString() })
    .eq("token", token);

  return NextResponse.json({ ok: true });
}
