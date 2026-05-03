"use client";
import { useState } from "react";

export default function LeadForm() {
  const [step, setStep] = useState<"form" | "ok">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    ciudad: "",
    activo_interes: "miss-sofia",
    plan_interes: "no-decidido",
    comentario: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(window.location.search);
      const r = await fetch("/api/operadores/lead-captura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          fuente: "web",
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      setStep("ok");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (step === "ok") {
    return (
      <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-orange-500/5 p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <div className="text-2xl font-bold mb-2">¡Recibimos tu interés!</div>
        <div className="text-zinc-300 mb-6">
          Te enviamos un mensaje de bienvenida a tu WhatsApp. Te contactaremos en menos de 24
          horas para resolver tus dudas y empezar.
        </div>
        <div className="text-sm text-zinc-500">
          Mientras tanto, revisa tu WhatsApp 📲
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 space-y-5">
      <div>
        <label className="block text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2">
          Tu nombre completo *
        </label>
        <input
          type="text"
          value={data.nombre}
          onChange={(e) => setData({ ...data, nombre: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 outline-none focus:border-amber-500/50 transition"
          placeholder="Juan Pérez"
          required
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2">
          Tu WhatsApp *
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-amber-500/50 transition">
          <span className="text-zinc-500">🇵🇪 +51</span>
          <input
            type="tel"
            value={data.telefono}
            onChange={(e) => setData({ ...data, telefono: e.target.value.replace(/\D/g, "") })}
            placeholder="9XX XXX XXX"
            className="flex-1 bg-transparent outline-none tracking-wider"
            maxLength={9}
            required
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2">
            Email (opcional)
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 outline-none focus:border-amber-500/50 transition"
            placeholder="juan@gmail.com"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2">
            Tu ciudad
          </label>
          <input
            type="text"
            value={data.ciudad}
            onChange={(e) => setData({ ...data, ciudad: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 outline-none focus:border-amber-500/50 transition"
            placeholder="Cajamarca"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2">
          ¿Qué plan te interesa?
        </label>
        <select
          value={data.plan_interes}
          onChange={(e) => setData({ ...data, plan_interes: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 outline-none focus:border-amber-500/50 transition"
        >
          <option value="no-decidido">Aún no decido, quiero más info</option>
          <option value="local">Local — S/. 500/mes (30 alumnos)</option>
          <option value="comunidad">Comunidad — S/. 1,200/mes (100 alumnos)</option>
          <option value="lider">Líder — S/. 2,500/mes (300 alumnos)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2">
          Comentario (opcional)
        </label>
        <textarea
          value={data.comentario}
          onChange={(e) => setData({ ...data, comentario: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 outline-none focus:border-amber-500/50 transition min-h-[80px]"
          placeholder="Cuéntanos qué te motivó / qué experiencia tienes..."
        />
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !data.nombre || data.telefono.length < 9}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-black font-bold transition transform hover:-translate-y-0.5 shadow-xl shadow-amber-500/30"
      >
        {loading ? "Enviando..." : "Quiero ser operador →"}
      </button>

      <div className="text-xs text-zinc-500 text-center">
        Te respondemos por WhatsApp en menos de 24h. Sin spam.
      </div>
    </form>
  );
}
