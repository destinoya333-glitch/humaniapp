"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MOTIVATIONS = [
  { key: "trabajo", label: "Trabajo / chamba" },
  { key: "viajar", label: "Viajar al extranjero" },
  { key: "series", label: "Ver series sin subtítulos" },
  { key: "familia", label: "Hablarle a mi familia / hijos" },
  { key: "otro", label: "Otro" },
];

const MINUTES = [
  { value: 5, label: "5 min al día", desc: "Mínimo viable" },
  { value: 10, label: "10 min al día", desc: "Recomendado" },
  { value: 20, label: "20 min al día", desc: "Intensivo" },
];

const COUNTRIES = ["Peru", "Mexico", "Colombia", "Argentina", "Chile", "Ecuador", "Venezuela", "USA", "Other"];

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Peru");
  const [profession, setProfession] = useState("");
  const [motivationKey, setMotivationKey] = useState<string>("");
  const [motivationOther, setMotivationOther] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [minutesPerDay, setMinutesPerDay] = useState<number | null>(null);
  const [committed, setCommitted] = useState(false);

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
      const fromMeta = (user.user_metadata as { whatsapp_phone?: string })?.whatsapp_phone;
      const fromSession =
        typeof window !== "undefined" ? sessionStorage.getItem("sofia_signup_phone") : null;
      if (fromMeta) setWhatsapp(fromMeta);
      else if (fromSession) setWhatsapp(fromSession);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const motivationFinal =
        motivationKey === "otro"
          ? motivationOther.trim() || "Otro"
          : MOTIVATIONS.find((m) => m.key === motivationKey)?.label ?? "";

      const res = await fetch("/api/sofia-auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age: age ? parseInt(age, 10) : null,
          city,
          country,
          profession,
          motivation: motivationFinal,
          whatsapp_phone: whatsapp || null,
          minutes_per_day: minutesPerDay,
          committed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en el onboarding");
      window.location.href = "/sofia-chat";
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!authedEmail) return null;

  /* ── Step 1 valid? ─────────────────────────────────────── */
  const step1Valid =
    name.trim().length >= 2 &&
    city.trim().length >= 2 &&
    motivationKey !== "" &&
    (motivationKey !== "otro" || motivationOther.trim().length >= 2);

  /* ── Step 2 valid? ─────────────────────────────────────── */
  const step2Valid = minutesPerDay !== null && committed === true;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-zinc-100 flex items-center justify-center p-4">
      <div className="card-surface rounded-2xl border border-[#2A2A2A] max-w-lg w-full p-8">
        <header className="mb-6">
          <p className="text-amber-400 text-xs uppercase tracking-widest mb-2">
            Paso {step} de 2
          </p>
          <h1 className="text-2xl font-bold">
            {step === 1 ? "Cuéntame sobre ti" : "Sella tu Pacto Cuna"}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {step === 1
              ? "Necesito conocerte para personalizar tu novela y misiones."
              : "El compromiso es lo que hace que el método funcione."}
          </p>
        </header>

        {step === 1 && (
          <Step1
            name={name}
            setName={setName}
            age={age}
            setAge={setAge}
            city={city}
            setCity={setCity}
            country={country}
            setCountry={setCountry}
            profession={profession}
            setProfession={setProfession}
            motivationKey={motivationKey}
            setMotivationKey={setMotivationKey}
            motivationOther={motivationOther}
            setMotivationOther={setMotivationOther}
            whatsapp={whatsapp}
            setWhatsapp={setWhatsapp}
          />
        )}

        {step === 2 && (
          <Step2
            minutesPerDay={minutesPerDay}
            setMinutesPerDay={setMinutesPerDay}
            committed={committed}
            setCommitted={setCommitted}
          />
        )}

        {/* ── Nav buttons ─────────────────────────────────── */}
        <div className="mt-6 flex gap-3">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 border border-[#2A2A2A] text-zinc-300 rounded-xl py-2.5 font-medium hover:border-zinc-500 transition-colors"
            >
              ← Atrás
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="flex-1 bg-amber-500 text-black rounded-xl py-2.5 font-bold hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
            >
              Continuar →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!step2Valid || loading}
              className="flex-1 bg-amber-500 text-black rounded-xl py-2.5 font-bold hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
            >
              {loading ? "Sellando pacto..." : "Sellar pacto y empezar →"}
            </button>
          )}
        </div>

        {err && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-3 rounded-xl">
            {err}
          </div>
        )}
      </div>
    </main>
  );
}

/* ─── Step 1: datos personales ─────────────────────────────── */

function Step1(props: {
  name: string; setName: (v: string) => void;
  age: string; setAge: (v: string) => void;
  city: string; setCity: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  profession: string; setProfession: (v: string) => void;
  motivationKey: string; setMotivationKey: (v: string) => void;
  motivationOther: string; setMotivationOther: (v: string) => void;
  whatsapp: string; setWhatsapp: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="¿Cómo te llamo?" required>
        <input
          type="text"
          value={props.name}
          onChange={(e) => props.setName(e.target.value)}
          placeholder="Tu primer nombre"
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Edad">
          <input
            type="number"
            value={props.age}
            onChange={(e) => props.setAge(e.target.value)}
            placeholder="25"
            min={10}
            max={99}
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        </Field>
        <Field label="Ciudad" required>
          <input
            type="text"
            value={props.city}
            onChange={(e) => props.setCity(e.target.value)}
            placeholder="Lima"
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        </Field>
      </div>

      <Field label="País">
        <select
          value={props.country}
          onChange={(e) => props.setCountry(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="¿A qué te dedicas?">
        <input
          type="text"
          value={props.profession}
          onChange={(e) => props.setProfession(e.target.value)}
          placeholder="Ingeniero, doctor, estudiante..."
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
        />
      </Field>

      <Field label="¿Por qué quieres aprender inglés?" required>
        <div className="space-y-2">
          {MOTIVATIONS.map((m) => (
            <label key={m.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="motivation"
                value={m.key}
                checked={props.motivationKey === m.key}
                onChange={() => props.setMotivationKey(m.key)}
                className="accent-amber-500"
              />
              <span className="text-sm text-zinc-300">{m.label}</span>
            </label>
          ))}
          {props.motivationKey === "otro" && (
            <input
              type="text"
              value={props.motivationOther}
              onChange={(e) => props.setMotivationOther(e.target.value)}
              placeholder="Cuéntame brevemente"
              className="w-full mt-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          )}
        </div>
      </Field>

      <Field label="WhatsApp (opcional — para audios diarios)">
        <input
          type="tel"
          value={props.whatsapp}
          onChange={(e) => props.setWhatsapp(e.target.value)}
          placeholder="+51999999999"
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
        />
      </Field>
    </div>
  );
}

/* ─── Step 2: Pacto Cuna ─────────────────────────────────────── */

function Step2(props: {
  minutesPerDay: number | null; setMinutesPerDay: (v: number) => void;
  committed: boolean; setCommitted: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="¿Cuánto tiempo al día puedes dedicarle?" required>
        <div className="space-y-2">
          {MINUTES.map((m) => (
            <label
              key={m.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                props.minutesPerDay === m.value
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-[#2A2A2A] hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="minutes"
                value={m.value}
                checked={props.minutesPerDay === m.value}
                onChange={() => props.setMinutesPerDay(m.value)}
                className="accent-amber-500"
              />
              <div>
                <p className="text-sm font-medium text-zinc-200">{m.label}</p>
                <p className="text-xs text-zinc-500">{m.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Field>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <p className="text-sm font-bold text-amber-400 mb-2">
          🤝 El Pacto Cuna
        </p>
        <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
          Los próximos <strong>30 días</strong> eres un bebé escuchando inglés.
          Te voy a mandar audios cortos y misiones suaves.{" "}
          <strong>NO te voy a pedir que hables en inglés todavía.</strong>{" "}
          Tu cerebro necesita escuchar primero, igual que escuchaste español
          12 meses antes de decir "mamá".
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={props.committed}
            onChange={(e) => props.setCommitted(e.target.checked)}
            className="accent-amber-500 mt-0.5"
          />
          <span className="text-sm text-zinc-200">
            Me comprometo a respetar mi Fase Cuna por 30 días.
          </span>
        </label>
      </div>
    </div>
  );
}

/* ─── Field wrapper ──────────────────────────────────────────── */

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
      <span className="text-xs font-medium text-zinc-400 mb-1.5 block">
        {label}
        {required && <span className="text-amber-400 ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}
