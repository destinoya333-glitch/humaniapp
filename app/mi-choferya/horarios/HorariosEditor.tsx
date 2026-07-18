"use client";

import { useEffect, useState } from "react";

type Horario = { dia_semana: number; hora_inicio: string; hora_fin: string };

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function HorariosEditor({ token }: { token: string }) {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/choferya/horarios?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => setHorarios(j.horarios || []))
      .finally(() => setLoading(false));
  }, [token]);

  function addSlot(dia: number) {
    setHorarios([...horarios, { dia_semana: dia, hora_inicio: "08:00", hora_fin: "20:00" }]);
  }

  function removeSlot(idx: number) {
    setHorarios(horarios.filter((_, i) => i !== idx));
  }

  function updateSlot(idx: number, field: "hora_inicio" | "hora_fin", value: string) {
    setHorarios(horarios.map((h, i) => (i === idx ? { ...h, [field]: value } : h)));
  }

  async function guardar() {
    setSaving(true);
    setMsg("");
    const r = await fetch(`/api/choferya/horarios?token=${encodeURIComponent(token)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ horarios }),
    });
    const j = await r.json();
    setSaving(false);
    setMsg(r.ok ? `✓ Guardado (${j.count} slots)` : `Error: ${j.error}`);
  }

  if (loading) return <p className="text-white/50 mt-6">Cargando...</p>;

  return (
    <div className="mt-6">
      <div className="space-y-3">
        {DIAS.map((dia, diaIdx) => {
          const slotsDia = horarios
            .map((h, i) => ({ h, i }))
            .filter(({ h }) => h.dia_semana === diaIdx);
          return (
            <div key={diaIdx} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">{DIAS[diaIdx]}</div>
                <button
                  onClick={() => addSlot(diaIdx)}
                  className="text-xs text-orange-400 hover:text-orange-300"
                >
                  + agregar
                </button>
              </div>
              {slotsDia.length === 0 ? (
                <p className="text-white/30 text-sm">No disponible</p>
              ) : (
                <ul className="space-y-2">
                  {slotsDia.map(({ h, i }) => (
                    <li key={i} className="flex gap-2 items-center">
                      <input
                        type="time"
                        value={h.hora_inicio.slice(0, 5)}
                        onChange={(e) => updateSlot(i, "hora_inicio", e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5"
                      />
                      <span className="text-white/40">–</span>
                      <input
                        type="time"
                        value={h.hora_fin.slice(0, 5)}
                        onChange={(e) => updateSlot(i, "hora_fin", e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5"
                      />
                      <button
                        onClick={() => removeSlot(i)}
                        className="text-red-400 hover:text-red-300 text-sm ml-2"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={guardar}
          disabled={saving}
          className="rounded-full bg-orange-500 hover:bg-orange-400 text-black font-medium px-6 py-3 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar horarios"}
        </button>
        {msg ? <span className="text-sm text-white/60">{msg}</span> : null}
      </div>
    </div>
  );
}
