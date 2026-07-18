import Reveal from "../_design/Reveal";
import Magnetic from "../_design/Magnetic";
import CountUp from "../_design/CountUp";

const STATS: Array<{ node: React.ReactNode; label: string }> = [
  { node: <CountUp to={6} />, label: "Activos en producción" },
  {
    node: (
      <CountUp to={247} prefix="S/ " suffix="K" />
    ),
    label: "Facturado YTD",
  },
  { node: <CountUp to={87} suffix="%" />, label: "Retención promedio" },
  { node: <CountUp to={24} suffix="h" />, label: "Onboarding" },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden px-6 pt-36 pb-24 md:pt-44">
      {/* Atmósfera */}
      <div className="absolute inset-0 au-mesh pointer-events-none" />
      <div className="absolute inset-0 au-vignette pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.022]"
        style={{
          backgroundImage:
            "linear-gradient(var(--au-gold) 1px, transparent 1px), linear-gradient(90deg, var(--au-gold) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(80% 60% at 50% 40%, black, transparent 75%)",
        }}
      />

      {/* Etiqueta vertical de margen */}
      <span className="au-label-vertical absolute left-5 top-1/2 -translate-y-1/2 hidden lg:block">
        ActivosYA · Est. 2026 · Perú
      </span>

      <div className="relative mx-auto w-full max-w-6xl">
        <Reveal>
          <div className="au-pill mb-9">
            <span className="relative flex h-2 w-2">
              <span className="au-ping absolute inline-flex h-full w-full rounded-full bg-[var(--au-gold-soft)]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--au-gold)]" />
            </span>
            Marketplace operativo · Hecho en Perú
          </div>
        </Reveal>

        <h1 className="au-display text-[clamp(2.9rem,9vw,7.5rem)] leading-[0.92] max-w-[15ch]">
          <Reveal delay={40}>
            <span className="block text-[var(--au-ink)]">Compra negocios</span>
          </Reveal>
          <Reveal delay={140}>
            <span className="block text-[var(--au-ink)]">digitales que</span>
          </Reveal>
          <Reveal delay={240}>
            <span className="au-display-italic au-gold-shimmer block">
              ya facturan.
            </span>
          </Reveal>
        </h1>

        <Reveal delay={360}>
          <p className="mt-9 max-w-xl text-lg md:text-xl leading-relaxed text-[var(--au-ink-soft)]">
            Plataformas SaaS llave-en-mano con flujo de caja{" "}
            <span className="text-[var(--au-ink)]">verificado</span>. Adquiérelas
            o réntalas — y empieza a cobrar suscripciones desde el día uno.
            Soporte 24/7 por 90 días. Garantía de devolución a 30 días.
          </p>
        </Reveal>

        <Reveal delay={460}>
          <div className="mt-11 flex flex-col sm:flex-row items-start gap-4">
            <Magnetic>
              <a href="#catalogo" className="au-btn-gold">
                Ver catálogo de activos
                <span aria-hidden>→</span>
              </a>
            </Magnetic>
            <Magnetic strength={0.25}>
              <a href="#contacto" className="au-btn-ghost">
                Hablar con un asesor
              </a>
            </Magnetic>
          </div>
        </Reveal>

        <Reveal delay={560}>
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-[var(--au-line)] bg-[var(--au-line)]">
            {STATS.map((s, i) => (
              <div
                key={i}
                className="bg-[var(--au-bg)] px-6 py-7"
              >
                <div className="au-display text-3xl md:text-4xl au-gold-text">
                  {s.node}
                </div>
                <div className="au-mono mt-2 text-[var(--au-ink-mute)]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2">
        <span className="au-mono text-[0.6rem]">Scroll</span>
        <span className="block h-10 w-px bg-gradient-to-b from-[var(--au-gold)] to-transparent" />
      </div>
    </section>
  );
}
