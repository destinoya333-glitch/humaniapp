"use client";

import { useEffect, useState } from "react";

type Edicion = {
  id: string;
  numero_edicion: number;
  nombre: string;
  estado: string;
  meta_tickets: number;
  abierta_at: string | null;
  cerrada_at: string | null;
  sorteo_at: string | null;
  numero_ganador: number | null;
};

type Stats = {
  edicion: { vendidos: number; meta: number; porcentaje: number; nombre: string; numero_edicion: number } | null;
  mix: Record<string, number>;
};

type Miembro = {
  id: string;
  nombre: string;
  dni: string;
  whatsapp: string;
  tipo_perfil: string;
  total_gastado: number;
  ediciones_consumidas: number;
  created_at: string;
};

export function AdminClubClient() {
  const [token, setToken] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("club_admin_token") || "" : ""
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [ediciones, setEdiciones] = useState<Edicion[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const headers = (): HeadersInit => ({ "x-club-admin": token, "Content-Type": "application/json" });

  const load = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const [s, e, m] = await Promise.all([
        fetch("/api/ecodrive/club/admin?action=stats", { headers: headers() }).then((r) => r.json()),
        fetch("/api/ecodrive/club/admin?action=ediciones", { headers: headers() }).then((r) => r.json()),
        fetch("/api/ecodrive/club/admin?action=miembros", { headers: headers() }).then((r) => r.json()),
      ]);
      if (s.error) setMsg(`stats: ${s.error}`);
      else setStats(s);
      if (!e.error) setEdiciones(e.ediciones ?? []);
      if (!m.error) setMiembros(m.miembros ?? []);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem("club_admin_token", token);
      load();
    }
  }, [token]);

  const exec = async (action: string, payload: Record<string, unknown> = {}) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/ecodrive/club/admin", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action, ...payload }),
      });
      const d = await r.json();
      if (!r.ok) setMsg(`❌ ${d.error}`);
      else setMsg(`✅ ${action} OK — ${JSON.stringify(d).slice(0, 200)}`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-xl p-6">
        <label className="block text-sm mb-2">Pegá tu admin token</label>
        <input
          type="password"
          onChange={(e) => setToken(e.target.value)}
          className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white"
        />
        <p className="text-xs text-gray-500 mt-2">Se guarda en localStorage de este browser.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {msg && <div className="bg-blue-500/10 border border-blue-500/40 rounded p-3 text-sm">{msg}</div>}

      <section className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-3">Edición actual</h2>
        {stats?.edicion ? (
          <div>
            <p className="text-2xl">
              <strong>#{stats.edicion.numero_edicion}</strong> {stats.edicion.nombre}
            </p>
            <p className="text-3xl text-[#E1811B] my-3">
              {stats.edicion.vendidos.toLocaleString("es-PE")} / {stats.edicion.meta.toLocaleString("es-PE")}{" "}
              <span className="text-base text-gray-400">({stats.edicion.porcentaje}%)</span>
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Object.entries(stats.mix).map(([k, v]) => (
                <div key={k} className="bg-black/40 rounded p-2">
                  <span className="text-gray-400">{k}</span>: <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Sin edición abierta.</p>
        )}
      </section>

      <section className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-3">Ediciones</h2>
        <table className="w-full text-sm">
          <thead className="text-gray-400">
            <tr><th className="text-left p-2">#</th><th className="text-left">Nombre</th><th>Estado</th><th>Meta</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {ediciones.map((e) => (
              <tr key={e.id} className="border-t border-white/10">
                <td className="p-2">{e.numero_edicion}</td>
                <td>{e.nombre}</td>
                <td className="text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    e.estado === "abierta" ? "bg-green-500/20 text-green-300" :
                    e.estado === "sorteada" ? "bg-purple-500/20 text-purple-300" :
                    e.estado === "borrador" ? "bg-gray-500/20 text-gray-300" :
                    "bg-yellow-500/20 text-yellow-300"
                  }`}>{e.estado}</span>
                </td>
                <td className="text-center">{e.meta_tickets}</td>
                <td className="text-right space-x-1">
                  {e.estado === "borrador" && (
                    <button disabled={busy} onClick={() => exec("edicion.abrir", { edicion_id: e.id })} className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs">
                      Abrir
                    </button>
                  )}
                  {e.estado === "abierta" && (
                    <>
                      <button disabled={busy} onClick={() => confirm(`Cerrar #${e.numero_edicion}?`) && exec("edicion.cerrar", { edicion_id: e.id })} className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-xs">
                        Cerrar
                      </button>
                      <button disabled={busy} onClick={() => {
                        const num = prompt(`Sortear #${e.numero_edicion}: ingresá el numero ganador que extrajo el notario del anfora (1-${e.meta_tickets})`);
                        const n = Number(num);
                        if (n && n >= 1 && n <= e.meta_tickets && confirm(`Confirmar ganador: #${n}? Esta accion es irreversible.`)) {
                          exec("edicion.sortear", { edicion_id: e.id, numero_ganador: n });
                        }
                      }} className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs">
                        Sortear
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          disabled={busy}
          onClick={() => {
            const nombre = prompt("Nombre de la nueva edición (ej: 'BYD Dolphin Mini 2025')");
            const premio_descripcion = prompt("Descripción del premio");
            const premio_valor = Number(prompt("Valor referencial (S/.)") || "0");
            const meta_tickets = Number(prompt("Meta tickets (default 3000)") || "3000");
            if (nombre) exec("edicion.crear", { nombre, premio_descripcion, premio_valor, meta_tickets });
          }}
          className="mt-4 bg-[#E1811B] hover:bg-[#FFA84A] text-black font-bold px-4 py-2 rounded"
        >
          + Crear nueva edición
        </button>
      </section>

      <section className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-3">Miembros recientes ({miembros.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400">
              <tr><th className="text-left p-2">Nombre</th><th>DNI</th><th>WhatsApp</th><th>Perfil</th><th>Gastado</th><th>Ediciones</th></tr>
            </thead>
            <tbody>
              {miembros.slice(0, 30).map((m) => (
                <tr key={m.id} className="border-t border-white/10">
                  <td className="p-2">{m.nombre}</td>
                  <td>{m.dni}</td>
                  <td>{m.whatsapp}</td>
                  <td className="text-xs">{m.tipo_perfil}</td>
                  <td>S/.{Number(m.total_gastado).toFixed(2)}</td>
                  <td className="text-center">{m.ediciones_consumidas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
