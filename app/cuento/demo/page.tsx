import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Demos · TuCuentoYa",
  description:
    "Mira 3 ejemplos reales de cuentos personalizados generados por Rex. Lee el cuento completo y escucha la narración en voz peruana.",
};

const demos = [
  {
    id: "mateo-lobo",
    titulo: "Mateo y el Lobo del Bosque Encantado",
    duracion: 3,
    protagonista: "Mateo (5 años)",
    acompanantes: "Su papá Carlos",
    escenario: "Un bosque donde un lobo intenta atraparlo y su papá llega a salvarlo",
    moraleja: "La familia siempre se cuida y se protege.",
    audio_disponible: false,
    texto: `Había una vez en un bosque encantado, un niño valiente llamado *Mateo*, de 5 años. Le encantaba caminar entre los árboles altísimos y escuchar el canto de los pájaros.

Una tarde, mientras jugaba con un palo que parecía espada mágica, escuchó un *"¡Grrrr!"* detrás de un árbol. Era un lobo gris con ojos amarillos.

—¿Quién eres tú, pequeño humano? —dijo el lobo enseñando los dientes.

Mateo sintió miedo, pero recordó lo valiente que era. En ese mismo instante, un grito poderoso llenó el bosque:

—¡Aléjate de mi hijo!

Era *papá Carlos*. Llegaba corriendo con su mochila, los ojos llenos de coraje. El lobo se sorprendió tanto que dio un brinco hacia atrás.

—¡Shhh, lobo! —dijo papá Carlos plantándose entre Mateo y el lobo—. Este bosque tiene reglas. Aquí los niños están protegidos.

Mateo se abrazó fuerte a la pierna de su papá. El lobo, que en realidad no era tan malo, bajó las orejas y dijo:

—No quería asustar... solo... estoy perdido.

Papá Carlos suspiró, y entre los tres encontraron el camino de regreso al bosque profundo donde vivía la familia del lobo. Mateo aprendió que tener miedo está bien, pero también que su papá *siempre* va a estar ahí.

Y colorín colorado, este cuento se ha acabado.`,
  },
  {
    id: "sofia-espacio",
    titulo: "Sofía y el Cohete de Estrellas",
    duracion: 2,
    protagonista: "Sofía (6 años)",
    acompanantes: "Su abuela María",
    escenario: "Sofía y su abuela viajan en cohete al espacio para encontrar la estrella perdida",
    moraleja: "Los abuelos guardan las mejores aventuras.",
    audio_disponible: false,
    texto: `Una noche estrellada, *Sofía*, una niña curiosa de 6 años, descubrió que su *abuela María* tenía un secreto. Detrás del armario de su cuarto... ¡había un cohete!

—¡Abuela, esto es real! —gritó Sofía con los ojos enormes.

La abuela María le sonrió y le puso un casco brillante.

—Vamos a buscar la *Estrella Perdida*, mi cielo. Cada cierto tiempo se le olvida brillar y necesita que alguien la encuentre.

¡PUM! El cohete despegó entre nubes rosadas. Pasaron junto a Júpiter, saludaron a un astronauta mono que comía banana espacial, y por fin, escondida detrás de un anillo de Saturno, encontraron a la pequeña estrellita.

—¡Hola! —dijo Sofía—. ¿Por qué no brillas?

—Es que tenía miedo de no ser suficiente —respondió la estrellita con voz tímida.

Abuela María le tocó la frente con cariño y le dijo: *"Todos somos suficientes. Solo hay que recordar quiénes somos."*

La estrellita sonrió, brilló más fuerte que nunca, y todo el universo se iluminó.

Sofía abrazó a su abuela y volvieron a casa. Esa noche, Sofía soñó que ella también era una estrella.

Fin.`,
  },
  {
    id: "diego-pirata",
    titulo: "Diego y el Tesoro del Capitán Manchas",
    duracion: 5,
    protagonista: "Diego (7 años)",
    acompanantes: "Su mamá Lucía y su perro Manchas",
    escenario: "Aventura pirata en una isla buscando un tesoro escondido",
    moraleja: "El verdadero tesoro siempre está cerca de los que amamos.",
    audio_disponible: false,
    texto: `En la playa de un pueblo pequeño, *Diego*, un niño de 7 años, encontró una botella con un mapa adentro.

—¡Mamá! ¡Mira! —gritó corriendo hacia *Lucía*, su mamá, mientras *Manchas*, su perrito, ladraba emocionado.

El mapa decía: *"Tesoro escondido. Isla de las Tres Palmeras. Sigue la cola de tu mejor amigo."*

Lucía sonrió. —Diego, *eso* sí es una aventura de verdad.

Subieron a un bote pequeño con remos azules. Manchas iba al frente, oliendo el aire salado. Después de una hora remando, llegaron a una isla con tres palmeras gigantes.

—¡Aquí es! —gritó Diego.

Cuando bajaron, escucharon una risa malvada:

—¡JA JA JA! Yo soy el *Capitán Manchas*, el pirata más temido del mar, ¡y este tesoro es MÍO!

Era un pirata con sombrero torcido y un loro de plástico en el hombro. (Mamá Lucía y Diego intercambiaron una mirada de risa contenida.)

—¿Capitán Manchas? —preguntó Diego mirando a su perrito—. Pero ese es el nombre de mi perro.

El pirata se detuvo. Miró al perrito Manchas, que movía la cola feliz. Miró a Diego. Miró a la mamá. Y de repente, se le aguaron los ojos.

—Hace muchos años... perdí a mi perro. Se llamaba *Manchas*. Y nunca lo encontré.

Diego se acercó. —Tal vez Manchas vino aquí buscándote, capitán. Y al no encontrarte, se quedó con nosotros.

El pirata lloró de felicidad. Abrazó a Manchas. Manchas le lamió la cara.

Y entonces el pirata dijo: —El verdadero tesoro nunca fue de oro. Era *él*. Y ustedes me ayudaron a encontrarlo.

Les regaló el cofre lleno de monedas de chocolate. Y se fue a vivir cerca del pueblo de Diego, donde podía visitar a *Manchas* cuando quisiera.

Esa noche, mamá Lucía le dio un beso a Diego en la frente y le dijo: *"Lo más valioso que tenemos es la familia, mi amor. Incluyendo a Manchas."*

Y Manchas, debajo de la cama, soñaba con galletas.

Colorín colorado, este cuento ya ha terminado.`,
  },
];

export default function DemoCuentoPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-zinc-800 px-6 py-4 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur z-10">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link
            href="/cuento"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-400"
          >
            ← TuCuentoYa
          </Link>
          <a
            href="https://wa.me/51914200642?text=Hola%20Rex%2C%20quiero%20mi%20cuento%20personalizado"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-amber-500 text-black rounded-full text-sm font-semibold hover:bg-amber-400"
          >
            Crear mi cuento →
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Image
              src="/cuento/rex-avatar.jpg"
              alt="Rex"
              width={100}
              height={100}
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            3 cuentos de ejemplo
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Estos son ejemplos reales generados por Rex. Cuando tú pidas el
            tuyo, será 100% personalizado con el nombre de TU peque, TU familia
            y el escenario que TÚ elijas.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {demos.map((d) => (
            <article
              key={d.id}
              className="rounded-3xl border border-zinc-800 bg-[#0F0F0F] overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-zinc-800 bg-[#141414]">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold mb-1">{d.titulo}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="text-amber-400 font-semibold">
                        {d.duracion} min
                      </span>
                      <span>·</span>
                      <span>{d.protagonista}</span>
                      <span>·</span>
                      <span>con {d.acompanantes}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    S/ {d.duracion === 2 ? 2 : d.duracion === 3 ? 3 : 5}
                  </span>
                </div>
              </div>

              <div className="px-6 py-6">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
                  Escenario
                </p>
                <p className="text-zinc-300 italic mb-6">&quot;{d.escenario}&quot;</p>

                {/* Audio placeholder */}
                <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-5 mb-6 text-center">
                  {d.audio_disponible ? (
                    <audio
                      controls
                      className="w-full"
                      src={`/cuento/demos/${d.id}.mp3`}
                    />
                  ) : (
                    <div className="text-zinc-500 text-sm">
                      <div className="text-3xl mb-2">🎧</div>
                      <p>Audio próximamente disponible</p>
                      <p className="text-xs mt-1">
                        Voces peruanas Azure Neural: Camila + Alex
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
                  El cuento
                </p>
                <div className="prose prose-invert max-w-none">
                  <div className="text-zinc-300 leading-relaxed whitespace-pre-line text-[15px]">
                    {d.texto}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <p className="text-xs text-amber-400 italic">
                    💡 Moraleja: {d.moraleja}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-3xl border border-amber-500/40 bg-amber-500/5 p-8 text-center">
          <div className="text-5xl mb-4">🐕</div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            ¿Listo para el cuento de TU peque?
          </h2>
          <p className="text-zinc-300 mb-6 max-w-xl mx-auto">
            Primer cuento de 2 minutos <strong>GRATIS</strong>. Solo dile a
            Rex el nombre, escenario y duración.
          </p>
          <a
            href="https://wa.me/51914200642?text=Hola%20Rex%2C%20quiero%20mi%20primer%20cuento%20gratis"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-amber-500 text-black rounded-full text-base font-semibold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/30"
          >
            Crear mi cuento ahora →
          </a>
        </div>
      </div>
    </main>
  );
}
