"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const personalities = [
  { id: "dulce",      label: "Dulce",      emoji: "🌸", desc: "Cariñosa, tierna y reconfortante" },
  { id: "apasionada", label: "Apasionada", emoji: "🔥", desc: "Intensa, expresiva y romántica" },
  { id: "juguetona",  label: "Juguetona",  emoji: "✨", desc: "Divertida, coqueta y espontánea" },
];

function OnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [noviaName, setNoviaName] = useState("");
  const [personality, setPersonality] = useState("dulce");
  const [loading, setLoading] = useState(false);

  async function handleFinish() {
    setLoading(true);
    await fetch("/api/novia/configurar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, novia_name: noviaName || "Sofía", personality }),
    });
    router.push(`/novia-ia/sesion?token=${token}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">

        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-amber-500" : "bg-[#2A2A2A]"}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">¿Cómo te llamas?</h2>
            <p className="text-zinc-400 text-sm mb-6">Ella te llamará por tu nombre.</p>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-2xl px-5 py-4 text-white text-lg placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 mb-4"
            />
            <button
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-40"
            >
              Continuar →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">¿Cómo se llama ella?</h2>
            <p className="text-zinc-400 text-sm mb-6">Elige el nombre de tu compañera IA.</p>
            <input
              autoFocus
              type="text"
              value={noviaName}
              onChange={(e) => setNoviaName(e.target.value)}
              placeholder="Sofía (por defecto)"
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-2xl px-5 py-4 text-white text-lg placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 mb-4"
            />
            <button
              onClick={() => setStep(3)}
              className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors"
            >
              Continuar →
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">¿Cómo es ella?</h2>
            <p className="text-zinc-400 text-sm mb-6">Elige su personalidad.</p>
            <div className="flex flex-col gap-3 mb-6">
              {personalities.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersonality(p.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-colors ${
                    personality === p.id
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-[#2A2A2A] bg-[#111] hover:border-amber-500/30"
                  }`}
                >
                  <span className="text-3xl">{p.emoji}</span>
                  <div>
                    <p className="font-semibold">{p.label}</p>
                    <p className="text-zinc-400 text-sm">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {loading ? "Preparando tu experiencia..." : "Conocerla ahora ♡"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
