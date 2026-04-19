import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({});

  const supabase = await createClient();
  const { data: user } = await supabase
    .from("novia_users")
    .select("name, novia_name, personality, avatar_id")
    .eq("token", token)
    .single();

  return NextResponse.json(user ?? {});
}
