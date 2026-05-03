import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/ecodrive/sorteo/ejecutar
// Headers: x-cron-secret: <ECO_CRON_SECRET>
// Body opcional: { fecha?: "YYYY-MM-DD", premio_soles?: number }
// Ejecuta sorteo del día: pickea ganador random ponderado por tickets,
// guarda en sorteos_diarios y devuelve datos para que n8n notifique por WhatsApp.
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret");
    if (secret !== process.env.ECO_CRON_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const fecha: string = body.fecha || new Date().toISOString().slice(0, 10);
    const premio: number = body.premio_soles ?? 20;

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Verificar que no se haya sorteado ya
    const { data: existing } = await sb
      .from("sorteos_diarios")
      .select("*")
      .eq("fecha", fecha)
      .maybeSingle();
    if (existing && existing.estado !== "pendiente") {
      return NextResponse.json({ ok: true, ya_sorteado: true, sorteo: existing });
    }

    // 2. Obtener todos los tickets del día
    const { data: tickets, error: errTickets } = await sb
      .from("sorteos_tickets")
      .select("id, user_phone, user_name, user_role")
      .eq("fecha", fecha);

    if (errTickets) return NextResponse.json({ error: errTickets.message }, { status: 500 });

    if (!tickets || tickets.length === 0) {
      // No hay participantes: registrar sorteo "desierto"
      const { data: empty } = await sb
        .from("sorteos_diarios")
        .upsert({
          fecha,
          premio_soles: premio,
          premio_descripcion: `Bono S/.${premio} BilleteraEco`,
          total_tickets: 0,
          total_participantes: 0,
          estado: "sorteado",
          sorteado_at: new Date().toISOString(),
        }, { onConflict: "fecha" })
        .select()
        .single();
      return NextResponse.json({ ok: true, desierto: true, sorteo: empty });
    }

    // 3. Elegir ganador random (ponderado por tickets — cada ticket cuenta)
    const ganador = tickets[Math.floor(Math.random() * tickets.length)];
    const participantesUnicos = new Set(tickets.map((t) => t.user_phone)).size;

    const { data: sorteo, error: errSorteo } = await sb
      .from("sorteos_diarios")
      .upsert({
        fecha,
        premio_soles: premio,
        premio_descripcion: `Bono S/.${premio} BilleteraEco`,
        ganador_phone: ganador.user_phone,
        ganador_name: ganador.user_name,
        ganador_role: ganador.user_role,
        ticket_ganador_id: ganador.id,
        total_tickets: tickets.length,
        total_participantes: participantesUnicos,
        estado: "sorteado",
        sorteado_at: new Date().toISOString(),
      }, { onConflict: "fecha" })
      .select()
      .single();

    if (errSorteo) return NextResponse.json({ error: errSorteo.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      ganador_phone: ganador.user_phone,
      ganador_name: ganador.user_name,
      premio_soles: premio,
      total_tickets: tickets.length,
      total_participantes: participantesUnicos,
      sorteo,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// GET /api/ecodrive/sorteo/ejecutar?fecha=YYYY-MM-DD
// Consulta info pública del sorteo de un día (para página /sorteos)
export async function GET(req: NextRequest) {
  try {
    const fecha = req.nextUrl.searchParams.get("fecha") || new Date().toISOString().slice(0, 10);
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await sb.from("sorteos_diarios").select("*").eq("fecha", fecha).maybeSingle();
    return NextResponse.json({ fecha, sorteo: data });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
