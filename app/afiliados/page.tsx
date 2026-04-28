import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Programa de afiliados — Gana 10% por cada activo vendido",
  description:
    "Recomienda activos digitales de ActivosYA y gana 10% del primer pago + 5% recurrente. Tracking automático con tu link único.",
  alternates: { canonical: "https://activosya.com/afiliados" },
};

export default function AfiliadosPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-xs text-zinc-500 hover:text-amber-400">
          ← Volver al marketplace
        </Link>

        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-sm">
          <span>💰</span>
          <span>Programa de afiliados ActivosYA</span>
        </div>

        <h1 className="mt-6 text-4xl md:text-5xl font-bold leading-tight">
          Recomienda y gana <span className="text-amber-400">10%</span> + recurrente
        </h1>
        <p className="mt-4 text-zinc-400 max-w-2xl">
          Tienes red de emprendedores, agencias o academias? Comparte tu link único y gana comisión
          por cada activo digital que vendamos a través de ti.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card icon="🔗" title="Comparte tu link único" desc="Te damos un link tracker. Cuando alguien lo usa para registrarse, queda asociado a ti por 90 días." />
          <Card icon="💵" title="10% del primer pago" desc="Si vendemos S/.5,000 en compra única, recibes S/.500. Si renta S/.2,500/mes, recibes S/.250." />
          <Card icon="🔁" title="5% recurrente" desc="Mientras el cliente siga rentando, sigues cobrando 5% de cada mes pagado. Para siempre." />
        </div>

        <div className="mt-16 rounded-2xl border border-zinc-800 bg-gradient-to-br from-amber-500/5 to-transparent p-8">
          <h2 className="text-2xl font-bold mb-4">Ejemplo real</h2>
          <p className="text-zinc-300 leading-relaxed">
            Recomiendas Miss Sofia a una academia de inglés. Renta el plan a S/.2,500/mes.
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="text-xs uppercase tracking-wider text-emerald-400">Mes 1</div>
              <div className="mt-1 text-2xl font-bold">S/. 250</div>
              <div className="text-xs text-zinc-500 mt-1">10% × S/.2,500</div>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="text-xs uppercase tracking-wider text-emerald-400">Meses 2-12</div>
              <div className="mt-1 text-2xl font-bold">S/. 1,375</div>
              <div className="text-xs text-zinc-500 mt-1">5% × S/.2,500 × 11</div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="text-xs uppercase tracking-wider text-amber-400">Total año 1</div>
              <div className="mt-1 text-2xl font-bold">S/. 1,625</div>
              <div className="text-xs text-zinc-500 mt-1">por una sola recomendación</div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">¿Quién puede ser afiliado?</h2>
          <ul className="space-y-3 text-zinc-300">
            <Item>Emprendedores con red en LATAM (Perú, México, Colombia, Chile, Argentina)</Item>
            <Item>Agencias de marketing digital con clientes que necesitan automatización</Item>
            <Item>Influencers/youtubers de emprendimiento (canal con más de 10K)</Item>
            <Item>Coaches de negocios y mentores</Item>
            <Item>Consultores tecnológicos y desarrolladores freelance</Item>
          </ul>
        </div>

        <div id="aplicar" className="mt-16 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8">
          <h2 className="text-2xl font-bold">Aplicar al programa</h2>
          <p className="mt-2 text-zinc-300">
            Mándanos un mensaje con tu nombre, red/audiencia y zona. Aprobamos en menos de 24h.
          </p>
          <a
            href="https://wa.me/51998102258?text=Hola,%20quiero%20ser%20afiliado%20de%20ActivosYA"
            className="mt-6 inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold transition"
          >
            💬 Aplicar por WhatsApp
          </a>
        </div>

        <div className="mt-12 text-xs text-zinc-500 leading-relaxed">
          <strong>Términos:</strong> el atribución dura 90 días desde el primer click. Pagos
          mensuales por Yape, Plin o transferencia. Mínimo de cobro S/.50. Comisiones recurrentes
          siguen mientras el cliente referido permanezca activo.
        </div>
      </div>
    </main>
  );
}

function Card(props: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="text-3xl">{props.icon}</div>
      <div className="mt-3 font-bold text-lg">{props.title}</div>
      <div className="mt-2 text-sm text-zinc-400 leading-relaxed">{props.desc}</div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-amber-400 mt-1">✓</span>
      <span>{children}</span>
    </li>
  );
}
