"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { useAdminPass } from "../useAdminPass";

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
  const { passcode, setPasscode, remember, booted } = useAdminPass();
  const [authed, setAuthed] = useState(false);
  const [status, setStatus] = useState("pending");
  const [list, setList] = useState<Pasajero[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (st: string, pass: string = passcode) => {
    if (!pass) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ecodrive/admin/pasajeros?status=${st}`, {
        headers: { "x-admin-passcode": pass },
      });
      const json = await res.json();
      if (res.ok) {
        setList(json.data || []);
        setAuthed(true);
        remember(pass);
      } else if (res.status === 401) setAuthed(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (booted && passcode && !authed) load(status, passcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  useEffect(() => {
    if (authed) load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, authed]);

  const action = async (
    id: string,
    act: "approve" | "reject" | "suspend" | "reactivate" | "refund"
  ) => {
    const body: Record<string, unknown> = { id, action: act };
    if (act === "reject" || act === "suspend") {
      body.reason = prompt("Razon (opcional)") || "";
    }
    if (act === "refund") {
      const amt = prompt("Monto a devolver (S/.)") || "";
      const num = parseFloat(amt);
      if (!isFinite(num) || num <= 0) {
        alert("Monto invalido");
        return;
      }
      body.amount = num;
      body.descripcion = prompt("Motivo / descripcion") || "Devolucion admin";
    }
    const res = await fetch("/api/ecodrive/admin/pasajeros", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-passcode": passcode },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      if (act === "refund") {
        const j = await res.json();
        alert(`Devolucion OK. Saldo despues: S/.${j.refund?.saldo_despues?.toFixed(2)}`);
      }
      load(status);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(`Error: ${j.error || res.status}`);
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
          <button onClick={() => load(status)} className="w-full bg-[#E1811B] text-white font-semibold py-2 rounded-lg">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <AdminNav />
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
                <div className="flex flex-col gap-1 shrink-0">
                  {p.status === "pending" && (
                    <>
                      <button onClick={() => action(p.id, "approve")} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold">Aprobar</button>
                      <button onClick={() => action(p.id, "reject")} className="bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold">Rechazar</button>
                    </>
                  )}
                  {p.status === "approved" && (
                    <>
                      <button onClick={() => action(p.id, "refund")} className="bg-amber-500 text-white px-3 py-1 rounded text-sm font-semibold">Devolver S/.</button>
                      <button onClick={() => action(p.id, "suspend")} className="bg-zinc-600 text-white px-3 py-1 rounded text-sm font-semibold">Bloquear</button>
                    </>
                  )}
                  {(p.status === "rejected" || p.status === "suspended") && (
                    <button onClick={() => action(p.id, "reactivate")} className="bg-emerald-600 text-white px-3 py-1 rounded text-sm font-semibold">Reactivar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
