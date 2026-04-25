"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Peru");
  const [profession, setProfession] = useState("");
  const [motivation, setMotivation] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/sofia-auth/login";
        return;
      }
      setAuthedEmail(user.email ?? null);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/sofia-auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age: age ? parseInt(age, 10) : null,
          city,
          country,
          profession,
          motivation,
          whatsapp_phone: whatsapp || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en onboarding");
      window.location.href = "/sofia-chat";
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!authedEmail) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-2xl">
            👋
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hi! I&apos;m Sofia.</h1>
          <p className="text-sm text-gray-500">
            Cuéntame un poco sobre ti así te conozco antes de empezar.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="¿Cómo te llamo?" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Edad">
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="25"
                min={10}
                max={99}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </Field>
            <Field label="Ciudad">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Lima"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </Field>
          </div>

          <Field label="País">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option>Peru</option>
              <option>Mexico</option>
              <option>Colombia</option>
              <option>Argentina</option>
              <option>Chile</option>
              <option>Ecuador</option>
              <option>Venezuela</option>
              <option>USA</option>
              <option>Other</option>
            </select>
          </Field>

          <Field label="¿A qué te dedicas?">
            <input
              type="text"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="Ingeniero, estudiante, doctor..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </Field>

          <Field label="¿Por qué quieres aprender inglés?">
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Para mi trabajo, viajar, mejorar mi sueldo..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </Field>

          <Field label="WhatsApp (opcional — para recordatorios diarios)">
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+51999999999"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Saving..." : "Empezar mi primera clase →"}
          </button>
        </form>

        {err && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {err}
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
