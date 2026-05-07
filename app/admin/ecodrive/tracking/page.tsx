"use client";
import { useState } from "react";

type Result =
  | { ok: true; session_id: string; meta_message_id?: string }
  | { error: string; detail?: unknown };

export default function EnviarTrackingPage() {
  const [passcode, setPasscode] = useState("");
  const [form, setForm] = useState({
    wa_id: "51998102258",
    chofer_nombre: "Pepe Garcia",
    chofer_rating: "4.9",
    vehiculo: "Toyota Yaris",
    placa: "ABC-123",
    lat: "-8.115",
    lng: "-79.029",
    eta_min: "5",
    distancia_km: "1.2",
    estado: "En camino",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ecodrive/admin/enviar-tracking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode,
        },
        body: JSON.stringify({
          wa_id: form.wa_id.replace(/\D/g, ""),
          chofer_nombre: form.chofer_nombre,
          chofer_rating: form.chofer_rating,
          vehiculo: form.vehiculo,
          placa: form.placa,
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
          eta_min: parseInt(form.eta_min, 10),
          distancia_km: form.distancia_km,
          estado: form.estado,
        }),
      });
      setResult(await res.json());
    } catch (e) {
      setResult({ error: "network", detail: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#E1811B] mb-1">EcoDrive+ Admin</h1>
        <p className="text-zinc-600 mb-6">Iniciar tracking real para un pasajero</p>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Admin passcode</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="ECODRIVE_ADMIN_PASSCODE"
            />
          </div>

          <hr />

          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp pasajero</label>
            <input value={form.wa_id} onChange={set("wa_id")}
              className="w-full border rounded-lg px-3 py-2" placeholder="51998102258" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Chofer nombre</label>
              <input value={form.chofer_nombre} onChange={set("chofer_nombre")}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rating</label>
              <input value={form.chofer_rating} onChange={set("chofer_rating")}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Vehículo</label>
              <input value={form.vehiculo} onChange={set("vehiculo")}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Placa</label>
              <input value={form.placa} onChange={set("placa")}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Latitud</label>
              <input value={form.lat} onChange={set("lat")}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Longitud</label>
              <input value={form.lng} onChange={set("lng")}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">ETA (min)</label>
              <input value={form.eta_min} onChange={set("eta_min")}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Distancia km</label>
              <input value={form.distancia_km} onChange={set("distancia_km")}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <input value={form.estado} onChange={set("estado")}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={loading || !passcode}
            className="w-full bg-[#E1811B] text-white font-semibold py-3 rounded-lg hover:bg-[#c46b0e] disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar tracking por WhatsApp"}
          </button>

          {result && (
            <pre className="text-xs bg-zinc-100 p-3 rounded overflow-auto max-h-60">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Tip: lat/lng iniciales = Trujillo centro. Edita según ubicación real del chofer.
          Sesion expira en 2 horas.
        </p>
      </div>
    </div>
  );
}
