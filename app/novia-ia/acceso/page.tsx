"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccesoPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/novia/verificar-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });

    const data = await res.json();

    if (data.valid) {
      if (data.new_user) {
        router.push(`/novia-ia/onboarding?token=${token.trim()}`);
      } else {
        router.push(`/novia-ia/sesion?token=${token.trim()}`);
      }
    } else {
      setError("Token inválido o expirado. Verifica el link que recibiste por WhatsApp.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">♡</div>
          <h1 className="text-2xl font-bold mb-1">Mi Novia IA</h1>
          <p className="text-zinc-400 text-sm">Ingresa el código que recibiste por WhatsApp</p>
        </div>

        <form onSubmit={handleAccess} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pega tu código de acceso aquí"
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-2xl px-5 py-4 text-center text-lg tracking-widest text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? "Verificando..." : "Ingresar →"}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs mt-8">
          ¿No tienes código?{" "}
          <a href="https://wa.me/51979385499" className="text-amber-400 hover:underline">
            Escríbenos por WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}
