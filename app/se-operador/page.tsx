import type { Metadata } from "next";
import Link from "next/link";
import LeadForm from "./LeadForm";

export const dynamic = "force-dynamic";

type ActivoSlug = "miss-sofia" | "tudestinoya";

const ACTIVO_COPY: Record<ActivoSlug, {
  display: string;
  shortDesc: string;
  pitchHero: string;
  bullets: string[];
  rentaTipica: string;
  comoCobra: string;
}> = {
  "miss-sofia": {
    display: "Miss Sofia",
    shortDesc: "curso de inglés con IA",
    pitchHero: "Vende cursos de inglés con IA",
    bullets: [
      "Curso de inglés con método neurolingüístico Cuna 6 fases",
      "Sofia (la IA) atiende y enseña 24/7 por WhatsApp",
      "Suscripción mensual recurrente — ingresos predecibles",
      "Garantía Klaric 6 meses (alumno → operador)",
    ],
    rentaTipica: "S/. 1,800 — 4,500",
    comoCobra: "S/. 39 a 89/mes por alumno suscriptor",
  },
  tudestinoya: {
    display: "TuDestinoYa",
    shortDesc: "consultas espirituales y profesionales por WhatsApp",
    pitchHero: "Vende consultas IA: tarot, astral, legal, salud y más",
    bullets: [
      "5 categorías: esotérico, profesional, soluciones rápidas, VIP, gratis",
      "El bot atiende 24/7 con Claude IA — lectura, análisis legal, salud, etc",
      "Pago por consulta (S/. 3 a S/. 9.90) o suscripción VIP S/. 18/mes",
      "Demanda alta en LATAM — mercado validado",
    ],
    rentaTipica: "S/. 2,500 — 8,500 MRR",
    comoCobra: "S/. 3 a 9.90 por consulta + S/. 18/mes VIP",
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ activo?: string }>;
}): Promise<Metadata> {
  const { activo: activoParam } = await searchParams;
  const slug: ActivoSlug = activoParam === "tudestinoya" ? "tudestinoya" : "miss-sofia";
  const c = ACTIVO_COPY[slug];
  return {
    title: `Sé operador ${c.display} · Gana ${c.rentaTipica}/mes con IA · ActivosYA`,
    description: `Vende ${c.shortDesc} en tu ciudad. Sin tecnología, sin programar. Renta mensual desde S/. 500. Rentabilidad típica ${c.rentaTipica}/mes.`,
    alternates: { canonical: `https://activosya.com/se-operador?activo=${slug}` },
  };
}

export default async function SeOperadorPage({
  searchParams,
}: {
  searchParams: Promise<{ activo?: string }>;
}) {
  const { activo: activoParam } = await searchParams;
  const slug: ActivoSlug = activoParam === "tudestinoya" ? "tudestinoya" : "miss-sofia";
  const c = ACTIVO_COPY[slug];

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden">
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0A]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center font-bold text-black">A</div>
            <span className="font-bold tracking-tight">ActivosYA</span>
          </Link>
          <a href="#registro" className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition">
            Quiero ser operador
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative px-6 pt-16 pb-24">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-widest uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            Convocatoria abierta · Cupos limitados
          </div>

          <h1 className="mt-6 text-5xl md:text-7xl font-bold leading-[0.95] tracking-tight">
            Gana{" "}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              {c.rentaTipica}
            </span>
            <br />
            al mes con IA
          </h1>

          <p className="mt-6 text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            {c.pitchHero === "Vende cursos de inglés con IA" ? (
              <>
                Vende <strong className="text-white">{c.display}</strong> — {c.shortDesc} — en tu ciudad. Sin programar, sin tecnología, sin equipo. Solo necesitas captar alumnos. Nosotros entregamos el servicio.
              </>
            ) : (
              <>
                Vende <strong className="text-white">{c.display}</strong> — {c.shortDesc} — en tu ciudad. Sin programar, sin tecnología, sin equipo. Solo necesitas captar clientes. Nosotros entregamos el servicio.
              </>
            )}
          </p>

          {/* Selector de activo */}
          <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <Link
              href="/se-operador?activo=miss-sofia"
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                slug === "miss-sofia"
                  ? "bg-amber-500 text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              ◎ Miss Sofia
            </Link>
            <Link
              href="/se-operador?activo=tudestinoya"
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                slug === "tudestinoya"
                  ? "bg-amber-500 text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              ✨ TuDestinoYa
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
            {c.bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">✓</span>
                <span className="text-sm text-zinc-300">{b}</span>
              </div>
            ))}
          </div>

          <a
            href="#registro"
            className="mt-10 inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold shadow-2xl shadow-amber-500/30 transition transform hover:-translate-y-1"
          >
            Quiero saber más →
          </a>
          <div className="mt-4 text-sm text-zinc-500">
            Activación auto en 1-2 minutos tras yapear · Cancela cuando quieras
          </div>
        </div>
      </section>

      {/* COMPARATIVA NEGOCIO TRADICIONAL VS ACTIVOSYA */}
      <section className="relative px-6 py-20 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">¿Por qué ActivosYA?</h2>
            <p className="mt-3 text-zinc-400 max-w-2xl mx-auto">
              Compara abrir un negocio tradicional vs operar {c.display} con IA.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-7">
              <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Negocio tradicional</div>
              <div className="mt-2 text-2xl font-bold">{slug === "miss-sofia" ? "Academia de inglés" : "Consultorio espiritual / asesoría"}</div>
              <ul className="mt-6 space-y-3 text-sm text-zinc-400">
                <li>❌ Inversión inicial: S/. 50,000+</li>
                <li>❌ Alquiler local: S/. 3,000/mes</li>
                <li>❌ {slug === "miss-sofia" ? "Profesores" : "Especialistas"}: S/. 8,000/mes</li>
                <li>❌ Punto de equilibrio: 100+ {slug === "miss-sofia" ? "alumnos" : "consultas"}</li>
                <li>❌ Manejas: equipo, infraestructura, soporte</li>
                <li>❌ Riesgo: alto, capital inmovilizado</li>
              </ul>
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <div className="text-xs text-zinc-500">Total costos fijos mensuales</div>
                <div className="text-2xl font-bold text-zinc-400">S/. 11,000+</div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-7 shadow-2xl shadow-amber-500/20">
              <div className="text-amber-400 text-xs uppercase tracking-widest font-bold">ActivosYA</div>
              <div className="mt-2 text-2xl font-bold">{c.display} operador</div>
              <ul className="mt-6 space-y-3 text-sm text-zinc-200">
                <li>✅ Inversión inicial: S/. 0</li>
                <li>✅ Renta plataforma: S/. 500-2,500/mes</li>
                <li>✅ Sin {slug === "miss-sofia" ? "profesores" : "especialistas"} (la IA atiende)</li>
                <li>✅ Punto de equilibrio: 17-40 {slug === "miss-sofia" ? "alumnos" : "consultas"}</li>
                <li>✅ Solo tú: marketing y captación</li>
                <li>✅ Riesgo: bajo, sin contratos largos</li>
              </ul>
              <div className="mt-6 pt-4 border-t border-amber-500/30">
                <div className="text-xs text-amber-300">Costo fijo plan Comunidad</div>
                <div className="text-2xl font-bold text-amber-400">S/. 1,200/mes</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="relative px-6 py-20 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">¿Cómo funciona?</h2>
            <p className="mt-3 text-zinc-400 max-w-2xl mx-auto">
              4 pasos. Sin tecnología, sin equipo, sin programar.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <Step n={1} title="Te registras" desc="Eliges tu plan. Llenas tus datos. Yapeas tu primera renta a Percy." />
            <Step n={2} title="Cuenta activa" desc="MacroDroid detecta tu Yape en segundos. Recibes WhatsApp con tu kit completo." />
            <Step n={3} title="Captas clientes" desc="Marketing local: Facebook ads, redes, networking, tu link de referido." />
            <Step n={4} title="Cobras directo" desc={`Tus ${slug === "miss-sofia" ? "alumnos" : "clientes"} pagan a TU Yape. La IA hace todo. Tú solo vendes.`} />
          </div>
        </div>
      </section>

      {/* PLANES */}
      <section className="relative px-6 py-20 border-t border-white/5">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Elige tu plan</h2>
            <p className="mt-3 text-zinc-400 max-w-2xl mx-auto">
              Renta mensual fija. Sin contratos largos. Cancela cuando quieras.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <PlanCard name="Local" precio="500" cupo={`30 ${slug === "miss-sofia" ? "alumnos" : "clientes"}`} rentabilidad="S/. 400 — 1,400" extras={["Ideal para empezar", "Marketing local", "Soporte estándar"]} />
            <PlanCard name="Comunidad" precio="1,200" cupo={`100 ${slug === "miss-sofia" ? "alumnos" : "clientes"}`} rentabilidad="S/. 1,800 — 4,500" extras={["Mejor relación precio/cupo", "Material premium", "Comunidad VIP", "Reportes mensuales"]} highlight />
            <PlanCard name="Líder" precio="2,500" cupo={`300 ${slug === "miss-sofia" ? "alumnos" : "clientes"}`} rentabilidad="S/. 6,500 — 15,000" extras={["Tagline custom", "Prioridad soporte", "Gestor de cuenta", "Acceso a betas"]} />
          </div>
        </div>
      </section>

      {/* PREGUNTAS */}
      <section className="relative px-6 py-20 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight mb-10">Preguntas frecuentes</h2>
          <div className="space-y-3">
            <Faq q="¿Necesito saber tecnología?">
              No. Tú solo te encargas de captar {slug === "miss-sofia" ? "alumnos" : "clientes"}. Nosotros entregamos la plataforma, la IA, los pagos. Cero programación.
            </Faq>
            <Faq q="¿Quién atiende a mis clientes?">
              {slug === "miss-sofia"
                ? "Sofia (la IA) atiende 24/7 por WhatsApp. Da las clases, evalúa, motiva. Tú solo respondes dudas comerciales si llegan."
                : "El bot TuDestinoYa atiende 24/7 por WhatsApp con Claude IA. Procesa lecturas esotéricas, asesorías profesionales, soluciones rápidas. Tú solo captas y respondes dudas si llegan."}
            </Faq>
            <Faq q="¿Cómo cobro a mis clientes?">
              Cada cliente paga directo a tu número de Yape personal. La plataforma detecta el pago automáticamente vía MacroDroid en tu celular y le activa su servicio.
            </Faq>
            <Faq q="¿Qué pasa después de pagar mi primera renta?">
              En 1-2 minutos te llega un WhatsApp con tu link único de referidos, tu URL para MacroDroid, kit de marketing, y siguiente paso para activar tu chip WhatsApp Business. Todo automático.
            </Faq>
            <Faq q="¿Y si no consigo clientes?">
              Asumes el costo de la renta mensual. Por eso recomendamos empezar con plan Local (S/. 500). Si en 1 mes no captas mínimo {slug === "miss-sofia" ? "17 alumnos" : "55 consultas"}, te asesoramos qué ajustar.
            </Faq>
            <Faq q="¿Puedo cancelar cuando quiera?">
              Sí, sin penalidad. Solo no recibes renovación al mes siguiente. Tus {slug === "miss-sofia" ? "alumnos" : "clientes"} seguirán recibiendo servicio si pagan, hasta el cierre del ciclo.
            </Faq>
          </div>
        </div>
      </section>

      {/* REGISTRO */}
      <section id="registro" className="relative px-6 py-24 border-t border-white/5 bg-gradient-to-b from-transparent via-amber-500/[0.03] to-transparent">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-10">
            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-widest uppercase">
              Empieza ahora
            </div>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
              Quiero ser operador {c.display}
            </h2>
            <p className="mt-3 text-zinc-400 max-w-md mx-auto">
              Llena tus datos. Te contactamos por WhatsApp en menos de 24h.
            </p>
          </div>
          <LeadForm defaultActivo={slug} />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 py-10 border-t border-white/5 text-center text-sm text-zinc-500">
        © 2026 ActivosYA · <Link href="/" className="text-amber-400 hover:underline">Marketplace de activos digitales</Link>
      </footer>
    </main>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="relative">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-black font-bold text-xl shadow-lg shadow-amber-500/30">{n}</div>
      <div className="mt-4 font-bold">{title}</div>
      <div className="mt-2 text-sm text-zinc-400 leading-relaxed">{desc}</div>
    </div>
  );
}

function PlanCard({ name, precio, cupo, rentabilidad, extras, highlight = false }: {
  name: string; precio: string; cupo: string; rentabilidad: string; extras: string[]; highlight?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl border p-7 transition ${
      highlight
        ? "border-amber-400/60 bg-gradient-to-br from-amber-500/15 to-orange-500/5 shadow-2xl shadow-amber-500/20 scale-105"
        : "border-white/10 bg-white/[0.02] hover:border-white/20"
    }`}>
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-black text-[10px] font-bold tracking-wider uppercase shadow-lg">
          Más popular
        </div>
      )}
      <div className="text-amber-400 text-xs uppercase tracking-widest font-bold">Plan</div>
      <div className="mt-1 text-2xl font-bold">{name}</div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-zinc-500 text-sm">S/.</span>
        <span className="text-5xl font-bold">{precio}</span>
        <span className="text-zinc-500 text-sm">/mes</span>
      </div>
      <div className="mt-2 text-sm text-zinc-400">Cupo: <strong className="text-white">{cupo}</strong></div>
      <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="text-xs text-zinc-500">Rentabilidad típica</div>
        <div className="text-lg font-bold text-amber-400">{rentabilidad}</div>
        <div className="text-[10px] text-zinc-500">por mes neto</div>
      </div>
      <ul className="mt-5 space-y-2 text-sm text-zinc-300">
        {extras.map((e, i) => <li key={i} className="flex items-start gap-2"><span className="text-amber-400 flex-shrink-0">✓</span>{e}</li>)}
      </ul>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur p-5 hover:border-amber-500/40 transition open:border-amber-500/50 open:bg-white/[0.04]">
      <summary className="flex items-center justify-between cursor-pointer font-semibold text-white list-none">
        <span>{q}</span>
        <span className="ml-4 flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15 text-amber-400 text-lg transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-4 text-sm text-zinc-300 leading-relaxed">{children}</div>
    </details>
  );
}
