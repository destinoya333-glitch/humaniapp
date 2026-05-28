"use client";
import { useState } from "react";
import AdminNav from "../AdminNav";
import { useAdminPass } from "../useAdminPass";

const TYPES = [
  { key: "viajes", label: "Viajes" },
  { key: "comisiones", label: "Comisiones" },
  { key: "transacciones", label: "Wallet transactions" },
  { key: "choferes", label: "Choferes (registros)" },
];

export default function ReportesAdminPage() {
  const { passcode, setPasscode, remember, cookieAuthed } = useAdminPass();
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth =
    new Date().toISOString().slice(0, 7) + "-01";
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const canDownload = !!passcode || cookieAuthed;

  // p="" cuando la sesion es por cookie del dashboard; la ruta acepta la cookie.
  const link = (type: string) =>
    `/api/ecodrive/admin/export?type=${type}&from=${from}&to=${to}&p=${encodeURIComponent(
      passcode
    )}`;

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <AdminNav />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#E1811B] mb-1">Reportes CSV</h1>
        <p className="text-zinc-600 mb-6">
          Exporta los datos por rango de fecha. Util para SUNAT, contabilidad y backups.
        </p>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Admin passcode</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onBlur={() => passcode && remember(passcode)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder={cookieAuthed ? "sesion activa (dashboard)" : "ECODRIVE_ADMIN_PASSCODE"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Desde</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hasta</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {TYPES.map((t) => (
              <a
                key={t.key}
                href={canDownload ? link(t.key) : undefined}
                onClick={(e) => {
                  if (!canDownload) {
                    e.preventDefault();
                    alert("Ingresa el passcode primero.");
                  }
                }}
                className={`text-center py-3 rounded-lg font-semibold ${
                  canDownload
                    ? "bg-[#E1811B] text-white hover:bg-[#c46b0e]"
                    : "bg-zinc-200 text-zinc-500 cursor-not-allowed"
                }`}
              >
                Descargar {t.label}
              </a>
            ))}
          </div>

          <p className="text-xs text-zinc-500 pt-2">
            El passcode viaja en la URL para que el navegador pueda descargar el archivo
            directamente. Si compartes la pantalla, hazlo solo con personas autorizadas.
          </p>
        </div>
      </div>
    </div>
  );
}
