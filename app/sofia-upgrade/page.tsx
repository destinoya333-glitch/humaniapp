"use client";

/**
 * Sofia Upgrade — paywall con marco neuromarketing (Klaric: "vende a la mente").
 * Gatillos: Sofia te mira preocupada · miedo a perder la racha · UNA oferta héroe
 * (anual) · contraste de precio vs un café · CTA de identidad ("Sí, quiero seguir").
 *
 * IMPORTANTE: la lógica de cobro NO cambió — mismo /api/sofia-auth/me y
 * POST /api/sofia-flows/payment, mismos precios reales (regular 39/349, premium 89/799).
 */
import { useEffect, useState } from "react";

const PRICING = {
  regular: { monthly: 39, yearly: 349 },
  premium: { monthly: 89, yearly: 799 },
} as const;

// Beneficios DISTINTOS por plan (lo que cada uno incluye de verdad)
const PLAN_BENEFITS = {
  regular: [
    { e: "♾️", t: "Sofia 24/7 sin límites — escucha y habla todo lo que quieras" },
    { e: "🎧", t: "Las 6 fases Cuna completas: de escuchar a hablar" },
    { e: "🗣️", t: "Voz natural de Sofia (Nova) en cápsulas y tu novela" },
    { e: "🧊", t: "Congela tu racha — que nadie te quite lo avanzado" },
    { e: "📖", t: "Tu diccionario personal + misiones diarias" },
    { e: "🛡️", t: "Garantía 6 meses" },
  ],
  premium: [
    { e: "⭐", t: "TODO lo de Regular, y además:" },
    { e: "🎙️", t: "Voz premium casi humana (ElevenLabs) — Sofia que parece real" },
    { e: "🏆", t: "Sello Cuna con un nativo de USA al graduarte" },
    { e: "🎬", t: "Video testimonial del nativo (para tu LinkedIn)" },
    { e: "✨", t: "Comunidad VIP + acceso anticipado a novedades" },
    { e: "🛡️", t: "Garantía 6 meses" },
  ],
} as const;

const YAPE = {
  number: "998 102 258",
  name: "Percy Roj*",
};

type Plan = "regular" | "premium";
type Billing = "monthly" | "yearly";
type Step = "offer" | "yape" | "done";

export default function SofiaUpgradePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [cardLoading, setCardLoading] = useState(false);
  const [streak, setStreak] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("offer");
  const [chosenPlan, setChosenPlan] = useState<Plan>("regular");
  const [chosenBilling, setChosenBilling] = useState<Billing>("yearly");
  const [showOptions, setShowOptions] = useState(false);
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
        setEmail(data.email ?? data.user?.email ?? "");
        // racha — para el gatillo de pérdida; si falla, no bloquea
        fetch(`/api/sofia-progress/streak?user_id=${data.user_id}&days=90`)
          .then((r) => r.json())
          .then((s) => setStreak(typeof s?.current_streak === "number" ? s.current_streak : null))
          .catch(() => {});
      });
  }, []);

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

  // Cargar Culqi.js (checkout con tarjeta)
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById("culqi-js")) return;
    const s = document.createElement("script");
    s.id = "culqi-js";
    s.src = "https://checkout.culqi.com/js/v4";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  function payWithCard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Culqi = (window as any).Culqi;
    if (!Culqi) {
      setError("El pago con tarjeta está cargando, intenta en un segundo.");
      return;
    }
    setError(null);
    Culqi.publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
    Culqi.settings({ title: "Miss Sofia", currency: "PEN", amount: PRICING[chosenPlan][chosenBilling] * 100 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).culqi = async function () {
      if (Culqi.token) {
        setCardLoading(true);
        setError(null);
        try {
          const res = await fetch("/api/sofia-flows/culqi-charge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: Culqi.token.id,
              email: Culqi.token.email || email,
              plan: chosenPlan,
              billing: chosenBilling,
              user_id: userId,
              phone,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo cobrar la tarjeta");
          setStep("done");
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setCardLoading(false);
        }
      } else if (Culqi.error) {
        setError(Culqi.error.user_message || "Error con la tarjeta");
      }
    };
    Culqi.open();
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-zinc-400">
        Cargando...
      </main>
    );
  }

  const amount = PRICING[chosenPlan][chosenBilling];
  const monthlyEquiv = chosenBilling === "yearly" ? Math.round(amount / 12) : amount;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-zinc-100 p-4 sm:p-6">
      <div className="max-w-md mx-auto">
        <header className="mb-5 flex items-center justify-between">
          <span className="text-xs text-zinc-600">Miss Sofia Pro</span>
          <a href="/sofia-chat" className="text-xs text-zinc-500 hover:text-amber-400">
            ← Volver al chat
          </a>
        </header>

        {step === "offer" && (
          <>
            {/* Sofia te mira — preocupada (gatillo: ojos + pérdida) */}
            <div className="text-center mb-5">
              <div className="relative inline-block">
                <img
                  src="/sofia-avatar.jpg"
                  alt="Miss Sofia"
                  className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-amber-400/40"
                />
                <span className="absolute -bottom-1 -right-1 text-2xl">😟</span>
              </div>
              {streak && streak > 0 ? (
                <>
                  <h1 className="text-2xl font-bold mt-4 leading-tight">
                    No pierdas tus <span className="text-amber-400">{streak} días</span> 🔥
                  </h1>
                  <p className="text-zinc-400 text-sm mt-2">
                    Llegaste más lejos que el 80% de los que empiezan.
                    <br />
                    ¿Vas a soltarlo justo ahora?
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold mt-4 leading-tight">
                    Hoy decides si <span className="text-amber-400">de verdad</span> lo hablas
                  </h1>
                  <p className="text-zinc-400 text-sm mt-2">
                    Sofia 24/7, sin límites, hasta que te salga solo.
                  </p>
                </>
              )}
            </div>

            {/* Oferta héroe — UNA decisión (anual). Beneficios en lenguaje de pérdida/poder */}
            <div className="card-surface rounded-2xl p-6 border border-amber-400/40 bg-amber-400/5 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                  El más elegido
                </span>
              </div>

              {/* Toggle de plan — cada uno muestra SUS propios beneficios */}
              <div className="flex gap-2 mb-4 mt-1">
                {(["regular", "premium"] as Plan[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setChosenPlan(p)}
                    className={`flex-1 rounded-xl py-2 text-sm font-bold border transition-colors ${
                      chosenPlan === p
                        ? "border-amber-400 bg-amber-400/10 text-amber-300"
                        : "border-[#2A2A2A] text-zinc-400"
                    }`}
                  >
                    {p === "regular" ? "Sofia Regular" : "Sofia Premium ⭐"}
                  </button>
                ))}
              </div>

              <ul className="space-y-2.5 text-sm text-zinc-200 mb-5">
                {PLAN_BENEFITS[chosenPlan].map((b) => (
                  <li key={b.t} className="flex gap-2">
                    <span>{b.e}</span> {b.t}
                  </li>
                ))}
              </ul>

              <div className="text-center mb-1">
                <span className="text-3xl font-bold text-amber-400">S/{amount}</span>
                <span className="text-zinc-400 text-sm">
                  {" "}/ {chosenBilling === "yearly" ? "año" : "mes"}
                </span>
              </div>
              {chosenBilling === "yearly" && (
                <p className="text-center text-xs text-zinc-400 mb-4">
                  ≈ S/{monthlyEquiv}/mes · <span className="text-zinc-300">menos que un café al mes</span> ☕
                </p>
              )}

              <button
                onClick={() => setStep("yape")}
                className="w-full bg-amber-500 text-black rounded-xl py-3 font-bold hover:bg-amber-400 transition-colors"
              >
                Sí, quiero seguir →
              </button>

              <button
                onClick={() => (window.location.href = "/sofia-chat")}
                className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 mt-3"
              >
                No, prefiero empezar de cero
              </button>
            </div>

            {/* Opciones (escondidas — el cerebro odia decidir) */}
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowOptions((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                {showOptions ? "Ocultar opciones" : "Ver otros planes"}
              </button>
            </div>

            {showOptions && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {(["regular", "premium"] as Plan[]).map((p) =>
                  (["yearly", "monthly"] as Billing[]).map((b) => {
                    const active = chosenPlan === p && chosenBilling === b;
                    return (
                      <button
                        key={`${p}-${b}`}
                        onClick={() => {
                          setChosenPlan(p);
                          setChosenBilling(b);
                        }}
                        className={`p-2.5 rounded-lg border text-left ${
                          active
                            ? "border-amber-400/60 bg-amber-400/10 text-zinc-100"
                            : "border-[#2A2A2A] text-zinc-400"
                        }`}
                      >
                        <div className="font-semibold capitalize">
                          {p === "regular" ? "Regular" : "Premium"} {b === "yearly" ? "anual" : "mensual"}
                        </div>
                        <div className="text-amber-400">S/{PRICING[p][b]}</div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {step === "yape" && (
          <div className="card-surface rounded-2xl p-6 border border-amber-400/30 bg-amber-400/5">
            <h2 className="text-lg font-bold mb-1">Yapea S/{amount}</h2>
            <p className="text-sm text-zinc-400 mb-5">
              {chosenPlan === "regular" ? "Sofia Regular" : "Sofia Premium"} ·{" "}
              {chosenBilling === "monthly" ? "mensual" : "anual"}
            </p>

            <div className="bg-[#0A0A0A] rounded-xl p-5 border border-[#2A2A2A] mb-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Yape a:</p>
              <p className="text-2xl font-bold text-amber-400 mb-1">{YAPE.number}</p>
              <p className="text-sm text-zinc-300">{YAPE.name}</p>
            </div>

            <label className="block mb-4">
              <span className="text-xs text-zinc-400 mb-1.5 block">
                Código de operación Yape (opcional — valida más rápido)
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
                onClick={() => setStep("offer")}
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
            {/* Opción: pago al instante con tarjeta (Culqi) */}
            <div className="mt-5 pt-4 border-t border-[#2A2A2A]">
              <p className="text-xs text-zinc-500 text-center mb-3">o paga al instante con tarjeta</p>
              <button
                onClick={payWithCard}
                disabled={cardLoading}
                className="w-full border border-purple-400/40 bg-purple-400/10 text-purple-200 rounded-xl py-2.5 font-bold hover:bg-purple-400/20 disabled:opacity-60"
              >
                {cardLoading ? "Procesando..." : `💳 Pagar S/${amount} con tarjeta`}
              </button>
              <p className="text-[10px] text-zinc-600 text-center mt-2">Pago seguro procesado por Culqi</p>
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
            <img
              src="/sofia-avatar.jpg"
              alt="Miss Sofia"
              className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-emerald-400/40 mb-3"
            />
            <h2 className="text-2xl font-bold mb-2">¡Bienvenido de vuelta! 🎉</h2>
            <p className="text-zinc-300 mb-6">
              Estoy validando tu Yape de S/{amount}. En cuanto lo confirme, tu plan se activa
              automáticamente y seguimos justo donde lo dejaste.
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
