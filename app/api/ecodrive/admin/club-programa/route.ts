/**
 * GET  -> lee la fila actual de club_programa
 * PATCH -> actualiza precio del Pass (pass_precio_publico, pass_precio_interno)
 *
 * Auth: header x-admin-passcode | query ?p= | cookie ecodrive_admin (helper isAdmin)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/ecodrive/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await db()
    .from("club_programa")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, programa: data });
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    pass_precio_publico?: number;
    pass_precio_interno?: number;
    pass_cap_por_dni?: number;
    pass_bonus_lealtad_max?: number;
    pass_descuento_lealtad?: number;
  };

  const update: Record<string, number> = {};
  if (typeof body.pass_precio_publico === "number") update.pass_precio_publico = body.pass_precio_publico;
  if (typeof body.pass_precio_interno === "number") update.pass_precio_interno = body.pass_precio_interno;
  if (typeof body.pass_cap_por_dni === "number") update.pass_cap_por_dni = body.pass_cap_por_dni;
  if (typeof body.pass_bonus_lealtad_max === "number") update.pass_bonus_lealtad_max = body.pass_bonus_lealtad_max;
  if (typeof body.pass_descuento_lealtad === "number") update.pass_descuento_lealtad = body.pass_descuento_lealtad;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no_fields", hint: "envia pass_precio_publico, pass_precio_interno, pass_cap_por_dni, pass_bonus_lealtad_max o pass_descuento_lealtad" }, { status: 400 });
  }

  // club_programa tiene una sola fila; lo actualizamos sin filtro (mas robusto si el id es uuid)
  const sb = db();
  const { data: existing } = await sb.from("club_programa").select("id").limit(1).maybeSingle();
  if (!existing?.id) {
    return NextResponse.json({ error: "club_programa_empty", hint: "no hay fila en club_programa" }, { status: 404 });
  }
  const { data, error } = await sb
    .from("club_programa")
    .update(update)
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Invalida ISR de las paginas que leen club_programa para que reflejen el cambio en seguida.
  try {
    revalidatePath("/ecodriveplus/club");
    revalidatePath("/ecodriveplus/club/como-funciona");
    revalidatePath("/ecodriveplus/club/bases");
    revalidatePath("/ecodriveplus");
  } catch {}

  return NextResponse.json({ ok: true, programa: data });
}
