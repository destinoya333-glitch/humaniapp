"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

const personalities = [
  { id: "dulce",      label: "Dulce",      emoji: "🌸", desc: "Cariñosa, tierna y reconfortante" },
  { id: "apasionada", label: "Apasionada", emoji: "🔥", desc: "Intensa, expresiva y romántica" },
  { id: "juguetona",  label: "Juguetona",  emoji: "✨", desc: "Divertida, coqueta y espontánea" },
];

// Best available avatars from LiveAvatar public library
// For fully custom sensual avatars → create at app.liveavatar.com > Avatars > Create
const avatars = [
  {
    id: "9d4d6cdd-38a1-448e-a336-1ac682ba6a27",
    name: "Marianne",
    tag: "Latina · Vestido rojo · Sensual",
    preview: "https://files2.heygen.ai/avatar/v3/e32d7d1047a24c34a70c54c2b77441c0_55890/preview_target.webp",
  },
  {
    id: "9a4f4b1f-86f9-4acf-9a37-b81c21ae95e4",
    name: "Elenora",
    tag: "Fitness · Ropa deportiva · Curvilínea",
    preview: "https://files2.heygen.ai/avatar/v3/4e5afdfe8bdb44f3ae18b90281ab034c_45610/preview_talk_1.webp",
  },
  {
    id: "69cf601f-b35b-4d1b-a701-c854d223b5a5",
    name: "Katya",
    tag: "Europea · Traje rosa · Elegante",
    preview: "https://files2.heygen.ai/avatar/v3/348ddf503c654b9bbbb8bea9f9210ead_55870/preview_target.webp",
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

    // Save to localStorage immediately (works without DB column)
    if (typeof window !== "undefined") {
      localStorage.setItem(`avatar_id_${token}`, avatarId);
    }

    await fetch("/api/novia/configurar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, novia_name: noviaName || "Sofía", personality, avatar_id: avatarId }),
    });
    router.push(`/novia-ia/sesion?token=${token}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-lg">

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[1,2,3,4].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? "bg-amber-500" : "bg-[#2A2A2A]"}`} />
          ))}
        </div>

        {/* STEP 1 — Nombre */}
        {step === 1 && (
          <div className="animate-fadeIn">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">Paso 1 de 4</p>
            <h2 className="text-3xl font-bold mb-2">¿Cómo te llamas?</h2>
            <p className="text-zinc-400 text-sm mb-8">Ella te llamará por tu nombre.</p>
            <input autoFocus type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep(2)}
              placeholder="Tu nombre"
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-2xl px-5 py-4 text-white text-lg placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 mb-4" />
            <button onClick={() => setStep(2)} disabled={!name.trim()}
              className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-40 text-lg">
              Continuar →
            </button>
          </div>
        )}

        {/* STEP 2 — Nombre de ella */}
        {step === 2 && (
          <div>
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">Paso 2 de 4</p>
            <h2 className="text-3xl font-bold mb-2">¿Cómo se llama ella?</h2>
            <p className="text-zinc-400 text-sm mb-8">Dale el nombre que más te guste.</p>
            <input autoFocus type="text" value={noviaName}
              onChange={(e) => setNoviaName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setStep(3)}
              placeholder="Sofía (por defecto)"
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-2xl px-5 py-4 text-white text-lg placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 mb-4" />
            <button onClick={() => setStep(3)}
              className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors text-lg">
              Continuar →
            </button>
          </div>
        )}

        {/* STEP 3 — Personalidad */}
        {step === 3 && (
          <div>
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">Paso 3 de 4</p>
            <h2 className="text-3xl font-bold mb-2">¿Cómo es ella?</h2>
            <p className="text-zinc-400 text-sm mb-6">Elige su personalidad.</p>
            <div className="flex flex-col gap-3 mb-6">
              {personalities.map((p) => (
                <button key={p.id} onClick={() => setPersonality(p.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                    personality === p.id ? "border-amber-500 bg-amber-500/10 shadow-[0_0_24px_rgba(245,158,11,0.12)]" : "border-[#2A2A2A] bg-[#111] hover:border-amber-500/30"
                  }`}>
                  <span className="text-3xl">{p.emoji}</span>
                  <div>
                    <p className="font-bold">{p.label}</p>
                    <p className="text-zinc-400 text-sm">{p.desc}</p>
                  </div>
                  {personality === p.id && <span className="ml-auto text-amber-400 text-lg">✓</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(4)}
              className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors text-lg">
              Continuar →
            </button>
          </div>
        )}

        {/* STEP 4 — Elegir avatar */}
        {step === 4 && (
          <div>
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">Paso 4 de 4</p>
            <h2 className="text-3xl font-bold mb-1">¿Cómo se ve ella?</h2>
            <p className="text-zinc-400 text-sm mb-6">Elige su apariencia.</p>

            {/* Avatar grid — 3 columns */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {avatars.map((av) => (
                <button key={av.id} onClick={() => setAvatarId(av.id)}
                  className={`relative flex flex-col rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                    avatarId === av.id
                      ? "border-amber-500 shadow-[0_0_28px_rgba(245,158,11,0.3)]"
                      : "border-[#2A2A2A] hover:border-amber-500/40"
                  }`}
                >
                  {/* Image */}
                  <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
                    <Image src={av.preview} alt={av.name} fill className="object-cover object-top" unoptimized />
                    {/* Dark overlay when not selected */}
                    {avatarId !== av.id && (
                      <div className="absolute inset-0 bg-black/30" />
                    )}
                    {/* Selected badge */}
                    {avatarId === av.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-black text-xs font-bold shadow-lg">✓</div>
                    )}
                  </div>
                  {/* Name */}
                  <div className={`px-2 py-2 text-center ${avatarId === av.id ? "bg-amber-500/10" : "bg-[#111]"}`}>
                    <p className="font-bold text-sm">{av.name}</p>
                    <p className="text-zinc-500 text-[10px] leading-tight mt-0.5">{av.tag}</p>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={handleFinish} disabled={loading}
              className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-50 text-lg">
              {loading ? "Preparando tu experiencia..." : "Conocerla ahora ♡"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return <Suspense><OnboardingForm /></Suspense>;
}
