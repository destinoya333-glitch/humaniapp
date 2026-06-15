"use client";

/**
 * TuDramaYa — login. Prioriza OAuth (Google/Facebook: sin correos, 1 toque).
 * Magic-link por correo como respaldo. Sesión compartida con ActivosYA
 * (callback /sofia-auth/callback?next=/tudramaya).
 */
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CALLBACK = "/sofia-auth/callback?next=/tudramaya";

export default function LoginTuDramaYa() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function oauth(provider: "google" | "facebook") {
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${CALLBACK}` },
      });
      if (error) throw error;
    } catch (e) {
      setErr(`No se pudo abrir ${provider}. ${(e as Error).message}`);
    }
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${CALLBACK}` },
      });
      if (error) throw error;
      setMsg("📩 Te enviamos un link de acceso al correo. Ábrelo (revisa Spam) y vuelves desbloqueado.");
    } catch (e) {
      const m = (e as Error).message;
      setErr(/rate limit/i.test(m)
        ? "Demasiados intentos por correo. Espera unos minutos o entra con Google/Facebook."
        : m);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 p-5 text-white">
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tudramaya-logo.png" alt="TuDramaYa" className="h-12 w-auto mx-auto mb-2" />
        <p className="text-center text-neutral-400 text-sm mb-7">Ingresa para ver tus capítulos</p>

        {/* Google */}
        <button
          onClick={() => oauth("google")}
          className="w-full flex items-center justify-center gap-3 bg-white text-neutral-800 rounded-xl py-3.5 font-semibold mb-3 active:scale-[.99]"
        >
          <span className="text-lg font-bold text-[#4285F4]">G</span>
          Continuar con Google
        </button>

        {/* Facebook */}
        <button
          onClick={() => oauth("facebook")}
          className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white rounded-xl py-3.5 font-semibold active:scale-[.99]"
        >
          <span className="text-lg font-bold">f</span>
          Continuar con Facebook
        </button>

        {/* divisor */}
        <div className="flex items-center gap-3 my-6 text-neutral-600 text-xs">
          <div className="h-px flex-1 bg-neutral-800" /> o con tu correo <div className="h-px flex-1 bg-neutral-800" />
        </div>

        {/* Magic link */}
        <form onSubmit={magicLink} className="space-y-3">
          <input
            type="email"
            inputMode="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white rounded-xl py-3.5 font-semibold disabled:bg-neutral-700"
          >
            {loading ? "Enviando…" : "Enviarme link de acceso"}
          </button>
        </form>

        {msg && (
          <div className="mt-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm p-3 rounded-xl">{msg}</div>
        )}
        {err && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl">{err}</div>
        )}
      </div>
    </main>
  );
}
