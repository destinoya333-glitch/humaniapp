"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { useAdminPass } from "../useAdminPass";

type Chofer = {
  id: string;
  wa_id: string;
  nombre: string;
  dni: string;
  edad: number | null;
  zona_principal: string | null;
  vehiculo_marca: string;
  vehiculo_modelo: string;
  vehiculo_anio: string;
  vehiculo_color: string;
  placa: string;
  status: string;
  rating: number | null;
  rejection_reason: string | null;
  created_at: string;
};

type Action =
  | "approve"
  | "reject"
  | "suspend"
  | "reactivate"
  | "set_rating"
  | "force_off_duty";

export default function ChoferesAdminPage() {
  const { passcode, setPasscode, remember, booted } = useAdminPass();
  const [authed, setAuthed] = useState(false);
  const [status, setStatus] = useState("pending");
  const [list, setList] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (st: string, pass: string = passcode) => {
    if (!pass) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ecodrive/admin/choferes?status=${st}`, {
        headers: { "x-admin-passcode": pass },
      });
      const json = await res.json();
      if (res.ok) {
        setList(json.data || []);
        setAuthed(true);
        remember(pass);
      } else if (res.status === 401) {
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // auto-login si ya hay passcode en sessionStorage
  useEffect(() => {
    if (booted && passcode && !authed) load(status, passcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  useEffect(() => {
    if (authed) load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, authed]);

  const action = async (id: string, act: Action) => {
    const body: Record<string, unknown> = { id, action: act };
    if (act === "reject" || act === "suspend") {
      body.reason = prompt("Razon (opcional)") || "";
    }
    if (act === "set_rating") {
      const r = prompt("Nueva calificacion (1.0 - 5.0)") || "";
      const num = parseFloat(r);
      if (!isFinite(num) || num < 1 || num > 5) {
        alert("Rating fuera de rango");
        return;
      }
      body.rating = num;
    }
    if (act === "force_off_duty") {
      if (!confirm("Sacar a este chofer de turno ahora?")) return;
    }
    const res = await fetch("/api/ecodrive/admin/choferes", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-passcode": passcode,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) load(status);
    else {
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
          <button
            onClick={() => load(status)}
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
      <AdminNav />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#E1811B]">Choferes</h1>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
            <option value="suspended">Suspendidos</option>
          </select>
        </div>

        {loading && <p>Cargando...</p>}
        {!loading && list.length === 0 && (
          <p className="text-zinc-500">Sin choferes en estado &quot;{status}&quot;.</p>
        )}

        <div className="grid gap-3">
          {list.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between mb-2 gap-4">
                <div className="min-w-0">
                  <div className="font-bold text-lg">
                    {c.nombre}{" "}
                    <span className="text-sm font-normal text-amber-600">
                      ⭐ {c.rating?.toFixed(2) ?? "—"}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-600">
                    DNI {c.dni} · {c.edad} años · {c.zona_principal || "—"}
                  </div>
                  <div className="text-sm text-zinc-600 mt-1">
                    {c.vehiculo_marca} {c.vehiculo_modelo} {c.vehiculo_anio} {c.vehiculo_color} · placa {c.placa}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    WhatsApp +{c.wa_id} · {new Date(c.created_at).toLocaleString("es-PE")}
                  </div>
                  {c.rejection_reason && (
                    <div className="text-xs text-red-600 mt-1">Motivo: {c.rejection_reason}</div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {c.status === "pending" && (
                    <>
                      <button
                        onClick={() => action(c.id, "approve")}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => action(c.id, "reject")}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  {c.status === "approved" && (
                    <>
                      <button
                        onClick={() => action(c.id, "set_rating")}
                        className="bg-amber-500 text-white px-3 py-1 rounded text-sm font-semibold"
                      >
                        Ajustar ⭐
                      </button>
                      <button
                        onClick={() => action(c.id, "force_off_duty")}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold"
                      >
                        Sacar de turno
                      </button>
                      <button
                        onClick={() => action(c.id, "suspend")}
                        className="bg-zinc-600 text-white px-3 py-1 rounded text-sm font-semibold"
                      >
                        Suspender
                      </button>
                    </>
                  )}
                  {(c.status === "rejected" || c.status === "suspended") && (
                    <button
                      onClick={() => action(c.id, "reactivate")}
                      className="bg-emerald-600 text-white px-3 py-1 rounded text-sm font-semibold"
                    >
                      Reactivar
                    </button>
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
