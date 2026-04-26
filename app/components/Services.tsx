import Link from "next/link";
import { ACTIVOS, type Status } from "@/lib/activos";

const statusStyles: Record<Status, string> = {
  Activo: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Beta: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Próximamente: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
};

export default function Services() {
  return (
    <section id="catalogo" className="py-24 px-6 scroll-mt-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Catálogo de activos digitales
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Plataformas que ya{" "}
            <span className="gold-gradient">facturan</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Cada activo viene con métricas verificadas, stack documentado y
            soporte de transición. Adquiere por suscripción mensual o por
            compra única — escala con tu marca, tus dominios y tus pagos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {ACTIVOS.map((a) => (
            <article
              key={a.slug}
              className="card-surface card-hover rounded-2xl p-7 flex flex-col gap-5"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs px-3 py-1 rounded-full border font-medium ${statusStyles[a.status]}`}
                >
                  {a.status}
                </span>
                <span className="text-2xl text-amber-400/60">{a.icon}</span>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-1">{a.name}</h3>
                <p className="text-amber-400/80 text-xs uppercase tracking-widest mb-3">
                  {a.tagline}
                </p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {a.shortDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-y border-[#2A2A2A] py-4">
                {a.metrics.slice(0, 4).map((m) => (
                  <div key={m.label}>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                      {m.label}
                    </div>
                    <div className="text-lg font-bold text-white">{m.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
                  Stack
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {a.stack.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs px-2 py-1 rounded-md bg-[#181818] border border-[#2A2A2A] text-zinc-400 font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                    Renta mensual
                  </div>
                  <div className="text-base font-semibold text-amber-400">
                    {a.rent}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                    Compra
                  </div>
                  <div className="text-base font-semibold text-zinc-300">
                    {a.buy}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 mt-auto">
                <Link
                  href={`/activos/${a.slug}`}
                  className="flex-1 text-center py-2.5 px-4 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
                >
                  Ver data room →
                </Link>
                <a
                  href={a.b2cHref}
                  target={a.b2cHref.startsWith("http") ? "_blank" : undefined}
                  rel={a.b2cHref.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex-1 text-center py-2.5 px-4 rounded-xl border border-[#2A2A2A] text-sm font-medium text-zinc-300 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
                >
                  {a.b2cLabel}
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-zinc-500 text-sm">
            ¿Buscas un activo específico? Cada trimestre agregamos nuevas
            plataformas al catálogo.
          </p>
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            Avísame cuando se agregue uno nuevo →
          </a>
        </div>
      </div>
    </section>
  );
}
