"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const params = useSearchParams();
  const phoneFromQuery = params.get("phone") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(phoneFromQuery);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (phoneFromQuery) {
      // Persist for the onboarding step
      sessionStorage.setItem("sofia_signup_phone", phoneFromQuery);
    }
  }, [phoneFromQuery]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      // Direct signup endpoint con auto-confirm (sin SMTP rate limit)
      const r = await fetch("/api/sofia-auth/signup-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, phone }),
      });
      const body = await r.json();
      if (!r.ok || !body.ok) {
        setErr(body.error || "Error creando la cuenta");
        return;
      }
      // Set session en client para que el dashboard lo reconozca
      if (body.access_token && body.refresh_token) {
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
        });
      }
      setMsg("¡Cuenta creada! Redirigiendo...");
      setTimeout(() => {
        window.location.href = "/sofia-onboarding" + (phone ? `?phone=${encodeURIComponent(phone)}` : "");
      }, 800);
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
          <h1 className="text-3xl font-extrabold text-gray-900">Empieza con Miss Sofia</h1>
          <p className="text-gray-500 mt-1">3 minutos gratis al día. Sin tarjeta.</p>
          {phoneFromQuery && (
            <div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-xs p-2 rounded-2xl">
              ✨ Llegaste desde WhatsApp. Tu nivel detectado se conecta automáticamente.
            </div>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tu correo electrónico
            </label>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-2 border-gray-200 bg-white rounded-2xl px-4 py-4 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Crea una contraseña
            </label>
            <input
              type="password"
              placeholder="mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="w-full border-2 border-gray-200 bg-white rounded-2xl px-4 py-4 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B4A] text-white rounded-2xl py-4 font-bold text-lg hover:bg-[#e8512f] disabled:bg-gray-300"
          >
            {loading ? "Creando..." : "Crear cuenta gratis"}
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
          ¿Ya tienes cuenta?{" "}
          <a href="/sofia-auth/login" className="text-[#FF6B4A] font-semibold hover:underline">
            Inicia sesión
          </a>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
