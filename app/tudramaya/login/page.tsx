"use client";

/**
 * TuDramaYa — login por magic link (Supabase Auth, sesión compartida con ActivosYA).
 * Reusa el callback existente /sofia-auth/callback; la sesión vale para todo el dominio.
 */
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginTuDramaYa() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/sofia-auth/callback` },
      });
      if (error) throw error;
      setMsg("Te enviamos un link de acceso al correo. Ábrelo y vuelve a TuDramaYa.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 p-4 text-white">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 max-w-md w-full p-8">
        <h1 className="text-2xl font-extrabold text-center">
          TuDrama<span className="text-rose-500">Ya</span>
        </h1>
        <p className="text-sm text-neutral-400 text-center mb-6">Ingresa para seguir viendo.</p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white rounded-lg py-2.5 font-semibold disabled:bg-neutral-600"
          >
            {loading ? "Enviando…" : "Enviarme link de acceso"}
          </button>
        </form>

        {msg && (
          <div className="mt-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm p-3 rounded-lg">
            {msg}
          </div>
        )}
        {err && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg">
            {err}
          </div>
        )}
      </div>
    </main>
  );
}
