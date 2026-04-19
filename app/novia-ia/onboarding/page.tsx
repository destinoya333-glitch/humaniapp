"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

const personalities = [
  { id: "dulce",      label: "Dulce",      emoji: "🌸", desc: "Cariñosa, tierna y reconfortante" },
  { id: "apasionada", label: "Apasionada", emoji: "🔥", desc: "Intensa, expresiva y romántica" },
  { id: "juguetona",  label: "Juguetona",  emoji: "✨", desc: "Divertida, coqueta y espontánea" },
];

const avatars = [
  {
    id: "65cca4cf-b7c8-4619-871f-84e2cf8b21d4",
    name: "Katya",
    origin: "Rusa · Ojos claros · Pelo castaño",
    preview: "https://files2.heygen.ai/avatar/v3/5b1db7e2080f4106a85b987437430a24_55860/preview_target.webp",
  },
  {
    id: "37c384cc-e572-4bf1-bc2a-02907ffc6521",
    name: "Rika",
    origin: "Asiática · Elegante · Moderna",
    preview: "https://files2.heygen.ai/avatar/v3/edfe155a51294088bcf97a55d8b46d70_55920/preview_target.webp",
  },
  {
    id: "63014563-22f7-4401-95db-034f3c992ec3",
    name: "Alessandra",
    origin: "Italiana · Morena · Casual sensual",
    preview: "https://files2.heygen.ai/avatar/v3/92f863c1db2d48cbb34e803866881192_55810/preview_talk_1.webp",
  },
];

function OnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [noviaName, setNoviaName] = useState("");
  const [personality, setPersonality] = useState("dulce");
  const [avatarId, setAvatarId] = useState(avatars[0].id);
  const [loading, setLoading] = useState(false);

  async function handleFinish() {
    setLoading(true);
    await fetch("/api/novia/configurar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, novia_name: noviaName || "Sofía", personality, avatar_id: avatarId }),
    });
    router.push(`/novia-ia/sesion?token=${token}`);
  }

  const totalSteps = 4;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-amber-500" : "bg-[#2A2A2A]"}`} />
          ))}
        </div>

        {/* Step 1 — Tu nombre */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">¿Cómo te llamas?</h2>
            <p className="text-zinc-400 text-sm mb-6">Ella te llamará por tu nombre.</p>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep(2)}
              placeholder="Tu nombre"
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-2xl px-5 py-4 text-white text-lg placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 mb-4"
            />
            <button onClick={() => setStep(2)} disabled={!name.trim()}
              className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-40">
              Continuar →
            </button>
          </div>
        )}

        {/* Step 2 — Nombre de ella */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">¿Cómo se llama ella?</h2>
            <p className="text-zinc-400 text-sm mb-6">Elige el nombre de tu compañera.</p>
            <input
              autoFocus
              type="text"
              value={noviaName}
              onChange={(e) => setNoviaName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setStep(3)}
              placeholder="Sofía (por defecto)"
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-2xl px-5 py-4 text-white text-lg placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 mb-4"
            />
            <button onClick={() => setStep(3)}
              className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors">
              Continuar →
            </button>
          </div>
        )}

        {/* Step 3 — Personalidad */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">¿Cómo es ella?</h2>
            <p className="text-zinc-400 text-sm mb-6">Elige su personalidad.</p>
            <div className="flex flex-col gap-3 mb-6">
              {personalities.map((p) => (
                <button key={p.id} onClick={() => setPersonality(p.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-colors ${
                    personality === p.id ? "border-amber-500 bg-amber-500/10" : "border-[#2A2A2A] bg-[#111] hover:border-amber-500/30"
                  }`}>
                  <span className="text-3xl">{p.emoji}</span>
                  <div>
                    <p className="font-semibold">{p.label}</p>
                    <p className="text-zinc-400 text-sm">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(4)}
              className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors">
              Continuar →
            </button>
          </div>
        )}

        {/* Step 4 — Elegir avatar */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">¿Cuál es ella?</h2>
            <p className="text-zinc-400 text-sm mb-6">Elige cómo se ve tu compañera.</p>

            <div className="flex flex-col gap-4 mb-6">
              {avatars.map((av) => (
                <button
                  key={av.id}
                  onClick={() => setAvatarId(av.id)}
                  className={`flex items-center gap-4 p-3 rounded-2xl border text-left transition-all ${
                    avatarId === av.id
                      ? "border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                      : "border-[#2A2A2A] bg-[#111] hover:border-amber-500/30"
                  }`}
                >
                  {/* Avatar preview */}
                  <div className="relative w-20 h-24 rounded-xl overflow-hidden shrink-0 border border-[#2A2A2A]">
                    <Image
                      src={av.preview}
                      alt={av.name}
                      fill
                      className="object-cover object-top"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base">{av.name}</p>
                    <p className="text-zinc-400 text-sm mt-0.5">{av.origin}</p>
                    {avatarId === av.id && (
                      <span className="inline-block mt-2 text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                        Seleccionada ✓
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button onClick={handleFinish} disabled={loading}
              className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-50">
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
