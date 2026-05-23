"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BOT_BASE = "https://bot-whatsapp-production-085b.up.railway.app";
const SAMPLE_PDF_URL = `${BOT_BASE}/api/certificate/sample`;

interface DriverResult {
  found: boolean;
  driver?: {
    affiliated: boolean;
    status: string;
    total_trips: number;
    rating: number;
    affiliated_since: string;
  };
  pdf_url?: string | null;
  message: string;
}

export function VerifierDashboard({ user, entidad }: { user: string; entidad: string }) {
  const router = useRouter();
  const [dni, setDni] = useState("");
  const [result, setResult] = useState<DriverResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ecodrive/financiera/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error");
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/ecodrive/financiera/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5EFE7]">
      <header className="border-b border-white/10 bg-[#131110]">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 bg-[url('/ecodriveplus/icon.png')] bg-contain bg-no-repeat bg-center" role="img" aria-label="EcoDrive+" />
            <div className="leading-tight min-w-0">
              <div className="font-bold">
                EcoDrive<span className="text-[#E08821]">+</span>{" "}
                <span className="text-[#C8C0B5] text-sm">· Portal Verificador</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[#7A7367] truncate">
                {entidad}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs uppercase tracking-widest text-[#7A7367] hover:text-[#E08821] transition"
          >
            Salir
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10 grid lg:grid-cols-5 gap-8">
        {/* Lado izquierdo: búsqueda */}
        <div className="lg:col-span-3 space-y-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#E08821] mb-3">
              01 / Verificación de Conductor
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              Ingrese el DNI del conductor para verificar afiliación.
            </h1>
            <p className="mt-4 text-[#C8C0B5] leading-relaxed">
              Confirme que el solicitante de crédito está registrado como conductor activo en ECO DRIVE PLUS S.A.C. y consulte el detalle de su afiliación.
            </p>
          </div>

          <form onSubmit={lookup} className="bg-[#131110] border border-white/10 rounded-2xl p-5">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-[#7A7367]">DNI del conductor</span>
              <input
                type="text"
                required
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="12345678"
                inputMode="numeric"
                pattern="\d{7,12}"
                className="mt-2 w-full rounded-lg bg-[#0A0908] border border-white/10 px-3 py-3 text-2xl tracking-widest text-center text-[#F5EFE7] outline-none focus:border-[#E08821] transition font-mono"
              />
            </label>
            {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
            <button
              type="submit"
              disabled={busy || dni.length < 7}
              className="mt-4 w-full rounded-lg bg-[#E08821] hover:bg-[#F3A852] disabled:opacity-50 text-[#0A0908] font-semibold py-3 uppercase tracking-widest text-xs transition"
            >
              {busy ? "Consultando..." : "Verificar conductor"}
            </button>
          </form>

          {/* Resultado */}
          {result && (
            <div
              className={`rounded-2xl border p-5 ${
                result.found
                  ? "bg-[#0E1A12] border-emerald-700/40"
                  : "bg-[#1A0E0E] border-red-900/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 h-3 w-3 rounded-full ${
                    result.found ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                  }`}
                />
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-widest mb-1 text-[#7A7367]">
                    Resultado de la consulta
                  </div>
                  <div className="font-bold text-lg">
                    {result.found ? "Conductor afiliado ✓" : "DNI no registrado"}
                  </div>
                  {result.found && result.driver && (
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-[#7A7367]">Estado</dt>
                        <dd className="font-mono text-[#F5EFE7]">{result.driver.status}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-[#7A7367]">Total viajes</dt>
                        <dd className="font-mono text-[#F5EFE7]">{result.driver.total_trips}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-[#7A7367]">Rating</dt>
                        <dd className="font-mono text-[#F5EFE7]">{Number(result.driver.rating).toFixed(2)} / 5</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-widest text-[#7A7367]">Afiliado desde</dt>
                        <dd className="font-mono text-[#F5EFE7]">
                          {result.driver.affiliated_since
                            ? new Date(result.driver.affiliated_since).toLocaleDateString("es-PE")
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  )}
                  <p className="mt-4 text-sm text-[#C8C0B5] leading-relaxed">{result.message}</p>
                  {result.found && result.pdf_url && (
                    <a
                      href={result.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#E08821] hover:bg-[#F3A852] text-[#0A0908] font-semibold px-4 py-2 text-sm uppercase tracking-widest transition"
                    >
                      Descargar constancia oficial PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lado derecho: muestra + info */}
        <aside className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-[#E08821]/15 to-[#B86A12]/5 border border-[#E08821]/30 rounded-2xl p-6">
            <div className="text-xs uppercase tracking-widest text-[#E08821] mb-3">
              02 / Constancia Modelo
            </div>
            <h2 className="text-xl font-bold mb-3">Vea cómo se ve el documento.</h2>
            <p className="text-sm text-[#C8C0B5] leading-relaxed mb-5">
              Descargue una constancia de muestra con datos ficticios para evaluar el formato, firma digital, sello, QR de verificación y hash anti-falsificación.
            </p>
            <a
              href={SAMPLE_PDF_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#E08821] hover:bg-[#F3A852] text-[#0A0908] font-semibold px-5 py-3 uppercase tracking-widest text-xs transition w-full justify-center"
            >
              📄 Descargar constancia modelo
            </a>
          </div>

          <div className="bg-[#131110] border border-white/10 rounded-2xl p-6 text-sm">
            <div className="text-xs uppercase tracking-widest text-[#7A7367] mb-3">
              Sobre la Constancia de Ingresos
            </div>
            <ul className="space-y-2 text-[#C8C0B5] leading-relaxed">
              <li>✦ Identificación completa del conductor (DNI, licencia, placa).</li>
              <li>✦ Período de 1, 3, 6 o 12 meses calendario.</li>
              <li>✦ Detalle mensual de viajes, ingreso bruto, comisión 6.3 %, neto.</li>
              <li>✦ Firma digital + sello de ECO DRIVE PLUS S.A.C.</li>
              <li>✦ QR de verificación pública.</li>
              <li>✦ Hash SHA256 único anti-falsificación.</li>
              <li>✦ Validez de 30 días desde su emisión.</li>
            </ul>
          </div>

          <div className="text-[11px] text-[#7A7367] leading-relaxed">
            Usuario en sesión: <span className="font-mono text-[#C8C0B5]">{user}</span>
            <br />
            Toda consulta queda registrada en auditoría con fecha, hora y DNI consultado.
            <br />
            Contacto:{" "}
            <a href="mailto:projas@ecodriveplus.com" className="text-[#E08821] hover:underline">
              projas@ecodriveplus.com
            </a>
          </div>
        </aside>
      </section>
    </main>
  );
}
