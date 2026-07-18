"use client";

import { useState } from "react";

const PLANES = [
  { id: "basico", label: "Básico — S/.39/mes" },
  { id: "pro", label: "Pro — S/.79/mes" },
  { id: "elite", label: "Élite — S/.149/mes" },
];

export default function SeChoferYaForm({
  initialPlan = "basico",
}: {
  initialPlan?: "basico" | "pro" | "elite";
}) {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [respuesta, setRespuesta] = useState<{
    requires_inscription: boolean;
    message?: string;
    monto_renta_pen?: number;
    slug?: string;
  } | null>(null);

  const [form, setForm] = useState({
    wa_id: "",
    plan: initialPlan,
    bio: "",
    zonas: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setErrorMsg("");

    try {
      const r = await fetch("/api/choferya/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wa_id: form.wa_id.trim(),
          plan: form.plan,
          bio: form.bio.trim() || undefined,
          zonas: form.zonas
            .split(",")
            .map((z) => z.trim())
            .filter(Boolean),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErrorMsg(j.error || "No se pudo registrar");
        setEstado("error");
        return;
      }
      setRespuesta(j);
      setEstado("ok");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setEstado("error");
    }
  }

  if (estado === "ok" && respuesta) {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center">
        <div className="text-4xl mb-3">📲</div>
        {respuesta.requires_inscription ? (
          <>
            <h2 className="text-xl font-semibold">Te mandamos un WhatsApp</h2>
            <p className="text-white/70 mt-2">
              Te llegó un formulario para subir tu DNI, licencia, SOAT y foto del auto. La IA te
              verifica en ~5 minutos. Cuando estés aprobado, vuelve aquí y completa el plan.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold">¡Casi listo!</h2>
            <p className="text-white/70 mt-2">
              Te mandamos por WhatsApp las instrucciones para yapear S/.{respuesta.monto_renta_pen}.
              En cuanto detectemos tu pago, activamos tu cuenta y te llega el link al panel.
            </p>
            {respuesta.slug ? (
              <p className="text-xs text-white/40 mt-3">
                Tu página será: chofer.activosya.com/c/{respuesta.slug}
              </p>
            ) : null}
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-white/80 mb-1 block">Tu WhatsApp</span>
        <span className="text-xs text-white/40 block mb-1">
          Ahí te mandaremos el formulario de inscripción.
        </span>
        <input
          required
          inputMode="numeric"
          value={form.wa_id}
          onChange={(e) => setForm({ ...form, wa_id: e.target.value })}
          placeholder="9XXXXXXXX"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-orange-400 outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-white/80 mb-1 block">Plan</span>
        <select
          value={form.plan}
          onChange={(e) => setForm({ ...form, plan: e.target.value as "basico" | "pro" | "elite" })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-orange-400 outline-none"
        >
          {PLANES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-white/80 mb-1 block">
          Zonas que cubres (opcional)
        </span>
        <span className="text-xs text-white/40 block mb-1">
          Separa por comas. Ej: Trujillo Centro, Huanchaco, Aeropuerto
        </span>
        <input
          value={form.zonas}
          onChange={(e) => setForm({ ...form, zonas: e.target.value })}
          placeholder="Trujillo Centro, Huanchaco"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-orange-400 outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-white/80 mb-1 block">
          Bio (opcional)
        </span>
        <textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={3}
          placeholder="Ej: 8 años manejando, especialista en aeropuerto y rutas largas. Auto con A/C y maletera amplia."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-orange-400 outline-none"
        />
      </label>

      {errorMsg ? <p className="text-red-400 text-sm">{errorMsg}</p> : null}

      <button
        type="submit"
        disabled={estado === "enviando"}
        className="w-full rounded-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-semibold py-4 transition"
      >
        {estado === "enviando" ? "Procesando..." : "Inscribirme a TuChoferYa"}
      </button>
    </form>
  );
}
