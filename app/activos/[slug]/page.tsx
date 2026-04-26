import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ACTIVOS, getActivo, getAllSlugs, type Status } from "@/lib/activos";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const activo = getActivo(slug);
  if (!activo) return { title: "Activo no encontrado" };
  return {
    title: `${activo.name} — Data room · ActivosYA`,
    description: activo.shortDescription,
  };
}

const statusStyles: Record<Status, string> = {
  Activo: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Beta: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Próximamente: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
};

export default async function ActivoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const activo = getActivo(slug);
  if (!activo) notFound();

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero */}
      <section className="relative px-6 pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="orb absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px]"
            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <Link
            href="https://activosya.com#catalogo"
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-amber-400 transition-colors mb-8"
          >
            ← Volver al catálogo
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl text-amber-400/70">{activo.icon}</span>
                <span className={`text-xs px-3 py-1 rounded-full border font-medium ${statusStyles[activo.status]}`}>
                  {activo.status}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-3">
                {activo.name}
              </h1>
              <p className="text-amber-400 text-sm uppercase tracking-widest">
                {activo.tagline}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://activosya.com/#contacto"
                className="px-6 py-3 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors text-sm whitespace-nowrap"
              >
                Solicitar data room →
              </a>
              {activo.subdomain && (
                <a
                  href={activo.b2cHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border border-[#2A2A2A] text-zinc-300 rounded-full hover:border-amber-500/40 hover:text-white transition-colors text-sm whitespace-nowrap"
                >
                  {activo.b2cLabel} →
                </a>
              )}
            </div>
          </div>

          <p className="text-lg text-zinc-300 leading-relaxed max-w-3xl">
            {activo.overview}
          </p>
        </div>
      </section>

      {/* KPIs */}
      <section className="px-6 py-12 bg-[#0D0D0D]">
        <div className="mx-auto max-w-5xl">
          <p className="text-amber-400 text-xs font-medium mb-6 tracking-widest uppercase">
            Métricas verificables
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {activo.metrics.map((m) => (
              <div key={m.label} className="card-surface rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                  {m.label}
                </div>
                <div className="text-xl font-bold text-amber-400">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-8">
          <div className="card-surface rounded-2xl p-7 border-l-4 border-rose-500/50">
            <p className="text-rose-400 text-xs font-medium mb-3 tracking-widest uppercase">
              Problema
            </p>
            <p className="text-zinc-300 leading-relaxed">{activo.problem}</p>
          </div>
          <div className="card-surface rounded-2xl p-7 border-l-4 border-emerald-500/50">
            <p className="text-emerald-400 text-xs font-medium mb-3 tracking-widest uppercase">
              Solución
            </p>
            <p className="text-zinc-300 leading-relaxed">{activo.solution}</p>
          </div>
        </div>
      </section>

      {/* Business Model */}
      <section className="px-6 py-16 bg-[#0D0D0D]">
        <div className="mx-auto max-w-4xl">
          <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase text-center">
            Modelo de negocio
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
            Cómo factura
          </h2>
          <p className="text-zinc-300 leading-relaxed text-lg max-w-3xl mx-auto text-center">
            {activo.businessModel}
          </p>
        </div>
      </section>

      {/* P&L Projection */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase text-center">
            P&L proyectado para el operador
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
            Trayectoria de 12 meses
          </h2>
          <p className="text-zinc-500 text-sm text-center mb-10">
            Estimaciones conservadoras basadas en métricas reales del piloto
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="text-left py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Mes</th>
                  <th className="text-right py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Ingresos</th>
                  <th className="text-right py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Costos</th>
                  <th className="text-right py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Utilidad</th>
                </tr>
              </thead>
              <tbody>
                {activo.pnlProjection.map((row) => (
                  <tr key={row.month} className="border-b border-[#2A2A2A]/50">
                    <td className="py-3 px-4 text-zinc-300 font-medium">{row.month}</td>
                    <td className="py-3 px-4 text-right text-zinc-200 font-mono">{row.revenue}</td>
                    <td className="py-3 px-4 text-right text-zinc-400 font-mono">{row.cost}</td>
                    <td className="py-3 px-4 text-right text-amber-400 font-mono font-semibold">{row.profit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-zinc-500 text-xs text-center mt-6">
            Proyección no es garantía. Los resultados reales dependen de la
            ejecución del operador, mercado objetivo y CAC efectivo.
          </p>
        </div>
      </section>

      {/* Stack */}
      <section className="px-6 py-16 bg-[#0D0D0D]">
        <div className="mx-auto max-w-4xl">
          <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase text-center">
            Stack técnico
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
            Construido con lo mejor
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {activo.stack.map((tech) => (
              <span
                key={tech}
                className="text-sm px-4 py-2 rounded-lg bg-[#181818] border border-[#2A2A2A] text-zinc-300 font-mono"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Competitors */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase text-center">
            Competencia y diferenciación
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
            Por qué ganamos
          </h2>
          <div className="flex flex-col gap-3">
            {activo.competitors.map((c) => (
              <div
                key={c.name}
                className="card-surface rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6"
              >
                <div className="font-semibold text-zinc-200 sm:min-w-[180px]">{c.name}</div>
                <div className="text-zinc-400 text-sm flex-1">
                  <span className="text-rose-400/70 mr-2">✗</span>
                  {c.weakness}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Includes */}
      <section className="px-6 py-16 bg-[#0D0D0D]">
        <div className="mx-auto max-w-4xl">
          <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase text-center">
            Qué incluye la adquisición
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
            Todo listo para operar
          </h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {activo.includes.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 p-4 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A]"
              >
                <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                <span className="text-zinc-300 text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA Pricing */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/8 to-transparent p-8">
              <div className="text-amber-400 text-xs uppercase tracking-widest mb-3">
                Modelo de renta
              </div>
              <div className="text-3xl font-bold mb-2">{activo.rent}</div>
              <p className="text-zinc-400 text-sm leading-relaxed mb-5">
                Acceso completo bajo licencia mensual. Cancela cuando quieras.
                Sin compromiso de capital alto.
              </p>
              <a
                href="https://activosya.com/#contacto"
                className="inline-flex items-center gap-2 text-amber-400 font-medium hover:text-amber-300"
              >
                Solicitar acceso renta →
              </a>
            </div>
            <div className="card-surface rounded-2xl p-8">
              <div className="text-zinc-400 text-xs uppercase tracking-widest mb-3">
                Modelo de compra
              </div>
              <div className="text-3xl font-bold mb-2">{activo.buy}</div>
              <p className="text-zinc-400 text-sm leading-relaxed mb-5">
                Adquisición total: código, dominio, base de usuarios, contratos.
                100% tuyo. Soporte transición 90 días.
              </p>
              <a
                href="https://activosya.com/#contacto"
                className="inline-flex items-center gap-2 text-zinc-300 font-medium hover:text-amber-400"
              >
                Solicitar valoración compra →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Other assets */}
      <section className="px-6 py-16 bg-[#0D0D0D]">
        <div className="mx-auto max-w-5xl">
          <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase text-center">
            Otros activos del catálogo
          </p>
          <h2 className="text-2xl font-bold text-center mb-8">
            Explora más oportunidades
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ACTIVOS.filter((a) => a.slug !== activo.slug).map((other) => (
              <Link
                key={other.slug}
                href={`/activos/${other.slug}`}
                className="card-surface rounded-xl p-4 hover:border-amber-500/30 transition-colors"
              >
                <div className="text-2xl mb-2 text-amber-400/70">{other.icon}</div>
                <div className="font-semibold text-sm">{other.name}</div>
                <div className="text-xs text-zinc-500 mt-1">{other.status}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2A] py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <span>
            <span className="text-amber-400">✦</span> {activo.name} · Un activo de{" "}
            <Link href="https://activosya.com" className="hover:text-amber-400 transition-colors">
              ActivosYA
            </Link>
          </span>
          <span>Hecho en Perú · 2026</span>
        </div>
      </footer>
    </main>
  );
}
