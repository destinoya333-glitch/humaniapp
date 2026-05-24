"use client";
import { useEffect, useState } from "react";

type Trip = {
  id: number;
  pasajero_telefono: string | null;
  origen_texto: string | null;
  destino_texto: string | null;
  precio_estimado: number | null;
  estado: string | null;
  created_at: string;
};
type ChoferSinPing = {
  chofer_id: number;
  telefono: string;
  zona: string | null;
  ultimo_ping: string | null;
};
type FlagMsg = { user_phone: string; content: string; created_at: string };

type Incidencias = {
  viajes_cancelados_48h: Trip[];
  viajes_stuck: Trip[];
  choferes_sin_ping: ChoferSinPing[];
  conversaciones_flag: FlagMsg[];
  counts: { cancelados: number; stuck: number; sin_ping: number; flag: number };
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

export default function IncidenciasAdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [d, setD] = useState<Incidencias | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ecodrive/admin/incidencias", {
        headers: { "x-admin-passcode": passcode },
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const j = await res.json();
      setD(j);
      setAuthed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

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
            onClick={() => load()}
            className="w-full bg-[#E1811B] text-white font-semibold py-2 rounded-lg"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#E1811B]">Incidencias</h1>
          <button
            onClick={() => load()}
            disabled={loading}
            className="text-sm border rounded-lg px-3 py-1 hover:bg-zinc-100"
          >
            {loading ? "..." : "Refrescar"}
          </button>
        </div>

        {d && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <Box label="Cancelados 48h" n={d.counts.cancelados} tone="red" />
              <Box label="Stuck >10min" n={d.counts.stuck} tone="amber" />
              <Box label="Choferes sin ping" n={d.counts.sin_ping} tone="amber" />
              <Box label="Mensajes con flag" n={d.counts.flag} tone="red" />
            </div>

            <Panel title={`🚦 Viajes stuck (${d.viajes_stuck.length})`}>
              <Trips trips={d.viajes_stuck} empty="Sin viajes stuck." />
            </Panel>

            <Panel title={`❌ Cancelados ultimas 48h (${d.viajes_cancelados_48h.length})`}>
              <Trips trips={d.viajes_cancelados_48h} empty="Sin cancelaciones recientes." />
            </Panel>

            <Panel title={`📡 Choferes sin ping >5min (${d.choferes_sin_ping.length})`}>
              {d.choferes_sin_ping.length === 0 ? (
                <Empty>Todos los choferes en turno pingueando OK.</Empty>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="text-left px-3 py-2">Telefono</th>
                      <th className="text-left px-3 py-2">Zona</th>
                      <th className="text-left px-3 py-2">Ultimo ping</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.choferes_sin_ping.map((c) => (
                      <tr key={c.chofer_id} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{c.telefono}</td>
                        <td className="px-3 py-2 text-xs">{c.zona || "—"}</td>
                        <td className="px-3 py-2 text-xs text-zinc-500">
                          {c.ultimo_ping ? fmt(c.ultimo_ping) : "nunca"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title={`💬 Mensajes con flag 7d (${d.conversaciones_flag.length})`}>
              {d.conversaciones_flag.length === 0 ? (
                <Empty>Sin mensajes flag.</Empty>
              ) : (
                <div className="divide-y">
                  {d.conversaciones_flag.map((m, i) => (
                    <div key={i} className="px-3 py-2 text-sm">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span className="font-mono">{m.user_phone}</span>
                        <span>{fmt(m.created_at)}</span>
                      </div>
                      <div className="text-zinc-700">{m.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

function Box({ label, n, tone }: { label: string; n: number; tone: "red" | "amber" }) {
  const cls = tone === "red" ? "border-red-500/40 bg-red-50" : "border-amber-500/40 bg-amber-50";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-3xl font-bold">{n}</div>
      <div className="text-[10px] uppercase text-zinc-600 tracking-wider mt-1">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border mb-6">
      <div className="px-4 py-2 border-b font-semibold text-sm">{title}</div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-zinc-500 py-6 text-sm">{children}</div>;
}

function Trips({ trips, empty }: { trips: Trip[]; empty: string }) {
  if (trips.length === 0) return <Empty>{empty}</Empty>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
        <tr>
          <th className="text-left px-3 py-2">#</th>
          <th className="text-left px-3 py-2">Hora</th>
          <th className="text-left px-3 py-2">Pasajero</th>
          <th className="text-left px-3 py-2">Origen → Destino</th>
          <th className="text-right px-3 py-2">S/.</th>
          <th className="text-left px-3 py-2">Estado</th>
        </tr>
      </thead>
      <tbody>
        {trips.map((t) => (
          <tr key={t.id} className="border-t">
            <td className="px-3 py-2 text-xs">#{t.id}</td>
            <td className="px-3 py-2 text-xs text-zinc-500">{fmt(t.created_at)}</td>
            <td className="px-3 py-2 font-mono text-xs">{t.pasajero_telefono?.slice(-4) || "—"}</td>
            <td className="px-3 py-2 text-xs">
              {t.origen_texto?.split(",")[0]?.slice(0, 20) || "?"} →{" "}
              {t.destino_texto?.split(",")[0]?.slice(0, 20) || "?"}
            </td>
            <td className="px-3 py-2 text-right">
              {t.precio_estimado ? Number(t.precio_estimado).toFixed(2) : "—"}
            </td>
            <td className="px-3 py-2 text-xs">{t.estado}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
