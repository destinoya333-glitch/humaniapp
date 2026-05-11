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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-2xl">
            👩‍🏫
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Empieza con Miss Sofia
          </h1>
          <p className="text-sm text-gray-500">3 minutos gratis al día. Sin tarjeta.</p>
          {phoneFromQuery && (
            <div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-xs p-2 rounded-lg">
              ✨ Llegaste desde WhatsApp. Tu nivel detectado se conecta automáticamente.
            </div>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tu correo electrónico
            </label>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crea una contraseña
            </label>
            <input
              type="password"
              placeholder="mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Creating..." : "Create free account"}
          </button>
        </form>

        {msg && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg">
            {msg}
          </div>
        )}
        {err && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {err}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/sofia-auth/login" className="text-blue-600 hover:underline">
            Sign in
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
