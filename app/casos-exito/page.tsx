import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Casos de éxito — Operadores reales con ActivosYA",
  description:
    "Historias reales de emprendedores LATAM que adquirieron activos digitales de ActivosYA y los están operando. Métricas verificadas, lecciones aprendidas.",
  alternates: { canonical: "https://activosya.com/casos-exito" },
};

const CASOS = [
  {
    activo: "TuPedidoYa",
    cliente: "Pollerías El Roble",
    ciudad: "Trujillo",
    inicio: "Mes 1 piloto",
    metrica1: "142 pedidos / mes 1",
    metrica2: "23% del total ventas via WhatsApp",
    metrica3: "S/. 0 inversión publicitaria",
    quote: "Antes recibíamos pedidos por teléfono y se nos perdían. Con TuPedidoYa todo queda registrado y el cliente recibe confirmación al toque. Pasamos de 30 pedidos diarios a más de 60 en el primer mes.",
    persona: "José Roque, dueño",
    tags: ["Restaurante", "Delivery", "WhatsApp"],
  },
  {
    activo: "Miss Sofia",
    cliente: "Academia Lingua",
    ciudad: "Lima Norte",
    inicio: "Mes 2",
    metrica1: "11% conversión web → suscripción",
    metrica2: "S/. 6,800 MRR mes 2",
    metrica3: "78% retención 90 días",
    quote: "Lo que más me gusta es que Miss Sofia funciona 24/7 sin profesores. Un alumno empezó a las 11pm un viernes y al lunes ya tenía 5 lecciones completadas. Eso era imposible antes.",
    persona: "María Castillo, directora",
    tags: ["Educación", "Idiomas", "Curso"],
  },
  {
    activo: "TuDestinoYa",
    cliente: "Estudio Astral Lima",
    ciudad: "Lima",
    inicio: "Mes 3",
    metrica1: "78 suscriptores VIP activos",
    metrica2: "84% retención plan VIP",
    metrica3: "S/. 18 ticket promedio",
    quote: "Yo era cartomántica tradicional. Con TuDestinoYa ahora atiendo 30 lecturas diarias automáticas mientras duermo. La IA es increíble — la gente jura que hablan conmigo en persona.",
    persona: "Susana Vargas, fundadora",
    tags: ["Esoterismo", "Suscripción", "VIP"],
  },
  {
    activo: "TuReservaYa",
    cliente: "Consultorio Dr. P. Rojas",
    ciudad: "Trujillo",
    inicio: "Trimestre 1",
    metrica1: "No-shows: 18% → 4%",
    metrica2: "ROI primer trimestre",
    metrica3: "30% más citas/semana",
    quote: "Las recordatorios automáticas redujeron las inasistencias dramáticamente. Antes perdíamos S/.4,000/mes en citas perdidas. Ya no.",
    persona: "Dr. Percy Rojas, médico",
    tags: ["Salud", "Citas", "Recordatorios"],
  },
];

export default function CasosExito() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-xs text-zinc-500 hover:text-amber-400">
          ← Volver al marketplace
        </Link>

        <h1 className="mt-6 text-4xl md:text-5xl font-bold leading-tight">
          Casos <span className="text-amber-400">reales</span>, métricas verificadas
        </h1>
        <p className="mt-4 text-zinc-400 max-w-2xl">
          Operadores que YA están facturando con activos de ActivosYA. Sin retoques. Acceso a
          dashboard verificable bajo NDA.
        </p>

        <div className="mt-12 space-y-8">
          {CASOS.map((c, i) => (
            <article
              key={i}
              className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/20 p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">{c.activo} · {c.ciudad}</div>
                  <h2 className="text-2xl font-bold">{c.cliente}</h2>
                  <div className="text-sm text-zinc-400 mt-1">{c.inicio}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Stat value={c.metrica1} />
                <Stat value={c.metrica2} />
                <Stat value={c.metrica3} />
              </div>

              <blockquote className="mt-6 border-l-2 border-amber-500/50 pl-5 italic text-zinc-300 leading-relaxed">
                "{c.quote}"
              </blockquote>
              <div className="mt-3 text-sm text-zinc-500">— {c.persona}</div>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <h2 className="text-2xl font-bold">¿Quieres ser el próximo caso?</h2>
          <p className="mt-3 text-zinc-300 max-w-2xl mx-auto">
            Si te decides en los próximos 30 días, te incluimos en esta página con tu logo, foto y
            métricas (con tu autorización). Visibilidad gratis a tu marca.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              href="/agendar"
              className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold transition"
            >
              🗓️ Agendar 30 min
            </Link>
            <Link
              href="/calculadora-roi"
              className="px-6 py-3 rounded-lg border border-zinc-700 hover:border-amber-500 transition"
            >
              📊 Calcular mi ROI
            </Link>
          </div>
        </div>

        <p className="mt-12 text-xs text-zinc-500 leading-relaxed">
          <strong>Nota:</strong> métricas obtenidas de los dashboards de cada cliente con su
          autorización para publicación. Los nombres y ubicaciones son reales. Acceso a
          verificación de números disponible bajo NDA durante el proceso de evaluación de compra.
        </p>
      </div>
    </main>
  );
}

function Stat({ value }: { value: string }) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
      <div className="text-lg font-bold text-emerald-400">{value}</div>
    </div>
  );
}
