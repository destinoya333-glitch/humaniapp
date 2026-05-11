import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de contenido infantil · TuCuentoYa",
  description:
    "Política de seguridad y contenido infantil de TuCuentoYa. Cómo filtramos cada cuento antes de la narración para garantizar contenido apto para niños 2-10 años.",
};

export default function PoliticaCuentoPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/cuento"
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-amber-400 transition-colors mb-6"
        >
          ← Volver a TuCuentoYa
        </Link>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-300 text-sm mb-6">
          🛡️ Política de contenido infantil
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Cómo cuidamos a los peques
        </h1>

        <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed">
          <p className="text-lg">
            Cada cuento generado por TuCuentoYa pasa por <strong>filtros automáticos
            estrictos</strong> antes de la narración. Diseñamos las reglas con
            asesoría de padres, pedagogos y storytellers infantiles.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-white">
            Lo que SIEMPRE pasa en cada cuento
          </h2>
          <ul className="flex flex-col gap-2 list-disc list-inside">
            <li>El niño protagonista <strong>nunca</strong> es herido gravemente, nunca muere, nunca sufre daño emocional permanente.</li>
            <li>Si hay villano (lobo, dragón, bruja, monstruo), es <strong>derrotado o reformado</strong> al final.</li>
            <li>Los acompañantes (papá, mamá, abuelos) <strong>protegen al niño</strong> o trabajan en equipo con él.</li>
            <li>Final <strong>siempre feliz</strong>, con moraleja simple (valentía, familia, amistad, generosidad).</li>
            <li>Vocabulario apto para 2-10 años, frases cortas, ritmo de lectura en voz alta.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-white">
            Contenido que NO toleramos
          </h2>
          <ul className="flex flex-col gap-2 list-disc list-inside">
            <li>Violencia gráfica, sangre, muerte (excepto &quot;el lobo huyó&quot;, &quot;la bruja se desvaneció&quot;).</li>
            <li>Groserías, insultos, agresiones verbales.</li>
            <li>Contenido sexual o romántico inapropiado para niños.</li>
            <li>Contenido religioso polémico, política, ideologías.</li>
            <li>Marcas comerciales, publicidad encubierta.</li>
            <li>Drogas, alcohol, juegos de azar.</li>
            <li>Estereotipos negativos por género, raza, religión, discapacidad.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-white">
            ¿Y si el cliente pide algo inapropiado?
          </h2>
          <p>
            Si por error o broma el padre/madre solicita un cuento con elementos
            no aptos (por ejemplo &quot;que el lobo se coma al niño&quot;), el
            sistema <strong>reescribe automáticamente</strong> el cuento
            preservando la trama pero haciendo el conflicto seguro: el lobo
            intenta, falla, el papá llega, el lobo huye asustado, el niño está
            bien, todos celebran.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-white">
            Privacidad de tus datos
          </h2>
          <ul className="flex flex-col gap-2 list-disc list-inside">
            <li>El nombre y edad del peque se usan SOLO para generar el cuento.</li>
            <li>No compartimos datos con terceros, ni con anunciantes.</li>
            <li>El audio se guarda 90 días por si quieres re-descargarlo, luego se elimina.</li>
            <li>Puedes pedir eliminación total escribiendo &quot;borra mis datos&quot; a Coqui.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-white">
            ¿Tienes una sugerencia o reportar contenido?
          </h2>
          <p>
            Escríbenos al WhatsApp de Coqui o a{" "}
            <a
              href="mailto:contacto@activosya.com"
              className="text-amber-400 underline"
            >
              contacto@activosya.com
            </a>
            . Revisamos cada caso reportado y ajustamos el sistema.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800 text-center">
          <p className="text-xs text-zinc-500">
            TuCuentoYa es un activo digital de{" "}
            <Link href="https://activosya.com" className="text-amber-400 underline">
              ActivosYA
            </Link>
            . Última actualización: mayo 2026.
          </p>
        </div>
      </div>
    </main>
  );
}
