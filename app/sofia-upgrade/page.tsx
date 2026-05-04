"use client";

import { useEffect, useState } from "react";

const PLANS = [
  {
    id: "cuna",
    name: "Sofia Cuna",
    subtitle: "El método completo",
    color: "border-amber-400/40",
    tag: "Recomendado",
    monthly: { label: "S/49 / mes", amount: 49, billing: "monthly" as const },
    yearly: { label: "S/449 / año", amount: 449, billing: "yearly" as const, save: "Ahorras S/139" },
    features: [
      "Las 6 fases · 12 meses",
      "Sofia 24/7 ilimitado",
      "Tu novela personal",
      "Tu diccionario personal",
      "Misiones diarias",
      "Métricas viscerales",
      "Garantía 6 meses",
    ],
  },
  {
    id: "cuna_vip",
    name: "Sofia Cuna VIP",
    subtitle: "+ Sello humano",
    color: "border-purple-400/40",
    tag: null,
    monthly: { label: "S/89 / mes", amount: 89, billing: "monthly" as const },
    yearly: { label: "S/799 / año", amount: 799, billing: "yearly" as const, save: "Ahorras S/269" },
    features: [
      "Todo lo del Cuna",
      "2 sesiones video al mes con Sofia humana",
      "Llamada Sello Cuna con nativo USA al graduarte",
      "Video testimonial del nativo (tu certificado)",
      "Comunidad VIP",
    ],
  },
];

const YAPE = {
  number: "998 102 258",
  name: "Percy Roj*",
};

type Step = "select" | "yape" | "done";

export default function SofiaUpgradePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>("");
  const [step, setStep] = useState<Step>("select");
  const [chosenPlan, setChosenPlan] = useState<"cuna" | "cuna_vip">("cuna");
  const [chosenBilling, setChosenBilling] = useState<"monthly" | "yearly">("yearly");
  const [yapeCode, setYapeCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sofia-auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          window.location.href = "/sofia-auth/login";
          return;
        }
        setUserId(data.user_id);
        setPhone(data.user?.whatsapp_phone ?? "");
      });
  }, []);

  function selectAndContinue() {
    setStep("yape");
  }

  async function submitPayment() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sofia-flows/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone || `+pending_${userId.slice(0, 8)}`,
          user_id: userId,
          plan: chosenPlan,
          billing: chosenBilling,
          yape_operation_code: yapeCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || "No pude registrar el pago");
      }
      setStep("done");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-zinc-400">
        Cargando...
      </main>
    );
  }

  const plan = PLANS.find((p) => p.id === chosenPlan)!;
  const amount = chosenBilling === "monthly" ? plan.monthly.amount : plan.yearly.amount;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-zinc-100 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Upgrade a Pro</h1>
          <a href="/sofia-chat" className="text-xs text-zinc-500 hover:text-amber-400">
            ← Volver al chat
          </a>
        </header>

        {step === "select" && (
          <>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  className={`card-surface rounded-2xl p-6 border ${p.color} relative cursor-pointer transition-all ${
                    chosenPlan === p.id ? "ring-2 ring-amber-400/60" : ""
                  }`}
                  onClick={() => setChosenPlan(p.id as "cuna" | "cuna_vip")}
                >
                  {p.tag && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                        {p.tag}
                      </span>
                    </div>
                  )}
                  <h2 className="text-xl font-bold mb-1">{p.name}</h2>
                  <p className="text-sm text-zinc-400 mb-4">{p.subtitle}</p>
                  <div className="space-y-2 mb-4">
                    <div
                      className={`p-2 rounded-lg border text-sm ${
                        chosenPlan === p.id && chosenBilling === "monthly"
                          ? "border-amber-400/50 bg-amber-400/10"
                          : "border-[#2A2A2A]"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChosenPlan(p.id as "cuna" | "cuna_vip");
                        setChosenBilling("monthly");
                      }}
                    >
                      {p.monthly.label}
                    </div>
                    <div
                      className={`p-2 rounded-lg border text-sm ${
                        chosenPlan === p.id && chosenBilling === "yearly"
                          ? "border-amber-400/50 bg-amber-400/10"
                          : "border-[#2A2A2A]"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChosenPlan(p.id as "cuna" | "cuna_vip");
                        setChosenBilling("yearly");
                      }}
                    >
                      {p.yearly.label} <span className="text-amber-400 text-xs">{p.yearly.save}</span>
                    </div>
                  </div>
                  <ul className="space-y-1 text-xs text-zinc-400">
                    {p.features.map((f) => (
                      <li key={f}>✓ {f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <button
              onClick={selectAndContinue}
              className="w-full bg-amber-500 text-black rounded-xl py-3 font-bold hover:bg-amber-400"
            >
              Continuar al pago →
            </button>
          </>
        )}

        {step === "yape" && (
          <div className="card-surface rounded-2xl p-6 border border-amber-400/30 bg-amber-400/5">
            <h2 className="text-lg font-bold mb-1">Yapea S/{amount}</h2>
            <p className="text-sm text-zinc-400 mb-5">
              {plan.name} · {chosenBilling === "monthly" ? "mensual" : "anual"}
            </p>

            <div className="bg-[#0A0A0A] rounded-xl p-5 border border-[#2A2A2A] mb-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Yape a:</p>
              <p className="text-2xl font-bold text-amber-400 mb-1">{YAPE.number}</p>
              <p className="text-sm text-zinc-300">{YAPE.name}</p>
            </div>

            <label className="block mb-4">
              <span className="text-xs text-zinc-400 mb-1.5 block">
                Código de operación Yape (opcional pero ayuda a validar más rápido)
              </span>
              <input
                type="text"
                value={yapeCode}
                onChange={(e) => setYapeCode(e.target.value)}
                placeholder="ABC123XYZ"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("select")}
                className="flex-1 border border-[#2A2A2A] text-zinc-300 rounded-xl py-2.5 font-medium hover:border-zinc-500"
              >
                ← Atrás
              </button>
              <button
                onClick={submitPayment}
                disabled={loading}
                className="flex-1 bg-amber-500 text-black rounded-xl py-2.5 font-bold hover:bg-amber-400 disabled:bg-zinc-700"
              >
                {loading ? "Registrando..." : "Ya yapeé"}
              </button>
            </div>
            {error && (
              <p className="mt-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-2 rounded-lg">
                {error}
              </p>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="card-surface rounded-2xl p-8 border border-emerald-500/30 bg-emerald-500/5 text-center">
            <p className="text-5xl mb-3">✓</p>
            <h2 className="text-2xl font-bold mb-2">Pago registrado</h2>
            <p className="text-zinc-300 mb-6">
              Vamos a validar tu Yape de S/{amount}. En cuanto lo confirmemos, tu plan{" "}
              <strong className="text-amber-400">{plan.name}</strong> se activa automáticamente.
            </p>
            <p className="text-xs text-zinc-500 mb-6">
              Validación típica: minutos. Si demora más de 1 hora, escríbenos por WhatsApp.
            </p>
            <a
              href="/sofia-chat"
              className="inline-block bg-amber-500 text-black px-6 py-2.5 rounded-full font-bold hover:bg-amber-400"
            >
              Volver al chat →
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
