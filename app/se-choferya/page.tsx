import type { Metadata } from "next";
import SeChoferYaForm from "./SeChoferYaForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sé chofer TuChoferYa · Deja la comisión de Uber · ActivosYA",
  description:
    "Tu propia agencia de taxi por S/.39/mes. Tarifa plana, tus pasajeros pagan 100% por Yape directo a ti. Sin comisión por viaje.",
  alternates: { canonical: "https://activosya.com/se-choferya" },
};

const PLANES = [
  {
    id: "basico",
    nombre: "Básico",
    precio: 39,
    features: [
      "Página personal mi.activosya.com/c/tu-nombre",
      "QR descargable para tu auto",
      "WhatsApp Business con plantillas",
      "Tarifas planas por ruta",
      "Sello Verificado IA (DNI+SOAT)",
      "Yape integrado",
    ],
    cta: "Empezar con Básico",
  },
  {
    id: "pro",
    nombre: "Pro",
    precio: 79,
    badge: "Más popular",
    features: [
      "Todo lo del Básico +",
      "Bot IA Eco responde mientras manejas",
      "Tarifa dinámica por día/hora",
      "Lista de espera automática",
      "Programa fidelidad propio",
      "Reportes PDF mensuales",
      "Audio personalizado a top 10 clientes",
    ],
    cta: "Empezar con Pro",
  },
  {
    id: "elite",
    nombre: "Élite",
    precio: 149,
    features: [
      "Todo lo del Pro +",
      "Multi-chofer (mini-flota 2-5)",
      "Ads pagados en directorio",
      "Capacitación mensual con experto",
      "Acceso flota de respaldo si tu auto falla",
    ],
    cta: "Empezar con Élite",
  },
];

export default async function SeChoferYaPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planParam } = await searchParams;
  const initialPlan: "basico" | "pro" | "elite" =
    planParam === "pro" ? "pro" : planParam === "elite" ? "elite" : "basico";

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden">
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-16 sm:py-24">
        <header className="text-center max-w-3xl mx-auto space-y-6">
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-orange-400">
            TuChoferYa · ActivosYA
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight">
            Deja de pagarle <span className="line-through text-white/30">27%</span><br />
            <span className="text-orange-400">a Uber.</span>
          </h1>
          <p className="text-xl text-white/70">
            Por S/.39 al mes tienes <strong>tu propia agencia de taxi</strong>: tu página, tus precios,
            tus clientes. Cada viaje 100% para ti. Yape directo. Sin comisión.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <a
              href="#planes"
              className="px-8 py-4 rounded-full bg-orange-500 hover:bg-orange-400 text-black font-semibold transition"
            >
              Ver planes
            </a>
            <a
              href="#registro"
              className="px-8 py-4 rounded-full border border-white/20 hover:border-orange-400 text-white font-medium transition"
            >
              Inscribirme ya
            </a>
          </div>
        </header>

        {/* Numbers */}
        <section className="mt-20 grid sm:grid-cols-3 gap-6 text-center">
          {[
            { n: "S/.760", l: "Lo que pierdes al mes pagando 27% Uber (cartera S/.3,000)" },
            { n: "S/.39", l: "Lo que pagas a TuChoferYa por mes, plan Básico" },
            { n: "100%", l: "De cada viaje queda en tu Yape" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="text-4xl font-bold text-orange-400">{s.n}</div>
              <p className="text-sm text-white/60 mt-2">{s.l}</p>
            </div>
          ))}
        </section>

        {/* Planes */}
        <section id="planes" className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-10">Elige tu plan</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {PLANES.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl border p-6 flex flex-col ${
                  p.badge
                    ? "border-orange-500/60 bg-orange-500/5 relative"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {p.badge ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-500 text-xs font-semibold text-black">
                    {p.badge}
                  </span>
                ) : null}
                <h3 className="text-2xl font-bold">{p.nombre}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-bold">S/. {p.precio}</span>
                  <span className="text-white/50">/mes</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm text-white/70 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-orange-400 flex-shrink-0">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={`?plan=${p.id}#registro`}
                  className="mt-6 block text-center rounded-full bg-orange-500 hover:bg-orange-400 text-black font-medium py-3"
                >
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-10">¿Cómo funciona?</h2>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { n: "1", t: "Inscríbete por WhatsApp", d: "Sube tu DNI, licencia, SOAT y foto del auto. La IA te verifica en 5 min." },
              { n: "2", t: "Yapea tu primera renta", d: "S/.39 / 79 / 149 al 998 102 258. Detectamos el pago en 1-2 min." },
              { n: "3", t: "Configura tu página", d: "Define tarifas planas, horarios, zonas. Descarga tu QR." },
              { n: "4", t: "Comparte y gana", d: "Pega el QR en tu auto, dáselo a tus pasajeros. Ellos reservan y te yapean directo." },
            ].map((s) => (
              <div key={s.n}>
                <div className="text-4xl font-bold text-orange-400 mb-2">{s.n}</div>
                <div className="font-semibold">{s.t}</div>
                <div className="text-sm text-white/60 mt-1">{s.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Form */}
        <section id="registro" className="mt-20 max-w-xl mx-auto scroll-mt-8">
          <h2 className="text-3xl font-bold text-center mb-3">Empieza hoy</h2>
          <p className="text-white/60 text-center mb-8">
            Te mandamos por WhatsApp el flow para subir tus documentos.
          </p>
          <SeChoferYaForm initialPlan={initialPlan} />
        </section>

        <footer className="mt-24 pt-10 border-t border-white/10 text-center text-sm text-white/40">
          <p>
            TuChoferYa es plataforma de comunicación y agenda. Tú eres trabajador independiente
            responsable de tu propia tributación. Cancela cuando quieras.
          </p>
        </footer>
      </div>
    </main>
  );
}
