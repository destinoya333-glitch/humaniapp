"use client";
import { useState } from "react";
import AdminNav from "../AdminNav";
import { useAdminPass } from "../useAdminPass";

type Result =
  | { ok: true; sent?: number; total?: number; results?: Array<{ telefono: string; zona: string | null; ok: boolean }>; detail?: unknown }
  | { error: string; detail?: unknown };

export default function PushAdminPage() {
  const { passcode, setPasscode, remember } = useAdminPass();
  const [mode, setMode] = useState<"uno" | "broadcast">("uno");
  const [waId, setWaId] = useState("51994810242");
  const [zona, setZona] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async () => {
    if (!mensaje.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { mensaje };
      if (mode === "uno") body.wa_id = waId.replace(/\D/g, "");
      else {
        body.broadcast = true;
        if (zona.trim()) body.zona = zona.trim();
      }
      const res = await fetch("/api/ecodrive/admin/push-chofer", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-passcode": passcode },
        body: JSON.stringify(body),
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
      <AdminNav />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#E1811B] mb-1">EcoDrive+ Admin</h1>
        <p className="text-zinc-600 mb-6">Mensaje directo via WhatsApp a chofer(es)</p>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Admin passcode</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onBlur={() => passcode && remember(passcode)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="ECODRIVE_ADMIN_PASSCODE"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMode("uno")}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                mode === "uno" ? "bg-[#E1811B] text-white" : "bg-zinc-100 text-zinc-700"
              }`}
            >
              1 chofer
            </button>
            <button
              onClick={() => setMode("broadcast")}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                mode === "broadcast" ? "bg-[#E1811B] text-white" : "bg-zinc-100 text-zinc-700"
              }`}
            >
              Todos en turno
            </button>
          </div>

          {mode === "uno" && (
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp chofer</label>
              <input
                value={waId}
                onChange={(e) => setWaId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="51994810242"
              />
            </div>
          )}

          {mode === "broadcast" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Filtrar por zona (opcional)
              </label>
              <input
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Centro, Mall Plaza, etc."
              />
              <p className="text-xs text-zinc-500 mt-1">
                Vacio = todos los choferes en turno
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Mensaje</label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 h-32"
              placeholder="Ej: Aviso, hay demanda alta en Mall Plaza. Ven ahora si puedes."
              maxLength={1024}
            />
            <p className="text-xs text-zinc-500 mt-1">
              {mensaje.length} / 1024 · Solo llega si el chofer interactuo con el bot en las
              ultimas 24h.
            </p>
          </div>

          <button
            onClick={submit}
            disabled={loading || !passcode || !mensaje.trim()}
            className="w-full bg-[#E1811B] text-white font-semibold py-3 rounded-lg hover:bg-[#c46b0e] disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar"}
          </button>

          {result && (
            <pre className="text-xs bg-zinc-100 p-3 rounded overflow-auto max-h-60">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
