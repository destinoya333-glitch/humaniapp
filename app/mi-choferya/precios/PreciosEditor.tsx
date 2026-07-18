"use client";

import { useEffect, useState } from "react";

type Precio = {
  id?: string;
  etiqueta: string;
  origen: string | null;
  destino: string | null;
  precio_pen: number;
  duracion_estimada_min: number | null;
  activo: boolean;
  orden: number;
};

export default function PreciosEditor({ token }: { token: string }) {
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function load() {
    const r = await fetch(`/api/choferya/precios?token=${encodeURIComponent(token)}`);
    const j = await r.json();
    if (r.ok) setPrecios(j.precios || []);
    else setErr(j.error || "Error");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function crear() {
    const etiqueta = prompt("Nombre de la ruta (ej: Centro → Aeropuerto):");
    if (!etiqueta) return;
    const precioStr = prompt("Precio en S/. (ej: 18):");
    const precio = Number(precioStr);
    if (!Number.isFinite(precio) || precio <= 0) return alert("Precio inválido");

    setSaving("new");
    const r = await fetch(`/api/choferya/precios?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etiqueta, precio_pen: precio, orden: precios.length }),
    });
    const j = await r.json();
    setSaving(null);
    if (!r.ok) return alert(j.error || "Error");
    load();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta tarifa?")) return;
    setSaving(id);
    const r = await fetch(
      `/api/choferya/precios?token=${encodeURIComponent(token)}&id=${id}`,
      { method: "DELETE" }
    );
    setSaving(null);
    if (!r.ok) return alert((await r.json()).error);
    load();
  }

  async function toggleActivo(p: Precio) {
    setSaving(p.id!);
    await fetch(`/api/choferya/precios?token=${encodeURIComponent(token)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, activo: !p.activo }),
    });
    setSaving(null);
    load();
  }

  if (loading) return <p className="text-white/50 mt-6">Cargando...</p>;

  return (
    <div className="mt-6 space-y-3">
      {err ? <p className="text-red-400">{err}</p> : null}

      {precios.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60">No tienes tarifas todavía.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {precios.map((p) => (
            <li
              key={p.id}
              className={`rounded-xl border px-4 py-3 flex justify-between items-center ${
                p.activo ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-60"
              }`}
            >
              <div>
                <div className="font-medium">{p.etiqueta}</div>
                <div className="text-xs text-white/40">
                  {p.duracion_estimada_min ? `${p.duracion_estimada_min} min · ` : ""}
                  {p.activo ? "visible" : "oculta"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-orange-400 font-bold">S/. {p.precio_pen}</span>
                <button
                  onClick={() => toggleActivo(p)}
                  disabled={saving === p.id}
                  className="text-xs text-white/60 hover:text-white"
                >
                  {p.activo ? "ocultar" : "mostrar"}
                </button>
                <button
                  onClick={() => eliminar(p.id!)}
                  disabled={saving === p.id}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={crear}
        disabled={saving === "new"}
        className="w-full rounded-full bg-orange-500 hover:bg-orange-400 text-black font-medium py-3 disabled:opacity-50"
      >
        {saving === "new" ? "Creando..." : "+ Nueva tarifa"}
      </button>
    </div>
  );
}
