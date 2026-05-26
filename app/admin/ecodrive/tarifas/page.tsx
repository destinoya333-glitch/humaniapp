"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { useAdminPass } from "../useAdminPass";

type Tipo = { label: string; multiplicador: number };
type Tarifas = {
  banderazo: number;
  por_km: number;
  por_min: number;
  minimo: number;
  tipos: Record<string, Tipo>;
  hora_pico: { enabled: boolean; multiplicador: number; horas: string[] };
  comision_pct: number;
  service_fee: number;
};

export default function TarifasAdminPage() {
  const { passcode, setPasscode, remember, booted } = useAdminPass();
  const [authed, setAuthed] = useState(false);
  const [t, setT] = useState<Tarifas | null>(null);
  const [meta, setMeta] = useState<{ source?: string; updated_at?: string; warning?: string }>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const load = async (pass: string = passcode) => {
    if (!pass) return;
    const res = await fetch("/api/ecodrive/admin/config?key=tarifas", {
      headers: { "x-admin-passcode": pass },
    });
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const j = await res.json();
    setT(j.value as Tarifas);
    setMeta({ source: j.source, updated_at: j.updated_at, warning: j.warning });
    setAuthed(true);
    remember(pass);
  };

  useEffect(() => {
    if (booted && passcode && !authed) void load(passcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  const save = async () => {
    if (!t) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/ecodrive/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-passcode": passcode },
        body: JSON.stringify({ key: "tarifas", value: t }),
      });
      const j = await res.json();
      if (res.ok) {
        setMsg("Guardado ✓");
        await load();
      } else {
        setMsg(`Error: ${j.error}${j.hint ? " · " + j.hint : ""}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="bg-white p-6 rounded-xl shadow-md w-80">
          <h1 className="font-bold text-xl mb-4 text-[#E1811B]">EcoDrive+ Admin</h1>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Admin passcode"
            className="w-full border rounded-lg px-3 py-2 mb-3"
          />
          <button
            onClick={() => load(passcode)}
            className="w-full bg-[#E1811B] text-white font-semibold py-2 rounded-lg"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  if (!t) return <div className="p-6">Cargando...</div>;

  const num =
    (path: string[]) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      setT((prev) => {
        if (!prev) return prev;
        const copy = JSON.parse(JSON.stringify(prev)) as Tarifas & Record<string, unknown>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let ref: any = copy;
        for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
        ref[path[path.length - 1]] = isFinite(v) ? v : 0;
        return copy as Tarifas;
      });
    };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <AdminNav />
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#E1811B] mb-1">Tarifas</h1>
        <p className="text-zinc-600 mb-2">
          Tarifa base + multiplicadores por tipo de servicio y hora pico.
        </p>
        <p className="text-xs text-zinc-500 mb-6">
          Fuente: <b>{meta.source}</b>
          {meta.updated_at && ` · ultima edicion: ${new Date(meta.updated_at).toLocaleString("es-PE")}`}
          {meta.warning && <span className="text-red-600 ml-2">⚠ {meta.warning}</span>}
        </p>

        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          <section>
            <h2 className="font-bold text-lg mb-3">Tarifa base</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Banderazo S/." value={t.banderazo} onChange={num(["banderazo"])} />
              <Field label="Por km" value={t.por_km} onChange={num(["por_km"])} />
              <Field label="Por min" value={t.por_min} onChange={num(["por_min"])} />
              <Field label="Minimo" value={t.minimo} onChange={num(["minimo"])} />
            </div>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3">Tipos de servicio (multiplicadores)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(t.tipos).map(([k, v]) => (
                <Field
                  key={k}
                  label={v.label}
                  value={v.multiplicador}
                  onChange={num(["tipos", k, "multiplicador"])}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3">Hora pico</h2>
            <label className="flex items-center gap-2 mb-2 text-sm">
              <input
                type="checkbox"
                checked={t.hora_pico.enabled}
                onChange={(e) =>
                  setT({ ...t, hora_pico: { ...t.hora_pico, enabled: e.target.checked } })
                }
              />
              Habilitar surge en horas pico
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Multiplicador"
                value={t.hora_pico.multiplicador}
                onChange={num(["hora_pico", "multiplicador"])}
              />
              <div>
                <label className="block text-xs text-zinc-600 mb-1">Horas (csv)</label>
                <input
                  value={t.hora_pico.horas.join(", ")}
                  onChange={(e) =>
                    setT({
                      ...t,
                      hora_pico: {
                        ...t.hora_pico,
                        horas: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      },
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="07:00-09:30, 17:30-20:00"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3">Comision y service fee</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Comision %"
                value={t.comision_pct}
                onChange={num(["comision_pct"])}
              />
              <Field
                label="Service fee S/."
                value={t.service_fee}
                onChange={num(["service_fee"])}
              />
            </div>
          </section>

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-[#E1811B] text-white font-semibold py-3 rounded-lg hover:bg-[#c46b0e] disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar tarifas"}
          </button>
          {msg && <p className="text-sm text-center text-zinc-600">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-600 mb-1">{label}</label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={onChange}
        className="w-full border rounded-lg px-3 py-2"
      />
    </div>
  );
}
