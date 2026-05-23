import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSession, destroySession } from "@/lib/ecodrive/verifier-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { user, pass } = body as { user?: string; pass?: string };
  if (!user || !pass) {
    return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });
  }
  const account = authenticate(user, pass);
  if (!account) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }
  await createSession(account);
  return NextResponse.json({ ok: true, entidad: account.entidad });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
