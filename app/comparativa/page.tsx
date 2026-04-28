import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ActivosYA vs Empire Flippers vs Acquire.com",
  description:
    "Comparativa honesta entre marketplaces de negocios digitales: ActivosYA (LATAM, hecho en Perú) vs Empire Flippers vs Acquire.com vs Flippa. Precios, soporte, garantías, idioma.",
  alternates: { canonical: "https://activosya.com/comparativa" },
};

const FEATURES = [
  { f: "Mercado objetivo", a: "LATAM (Perú primero)", ef: "USA / Global", aq: "USA / Global", fl: "Global" },
  { f: "Idioma", a: "Español 100%", ef: "Inglés", aq: "Inglés", fl: "Inglés" },
  { f: "Pricing visible", a: "Sí, desde S/.1,800/mes", ef: "Listings con precio", aq: "Listings con precio", fl: "Listings con precio" },
  { f: "Activos producidos in-house", a: "Sí, white-label completo", ef: "No, solo intermediario", aq: "No, solo intermediario", fl: "No" },
  { f: "Comisión vendedor", a: "0% (somos creadores)", ef: "15% del valor", aq: "Variable", fl: "10-15%" },
  { f: "Garantía devolución", a: "30 días + roadmap", ef: "Limitada al broker", aq: "Limitada al broker", fl: "Limitada" },
  { f: "Soporte post-venta", a: "90 días 24/7 + WhatsApp", ef: "30 días vía email", aq: "Variable por seller", fl: "Variable por seller" },
  { f: "Renta mensual (no compra)", a: "Sí, desde S/.1,800/mes", ef: "No", aq: "No", fl: "No" },
  { f: "Onboarding técnico", a: "Asesoría 1-on-1", ef: "Self-service", aq: "Self-service", fl: "Self-service" },
  { f: "Pago en moneda local", a: "Sí (Soles, Yape, Culqi)", ef: "USD wire transfer", aq: "USD wire transfer", fl: "USD" },
  { f: "Métricas verificadas", a: "Acceso a Supabase/Stripe", ef: "Auditoría broker", aq: "Auditoría broker", fl: "Self-reported" },
];

export default function Comparativa() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-xs text-zinc-500 hover:text-amber-400">
          ← Volver al marketplace
        </Link>

        <h1 className="mt-6 text-4xl font-bold">
          ActivosYA <span className="text-amber-400">vs</span> el mundo
        </h1>
        <p className="mt-3 text-zinc-400 max-w-2xl">
          Comparativa honesta con los marketplaces internacionales más conocidos. Te lo decimos sin
          maquillar: dónde te conviene cada uno.
        </p>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-3 font-semibold text-zinc-500 uppercase text-xs">
                  Aspecto
                </th>
                <th className="text-left py-3 px-3 font-bold text-amber-400 bg-amber-500/5">
                  ActivosYA
                </th>
                <th className="text-left py-3 px-3 font-semibold text-zinc-400">
                  Empire Flippers
                </th>
                <th className="text-left py-3 px-3 font-semibold text-zinc-400">
                  Acquire.com
                </th>
                <th className="text-left py-3 px-3 font-semibold text-zinc-400">Flippa</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((row, i) => (
                <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-900/50 transition">
                  <td className="py-3 px-3 font-medium">{row.f}</td>
                  <td className="py-3 px-3 bg-amber-500/5 text-emerald-400">{row.a}</td>
                  <td className="py-3 px-3 text-zinc-500">{row.ef}</td>
                  <td className="py-3 px-3 text-zinc-500">{row.aq}</td>
                  <td className="py-3 px-3 text-zinc-500">{row.fl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
            <h3 className="font-bold text-amber-400 mb-3">¿Cuándo elegir ActivosYA?</h3>
            <ul className="space-y-2 text-sm text-zinc-300">
              <li>• Eres emprendedor LATAM y quieres negocio en español</li>
              <li>• Necesitas asesoría 1-on-1, no self-service</li>
              <li>• Preferís renta mensual antes que invertir USD$$ de golpe</li>
              <li>• Quieres que el equipo creador siga mejorando el activo</li>
              <li>• Pagas en soles vía Yape/Culqi</li>
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-800 p-6">
            <h3 className="font-bold text-zinc-400 mb-3">¿Cuándo NO?</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>• Buscas activos con &gt;$100K MRR (recién arrancamos)</li>
              <li>• Quieres marca consolidada con años en mercado</li>
              <li>• Tu mercado objetivo es 100% USA/Europa</li>
              <li>• Solo quieres comprar y revender (Empire Flippers especializa)</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/#contacto"
            className="inline-block px-8 py-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold transition"
          >
            Hablar con un asesor →
          </Link>
        </div>
      </div>
    </main>
  );
}
