"use client";
import { useEffect, useState } from "react";

type Pasajero = {
  id: string;
  wa_id: string;
  nombre: string;
  dni: string;
  edad: number | null;
  status: string;
  created_at: string;
};

export default function PasajerosAdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [status, setStatus] = useState("pending");
  const [list, setList] = useState<Pasajero[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (st: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ecodrive/admin/pasajeros?status=${st}`, {
        headers: { "x-admin-passcode": passcode },
      });
      const json = await res.json();
      if (res.ok) {
        setList(json.data || []);
        setAuthed(true);
      } else if (res.status === 401) setAuthed(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) load(status);
  }, [status, authed]);

  const action = async (id: string, act: "approve" | "reject" | "suspend") => {
    const reason = act !== "approve" ? prompt("Razon (opcional)") || "" : "";
    const res = await fetch("/api/ecodrive/admin/pasajeros", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-passcode": passcode },
      body: JSON.stringify({ id, action: act, reason }),
    });
    if (res.ok) load(status);
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
          <button onClick={() => load(status)} className="w-full bg-[#E1811B] text-white font-semibold py-2 rounded-lg">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#E1811B]">Pasajeros</h1>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
            <option value="suspended">Suspendidos</option>
          </select>
        </div>

        {loading && <p>Cargando...</p>}
        {!loading && list.length === 0 && (
          <p className="text-zinc-500">Sin pasajeros en estado &quot;{status}&quot;.</p>
        )}

        <div className="grid gap-3">
          {list.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-lg">{p.nombre}</div>
                  <div className="text-sm text-zinc-600">DNI {p.dni} · {p.edad} años</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    +{p.wa_id} · {new Date(p.created_at).toLocaleString("es-PE")}
                  </div>
                </div>
                {p.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => action(p.id, "approve")} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold">Aprobar</button>
                    <button onClick={() => action(p.id, "reject")} className="bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold">Rechazar</button>
                  </div>
                )}
                {p.status === "approved" && (
                  <button onClick={() => action(p.id, "suspend")} className="bg-zinc-600 text-white px-3 py-1 rounded text-sm font-semibold">Suspender</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
