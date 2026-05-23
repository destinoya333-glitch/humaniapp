"use client";

import { useState } from "react";

type Pass = { id: string; numero_pass_en_dni: number; fecha_inicio: string; fecha_fin: string; estado: string; ediciones_consumidas: number };
type Ticket = { id: string; numero_correlativo: number; origen: string; estado: string; paid_at: string | null; garaje_ediciones: { numero_edicion: number; nombre: string; estado: string } | null };
type Miembro = { nombre: string; dni: string; whatsapp: string; tipo_perfil: string; total_gastado: number };

export function MiCuentaClient() {
  const [wa, setWa] = useState("");
  const [data, setData] = useState<{ miembro: Miembro | null; pass: Pass[]; tickets: Ticket[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const consultar = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`/api/ecodrive/garaje/mis-numeros?whatsapp=${encodeURIComponent(wa)}`);
      const d = await r.json();
      if (!r.ok) setErr(d.error || "error");
      else setData(d);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
        <label className="block text-sm text-gray-300 mb-2">Ingresá tu WhatsApp (9 dígitos)</label>
        <div className="flex gap-2">
          <input
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            placeholder="998102258"
            className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-3 text-white"
          />
          <button
            onClick={consultar}
            disabled={loading || wa.length < 8}
            className="bg-[#E1811B] hover:bg-[#FFA84A] text-black font-bold px-6 rounded disabled:opacity-50"
          >
            {loading ? "..." : "Consultar"}
          </button>
        </div>
        {err && <p className="text-red-400 text-sm mt-2">⚠️ {err}</p>}
      </div>

      {data && (
        <>
          {!data.miembro ? (
            <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-6 text-center">
              <p className="text-yellow-200 mb-3">No encontramos compras a este número.</p>
              <a href="/ecodriveplus/garaje" className="bg-[#E1811B] text-black px-5 py-2 rounded font-bold inline-block">
                Hacerme Garaje Pass
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-sm text-gray-400">Miembro Garaje</p>
                <h2 className="text-2xl font-bold mb-2">{data.miembro.nombre}</h2>
                <div className="text-sm text-gray-300 grid grid-cols-2 gap-2">
                  <div>DNI: <strong>{data.miembro.dni}</strong></div>
                  <div>Perfil: <strong>{data.miembro.tipo_perfil}</strong></div>
                  <div>Total invertido: <strong>S/.{Number(data.miembro.total_gastado).toFixed(2)}</strong></div>
                </div>
              </div>

              {data.pass.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <h3 className="text-xl font-bold mb-3">👑 Tus Pass ({data.pass.length})</h3>
                  <div className="space-y-2">
                    {data.pass.map((p) => (
                      <div key={p.id} className="bg-black/40 rounded p-3 flex justify-between">
                        <div>
                          <p className="font-bold">Pass #{p.numero_pass_en_dni}</p>
                          <p className="text-xs text-gray-400">
                            Vigente {p.fecha_inicio} → {p.fecha_fin} · {p.ediciones_consumidas} ediciones consumidas
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded h-fit ${
                          p.estado === "activo" ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-300"
                        }`}>{p.estado}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.tickets.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <h3 className="text-xl font-bold mb-3">🎟️ Tus números ({data.tickets.length})</h3>
                  <div className="space-y-2">
                    {data.tickets.map((t) => (
                      <div key={t.id} className="bg-black/40 rounded p-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-[#E1811B]">#{t.numero_correlativo}</p>
                          <p className="text-xs text-gray-400">
                            Edición #{t.garaje_ediciones?.numero_edicion ?? "?"} · {t.garaje_ediciones?.nombre} · origen: {t.origen}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          t.estado === "ganador" ? "bg-yellow-500/20 text-yellow-300" :
                          t.estado === "confirmado" ? "bg-green-500/20 text-green-300" :
                          "bg-gray-500/20 text-gray-300"
                        }`}>{t.estado}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.tickets.length === 0 && data.pass.length === 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-6 text-center">
                  <p className="text-yellow-200 mb-3">Todavía no tenés Pass activo.</p>
                  <a href="/ecodriveplus/garaje" className="bg-[#E1811B] text-black px-5 py-2 rounded font-bold inline-block">
                    Hacerme Garaje Pass
                  </a>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
