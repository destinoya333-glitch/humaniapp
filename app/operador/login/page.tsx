"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function OperadorLoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/operador/auth/callback`,
        },
      });
      if (error) throw error;
      setMsg(
        "Te enviamos un link mágico a tu correo. Revisa tu bandeja (también el spam) y haz click para entrar."
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-amber-400 transition-colors mb-8"
        >
          ← Volver a ActivosYA
        </Link>

        <div className="card-surface rounded-3xl p-8">
          <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase">
            Panel del operador
          </p>
          <h1 className="text-3xl font-bold mb-2">Iniciar sesión</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            Acceso para emprendedores que ya operan un activo digital de
            ActivosYA. Si todavía no tienes acceso,{" "}
            <Link href="/#contacto" className="text-amber-400 hover:text-amber-300">
              solicita un activo aquí
            </Link>
            .
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Email registrado
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-3 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Enviando..." : "Enviar link mágico"}
            </button>

            {msg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {msg}
              </div>
            )}
            {err && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {err}
              </div>
            )}
          </form>

          <p className="text-zinc-500 text-xs mt-6 text-center">
            Sin contraseñas. Te llega un link mágico al correo.
          </p>
        </div>
      </div>
    </main>
  );
}
