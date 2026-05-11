/**
 * POST /api/sofia-auth/signup-direct
 *
 * Crea usuario con email auto-confirmado (sin envío de correo) y devuelve
 * la session inmediata para auto-login. Bypassa el rate limit del SMTP de
 * Supabase y la latencia del flujo email-confirm.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email as string)?.trim().toLowerCase();
    const password = body.password as string;
    const phone = (body.phone as string)?.trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "email inválido" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "password >= 8 caracteres" }, { status: 400 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1. Crear usuario con email auto-confirmado
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // ⭐ skip correo
      user_metadata: phone ? { whatsapp_phone: phone } : undefined,
    });

    if (createErr) {
      // Si ya existe, intentar resetear password y devolver session
      if (/already registered|already been registered|already exists/i.test(createErr.message)) {
        return NextResponse.json(
          { error: "Este correo ya tiene cuenta. Usa 'Iniciar sesión' o recupera tu contraseña." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    // 2. Login con email + password para obtener session
    const publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: sess, error: loginErr } = await publicClient.auth.signInWithPassword({
      email,
      password,
    });
    if (loginErr || !sess.session) {
      return NextResponse.json({
        ok: true,
        userId: created.user?.id,
        warning: "Usuario creado, login requiere reintento manual",
      });
    }

    return NextResponse.json({
      ok: true,
      userId: created.user?.id,
      access_token: sess.session.access_token,
      refresh_token: sess.session.refresh_token,
    });
  } catch (e) {
    console.error("signup-direct error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 },
    );
  }
}
