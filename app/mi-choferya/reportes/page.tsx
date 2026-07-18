import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reportes · TuChoferYa",
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <p>Token requerido.</p>
      </main>
    );
  }

  // Generar lista últimos 12 meses
  const now = new Date();
  const meses: Array<{ key: string; label: string }> = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    meses.push({ key, label });
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href={`/mi-choferya?token=${token}`} className="text-sm text-white/50 hover:text-orange-400">
          ← Panel
        </Link>
        <h1 className="text-3xl font-bold mt-4">Reportes mensuales</h1>
        <p className="text-white/60 mt-2">
          Descarga el CSV con tus viajes completados de cada mes. Útil para presentar a tu
          contador. Los totales incluyen IGV y renta 4ta categoría <em>referenciales</em>.
        </p>

        <ul className="mt-8 space-y-2">
          {meses.map((m) => (
            <li
              key={m.key}
              className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex justify-between items-center"
            >
              <span className="capitalize">{m.label}</span>
              <a
                href={`/api/choferya/reporte-mensual?token=${encodeURIComponent(token)}&mes=${m.key}`}
                className="text-orange-400 hover:underline text-sm"
                download
              >
                Descargar CSV
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-xs text-white/40 leading-relaxed">
          Aviso legal: los importes de IGV (18%) y renta 4ta categoría (8%) son referenciales para
          orientarte. Tú eres responsable de tu tributación. Confirma con tu contador antes de
          presentar declaraciones a SUNAT.
        </p>
      </div>
    </main>
  );
}
