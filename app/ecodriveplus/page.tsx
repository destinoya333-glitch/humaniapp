import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "EcoDrive+ — Pides tu carro como pides delivery",
  description:
    "EcoDrive+ es el primer servicio de viajes 100% por WhatsApp en Trujillo. Sin app, sin descargas. Pides taxi, eliges chofer, pagas con wallet. Más barato que Indrive y Didi.",
  alternates: { canonical: "https://ecodriveplus.com" },
};

const PASAJERO_WA = "https://wa.me/51994810242?text=Hola,%20quiero%20pedir%20un%20taxi";
const CHOFER_WA = "https://wa.me/51994810242?text=Hola,%20quiero%20ser%20chofer%20EcoDrive";

export default function EcoDrivePlusPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 20%, rgba(245,124,0,0.18) 0%, transparent 60%)",
          }}
        />

        <div className="relative mx-auto max-w-5xl text-center">
          <Link href="/" className="text-xs text-zinc-500 hover:text-orange-400">
            ← Volver a ActivosYA
          </Link>

          <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full border border-orange-500/30 bg-orange-500/5 text-orange-400 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
            </span>
            <span>Activo en Trujillo · 88 conductores · 231 clientes</span>
          </div>

          <h1 className="mt-8 text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
            Pides tu carro como
            <br />
            <span className="text-orange-400">pides delivery</span>
          </h1>

          <p className="mt-6 text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            EcoDrive+ es el primer servicio de viajes 100% por WhatsApp en Perú. Sin app, sin
            descargas, sin trámites. Solo dile <strong>Hola</strong> al bot y pide tu carro.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={PASAJERO_WA}
              className="px-8 py-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-bold transition flex items-center justify-center gap-2"
            >
              🚗 Pedir mi primer viaje
            </a>
            <a
              href={CHOFER_WA}
              className="px-8 py-4 rounded-lg border border-orange-500/30 hover:bg-orange-500/10 text-orange-400 font-bold transition flex items-center justify-center gap-2"
            >
              💼 Ser chofer
            </a>
          </div>

          <div className="mt-6 text-xs text-zinc-500">
            Bono S/.5 wallet en tu primer viaje · Sin tarifa fija, tú comparas precios
          </div>
        </div>
      </section>

      {/* 3 ventajas grandes */}
      <section className="px-6 py-16 border-t border-zinc-900">
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8">
          <Big icon="📲" title="Sin app" desc="Solo WhatsApp. Nada que descargar. Funciona desde cualquier celular, sin actualizaciones." />
          <Big icon="💰" title="Sin tarifa fija" desc="Recibes 3 ofertas de choferes con precios distintos. Eliges la que más te conviene." />
          <Big icon="⭐" title="Modo a tu medida" desc="Elige Mujer (solo choferas), Familia (van), Mascotas, Abuelo (te llaman) y más." />
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="px-6 py-20 border-t border-zinc-900">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center">
            Así es como funciona
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <Step n={1} title="Dile Hola" desc="Por WhatsApp. Eco te saluda y te pregunta qué necesitas." />
            <Step n={2} title="Comparte ubicación" desc="Click clip 📎 → Ubicación. Eco identifica al toque dónde estás." />
            <Step n={3} title="Elige chofer" desc="Te llegan 3 ofertas con foto, vehículo, rating y precio. Eliges una." />
            <Step n={4} title="Listo" desc="El chofer llega. Pagas con tu wallet o efectivo. Cashback 2% al toque." />
          </div>
        </div>
      </section>

      {/* Modos especiales */}
      <section className="px-6 py-20 border-t border-zinc-900">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center">
            7 modos para cada situación
          </h2>
          <p className="mt-3 text-zinc-400 text-center max-w-2xl mx-auto">
            Cada modo filtra automáticamente al chofer correcto según tu necesidad.
          </p>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "🚗", name: "Regular", desc: "Auto estándar mejor precio" },
              { icon: "🌱", name: "Eco", desc: "Vehículos eficientes, ahorras" },
              { icon: "⚡", name: "Express", desc: "Llega más rápido" },
              { icon: "👩", name: "Mujer", desc: "Solo choferas mujeres" },
              { icon: "👨‍👩‍👧", name: "Familia", desc: "Van 7 personas" },
              { icon: "🐕", name: "Mascotas", desc: "Acepta perros y gatos" },
              { icon: "👴", name: "Abuelo", desc: "Chofer llama al pasajero" },
              { icon: "🏢", name: "Empresa", desc: "RUC + 5% descuento + factura" },
            ].map((m) => (
              <div
                key={m.name}
                className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-orange-500/50 transition"
              >
                <div className="text-3xl">{m.icon}</div>
                <div className="mt-2 font-bold">{m.name}</div>
                <div className="mt-1 text-xs text-zinc-500">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para choferes */}
      <section className="px-6 py-20 border-t border-zinc-900 bg-gradient-to-br from-orange-500/5 to-transparent">
        <div className="mx-auto max-w-5xl">
          <div className="text-orange-400 text-sm uppercase tracking-wider font-semibold">
            Si eres chofer
          </div>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold">
            Cobras directo a tu wallet, retiras por Yape
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChoferCard
              icon="🎁"
              title="EcoCredit Welcome"
              value="S/. 30"
              desc="Bono inicial al aprobarte. Lo descuentas despacio de comisiones."
            />
            <ChoferCard
              icon="💸"
              title="Comisión más baja"
              value="6.3%"
              desc="vs Indrive/Didi 25%. Más plata para ti."
            />
            <ChoferCard
              icon="🚀"
              title="Tú eliges precio"
              value="Libre"
              desc="Sin tarifa fija. Tú pones tu oferta y compites."
            />
          </div>
          <div className="mt-12 text-center">
            <a
              href={CHOFER_WA}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-bold transition"
            >
              💼 Quiero ser chofer EcoDrive+
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16 border-t border-zinc-900">
        <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <Stat n="88" label="Conductores activos" />
          <Stat n="231" label="Clientes registrados" />
          <Stat n="6.3%" label="Comisión más baja" />
          <Stat n="24/7" label="Disponibilidad" />
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 border-t border-zinc-900 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold">
            Tu próximo viaje empieza con un <span className="text-orange-400">Hola</span>
          </h2>
          <p className="mt-4 text-zinc-400">
            No descargues nada. Solo WhatsApp. Estamos en Trujillo, llegando a Lima pronto.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={PASAJERO_WA}
              className="px-8 py-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-bold transition"
            >
              🚗 Pedir mi primer viaje
            </a>
            <a
              href={CHOFER_WA}
              className="px-8 py-4 rounded-lg border border-orange-500/30 hover:bg-orange-500/10 text-orange-400 font-bold transition"
            >
              💼 Ser chofer
            </a>
          </div>
        </div>
      </section>

      <footer className="px-6 py-12 border-t border-zinc-900 text-center text-xs text-zinc-500">
        <div>EcoDrive+ es un activo digital de <Link href="/" className="text-orange-400 hover:underline">ActivosYA</Link></div>
        <div className="mt-2">© 2026 · Hecho con ✦ en Trujillo, Perú</div>
      </footer>
    </main>
  );
}

function Big({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-xl font-bold">{title}</div>
      <div className="mt-2 text-zinc-400 leading-relaxed">{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <div className="text-4xl font-bold text-orange-400">{n}</div>
      <div className="mt-3 font-bold">{title}</div>
      <div className="mt-2 text-sm text-zinc-400 leading-relaxed">{desc}</div>
    </div>
  );
}

function ChoferCard({ icon, title, value, desc }: { icon: string; title: string; value: string; desc: string }) {
  return (
    <div className="rounded-xl border border-orange-500/20 bg-zinc-900/40 p-6">
      <div className="text-3xl">{icon}</div>
      <div className="mt-3 text-3xl font-bold text-orange-400">{value}</div>
      <div className="mt-1 text-sm font-semibold">{title}</div>
      <div className="mt-2 text-xs text-zinc-400 leading-relaxed">{desc}</div>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-bold text-orange-400">{n}</div>
      <div className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
