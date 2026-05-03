import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/ecodrive/sorteo/ticket
// Body: { user_phone, user_name?, user_role, viaje_id? }
// Registra 1 ticket para el sorteo del día.
// Idempotente por viaje_id (no permite duplicados del mismo viaje).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { user_phone, user_name, user_role, viaje_id } = body;

    if (!user_phone) return NextResponse.json({ error: "user_phone required" }, { status: 400 });
    const role = user_role === "chofer" ? "chofer" : "pasajero";

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Idempotencia por viaje_id
    if (viaje_id) {
      const { data: existing } = await sb
        .from("sorteos_tickets")
        .select("id")
        .eq("viaje_id", viaje_id)
        .eq("user_phone", user_phone)
        .limit(1)
        .maybeSingle();
      if (existing) return NextResponse.json({ ok: true, ticket_id: existing.id, duplicated: true });
    }

    const { data, error } = await sb
      .from("sorteos_tickets")
      .insert({ user_phone, user_name, user_role: role, viaje_id })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ticket_id: data?.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// GET /api/ecodrive/sorteo/ticket?phone=51994810242
// Devuelve cuántos tickets tiene HOY el usuario
export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get("phone");
    if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await sb
      .from("sorteos_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_phone", phone)
      .eq("fecha", today);

    return NextResponse.json({ phone, fecha: today, tickets_hoy: count ?? 0 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
