import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TuChoferYa · Tu chofer de confianza, sin Uber",
  description:
    "Reserva con choferes verificados de tu ciudad. Tarifas planas, paga directo por Yape, mismo chofer siempre.",
  alternates: { canonical: "https://chofer.activosya.com" },
};

export default function ChoferyaHome() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden">
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-16 sm:py-24">
        <header className="text-center space-y-6">
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-orange-400">
            TuChoferYa · ActivosYA
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight">
            Tu chofer de confianza,<br />
            <span className="text-orange-400">no un desconocido.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto">
            Reserva con choferes verificados de tu ciudad. Precio fijo desde el inicio.
            Mismo chofer cuando lo necesites. Pagas directo por Yape.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href="/choferya/buscar"
              className="px-8 py-4 rounded-full bg-orange-500 hover:bg-orange-400 text-black font-semibold transition"
            >
              Encontrar mi chofer
            </Link>
            <Link
              href="/se-choferya"
              className="px-8 py-4 rounded-full border border-white/20 hover:border-orange-400 text-white font-medium transition"
            >
              Soy chofer · Quiero inscribirme
            </Link>
          </div>
        </header>

        <section className="grid sm:grid-cols-3 gap-6 mt-20">
          {[
            {
              h: "Tarifa plana, sin sorpresas",
              p: "Centro → Aeropuerto S/.18 fijo. Centro → Huanchaco S/.25. No hay surge, no hay negociación.",
            },
            {
              h: "Verificación IA + RENIEC",
              p: "DNI, licencia, SOAT y antecedentes validados por IA antes de aparecer aquí.",
            },
            {
              h: "Yape directo al chofer",
              p: "Pagas 100% al chofer. Nosotros no tocamos tu dinero. Cero comisión por viaje.",
            },
          ].map((card) => (
            <div
              key={card.h}
              className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:border-orange-500/40 transition"
            >
              <h3 className="text-lg font-semibold mb-2">{card.h}</h3>
              <p className="text-white/70 text-sm leading-relaxed">{card.p}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">¿Cómo funciona?</h2>
          <div className="grid sm:grid-cols-4 gap-4 mt-8">
            {[
              { n: "1", t: "Escanea el QR del chofer", d: "O búscalo en nuestro directorio por ciudad." },
              { n: "2", t: "Elige fecha y hora", d: "Reserva con anticipación o ahora mismo." },
              { n: "3", t: "El chofer confirma", d: "Recibe su número de Yape para el pago." },
              { n: "4", t: "Viaja y califica", d: "Tu calificación lo posiciona o no en el directorio." },
            ].map((step) => (
              <div key={step.n} className="text-left">
                <div className="text-3xl font-bold text-orange-400 mb-2">{step.n}</div>
                <div className="font-semibold">{step.t}</div>
                <div className="text-sm text-white/60 mt-1">{step.d}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-24 pt-10 border-t border-white/10 text-center text-sm text-white/40">
          <p>
            TuChoferYa es un activo de{" "}
            <a href="https://activosya.com" className="text-orange-400 hover:underline">
              ActivosYA
            </a>
            . Plataforma de comunicación; los viajes son responsabilidad del chofer independiente.
          </p>
        </footer>
      </div>
    </main>
  );
}
