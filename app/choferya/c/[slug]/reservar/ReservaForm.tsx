"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Precio = {
  id: string;
  etiqueta: string;
  precio_pen: number;
  duracion_estimada_min: number | null;
};

export default function ReservaForm({
  slug,
  choferNombre,
  precios,
}: {
  slug: string;
  choferNombre: string;
  precios: Precio[];
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [reservaId, setReservaId] = useState<string>("");

  const [form, setForm] = useState({
    nombre: "",
    wa_id: "",
    fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    hora: "08:00",
    precio_id: precios[0]?.id || "",
    origen: "",
    destino: "",
    precio_custom: "",
    notas: "",
  });

  const selPrecio = precios.find((p) => p.id === form.precio_id);
  const precioFinal =
    selPrecio?.precio_pen ?? (form.precio_custom ? Number(form.precio_custom) : 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.wa_id.trim()) {
      setErrorMsg("Tu nombre y WhatsApp son obligatorios");
      setEstado("error");
      return;
    }
    if (precios.length === 0 && (!form.precio_custom || Number(form.precio_custom) <= 0)) {
      setErrorMsg("Ingresa un precio acordado con el chofer");
      setEstado("error");
      return;
    }

    setEstado("enviando");
    setErrorMsg("");

    try {
      const r = await fetch("/api/choferya/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          pasajero_nombre: form.nombre.trim(),
          pasajero_wa_id: form.wa_id.trim(),
          fecha_viaje: form.fecha,
          hora_viaje: form.hora,
          origen_direccion: form.origen.trim() || null,
          destino_direccion: form.destino.trim() || null,
          precio_id: form.precio_id || null,
          precio_pen: precioFinal,
          notas: form.notas.trim() || null,
          source: "web",
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErrorMsg(j.error || "No se pudo crear la reserva");
        setEstado("error");
        return;
      }
      setReservaId(j.reserva_id);
      setEstado("ok");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setEstado("error");
    }
  }

  if (estado === "ok") {
    return (
      <div className="mt-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-semibold">Reserva enviada</h2>
        <p className="text-white/70 mt-2">
          {choferNombre.split(" ")[0]} recibió tu solicitud por WhatsApp y debe confirmarla.
          Cuando confirme te llegará su número de Yape al WhatsApp que registraste.
        </p>
        <p className="text-xs text-white/40 mt-4">Reserva #{reservaId.slice(0, 8)}</p>
        <button
          onClick={() => router.push(`/choferya/c/${slug}`)}
          className="mt-6 px-6 py-3 rounded-full bg-orange-500 text-black font-medium"
        >
          Volver al perfil
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <Field label="Tu nombre">
        <input
          required
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej: María Pérez"
          className="input"
        />
      </Field>

      <Field label="Tu WhatsApp" hint="Aquí recibirás la confirmación y el Yape del chofer">
        <input
          required
          inputMode="numeric"
          value={form.wa_id}
          onChange={(e) => setForm({ ...form, wa_id: e.target.value })}
          placeholder="9XXXXXXXX"
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <input
            required
            type="date"
            value={form.fecha}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Hora">
          <input
            required
            type="time"
            value={form.hora}
            onChange={(e) => setForm({ ...form, hora: e.target.value })}
            className="input"
          />
        </Field>
      </div>

      {precios.length > 0 ? (
        <Field label="Ruta · tarifa plana">
          <select
            value={form.precio_id}
            onChange={(e) => setForm({ ...form, precio_id: e.target.value })}
            className="input"
          >
            <option value="">Otra ruta (cotizar)</option>
            {precios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etiqueta} · S/. {p.precio_pen}
                {p.duracion_estimada_min ? ` (~${p.duracion_estimada_min} min)` : ""}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {!form.precio_id ? (
        <Field label="Precio acordado con el chofer (S/.)" hint="Si todavía no acordaron, déjalo en 0 y el chofer cotiza">
          <input
            type="number"
            inputMode="decimal"
            value={form.precio_custom}
            onChange={(e) => setForm({ ...form, precio_custom: e.target.value })}
            placeholder="0"
            className="input"
          />
        </Field>
      ) : null}

      <Field label="Origen (dirección)">
        <input
          value={form.origen}
          onChange={(e) => setForm({ ...form, origen: e.target.value })}
          placeholder="Ej: Av. España 234"
          className="input"
        />
      </Field>

      <Field label="Destino (dirección)">
        <input
          value={form.destino}
          onChange={(e) => setForm({ ...form, destino: e.target.value })}
          placeholder="Ej: Aeropuerto Carlos Martínez"
          className="input"
        />
      </Field>

      <Field label="Notas (opcional)">
        <textarea
          value={form.notas}
          onChange={(e) => setForm({ ...form, notas: e.target.value })}
          rows={2}
          placeholder="Ej: necesito asiento de bebé / 2 personas + maletas"
          className="input"
        />
      </Field>

      {errorMsg ? <p className="text-red-400 text-sm">{errorMsg}</p> : null}

      <button
        type="submit"
        disabled={estado === "enviando"}
        className="w-full rounded-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-semibold py-4 transition"
      >
        {estado === "enviando" ? "Enviando..." : `Enviar reserva a ${choferNombre.split(" ")[0]}`}
      </button>

      <p className="text-xs text-white/40 text-center">
        Al enviar aceptas que tu WhatsApp se comparta con el chofer para coordinar el viaje.
        El pago lo haces directo al Yape del chofer cuando él confirme.
      </p>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          outline: none;
          font-size: 16px;
        }
        :global(.input:focus) {
          border-color: rgb(249 115 22 / 0.6);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-white/80 mb-1 block">{label}</span>
      {hint ? <span className="text-xs text-white/40 block mb-1">{hint}</span> : null}
      {children}
    </label>
  );
}
