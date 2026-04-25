"use client";

import { useState } from "react";

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function checkout(plan: "pro" | "elite") {
    setLoading(plan);
    setErr(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en checkout");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setErr((e as Error).message);
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Tu inglés merece más que 3 minutos
          </h1>
          <p className="text-gray-600">
            Conversa todo lo que quieras con Miss Sofia. Cancela cuando quieras.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-5">
          {/* PRO */}
          <PlanCard
            badge="MÁS POPULAR"
            badgeColor="bg-blue-600"
            name="Pro"
            price="49"
            features={[
              "Conversaciones ilimitadas con Miss Sofia",
              "Examen semanal + certificado descargable",
              "Shadow Coach completo (reporte tras cada sesión)",
              "Memoria avanzada (Sofia te recuerda todo)",
              "Acceso a los 6 niveles (A1 a C1)",
              "Cancela cuando quieras",
            ]}
            cta="Subscribirme a Pro"
            onClick={() => checkout("pro")}
            loading={loading === "pro"}
            highlight
          />

          {/* ELITE */}
          <PlanCard
            badge="PARA SERIOS"
            badgeColor="bg-purple-600"
            name="Elite"
            price="99"
            features={[
              "Todo lo de Pro",
              "Sesiones con humanos certificados (4/mes)",
              "Tracks especializados (Business, Tech, Hospitality)",
              "Soporte prioritario por WhatsApp",
              "Acceso anticipado a nuevas funciones",
              "Certificación oficial al completar nivel",
            ]}
            cta="Subscribirme a Elite"
            onClick={() => checkout("elite")}
            loading={loading === "elite"}
          />
        </div>

        {err && (
          <div className="mt-5 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg max-w-xl mx-auto">
            {err}
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-500">
          Pago procesado por Stripe. Cancelas cuando quieras desde tu cuenta.
        </div>
      </div>
    </main>
  );
}

function PlanCard({
  badge,
  badgeColor,
  name,
  price,
  features,
  cta,
  onClick,
  loading,
  highlight,
}: {
  badge: string;
  badgeColor: string;
  name: string;
  price: string;
  features: string[];
  cta: string;
  onClick: () => void;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl p-6 shadow-md ${
        highlight ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <div
        className={`${badgeColor} text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded inline-block mb-3`}
      >
        {badge}
      </div>
      <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
      <div className="mt-1 mb-4">
        <span className="text-4xl font-bold text-gray-900">S/{price}</span>
        <span className="text-gray-500">/mes</span>
      </div>
      <ul className="space-y-2 mb-6">
        {features.map((f, i) => (
          <li key={i} className="text-sm text-gray-700 flex">
            <span className="text-green-500 mr-2">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`w-full rounded-lg py-2.5 font-semibold ${
          highlight
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-purple-600 text-white hover:bg-purple-700"
        } disabled:bg-gray-400`}
      >
        {loading ? "Cargando..." : cta}
      </button>
    </div>
  );
}
