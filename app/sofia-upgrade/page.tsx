"use client";

/**
 * Sofia Upgrade — paywall con marco neuromarketing (Klaric: "vende a la mente").
 * Gatillos: Sofia te mira preocupada · miedo a perder la racha · UNA oferta héroe
 * (anual) · contraste de precio vs un café · CTA de identidad ("Sí, quiero seguir").
 *
 * Tema CÁLIDO (crema) — coherente con la app nativa. Nada de fondos negros con
 * vacíos: el espacio libre se ve como aire limpio, no como un hueco.
 *
 * IMPORTANTE: la lógica de cobro NO cambió — mismo /api/sofia-auth/me y
 * POST /api/sofia-flows/culqi-charge. El monto lo deriva el backend del PRICING;
 * este PRICING solo se usa para MOSTRAR (debe coincidir con el del servidor).
 */
import { useEffect, useState } from "react";

const PRICING = {
  regular: { monthly: 30, yearly: 299 },
  premium: { monthly: 89, yearly: 799 },
} as const;

// Ahorro real del plan anual vs pagar 12 meses sueltos (siempre veraz).
const YEARLY_SAVE_PCT = Math.round(
  (1 - PRICING.regular.yearly / (PRICING.regular.monthly * 12)) * 100
);
const YEARLY_PER_MONTH = Math.round(PRICING.regular.yearly / 12);

const BENEFITS = [
  { e: "♾️", t: "Sofia 24/7 sin límites — escucha y habla todo lo que quieras" },
  { e: "🎧", t: "Las 6 fases Cuna completas: de escuchar a hablar" },
  { e: "🗣️", t: "Voz natural de Sofia en cápsulas y tu novela" },
  { e: "🧊", t: "Congela tu racha — que nadie te quite lo avanzado" },
  { e: "📖", t: "Tu diccionario personal + misiones diarias" },
  { e: "🛡️", t: "Garantía 6 meses" },
];

type Billing = "monthly" | "yearly";
type Step = "offer" | "pay" | "done";

const CULQI_PK = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;

export default function SofiaUpgradePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>("");
  const [streak, setStreak] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("offer");
  const [chosenBilling, setChosenBilling] = useState<Billing>("yearly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [culqiReady, setCulqiReady] = useState(false);

  // La app nativa abre esta web con ?plan=monthly|yearly según lo que el
  // usuario tocó en su pantalla → respetamos su elección.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("plan");
    if (p === "monthly" || p === "yearly") setChosenBilling(p);
  }, []);

  // Cargar Culqi Checkout v4 una sola vez (solo si hay public key configurada)
  useEffect(() => {
    if (!CULQI_PK) return;
    if ((window as unknown as { Culqi?: unknown }).Culqi) {
      setCulqiReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.culqi.com/js/v4";
    s.async = true;
    s.onload = () => setCulqiReady(true);
    document.body.appendChild(s);
  }, []);

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
        fetch(`/api/sofia-progress/streak?user_id=${data.user_id}&days=90`)
          .then((r) => r.json())
          .then((s) => setStreak(typeof s?.current_streak === "number" ? s.current_streak : null))
          .catch(() => {});
      });
  }, []);

  // Pago vía Culqi Checkout v4 — método explícito (tarjeta O yape). El backend
  // (/api/sofia-flows/culqi-charge) crea el cargo con el token y ACTIVA el plan.
  // Todo va a la cuenta Culqi (NO a un número Yape personal).
  function payWith(method: "tarjeta" | "yape") {
    if (!userId) return;
    setError(null);
    const Culqi = (window as unknown as { Culqi?: any }).Culqi; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!CULQI_PK || !Culqi || !culqiReady) {
      setError("El pago no está disponible en este momento. Intenta de nuevo en unos segundos.");
      return;
    }

    Culqi.publicKey = CULQI_PK;
    Culqi.settings({
      title: "Miss Sofia",
      currency: "PEN",
      amount: amount * 100, // céntimos
      description: `Miss Sofia ${chosenBilling}`,
    });
    Culqi.options({
      lang: "es",
      installments: false,
      paymentMethods: {
        tarjeta: method === "tarjeta",
        yape: method === "yape",
        bancaMovil: false,
        agente: false,
        billetera: false,
        cuotealo: false,
      },
      style: {
        bannerColor: "#FF6B4A",
        buttonBackground: "#FF6B4A",
      },
    });

    (window as unknown as { culqi?: () => void }).culqi = async () => {
      if (Culqi.token) {
        const token = Culqi.token.id as string;
        const email = (Culqi.token.email as string) || `sofia_${userId.slice(0, 8)}@activosya.com`;
        setLoading(true);
        try {
          const res = await fetch("/api/sofia-flows/culqi-charge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              email,
              plan: "regular",
              billing: chosenBilling,
              user_id: userId,
              phone: phone || undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            throw new Error(data.error || data.message || "No se pudo cobrar la tarjeta");
          }
          setStep("done");
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setLoading(false);
        }
      } else if (Culqi.error) {
        setError(Culqi.error.user_message || "No se pudo procesar el pago. Intenta de nuevo.");
      }
    };

    Culqi.open();
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#FFF3EC] to-[#FFE0D8] flex items-center justify-center text-[#8a6a5e]">
        Cargando...
      </main>
    );
  }

  const amount = PRICING.regular[chosenBilling];

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FFF3EC] to-[#FFE0D8] text-[#2A1A15]">
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col px-5 py-4">
        <header className="mb-2 flex items-center justify-between">
          <span className="text-xs text-[#B79A8E]">Miss Sofia Pro</span>
          <a href="/sofia-chat" className="text-xs text-[#B79A8E] hover:text-[#FF6B4A]">
            ← Volver al chat
          </a>
        </header>

        {step === "offer" && (
          <div className="flex-1 flex flex-col">
            {/* Héroe — compacto arriba */}
            <div className="text-center pt-2 pb-4">
              <div className="relative inline-block">
                <img
                  src="/sofia-avatar.jpg"
                  alt="Miss Sofia"
                  className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg"
                />
                <span className="absolute -bottom-1 -right-1 text-2xl">😟</span>
              </div>
              {streak && streak > 0 ? (
                <>
                  <h1 className="text-2xl font-extrabold mt-4 leading-tight">
                    No pierdas tus <span className="text-[#FF6B4A]">{streak} días</span> 🔥
                  </h1>
                  <p className="text-[#8a6a5e] text-sm mt-2 px-2">
                    Llegaste más lejos que el 80% de los que empiezan. ¿Vas a soltarlo justo ahora?
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-extrabold mt-4 leading-tight">
                    Hoy decides si <span className="text-[#FF6B4A]">de verdad</span> lo hablas
                  </h1>
                  <p className="text-[#8a6a5e] text-sm mt-2 px-2">
                    Sofia 24/7, sin límites, hasta que te salga solo.
                  </p>
                </>
              )}
            </div>

            {/* Card blanca — beneficios + planes JUNTOS (sin vacíos) */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-[#FFD9CC] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#FF6B4A] text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                  EL MÁS ELEGIDO
                </span>
              </div>

              <ul className="space-y-3 text-[15px] text-[#3a2a24] font-medium mt-3 mb-5">
                {BENEFITS.map((b) => (
                  <li key={b.t} className="flex gap-3 items-start">
                    <span className="text-lg leading-6">{b.e}</span>
                    <span className="leading-6">{b.t}</span>
                  </li>
                ))}
              </ul>

              {/* Elige tu plan — ambos precios visibles y CLICKEABLES */}
              <p className="text-center text-xs text-[#8a6a5e] mb-2">Elige tu plan:</p>
              <div className="grid grid-cols-2 gap-3">
                {(["yearly", "monthly"] as Billing[]).map((b) => {
                  const active = chosenBilling === b;
                  return (
                    <button
                      key={b}
                      onClick={() => setChosenBilling(b)}
                      className={`relative py-4 rounded-2xl border-2 text-center transition-colors ${
                        active
                          ? "border-[#FF6B4A] bg-[#FFF0EB]"
                          : "border-[#F0E0D8] bg-white"
                      }`}
                    >
                      {b === "yearly" && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#FF6B4A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow">
                          Ahorra {YEARLY_SAVE_PCT}%
                        </span>
                      )}
                      <div className="text-xs text-[#8a6a5e] mt-1">{b === "yearly" ? "Anual" : "Mensual"}</div>
                      <div className="text-3xl font-extrabold text-[#FF6B4A] leading-tight">
                        S/{PRICING.regular[b]}
                      </div>
                      <div className="text-[11px] text-[#B79A8E]">
                        {b === "yearly" ? `≈ S/${YEARLY_PER_MONTH}/mes` : "por mes"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA — al fondo, con aire limpio (no negro) */}
            <div className="mt-auto pt-5">
              <button
                onClick={() => setStep("pay")}
                className="w-full bg-[#FF6B4A] text-white rounded-2xl py-4 font-extrabold text-lg shadow-lg hover:bg-[#ff5a35] transition-colors"
              >
                Sí, quiero seguir →
              </button>
              <button
                onClick={() => (window.location.href = "/sofia-chat")}
                className="w-full text-center text-xs text-[#B79A8E] hover:text-[#8a6a5e] mt-3 underline"
              >
                No, prefiero empezar de cero
              </button>
            </div>
          </div>
        )}

        {step === "pay" && (
          <div className="flex-1 flex flex-col justify-center">
            {/* Una sola tarjeta grande y cohesionada: monto + métodos JUNTOS */}
            <div className="bg-white rounded-3xl p-7 shadow-xl border border-[#FFD9CC]">
              <div className="text-center mb-6">
                <img
                  src="/sofia-avatar.jpg"
                  alt="Miss Sofia"
                  className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg mb-3"
                />
                <h2 className="text-4xl font-extrabold">Paga S/{amount}</h2>
                <p className="text-[#8a6a5e] mt-1">
                  Sofia Regular · {chosenBilling === "monthly" ? "mensual" : "anual"}
                </p>
              </div>

              <button
                onClick={() => payWith("tarjeta")}
                disabled={loading || !culqiReady}
                className="w-full bg-[#FF6B4A] text-white rounded-2xl py-5 font-bold text-xl shadow-lg hover:bg-[#ff5a35] disabled:bg-[#e5cabf] flex items-center justify-center gap-2"
              >
                💳 {loading ? "Procesando..." : "Pagar con tarjeta"}
              </button>
              <button
                onClick={() => payWith("yape")}
                disabled={loading || !culqiReady}
                className="w-full mt-3 bg-[#742284] text-white rounded-2xl py-5 font-bold text-xl shadow-lg hover:bg-[#8a2b9e] disabled:bg-[#e5cabf] flex items-center justify-center gap-2"
              >
                📱 {loading ? "Procesando..." : "Pagar con Yape"}
              </button>
              <p className="text-center text-sm text-[#8a6a5e] mt-4">
                Pago seguro · se activa al instante 🔒
              </p>

              {error && (
                <p className="mt-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm p-3 rounded-xl">
                  {error}
                </p>
              )}
            </div>

            <button
              onClick={() => setStep("offer")}
              className="w-full text-[#8a6a5e] text-sm py-3 mt-4 hover:text-[#2A1A15]"
            >
              ← Atrás
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-emerald-200 text-center">
              <img
                src="/sofia-avatar.jpg"
                alt="Miss Sofia"
                className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-emerald-100 shadow-lg mb-3"
              />
              <h2 className="text-2xl font-extrabold mb-2">¡Bienvenido de vuelta! 🎉</h2>
              <p className="text-[#3a2a24] mb-6">
                Tu pago de S/{amount} se procesó y tu plan quedó <b>activo al instante</b>. Seguimos
                justo donde lo dejaste.
              </p>
              <p className="text-xs text-[#B79A8E] mb-6">
                Si algo no se ve activado, recarga la app. ¿Dudas? Escríbenos por WhatsApp.
              </p>
              <a
                href="/sofia-chat"
                className="inline-block bg-[#FF6B4A] text-white px-6 py-3 rounded-full font-bold hover:bg-[#ff5a35] shadow"
              >
                Volver al chat →
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
