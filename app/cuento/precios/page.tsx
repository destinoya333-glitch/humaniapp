import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Precios TuCuentoYa · Cuentos sueltos, Wallet y VIP",
  description:
    "Precios TuCuentoYa: cuentos sueltos desde S/2, wallet recargable con bonus, VIP Estrella S/18/mes (20 cuentos) y VIP Mágico S/30/mes (50 cuentos).",
};

const sueltos = [
  { dur: "2 min", precio: "S/ 2", emoji: "🌙", label: "Cuento Dormir" },
  { dur: "3 min", precio: "S/ 3", emoji: "🐕", label: "Cuento Aventura", popular: true },
  { dur: "5 min", precio: "S/ 5", emoji: "🐉", label: "Cuento Saga" },
];

const wallet = [
  { pack: "Chica", precio: "S/ 15", cuentos: 5, bonus: 1, total: 6 },
  { pack: "Media", precio: "S/ 30", cuentos: 10, bonus: 2, total: 12, popular: true },
  { pack: "Grande", precio: "S/ 50", cuentos: 16, bonus: 5, total: 21 },
  { pack: "Mágica", precio: "S/ 100", cuentos: 33, bonus: 12, total: 45 },
];

const vip = [
  {
    nombre: "VIP Estrella",
    icon: "🌟",
    precio: "S/ 18/mes",
    anual: "o S/ 180/año (2 meses gratis)",
    desc: "20 cuentos al mes · cualquier duración",
    bullets: [
      "Equivale a S/60 sueltos → ahorras 70%",
      "Entrega prioritaria <60 segundos",
      "Voces peruanas Camila + Alex",
      "Personajes ilimitados (papá, mamá, abuelos, mascotas)",
      "Saga continua (cuentos por capítulos)",
    ],
    destacado: true,
  },
  {
    nombre: "VIP Mágico",
    icon: "🪄",
    precio: "S/ 30/mes",
    anual: "o S/ 300/año (2 meses gratis)",
    desc: "50 cuentos al mes + extras",
    bullets: [
      "Equivale a S/150 sueltos → ahorras 80%",
      "Todo lo del VIP Estrella +",
      "Música de fondo personalizada por escenario",
      "Add-on 'Hermanito' GRATIS (2do niño protagonista)",
      "Efectos de sonido inmersivos (lobo, viento, mar)",
    ],
    destacado: false,
  },
];

const addons = [
  { tipo: "📕 PDF ilustrado del cuento", precio: "+S/ 4.90 c/u" },
  { tipo: "🎵 Música personalizada (cuento suelto)", precio: "+S/ 2.90" },
  { tipo: "📖 Capítulo continuación (saga)", precio: "+S/ 4.90" },
  { tipo: "👶 Hermanito (sobre VIP Estrella)", precio: "+S/ 9/mes" },
  { tipo: "👨‍👩‍👧‍👦 Familia Grande (3-5 niños)", precio: "+S/ 19/mes" },
];

export default function PreciosCuentoPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/cuento"
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-amber-400 transition-colors mb-6"
        >
          ← Volver a TuCuentoYa
        </Link>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          Precios{" "}
          <span className="bg-gradient-to-r from-amber-400 to-pink-400 bg-clip-text text-transparent">
            TuCuentoYa
          </span>
        </h1>
        <p className="text-zinc-400 text-lg mb-12 max-w-2xl">
          Tres formas de comprar: cuento suelto, wallet recargable con bonus o
          VIP mensual con cap de cuentos. Pago Yape al{" "}
          <span className="text-amber-400 font-semibold">998 102 258</span>.
        </p>

        {/* Cuentos sueltos */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Cuentos sueltos</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {sueltos.map((s) => (
              <div
                key={s.label}
                className={`rounded-2xl p-6 border-2 ${
                  s.popular
                    ? "border-amber-500/60 bg-amber-500/5"
                    : "border-zinc-800 bg-[#101010]"
                }`}
              >
                {s.popular && (
                  <div className="inline-block px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold mb-3">
                    MÁS POPULAR
                  </div>
                )}
                <div className="text-4xl mb-2">{s.emoji}</div>
                <h3 className="font-semibold">{s.label}</h3>
                <p className="text-zinc-500 text-sm mb-3">{s.dur}</p>
                <div className="text-3xl font-bold text-amber-400">
                  {s.precio}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Wallet */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Wallet recargable</h2>
          <p className="text-zinc-400 mb-6 text-sm">
            Recarga 1 vez y compra cuentos sin re-pagar cada vez. Más recargas
            grandes → más bonus.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {wallet.map((w) => (
              <div
                key={w.pack}
                className={`rounded-2xl p-5 border-2 ${
                  w.popular
                    ? "border-amber-500/60 bg-amber-500/5"
                    : "border-zinc-800 bg-[#101010]"
                }`}
              >
                {w.popular && (
                  <div className="inline-block px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold mb-2">
                    RECOMENDADA
                  </div>
                )}
                <h3 className="font-semibold mb-1">Recarga {w.pack}</h3>
                <div className="text-2xl font-bold text-amber-400 mb-3">
                  {w.precio}
                </div>
                <ul className="text-sm text-zinc-300 flex flex-col gap-1">
                  <li>{w.cuentos} cuentos base</li>
                  <li className="text-amber-300">+{w.bonus} bonus 🎁</li>
                  <li className="font-bold mt-2 pt-2 border-t border-zinc-800">
                    = {w.total} cuentos
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* VIP */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-2">VIP mensual</h2>
          <p className="text-zinc-400 mb-6 text-sm">
            Para familias con peques exigentes que escuchan cuentos
            frecuentemente. Mejor ahorro vs. comprar suelto.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {vip.map((v) => (
              <div
                key={v.nombre}
                className={`rounded-3xl p-7 border-2 ${
                  v.destacado
                    ? "border-amber-500/60 bg-amber-500/5 shadow-lg shadow-amber-500/10"
                    : "border-zinc-800 bg-[#101010]"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{v.icon}</span>
                  <h3 className="text-xl font-bold">{v.nombre}</h3>
                </div>
                <div className="text-3xl font-bold text-amber-400 mb-1">
                  {v.precio}
                </div>
                <p className="text-zinc-500 text-xs mb-2">{v.anual}</p>
                <p className="text-zinc-400 text-sm mb-5">{v.desc}</p>
                <ul className="flex flex-col gap-2 text-sm text-zinc-300 mb-6">
                  {v.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="text-amber-400">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="https://wa.me/51914200642?text=Hola%20Rex%2C%20quiero%20activar%20VIP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block text-center px-6 py-3 rounded-full font-semibold transition-all ${
                    v.destacado
                      ? "bg-amber-500 text-black hover:bg-amber-400"
                      : "border border-zinc-700 text-zinc-200 hover:border-amber-500/40"
                  }`}
                >
                  Activar {v.nombre} →
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Add-ons */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Add-ons opcionales</h2>
          <div className="rounded-2xl border border-zinc-800 bg-[#101010] overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {addons.map((a, i) => (
                  <tr
                    key={a.tipo}
                    className={
                      i !== addons.length - 1 ? "border-b border-zinc-800" : ""
                    }
                  >
                    <td className="px-5 py-4 text-zinc-200">{a.tipo}</td>
                    <td className="px-5 py-4 text-right text-amber-400 font-semibold">
                      {a.precio}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Cómo pagar */}
        <section className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">¿Cómo pago?</h2>
          <p className="text-zinc-300 mb-2">
            Yape al <span className="text-amber-400 font-semibold">998 102 258</span>{" "}
            (Percy Roj*)
          </p>
          <p className="text-zinc-400 text-sm">
            Envía la captura por WhatsApp a Rex. El sistema verifica
            automáticamente y acredita en segundos.
          </p>
          <a
            href="https://wa.me/51914200642?text=Hola%20Rex"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-6 px-8 py-3 bg-amber-500 text-black rounded-full font-semibold hover:bg-amber-400 transition-all"
          >
            Empezar en WhatsApp →
          </a>
        </section>
      </div>
    </main>
  );
}
