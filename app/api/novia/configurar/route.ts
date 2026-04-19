import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token, name, novia_name, personality, avatar_id } = await req.json();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { name, novia_name: novia_name || "Sofía", personality, last_seen: new Date().toISOString() };
  if (avatar_id) update.avatar_id = avatar_id;

  await supabase
    .from("novia_users")
    .update(update)
    .eq("token", token);

  return NextResponse.json({ ok: true });
}
