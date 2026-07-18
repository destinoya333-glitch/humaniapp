import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "TuCuentoYa — Cuentos infantiles personalizados por WhatsApp · Audio IA",
  description:
    "Tu hijo es el HÉROE del cuento. Dile a Rex quién es, el escenario y la duración. Recibe audio narrado en voz peruana en menos de 60 segundos. Desde S/ 2.",
  openGraph: {
    title: "TuCuentoYa — Cuentos infantiles personalizados",
    description:
      "Tu hijo es el HÉROE del cuento. Audio IA en voz peruana, entregado por WhatsApp en 60 segundos. Desde S/2.",
    images: ["/cuento/rex-avatar.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TuCuentoYa — El cuento donde tu hijo es el héroe",
    description: "Cuentos infantiles personalizados por audio IA. Desde S/2 por WhatsApp.",
    images: ["/cuento/rex-avatar.jpg"],
  },
  icons: {
    icon: "/cuento/rex-avatar.jpg",
  },
};

const features = [
  {
    icon: "🐕",
    title: "100% personalizado",
    desc: "El niño es el protagonista, con su familia real (papá, mamá, abuelos) en el escenario que tú elijas.",
  },
  {
    icon: "🇵🇪",
    title: "Voces peruanas",
    desc: "Camila (narradora) y Alex (personajes) con acento neutral peruano que conecta con tu peque.",
  },
  {
    icon: "⚡",
    title: "Entrega en 60 segundos",
    desc: "Sin esperas. Escribe, paga y recibe el MP3 listo para reproducir en la cama.",
  },
  {
    icon: "🛡️",
    title: "Contenido seguro",
    desc: "Filtros estrictos: sin violencia gráfica, final feliz garantizado, vocabulario apto 2-10 años.",
  },
  {
    icon: "💰",
    title: "Wallet recargable",
    desc: "Recarga S/15 y obtén 6 cuentos. Sin micropagos Yape por cada uno.",
  },
  {
    icon: "🌟",
    title: "VIP desde S/18/mes",
    desc: "20 cuentos al mes en Estrella. 50 al mes en Mágico. Tu peque escucha una historia distinta cada noche.",
  },
];

const sampleChat = [
  { from: "user", text: "Hola, quiero un cuento para mi hijo" },
  { from: "bot", text: "¡Hola! 🐕 Soy Rex, tu narrador. ¿Cómo se llama tu peque?" },
  { from: "user", text: "Mateo, 5 años" },
  { from: "bot", text: "¡Genial! ¿Dónde quieres que ocurra la historia y quiénes salen?" },
  {
    from: "user",
    text: "En un bosque, un lobo quiere comerlo y yo, su papá, llego a salvarlo",
  },
  {
    from: "bot",
    text: "🐕 ¿De cuánto quieres el cuento?\n\n*2 min* — S/2\n*3 min* — S/3 ⭐\n*5 min* — S/5",
  },
  { from: "user", text: "3" },
  {
    from: "bot",
    text: "🎉 ¡Listo! Yapea S/3 a *998 102 258* y te envío el audio en 60 segundos ✨",
  },
];

const planes = [
  {
    nombre: "Cuento Suelto",
    precio: "S/ 2 - 5",
    desc: "Pago Yape por cuento. Ideal para probar.",
    bullets: ["2 min — S/ 2", "3 min — S/ 3 ⭐", "5 min — S/ 5", "Sin compromiso"],
    cta: "Probar gratis",
    destacado: false,
  },
  {
    nombre: "VIP Estrella",
    precio: "S/ 18/mes",
    desc: "20 cuentos al mes. Para familias con peques exigentes.",
    bullets: [
      "20 cuentos cualquier duración",
      "Equivale a S/60 sueltos",
      "Entrega prioritaria <60s",
      "Voces peruanas Camila + Alex",
      "Saga continua",
    ],
    cta: "Activar VIP",
    destacado: true,
  },
  {
    nombre: "VIP Mágico",
    precio: "S/ 30/mes",
    desc: "50 cuentos + música ambient. Para familias maximalistas.",
    bullets: [
      "50 cuentos al mes",
      "Música de fondo por escenario",
      "Hermanito GRATIS (2do niño)",
      "Capítulos saga ilimitados",
    ],
    cta: "Activar VIP",
    destacado: false,
  },
];

export default function TuCuentoYaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1a0d0a] via-[#0d0608] to-[#0a0a0a] text-white">
      {/* Hero */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px]"
            style={{
              background:
                "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-2/3 right-1/4 w-[400px] h-[400px]"
            style={{
              background:
                "radial-gradient(circle, rgba(244,114,182,0.10) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <Link
            href="https://activosya.com"
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-amber-400 transition-colors mb-6"
          >
            ← Volver a ActivosYA
          </Link>

          <div className="flex justify-center mb-6">
            <Image
              src="/cuento/rex-avatar.jpg"
              alt="Rex, el zorrito narrador"
              width={160}
              height={160}
              priority
              className="drop-shadow-2xl"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm mb-6">
            <span>Hola, soy Rex · Tu narrador IA</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Tu hijo es{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-pink-400 bg-clip-text text-transparent">
              el héroe
            </span>{" "}
            del cuento
          </h1>

          <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Cuentos infantiles 100% personalizados por audio. Tú me dices el
            nombre de tu peque, el escenario y quiénes salen. Yo te entrego un
            cuento mágico en menos de 60 segundos por WhatsApp.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-200 text-sm mb-8">
            🎁 Primer cuento de 2 minutos GRATIS · Sin tarjeta
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/51914200642?text=Hola%20Rex%2C%20quiero%20mi%20primer%20cuento%20gratis"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-amber-500 text-black rounded-full hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/30"
            >
              Probar gratis por WhatsApp →
            </a>
            <Link
              href="/cuento/demo"
              className="w-full sm:w-auto px-8 py-4 text-base font-medium border border-zinc-700 text-zinc-300 rounded-full hover:border-amber-500/40 hover:text-white transition-all"
            >
              Ver ejemplos
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md mx-auto pt-8 border-t border-zinc-800">
            <div>
              <div className="text-2xl font-bold text-amber-400">S/ 2-5</div>
              <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">
                Por cuento
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">60 seg</div>
              <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">
                Entrega
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">100%</div>
              <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">
                Personalizado
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-[#0D0D0D]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
              Por qué TuCuentoYa
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              6 razones para enganchar a tu peque cada noche
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 border border-zinc-800 bg-[#101010] hover:border-amber-500/30 transition-colors"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold mb-2 text-lg">{f.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo chat */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
              Cómo funciona
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Escríbeme.<br />
              <span className="bg-gradient-to-r from-amber-400 to-pink-400 bg-clip-text text-transparent">
                Recibe el cuento.
              </span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-6">
              Sin descargar apps. Sin crear cuentas. Solo escribe &quot;hola&quot;
              en WhatsApp y te guío paso a paso. En menos de 2 minutos tu peque
              está escuchando su propio cuento personalizado.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-zinc-300">
              <li>✦ Tú me dices nombre, edad y escenario</li>
              <li>✦ Eliges duración (2, 3 o 5 minutos)</li>
              <li>✦ Pagas con Yape o usas tu wallet</li>
              <li>✦ Recibes el MP3 narrado en voz peruana</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-[#0F0F0F] p-5 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-800 mb-4">
              <Image
                src="/cuento/rex-avatar.jpg"
                alt="Rex"
                width={40}
                height={40}
                className="rounded-full bg-amber-500/20"
              />
              <div>
                <p className="text-sm font-semibold">Rex · TuCuentoYa</p>
                <p className="text-xs text-emerald-400">● en línea</p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 text-sm">
              {sampleChat.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[80%] px-3 py-2 rounded-xl ${
                    m.from === "user"
                      ? "self-end bg-emerald-500/20 border border-emerald-500/30 rounded-br-sm"
                      : "self-start bg-[#181818] border border-zinc-800 rounded-bl-sm"
                  }`}
                >
                  <p className="text-zinc-200 whitespace-pre-line">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Planes */}
      <section className="px-6 py-16 bg-[#0D0D0D]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
              Planes
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Elige tu plan mágico
            </h2>
            <p className="text-zinc-400 mt-3 max-w-xl mx-auto">
              Desde un cuento suelto hasta 50 cuentos al mes. Todos con voces
              peruanas Camila y Alex.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {planes.map((p) => (
              <div
                key={p.nombre}
                className={`rounded-3xl p-6 border-2 transition-all ${
                  p.destacado
                    ? "border-amber-500/60 bg-amber-500/5 shadow-lg shadow-amber-500/10"
                    : "border-zinc-800 bg-[#101010]"
                }`}
              >
                {p.destacado && (
                  <div className="inline-block px-3 py-1 rounded-full bg-amber-500 text-black text-xs font-bold mb-4">
                    MÁS POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{p.nombre}</h3>
                <div className="text-3xl font-bold text-amber-400 mb-2">
                  {p.precio}
                </div>
                <p className="text-zinc-400 text-sm mb-5">{p.desc}</p>
                <ul className="flex flex-col gap-2 text-sm text-zinc-300 mb-6">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="text-amber-400">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="https://wa.me/51914200642?text=Hola%20Rex"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block text-center px-6 py-3 rounded-full font-semibold transition-all ${
                    p.destacado
                      ? "bg-amber-500 text-black hover:bg-amber-400"
                      : "border border-zinc-700 text-zinc-200 hover:border-amber-500/40"
                  }`}
                >
                  {p.cta} →
                </a>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/cuento/precios"
              className="text-amber-400 hover:text-amber-300 text-sm underline underline-offset-4"
            >
              Ver wallet recargable y todos los add-ons →
            </Link>
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-300 text-sm mb-6">
            🛡️ Contenido seguro garantizado
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pensado para peques de 2 a 10 años
          </h2>
          <p className="text-zinc-400 leading-relaxed mb-6">
            Cada cuento pasa por filtros estrictos antes de la narración. El
            niño <strong>nunca</strong> sufre daño real, los villanos siempre
            son derrotados o reformados, y el final es <strong>feliz</strong>.
            Si el cliente pide algo inapropiado, el sistema reescribe el cuento
            para que sea apto.
          </p>
          <Link
            href="/cuento/politica"
            className="text-amber-400 hover:text-amber-300 text-sm underline underline-offset-4"
          >
            Lee nuestra política de contenido infantil →
          </Link>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-16 bg-gradient-to-br from-amber-500/10 via-pink-500/5 to-transparent border-t border-zinc-800">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/cuento/rex-avatar.jpg"
              alt="Rex"
              width={120}
              height={120}
            />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            ¿Listo para crear el primer cuento?
          </h2>
          <p className="text-lg text-zinc-300 mb-8">
            Tu primer cuento de 2 minutos es <strong>GRATIS</strong>. Solo
            dime el nombre de tu peque.
          </p>
          <a
            href="https://wa.me/51914200642?text=Hola%20Rex%2C%20quiero%20mi%20primer%20cuento%20gratis"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-10 py-5 text-lg font-semibold bg-amber-500 text-black rounded-full hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/30"
          >
            Escribir a Rex ahora →
          </a>
          <p className="text-xs text-zinc-500 mt-6">
            Activo digital de{" "}
            <Link href="https://activosya.com" className="underline">
              ActivosYA
            </Link>
            {" · "}
            Yape: <span className="text-amber-400">998 102 258</span>
          </p>
        </div>
      </section>
    </main>
  );
}
