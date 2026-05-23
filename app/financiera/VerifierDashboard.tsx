"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// CIE de muestra por caja — el slug del user es la fuente primaria, fallback
// keyword match si el slug no esta mapeado (ej. cuentas nuevas con otro user).
const SAMPLE_CIE_BY_USER: Record<string, string> = {
  "caja-trujillo": "CIE-TRU-2026-00187",
  "caja-arequipa": "CIE-AQP-2026-00188",
  "caja-huancayo": "CIE-HCO-2026-00189",
};

function resolveCieForCaja(user: string, entidad: string): string {
  const key = user.trim().toLowerCase();
  let cie = SAMPLE_CIE_BY_USER[key];
  if (!cie) {
    const e = entidad.toLowerCase();
    if (e.includes("arequipa")) cie = "CIE-AQP-2026-00188";
    else if (e.includes("huancayo")) cie = "CIE-HCO-2026-00189";
    else cie = "CIE-TRU-2026-00187";
  }
  return cie;
}

interface DriverResult {
  found: boolean;
  driver?: {
    affiliated: boolean;
    status: string;
    total_trips: number;
    rating: number;
    affiliated_since: string;
  };
  message: string;
}

export function VerifierDashboard({ user, entidad }: { user: string; entidad: string }) {
  const router = useRouter();
  const [dni, setDni] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // null = mostrando formulario. Si se asigna = ya hay un resultado para mostrar.
  const [view, setView] = useState<
    | { kind: "search" }
    | { kind: "certificate"; cie: string; dni: string }
    | { kind: "notfound"; dni: string; message: string }
  >({ kind: "search" });
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ecodrive/financiera/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni }),
      });
      const data = (await res.json()) as DriverResult & { error?: string };
      if (!res.ok) throw new Error(data?.error ?? "Error");
      if (data.found) {
        // Por ahora todos los conductores afiliados muestran el certificado modelo
        // de la caja en sesion. Cuando exista generacion real de CIE por conductor,
        // el lookup endpoint debe devolver el CIE asignado y lo usamos aqui.
        setView({ kind: "certificate", cie: resolveCieForCaja(user, entidad), dni });
      } else {
        setView({ kind: "notfound", dni, message: data.message ?? "DNI no registrado" });
      }
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

  function resetSearch() {
    setView({ kind: "search" });
    setDni("");
    setErr(null);
  }

  function downloadPdf() {
    // Triggera el dialogo print del iframe — la caja elige "Guardar como PDF"
    // y obtiene una copia binaria del certificado.
    const iframeWin = iframeRef.current?.contentWindow;
    if (iframeWin) {
      iframeWin.focus();
      iframeWin.print();
    } else {
      window.print();
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5EFE7] flex flex-col">
      <header className="border-b border-white/10 bg-[#131110] shrink-0">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
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

      {view.kind === "search" && (
        <section className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-xl">
            <div className="text-xs uppercase tracking-widest text-[#E08821] mb-3 text-center">
              Verificación de Conductor
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight text-center mb-3">
              Ingrese el DNI del conductor.
            </h1>
            <p className="text-[#C8C0B5] leading-relaxed text-center mb-8">
              Confirme la afiliación a ECO DRIVE PLUS S.A.C. y vea la constancia de ingresos del solicitante.
            </p>

            <form onSubmit={lookup} className="bg-[#131110] border border-white/10 rounded-2xl p-6 shadow-xl">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-[#7A7367]">DNI del conductor</span>
                <input
                  type="text"
                  required
                  autoFocus
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="12345678"
                  inputMode="numeric"
                  pattern="\d{7,12}"
                  className="mt-2 w-full rounded-lg bg-[#0A0908] border border-white/10 px-3 py-4 text-3xl tracking-widest text-center text-[#F5EFE7] outline-none focus:border-[#E08821] transition font-mono"
                />
              </label>
              {err && <p className="mt-3 text-sm text-red-400 text-center">{err}</p>}
              <button
                type="submit"
                disabled={busy || dni.length < 7}
                className="mt-5 w-full rounded-lg bg-[#E08821] hover:bg-[#F3A852] disabled:opacity-50 text-[#0A0908] font-semibold py-3 uppercase tracking-widest text-xs transition"
              >
                {busy ? "Consultando..." : "Ver constancia"}
              </button>
              <p className="mt-4 text-[11px] text-[#7A7367] text-center leading-relaxed">
                Toda consulta queda registrada en auditoría con fecha, hora y DNI.
              </p>
            </form>
          </div>
        </section>
      )}

      {view.kind === "notfound" && (
        <section className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-xl bg-[#1A0E0E] border border-red-900/40 rounded-2xl p-8 text-center">
            <div className="text-xs uppercase tracking-widest text-red-400 mb-3">
              DNI no registrado
            </div>
            <h2 className="text-2xl font-bold mb-3">
              {view.dni} no está afiliado
            </h2>
            <p className="text-[#C8C0B5] leading-relaxed mb-6">{view.message}</p>
            <button
              onClick={resetSearch}
              className="rounded-lg bg-[#E08821] hover:bg-[#F3A852] text-[#0A0908] font-semibold px-6 py-3 uppercase tracking-widest text-xs transition"
            >
              Nueva búsqueda
            </button>
          </div>
        </section>
      )}

      {view.kind === "certificate" && (
        <section className="flex-1 flex flex-col">
          <div className="border-b border-white/10 bg-[#131110]/60">
            <div className="mx-auto max-w-6xl px-6 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-widest text-[#C8C0B5]">
                Constancia de ingresos · DNI <span className="font-mono text-[#F5EFE7]">{view.dni}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetSearch}
                  className="rounded-lg border border-white/15 hover:border-[#E08821] text-[#C8C0B5] hover:text-[#F5EFE7] font-semibold px-4 py-2 uppercase tracking-widest text-[10px] transition"
                >
                  ← Nueva búsqueda
                </button>
                <button
                  onClick={downloadPdf}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E08821] hover:bg-[#F3A852] text-[#0A0908] font-semibold px-4 py-2 uppercase tracking-widest text-[10px] transition"
                >
                  📥 Descargar PDF
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-[#1c1a18] p-3 md:p-5">
            <iframe
              ref={iframeRef}
              src={`/financiera/${view.cie}`}
              title="Constancia de ingresos"
              className="w-full h-[calc(100vh-160px)] min-h-[600px] bg-white rounded-lg shadow-2xl border border-white/10"
            />
          </div>
        </section>
      )}
    </main>
  );
}
