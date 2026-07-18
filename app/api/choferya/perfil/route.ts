import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyChoferPanelToken } from "@/lib/activosya/choferya-token";
import { normalizarTelefonoPE } from "@/lib/activosya/operadores";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function auth(req: NextRequest):
  | { ok: true; choferId: string }
  | { ok: false; status: number; msg: string } {
  const token = new URL(req.url).searchParams.get("token") || req.headers.get("x-choferya-token");
  if (!token) return { ok: false, status: 401, msg: "token requerido" };
  const v = verifyChoferPanelToken(token);
  if (!v.ok) return { ok: false, status: 401, msg: `token: ${v.reason}` };
  return { ok: true, choferId: v.choferId };
}

// PATCH — actualiza bio, zonas, yape del chofer
export async function PATCH(req: NextRequest) {
  const a = auth(req);
  if (!a.ok) return NextResponse.json({ error: a.msg }, { status: a.status });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.bio !== undefined) updates.choferya_bio = body.bio ? String(body.bio).slice(0, 500) : null;
  if (body.zonas !== undefined) {
    if (!Array.isArray(body.zonas))
      return NextResponse.json({ error: "zonas debe ser array" }, { status: 400 });
    updates.choferya_zonas = body.zonas.length > 0
      ? body.zonas.map((z: unknown) => String(z).trim()).filter(Boolean).slice(0, 10)
      : null;
  }
  if (body.yape_celular !== undefined) {
    const n = normalizarTelefonoPE(String(body.yape_celular));
    if (!n) return NextResponse.json({ error: "Yape inválido" }, { status: 400 });
    updates.yape_celular = n;
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  const { error } = await db()
    .from("eco_choferes")
    .update(updates)
    .eq("id", a.choferId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
