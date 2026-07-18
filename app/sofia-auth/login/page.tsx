"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicMode, setMagicMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Recuperar contraseña → envía correo con link a nuestra página /miss-sofia/reset
  async function resetPwd() {
    if (!email || !email.includes("@")) {
      setErr("Escribe tu correo arriba y toca de nuevo.");
      return;
    }
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/miss-sofia/reset`,
      });
      if (error) throw error;
      setMsg("Te enviamos un correo para crear una nueva contraseña. Revisa tu bandeja.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    try {
      if (magicMode) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/sofia-auth/callback` },
        });
        if (error) throw error;
        setMsg("Te enviamos un link mágico al correo. Revisa tu bandeja.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/sofia-chat";
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-[#FFF3EC] to-[#FFE0D8] px-6 py-8">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <img
            src="/sofia-avatar.jpg"
            alt="Miss Sofia"
            className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-white shadow-md mb-4"
          />
          <h1 className="text-3xl font-extrabold text-gray-900">¡Hola de nuevo! 👋</h1>
          <p className="text-gray-500 mt-1">Miss Sofia te está esperando</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tu correo</label>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-2 border-gray-200 bg-white rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>

          {!magicMode && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tu contraseña</label>
              <input
                type="password"
                placeholder="tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!magicMode}
                className="w-full border-2 border-gray-200 bg-white rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-[#FF6B4A]"
              />
              <button
                type="button"
                onClick={resetPwd}
                className="mt-2 text-sm text-[#FF6B4A] font-medium hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B4A] text-white rounded-2xl py-4 font-bold text-lg hover:bg-[#e8512f] disabled:bg-gray-300"
          >
            {loading ? "Cargando..." : magicMode ? "Enviar link mágico" : "Ingresar"}
          </button>

          <button
            type="button"
            onClick={() => setMagicMode(!magicMode)}
            className="w-full text-sm text-gray-500 hover:text-[#FF6B4A]"
          >
            {magicMode ? "Prefiero usar mi contraseña" : "Entrar con link mágico (sin contraseña)"}
          </button>
        </form>

        {msg && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-2xl">
            {msg}
          </div>
        )}
        {err && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-2xl">
            {err}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          ¿Primera vez?{" "}
          <a href="/sofia-auth/signup" className="text-[#FF6B4A] font-semibold hover:underline">
            Crea tu cuenta
          </a>
        </div>
      </div>
    </main>
  );
}
