import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import Reveal from "./_design/Reveal";
import WordReveal from "./_design/WordReveal";
import Magnetic from "./_design/Magnetic";
import CountUp from "./_design/CountUp";
import TrujilloClock from "./_design/TrujilloClock";
import ChatMockup from "./_design/ChatMockup";
import CinematicImage from "./_design/CinematicImage";

export const metadata: Metadata = {
  title: "EcoDrive+ — Pides tu carro como pides delivery",
  description:
    "EcoDrive+ es el primer servicio de viajes 100% por WhatsApp en Trujillo. Sin app, sin descargas. Pides taxi, eliges chofer, pagas con BilleteraEco. Más barato que InDrive y DiDi.",
  alternates: { canonical: "https://ecodriveplus.com" },
  keywords: [
    "taxi Trujillo WhatsApp",
    "rideshare sin app Perú",
    "EcoDrive Trujillo",
    "taxi por WhatsApp",
    "chofer Trujillo comisión baja",
    "InDrive alternativa Perú",
    "DiDi alternativa Trujillo",
  ],
};

const PASAJERO_WA = "https://wa.me/51994810242?text=Hola,%20quiero%20pedir%20un%20taxi";
const CHOFER_WA = "https://wa.me/51994810242?text=Hola,%20quiero%20ser%20chofer%20EcoDrive";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

const NIVELES_PASAJERO: Array<[string, string, string, string]> = [
  ["Iniciante", "0–9", "0.3%", "1/día"],
  ["Bronce", "10–18", "0.6%", "1/día"],
  ["Plata", "19–33", "0.9%", "2/día"],
  ["Oro", "34–63", "1.2%", "2/día +1 mes"],
  ["Platino", "64–93", "1.5%", "3/día +2 mes"],
  ["Zafiro", "94–123", "1.8%", "3/día +3 mes"],
  ["Rubí", "124–153", "2.1%", "5/día +4 mes"],
  ["Esmeralda", "154–183", "2.4%", "Ilimitadas"],
  ["Diamante", "184+", "2.7%", "Ilimitadas VIP"],
];

const NIVELES_CHOFER: Array<[string, string, string, string, string]> = [
  ["Aspirante", "0–90", "6.3%", "S/.9", "Chequeo médico + bono S/.20"],
  ["Bronce", "91–270", "6.0%", "S/.27", "Insignia + soporte prioritario"],
  ["Plata", "271–450", "5.7%", "S/.45", "Prioridad zonas cercanas"],
  ["Oro", "451–750", "5.4%", "S/.75", "Insignia Oro + zonas céntricas"],
  ["Platino", "751–1050", "5.1%", "S/.105", "Corporativos + constancia financiera"],
  ["Zafiro", "1051–1850", "4.8%", "S/.135", "Tarifa dinámica +5% hora pico"],
  ["Rubí", "1851–2890", "4.5%", "S/.195", "Préstamo S/.500 + activo ActivosYA"],
  ["Esmeralda", "2891–3930", "4.2%", "S/.255", "Plan salud + S/.1k + vacaciones S/.1.5k"],
  ["Diamante", "3931+", "3.9%", "S/.315", "Salud familiar + S/.1.5k + vacaciones S/.2.5k + aguinaldo"],
];

const SERVICIOS = [
  { code: "01", name: "Normal", criterio: "Auto ≥ 2010", tarifa: "Base" },
  { code: "02", name: "Premium", criterio: "Auto ≥ 2018 · A/C", tarifa: "+20%" },
  { code: "03", name: "VIP", criterio: "Auto ≥ 2022 · rating 4.8+", tarifa: "+30%" },
  { code: "04", name: "XL", criterio: "5–7 pasajeros · equipaje", tarifa: "+30%" },
  { code: "05", name: "Encomienda", criterio: "Paquete sin pasajero", tarifa: "−5%" },
];

const TESTIMONIOS = [
  {
    quote: "Antes ganaba S/.130 al día con otra app. Ahora gano S/.180 con EcoDrive+. La comisión 6.3% me cambió el bolsillo.",
    who: "Carlos M.",
    role: "Chofer · 8 años",
  },
  {
    quote: "Pido mi taxi mientras cocino, sin abrir nada. Mi mamá ve el viaje en vivo y se queda tranquila.",
    who: "Ana R.",
    role: "Pasajera",
  },
  {
    quote: "Cobro al instante a mi Yape. Ya no espero el lunes para retirar. Eso me sostiene la semana.",
    who: "Luis V.",
    role: "Chofer · BilleteraEco activa",
  },
];

const FAQS: Array<[string, React.ReactNode]> = [
  ["¿Necesito descargar alguna aplicación?", <>No. EcoDrive+ funciona 100% por WhatsApp. Solo guardas el número <strong className="text-[var(--eco-flame)]">994 810 242</strong> y le escribes a Eco.</>],
  ["¿Cómo pago el viaje?", <>Tres opciones: <strong>Yape</strong> (al toque al chofer), <strong>BilleteraEco</strong> (con bono S/.5 al primer viaje) o <strong>efectivo</strong>. Tú eliges.</>],
  ["¿Qué pasa si el chofer no llega?", <>Eco rastrea cada viaje. Si demora o cancela, te reasignamos otro y enviamos compensación a tu BilleteraEco automáticamente.</>],
  ["¿Cómo me registro como chofer?", <>Escribe a Eco al WhatsApp <strong>994 810 242</strong> diciendo &ldquo;Quiero ser chofer&rdquo;. Pedimos DNI, foto vehículo, SOAT y revisión técnica. Aprobación 24–48 horas.</>],
  ["¿La comisión 6.3% incluye algo más?", <>No. 6.3% es lo único que descuenta EcoDrive+ por viaje. Sin pagos por uso, sin suscripciones, sin sorpresas.</>],
  ["¿Mi familia puede ver dónde estoy en el viaje?", <>Sí. Al pedir el viaje recibes link de seguimiento en vivo que puedes compartir. Ven la ubicación en tiempo real hasta que llegues.</>],
];

export default function EcoDrivePlusPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* === TRACKING === */}
      {META_PIXEL_ID && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
          </Script>
          <noscript>
            <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
          </noscript>
        </>
      )}
      {GA4_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}');`}
          </Script>
        </>
      )}

      <Script id="schema-org" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "EcoDrive+",
          url: "https://ecodriveplus.com",
          logo: "https://ecodriveplus.com/ecodrive-logo.png",
          description: "Servicio de transporte 100% por WhatsApp. Sin app. Comisión 6.3% para choferes.",
          areaServed: { "@type": "City", name: "Trujillo, Perú" },
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+51-994-810-242",
            contactType: "Customer Service",
            availableLanguage: "Spanish",
          },
        })}
      </Script>

      {/* === ATMOSPHERIC BACKGROUND === */}
      <div aria-hidden className="fixed inset-0 pointer-events-none eco-mesh" />
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(224,136,33,0.18), transparent 70%)", filter: "blur(120px)" }} />
        <div className="absolute -bottom-1/3 -right-1/4 w-[55vw] h-[55vw] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(184,106,18,0.22), transparent 70%)", filter: "blur(140px)" }} />
      </div>

      {/* === HEADER === */}
      <header className="relative z-40 border-b border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 h-32 md:h-40 flex items-center justify-between">
          <Link href="/ecodriveplus" className="flex items-center gap-5 group">
            <div
              role="img"
              aria-label="EcoDrive+"
              className="h-24 w-24 md:h-28 md:w-28 bg-[url('/ecodriveplus/icon.png')] bg-contain bg-no-repeat bg-center group-hover:rotate-[8deg] transition-transform duration-700 shrink-0"
            />
            <div className="leading-none">
              <div className="eco-display text-[32px] md:text-[40px] tracking-tight">EcoDrive<span className="text-[var(--eco-flame)]">+</span></div>
              <div className="eco-mono mt-2 text-[var(--eco-ink-mute)] hidden sm:block text-[0.95rem] tracking-[0.18em]">EST. TRUJILLO · 2024</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-10 eco-mono text-[var(--eco-ink-soft)]">
            <a href="#manifesto" className="hover:text-[var(--eco-flame)] transition-colors">Manifiesto</a>
            <a href="#como" className="hover:text-[var(--eco-flame)] transition-colors">Cómo opera</a>
            <a href="#niveles" className="hover:text-[var(--eco-flame)] transition-colors">Niveles</a>
            <a href="#contra" className="hover:text-[var(--eco-flame)] transition-colors">Contraste</a>
            <a href="#choferes" className="hover:text-[var(--eco-flame)] transition-colors">Choferes</a>
          </nav>

          <Magnetic strength={0.3}>
            <a
              href={PASAJERO_WA}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--eco-flame)] hover:bg-[var(--eco-flame-soft)] text-[var(--eco-bg-deep)] eco-mono font-semibold transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--eco-bg-deep)] animate-pulse" />
              Hablar con Eco
            </a>
          </Magnetic>
        </div>
      </header>

      {/* === HERO === */}
      <section className="relative pt-12 md:pt-24 pb-24 md:pb-40">
        {/* Vertical label margen izq */}
        <div aria-hidden className="hidden lg:block absolute left-6 top-32 eco-label-vertical">
          INDICE · 01 — PRÓLOGO · TRUJILLO LA LIBERTAD
        </div>

        <div className="mx-auto max-w-[1400px] px-6 lg:px-24 grid lg:grid-cols-12 gap-y-16 lg:gap-x-12 items-center">
          {/* Lado izquierdo */}
          <div className="lg:col-span-7 relative">
            <Reveal as="div" className="flex items-center gap-3 mb-10">
              <span className="h-px w-12 bg-[var(--eco-flame)]" />
              <span className="eco-mono text-[var(--eco-flame)]">N° 001 / VOLUMEN ÚNICO</span>
            </Reveal>

            <h1 className="eco-display text-[64px] sm:text-[88px] md:text-[120px] xl:text-[152px] text-[var(--eco-ink)]">
              <span className="block">
                <WordReveal text="Pides" />
              </span>
              <span className="block -mt-2 md:-mt-4">
                <WordReveal text="tu carro" delay={0.18} />
              </span>
              <span className="block eco-display-italic text-[var(--eco-flame)] -mt-2 md:-mt-4 pl-[18%]">
                <WordReveal text="como pides" delay={0.34} />
              </span>
              <span className="block eco-display-italic text-[var(--eco-flame)] -mt-2 md:-mt-4 pl-[36%]">
                <WordReveal text="delivery." delay={0.5} />
              </span>
            </h1>

            <Reveal delay={0.85} className="mt-10 max-w-md text-[17px] md:text-[18px] text-[var(--eco-ink-soft)] leading-[1.55]">
              <p>
                El primer servicio de movilidad <strong className="text-[var(--eco-ink)]">100% por WhatsApp</strong> en Perú.
                Sin app, sin descargas, sin trámites. <span className="eco-display-italic text-[var(--eco-flame-soft)]">Solo dile Hola</span> al bot Eco.
              </p>
            </Reveal>

            <Reveal delay={1.05} className="mt-12 flex flex-col sm:flex-row gap-4">
              <Magnetic strength={0.35}>
                <a
                  href={PASAJERO_WA}
                  className="group inline-flex items-center justify-center gap-3 px-9 py-5 rounded-full bg-[var(--eco-flame)] text-[var(--eco-bg-deep)] font-semibold eco-mono hover:bg-[var(--eco-flame-soft)] transition-colors"
                >
                  Pedir mi primer viaje
                  <svg viewBox="0 0 24 24" className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </a>
              </Magnetic>
              <Magnetic strength={0.25}>
                <a
                  href={CHOFER_WA}
                  className="inline-flex items-center justify-center gap-2 px-8 py-5 rounded-full border border-[var(--eco-line-strong)] text-[var(--eco-ink-soft)] eco-mono hover:border-[var(--eco-flame)] hover:text-[var(--eco-flame)] transition-colors"
                >
                  Ser chofer
                </a>
              </Magnetic>
            </Reveal>

            <Reveal delay={1.2} className="mt-12 flex flex-wrap gap-x-8 gap-y-2 eco-mono text-[var(--eco-ink-mute)]">
              <span>⌗ 30 s respuesta</span>
              <span>⌗ Yape al toque</span>
              <span>⌗ Choferes verificados</span>
              <span>⌗ 24 / 7 — sin pausa</span>
            </Reveal>
          </div>

          {/* Lado derecho — chat mockup elevado y rotado, con estrella sigil de fondo */}
          <div className="lg:col-span-5 relative">
            <div aria-hidden className="absolute -inset-10 eco-mesh rounded-[48px] opacity-50 blur-2xl" />
            {/* SLOT A — Estrella sigil gigante detras del chat */}
            <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] opacity-[0.45] eco-spin-slow pointer-events-none -z-10">
              <div className="eco-halo" />
              <div className="relative w-full h-full eco-sigil" />
            </div>
            <ChatMockup />
            <Reveal delay={1.4} className="mt-6 eco-mono text-center text-[var(--eco-ink-mute)]">
              <span className="text-[var(--eco-flame)]">●</span> Conversación reconstruida — 12 segundos de Hola a chofer asignado
            </Reveal>
          </div>
        </div>

        {/* Marquee de pueblos servidos */}
        <Reveal delay={1.5} className="mt-20 overflow-hidden border-y border-[var(--eco-line)] py-6">
          <div className="eco-marquee eco-mono text-[var(--eco-ink-mute)]">
            {Array.from({ length: 2 }).flatMap((_, i) =>
              ["Trujillo Centro", "Huanchaco", "Víctor Larco", "Moche", "Salaverry", "El Porvenir", "La Esperanza", "Florencia de Mora", "Buenos Aires", "California", "Las Quintanas"].map((p) => (
                <span key={`${i}-${p}`} className="inline-flex items-center gap-3">
                  <span className="text-[var(--eco-flame)]">✦</span> {p}
                </span>
              ))
            )}
          </div>
        </Reveal>
      </section>

      {/* === STATS === */}
      <section className="relative py-24 md:py-32 border-t border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-16">
            <Reveal>
              <div className="eco-mono text-[var(--eco-ink-mute)] mb-4">— 01 / Choferes</div>
              <div className="eco-display text-[72px] md:text-[96px] text-[var(--eco-ink)]">
                <CountUp end={88} />
              </div>
              <div className="eco-mono mt-3 text-[var(--eco-ink-soft)]">Verificados activos</div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="eco-mono text-[var(--eco-ink-mute)] mb-4">— 02 / Pasajeros</div>
              <div className="eco-display text-[72px] md:text-[96px] text-[var(--eco-ink)]">
                <CountUp end={231} />
              </div>
              <div className="eco-mono mt-3 text-[var(--eco-ink-soft)]">Cuentas con viaje</div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="eco-mono text-[var(--eco-ink-mute)] mb-4">— 03 / Comisión</div>
              <div className="eco-display text-[72px] md:text-[96px] text-[var(--eco-flame)]">
                <CountUp end={6.3} decimals={1} suffix="%" />
              </div>
              <div className="eco-mono mt-3 text-[var(--eco-ink-soft)]">La más baja del Perú</div>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="eco-mono text-[var(--eco-ink-mute)] mb-4">— 04 / Disponibilidad</div>
              <div className="eco-display text-[72px] md:text-[96px] text-[var(--eco-ink)]">24/7</div>
              <div className="eco-mono mt-3 text-[var(--eco-ink-soft)]">Sin pausa, sin app</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* === MANIFESTO === */}
      <section id="manifesto" className="relative py-32 md:py-48 border-t border-[var(--eco-line)]">
        <div aria-hidden className="hidden lg:block absolute left-6 top-32 eco-label-vertical">
          02 — MANIFIESTO
        </div>
        <div className="mx-auto max-w-4xl px-6 lg:px-24">
          <Reveal>
            <div className="eco-mono text-[var(--eco-flame)] mb-8">— Manifiesto Eco</div>
            <p className="eco-display text-[36px] md:text-[48px] xl:text-[56px] leading-[1.05] text-[var(--eco-ink)] eco-dropcap">
              No nacimos para competir con Uber. Nacimos para que un chofer trujillano deje de
              entregar <span className="eco-display-italic text-[var(--eco-flame)]">un cuarto de su día</span> a una app que le cobra desde San Francisco. Aquí
              te quedas con el 93.7%. Aquí pagas por WhatsApp. Aquí, cuando ganas, tu familia gana.
            </p>
            <p className="mt-10 eco-mono text-[var(--eco-ink-mute)]">
              — Trujillo, La Libertad. Hecho por choferes, para choferes y para quien quiera llegar a tiempo.
            </p>
            {/* SLOT B — logo completo como firma editorial */}
            <div className="mt-16 flex justify-end items-center gap-6">
              <span className="eco-mono text-[var(--eco-ink-mute)]">firma</span>
              <span className="h-px w-16 bg-[var(--eco-line-strong)]" />
              <div
                role="img"
                aria-label="EcoDrive+"
                className="h-16 md:h-20 w-[260px] md:w-[320px] eco-wordmark bg-left opacity-90"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* === BANDA CINEMÁTICA — CIUDAD === */}
      <section className="relative h-[60vh] md:h-[75vh] min-h-[420px] border-y border-[var(--eco-line)]">
        <CinematicImage src="/ecodriveplus/hero-city.jpg" motion="both" parallaxRange={120} className="absolute inset-0">
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.25) 50%, rgba(10,9,8,0.85) 100%)" }} />
          <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 50% 60%, rgba(224,136,33,0.18), transparent 70%)" }} />
        </CinematicImage>
        <div className="relative h-full mx-auto max-w-[1400px] px-6 lg:px-24 flex flex-col justify-end pb-16 md:pb-24">
          <Reveal>
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— Intermezzo</div>
            <h3 className="eco-display text-[44px] sm:text-[64px] md:text-[96px] leading-[0.95] text-[var(--eco-ink)] max-w-4xl">
              Pediste delivery hoy.<br />
              <span className="eco-display-italic text-[var(--eco-flame)]">¿Por qué no tu carro?</span>
            </h3>
            <p className="mt-6 max-w-xl eco-mono text-[var(--eco-ink-soft)]">
              La ciudad ya está conectada. Solo falta que tu próximo viaje también lo esté.
            </p>
          </Reveal>
        </div>
      </section>

      {/* === CÓMO OPERA === */}
      <section id="como" className="relative py-32 border-t border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24">
          <Reveal className="mb-20">
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— 03 / Operación</div>
            <h2 className="eco-display text-[56px] md:text-[88px] leading-[0.95] text-[var(--eco-ink)] max-w-3xl">
              Cuatro pasos. <span className="eco-display-italic text-[var(--eco-flame)]">Doce segundos.</span> Tu carro en camino.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-4 gap-8 relative">
            <div aria-hidden className="hidden md:block absolute top-12 left-[6%] right-[6%] h-px bg-gradient-to-r from-transparent via-[var(--eco-flame)] to-transparent opacity-40" />
            {[
              ["01", "Dile Hola", "Por WhatsApp. Eco te saluda y pregunta a dónde vas."],
              ["02", "Comparte ubicación", "Clip 📎 → Ubicación. Eco identifica al toque."],
              ["03", "Elige chofer", "3 ofertas con foto, vehículo, rating y precio. Tú decides."],
              ["04", "Listo", "Llega tu chofer. Pagas con BilleteraEco o efectivo. 2 % de retorno."],
            ].map(([code, title, desc], i) => (
              <Reveal key={code} delay={i * 0.12} className="relative pt-12">
                <div className="absolute -top-2 left-0 eco-mono text-[var(--eco-flame)]">PASO {code}</div>
                <div className="absolute top-8 left-0 h-px w-8 bg-[var(--eco-flame)]" />
                <h3 className="eco-display text-[32px] md:text-[40px] text-[var(--eco-ink)] mt-6">{title}</h3>
                <p className="mt-4 text-[var(--eco-ink-soft)] leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* === SERVICIOS === */}
      <section className="relative py-32 border-t border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24">
          <Reveal className="mb-16 grid md:grid-cols-2 gap-12 items-end">
            <div>
              <div className="eco-mono text-[var(--eco-flame)] mb-4">— 04 / Cinco servicios</div>
              <h2 className="eco-display text-[56px] md:text-[88px] leading-[0.95] text-[var(--eco-ink)]">
                Pides el que <span className="eco-display-italic text-[var(--eco-flame)]">necesitas.</span>
              </h2>
            </div>
            <p className="text-[var(--eco-ink-soft)] leading-relaxed max-w-md">
              El bot filtra al chofer correcto automáticamente. Lunas polarizadas <em className="eco-display-italic text-[var(--eco-flame)]">sin recargo extra</em> — privacidad sin pagar de más.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-px bg-[var(--eco-line)] border border-[var(--eco-line)]">
            {SERVICIOS.map((s, i) => (
              <Reveal key={s.code} delay={i * 0.08} className="bg-[var(--eco-bg)] p-8 eco-card cursor-pointer">
                <div className="eco-mono text-[var(--eco-flame)]">{s.code}</div>
                <div className="eco-display text-[32px] md:text-[40px] text-[var(--eco-ink)] mt-6">{s.name}</div>
                <div className="mt-4 text-sm text-[var(--eco-ink-soft)] leading-snug">{s.criterio}</div>
                <div className="mt-8 eco-mono text-[var(--eco-ink)]">Tarifa · <span className="text-[var(--eco-flame)]">{s.tarifa}</span></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* === BANDA CINEMÁTICA — AUTO MODERNO === */}
      <section className="relative h-[52vh] md:h-[68vh] min-h-[380px] border-y border-[var(--eco-line)]">
        <CinematicImage src="/ecodriveplus/auto-moderno.jpg" motion="both" parallaxRange={120} className="absolute inset-0">
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(10,9,8,0.92) 0%, rgba(10,9,8,0.55) 45%, transparent 100%)" }} />
        </CinematicImage>
        <div className="relative h-full mx-auto max-w-[1400px] px-6 lg:px-24 flex flex-col justify-center">
          <Reveal className="max-w-xl">
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— Intermezzo · Servicio</div>
            <h3 className="eco-display text-[42px] sm:text-[56px] md:text-[80px] leading-[0.95] text-[var(--eco-ink)]">
              El carro <span className="eco-display-italic text-[var(--eco-flame)]">correcto</span> para ti.
            </h3>
            <p className="mt-6 eco-mono text-[var(--eco-ink-soft)]">
              Normal · Premium · VIP · XL · Encomienda. Tú eliges, Eco filtra.
            </p>
          </Reveal>
        </div>
      </section>

      {/* === NIVELES === */}
      <section id="niveles" className="relative py-32 border-t border-[var(--eco-line)]">
        <div aria-hidden className="hidden lg:block absolute left-6 top-32 eco-label-vertical">
          05 — JERARQUÍA · 9 ESCALONES
        </div>
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24">
          <Reveal className="mb-20">
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— 05 / Niveles</div>
            <h2 className="eco-display text-[56px] md:text-[88px] leading-[0.95] text-[var(--eco-ink)] max-w-4xl">
              Mientras más viajas, <span className="eco-display-italic text-[var(--eco-flame)]">más ganas.</span>
            </h2>
            <p className="mt-8 max-w-2xl text-[var(--eco-ink-soft)] leading-relaxed">
              Nueve escalones para pasajeros y nueve para conductores. Una vez subes, nunca bajas.
              La recompensa se compone como un mosaico — cuanto más arriba, más se abre.
            </p>
          </Reveal>

          {/* Tabla pasajero */}
          <Reveal>
            <div className="flex items-baseline justify-between mb-6">
              <h3 className="eco-display text-[36px] md:text-[48px] text-[var(--eco-ink)]">Pasajero</h3>
              <span className="eco-mono text-[var(--eco-ink-mute)]">recompensa por viaje</span>
            </div>
            <div className="overflow-x-auto eco-no-scrollbar border-y border-[var(--eco-line-strong)]">
              <table className="w-full text-sm md:text-base">
                <thead>
                  <tr className="border-b border-[var(--eco-line)]">
                    <th className="text-left py-4 eco-mono text-[var(--eco-ink-mute)]">Nivel</th>
                    <th className="text-right py-4 eco-mono text-[var(--eco-ink-mute)]">Servicios</th>
                    <th className="text-right py-4 eco-mono text-[var(--eco-ink-mute)]">Recompensa</th>
                    <th className="text-right py-4 eco-mono text-[var(--eco-ink-mute)] pr-2">Cancelaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {NIVELES_PASAJERO.map((row) => (
                    <tr key={row[0]} className="border-b border-[var(--eco-line)] hover:bg-[var(--eco-bg-soft)] transition-colors">
                      <td className="py-4 eco-display text-[22px] md:text-[26px] text-[var(--eco-ink)]">{row[0]}</td>
                      <td className="py-4 text-right text-[var(--eco-ink-soft)] eco-mono-md">{row[1]}</td>
                      <td className="py-4 text-right text-[var(--eco-flame)] eco-mono-md">{row[2]}</td>
                      <td className="py-4 text-right text-[var(--eco-ink-soft)] eco-mono-md pr-2">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          {/* Tabla chofer */}
          <Reveal className="mt-24">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className="eco-display text-[36px] md:text-[48px] text-[var(--eco-ink)]">Conductor</h3>
              <span className="eco-mono text-[var(--eco-ink-mute)]">comisión 6.3 % → 3.9 %</span>
            </div>
            <div className="overflow-x-auto eco-no-scrollbar border-y border-[var(--eco-line-strong)]">
              <table className="w-full text-sm md:text-base">
                <thead>
                  <tr className="border-b border-[var(--eco-line)]">
                    <th className="text-left py-4 eco-mono text-[var(--eco-ink-mute)]">Nivel</th>
                    <th className="text-right py-4 eco-mono text-[var(--eco-ink-mute)]">Servicios</th>
                    <th className="text-right py-4 eco-mono text-[var(--eco-ink-mute)]">Comisión</th>
                    <th className="text-right py-4 eco-mono text-[var(--eco-ink-mute)]">Bono mes</th>
                    <th className="text-left py-4 pl-6 eco-mono text-[var(--eco-ink-mute)]">Beneficios</th>
                  </tr>
                </thead>
                <tbody>
                  {NIVELES_CHOFER.map((row) => (
                    <tr key={row[0]} className="border-b border-[var(--eco-line)] hover:bg-[var(--eco-bg-soft)] transition-colors align-top">
                      <td className="py-4 eco-display text-[22px] md:text-[26px] text-[var(--eco-ink)] whitespace-nowrap">{row[0]}</td>
                      <td className="py-4 text-right text-[var(--eco-ink-soft)] eco-mono-md whitespace-nowrap">{row[1]}</td>
                      <td className="py-4 text-right text-[var(--eco-flame)] eco-mono-md whitespace-nowrap">{row[2]}</td>
                      <td className="py-4 text-right text-[var(--eco-cream)] eco-mono-md whitespace-nowrap">{row[3]}</td>
                      <td className="py-4 pl-6 text-[var(--eco-ink-soft)] text-sm leading-relaxed">{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 eco-mono text-[var(--eco-ink-mute)] leading-loose">
              ⌗ Bono mensual abonado el último día del mes a conductores activos (≥10 servicios).<br />
              ⌗ Préstamos sin intereses con descuento diario prorrateado.<br />
              ⌗ Activos digitales: Miss Sofia · TuDestinoYa · TuNoviaIA · TuPedidoYa · TuReservaYa.<br />
              ⌗ Una vez subes de nivel, nunca bajas.
            </p>
          </Reveal>
        </div>
      </section>

      {/* === PICHANGA ECO === */}
      <section className="relative py-32 border-t border-[var(--eco-line)] overflow-hidden">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24 grid lg:grid-cols-12 gap-12 items-center">
          <Reveal className="lg:col-span-7">
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— 06 / Programa de salud</div>
            <h2 className="eco-display text-[56px] md:text-[88px] leading-[0.95] text-[var(--eco-ink)]">
              Pichanga <span className="eco-display-italic text-[var(--eco-flame)]">Eco.</span>
            </h2>
            <p className="mt-8 max-w-md text-[var(--eco-ink-soft)] leading-relaxed">
              Único en LATAM: cuidamos la salud de nuestros conductores. Pagamos cancha,
              bebidas y agua para que jueguen una vez al mes con choferes de su zona.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                ["Fútbol", "8 v 8 · sintética · sábados"],
                ["Vóley", "Menos contacto · mismo apoyo"],
                ["Billar", "Grupos de 2 a 4 · frente a la mesa"],
              ].map(([n, d], i) => (
                <Reveal key={n} delay={i * 0.1} className="border border-[var(--eco-line)] p-5 eco-card">
                  <div className="eco-display text-[26px] text-[var(--eco-ink)]">{n}</div>
                  <div className="mt-3 eco-mono text-[var(--eco-ink-mute)] leading-relaxed">{d}</div>
                </Reveal>
              ))}
            </div>
            <div className="mt-10 inline-flex items-center gap-3 eco-mono text-[var(--eco-flame)]">
              <span className="h-px w-10 bg-[var(--eco-flame)]" />
              Mientras más activo, más beneficios: chequeo médico, polos, bonos.
            </div>
          </Reveal>

          <Reveal delay={0.2} className="lg:col-span-5">
            {/* SLOT C — Foto cinematica del chofer (Ken Burns + parallax) + sigil estrella + eslogan */}
            <CinematicImage src="/ecodriveplus/chofer.jpg" motion="both" parallaxRange={80} className="rounded-3xl aspect-[4/5]">
              <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,9,8,0.15) 0%, rgba(10,9,8,0.40) 55%, rgba(10,9,8,0.92) 100%)" }} />
              <div aria-hidden className="absolute top-6 right-6 w-14 h-14 eco-sigil opacity-90 eco-spin-slow" />
              <div className="relative z-10 h-full flex flex-col justify-end p-8 md:p-10">
                <div className="eco-mono text-[var(--eco-flame)] mb-3">— Vista desde el volante</div>
                <div className="eco-display-italic text-[28px] md:text-[36px] text-[var(--eco-ink)] leading-[1.1] max-w-sm">
                  Mejorando familias, transformando ciudades.
                </div>
              </div>
            </CinematicImage>
          </Reveal>
        </div>
      </section>

      {/* === COMPARATIVA === */}
      <section id="contra" className="relative py-32 border-t border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24">
          <Reveal className="mb-20">
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— 07 / Contraste</div>
            <h2 className="eco-display text-[56px] md:text-[96px] leading-[0.95] text-[var(--eco-ink)] max-w-4xl">
              EcoDrive+ <span className="eco-display-italic text-[var(--eco-flame)]">vs.</span> los demás.
            </h2>
          </Reveal>

          <div className="border-y border-[var(--eco-line-strong)] divide-y divide-[var(--eco-line)]">
            <div className="grid grid-cols-5 py-5 eco-mono text-[var(--eco-ink-mute)]">
              <div className="col-span-1">Servicio</div>
              <div className="text-right">Comisión</div>
              <div className="text-right">Tiempo</div>
              <div className="text-right">Plataforma</div>
              <div className="text-right">Pago</div>
            </div>
            {[
              ["Uber", "25–30 %", "60–90 s", "App requerida", "Semanal"],
              ["InDriver", "10–15 %", "3–5 min", "App requerida", "Variable"],
              ["DiDi", "20–25 %", "60–90 s", "App requerida", "Semanal"],
            ].map(([n, c, t, p, pa]) => (
              <Reveal key={n} className="grid grid-cols-5 py-6 items-center text-[var(--eco-ink-soft)] eco-mono-md">
                <div className="col-span-1 eco-display text-[26px] md:text-[34px] text-[var(--eco-ink-soft)] opacity-60">{n}</div>
                <div className="text-right">{c}</div>
                <div className="text-right">{t}</div>
                <div className="text-right">{p}</div>
                <div className="text-right">{pa}</div>
              </Reveal>
            ))}
            <Reveal className="grid grid-cols-5 py-8 items-center text-[var(--eco-ink)] eco-mono-md bg-[var(--eco-flame)]/[0.04]">
              <div className="col-span-1 eco-display text-[28px] md:text-[40px] text-[var(--eco-flame)]">EcoDrive+</div>
              <div className="text-right text-[var(--eco-flame)] font-semibold">6.3 %</div>
              <div className="text-right text-[var(--eco-flame)] font-semibold">12 s</div>
              <div className="text-right">WhatsApp · sin app</div>
              <div className="text-right">Yape al toque</div>
            </Reveal>
          </div>
          <p className="mt-6 eco-mono text-[var(--eco-ink-mute)]">⌗ Datos referenciales basados en publicaciones públicas de cada plataforma.</p>
        </div>
      </section>

      {/* === CHOFERES === */}
      <section id="choferes" className="relative py-32 border-t border-[var(--eco-line)] overflow-hidden">
        {/* Imagen lateral cinematica EV con Ken Burns + parallax */}
        <CinematicImage src="/ecodriveplus/ev-modern.jpg" motion="both" parallaxRange={60} className="absolute top-12 right-0 w-[42%] h-[420px] hidden lg:block rounded-l-3xl">
          <div className="absolute inset-0" style={{ background: "linear-gradient(270deg, transparent 0%, rgba(10,9,8,0.55) 70%, rgba(10,9,8,1) 100%)" }} />
          <div className="absolute bottom-6 right-6 eco-mono text-[var(--eco-cream)] z-10">— Energía limpia · BilleteraEco</div>
        </CinematicImage>
        <div className="relative mx-auto max-w-[1400px] px-6 lg:px-24 grid lg:grid-cols-12 gap-y-16 lg:gap-x-12">
          <Reveal className="lg:col-span-5">
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— 08 / Para choferes</div>
            <h2 className="eco-display text-[56px] md:text-[88px] leading-[0.95] text-[var(--eco-ink)]">
              Cobras directo,<br />
              <span className="eco-display-italic text-[var(--eco-flame)]">retiras por Yape.</span>
            </h2>
            <p className="mt-8 max-w-md text-[var(--eco-ink-soft)] leading-relaxed">
              BilleteraEco recibe el pago al instante. Tú decides cuándo retiras — al toque,
              en la noche, fin de semana. Sin esperar al lunes para que otra app te suelte la plata.
            </p>
            <div className="mt-10">
              <Magnetic strength={0.3}>
                <a href={CHOFER_WA} className="inline-flex items-center gap-3 px-8 py-5 rounded-full bg-[var(--eco-flame)] text-[var(--eco-bg-deep)] font-semibold eco-mono hover:bg-[var(--eco-flame-soft)] transition-colors">
                  Quiero ser chofer EcoDrive+
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </a>
              </Magnetic>
            </div>
          </Reveal>

          <div className="lg:col-span-7 grid sm:grid-cols-3 gap-px bg-[var(--eco-line)] border border-[var(--eco-line)]">
            {[
              ["Welcome", "S/. 30", "EcoCredit inicial al aprobarte. Lo descuentas despacio de comisiones."],
              ["Comisión", "6.3 %", "vs InDrive/DiDi 25 %. Más plata para ti."],
              ["Precio", "Libre", "Sin tarifa fija. Tú pones tu oferta y compites."],
            ].map(([label, value, desc], i) => (
              <Reveal key={label} delay={i * 0.12} className="bg-[var(--eco-bg)] p-8 eco-card cursor-pointer flex flex-col justify-between min-h-[280px]">
                <div className="eco-mono text-[var(--eco-flame)]">— {label}</div>
                <div>
                  <div className="eco-display text-[64px] md:text-[80px] leading-none text-[var(--eco-ink)]">{value}</div>
                  <div className="mt-4 eco-mono text-[var(--eco-ink-mute)] leading-relaxed">{desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* === TESTIMONIOS === */}
      <section className="relative py-32 border-t border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24">
          <Reveal className="mb-20">
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— 09 / Voces reales</div>
            <h2 className="eco-display text-[56px] md:text-[88px] leading-[0.95] text-[var(--eco-ink)]">
              Lo dicen los <span className="eco-display-italic text-[var(--eco-flame)]">de adentro.</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {TESTIMONIOS.map((t, i) => (
              <Reveal key={t.who} delay={i * 0.1} className="relative">
                <div aria-hidden className="eco-display text-[120px] leading-none text-[var(--eco-flame)] opacity-30 absolute -top-12 -left-4">&ldquo;</div>
                <p className="relative eco-display text-[24px] md:text-[28px] leading-[1.15] text-[var(--eco-ink)]">
                  {t.quote}
                </p>
                <div className="mt-8 eco-mono text-[var(--eco-flame)]">— {t.who}</div>
                <div className="mt-1 eco-mono text-[var(--eco-ink-mute)]">{t.role}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* === BANDA CINEMÁTICA — CIUDAD AÉREA NOCTURNA === */}
      <section className="relative h-[55vh] md:h-[68vh] min-h-[380px] border-y border-[var(--eco-line)]">
        <CinematicImage src="/ecodriveplus/ciudad-aerial.jpg" motion="both" parallaxRange={140} className="absolute inset-0">
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,9,8,0.45) 0%, rgba(10,9,8,0.20) 45%, rgba(10,9,8,0.85) 100%)" }} />
          <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 30% 60%, rgba(224,136,33,0.20), transparent 70%)" }} />
        </CinematicImage>
        <div className="relative h-full mx-auto max-w-[1400px] px-6 lg:px-24 flex flex-col justify-end pb-16 md:pb-24">
          <Reveal className="max-w-2xl">
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— Intermezzo · Cobertura</div>
            <h3 className="eco-display text-[44px] sm:text-[60px] md:text-[88px] leading-[0.95] text-[var(--eco-ink)]">
              Cada luz que ves <span className="eco-display-italic text-[var(--eco-flame)]">ya pidió un viaje.</span>
            </h3>
            <p className="mt-6 max-w-md eco-mono text-[var(--eco-ink-soft)]">
              Trujillo empieza. Lima sigue. La movilidad sin app llega a más ciudades cada mes.
            </p>
          </Reveal>
        </div>
      </section>

      {/* === FAQ === */}
      <section className="relative py-32 border-t border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1100px] px-6 lg:px-24 grid lg:grid-cols-12 gap-12">
          <Reveal className="lg:col-span-4">
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— 10 / Dudas</div>
            <h2 className="eco-display text-[56px] md:text-[72px] leading-[0.95] text-[var(--eco-ink)]">
              Preguntas <span className="eco-display-italic text-[var(--eco-flame)]">frecuentes.</span>
            </h2>
            <p className="mt-8 text-[var(--eco-ink-soft)] leading-relaxed eco-mono text-[var(--eco-ink-mute)]">
              ⌗ ¿Algo que falta? Escribe a Eco directo.
            </p>
          </Reveal>

          <div className="lg:col-span-8 divide-y divide-[var(--eco-line)] border-y border-[var(--eco-line)]">
            {FAQS.map(([q, a], i) => (
              <details key={i} className="group py-8">
                <summary className="flex items-start justify-between gap-6 cursor-pointer list-none">
                  <h3 className="eco-display text-[24px] md:text-[32px] leading-tight text-[var(--eco-ink)] group-hover:text-[var(--eco-flame-soft)] transition-colors">
                    {q}
                  </h3>
                  <span className="eco-mono text-[var(--eco-flame)] mt-2 group-open:rotate-45 transition-transform duration-500">＋</span>
                </summary>
                <div className="mt-6 text-[var(--eco-ink-soft)] leading-relaxed max-w-3xl">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA FINAL === */}
      <section className="relative py-40 border-t border-[var(--eco-line)] overflow-hidden">
        {/* Background cinematico ciudad nocturna con Ken Burns + parallax */}
        <CinematicImage src="/ecodriveplus/noche.jpg" motion="both" parallaxRange={100} className="absolute inset-0">
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,9,8,0.85) 0%, rgba(10,9,8,0.70) 40%, rgba(10,9,8,0.95) 100%)" }} />
          <div aria-hidden className="absolute inset-0 eco-mesh opacity-60" />
        </CinematicImage>
        {/* SLOT D — Logo completo como watermark gigante de fondo */}
        <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[120%] md:w-[90%] h-[80%] eco-wordmark opacity-[0.12]" />
        </div>
        {/* Estrella spinning detras del headline */}
        <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] md:w-[560px] md:h-[560px] opacity-[0.22] eco-spin-slow-rev pointer-events-none">
          <div className="w-full h-full eco-sigil" />
        </div>
        <div className="relative mx-auto max-w-[1400px] px-6 lg:px-24 text-center">
          <Reveal>
            <div className="eco-mono text-[var(--eco-flame)] mb-8">— Fin del prólogo</div>
            <h2 className="eco-display text-[64px] md:text-[120px] xl:text-[160px] leading-[0.9] text-[var(--eco-ink)]">
              Tu próximo viaje<br />
              empieza con un <span className="eco-display-italic text-[var(--eco-flame)]">Hola.</span>
            </h2>
            <p className="mt-12 text-[var(--eco-ink-soft)] eco-mono">
              No descargues nada · Solo WhatsApp · Trujillo hoy · Lima pronto.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <Magnetic strength={0.35}>
                <a href={PASAJERO_WA} className="inline-flex items-center justify-center gap-3 px-9 py-5 rounded-full bg-[var(--eco-flame)] hover:bg-[var(--eco-flame-soft)] text-[var(--eco-bg-deep)] font-semibold eco-mono transition-colors">
                  Pedir mi primer viaje
                </a>
              </Magnetic>
              <Magnetic strength={0.25}>
                <a href={CHOFER_WA} className="inline-flex items-center justify-center gap-2 px-8 py-5 rounded-full border border-[var(--eco-flame)] text-[var(--eco-flame)] hover:bg-[var(--eco-flame)]/10 eco-mono transition-colors">
                  Ser chofer
                </a>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="relative py-16 border-t border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24 grid md:grid-cols-3 gap-8 items-center">
          <div className="flex items-center gap-3">
            <div role="img" aria-label="EcoDrive+" className="h-8 w-8 bg-[url('/ecodriveplus/icon.png')] bg-contain bg-no-repeat bg-center" />
            <div className="eco-mono text-[var(--eco-ink-soft)]">
              EcoDrive+ © 2026 — Hecho en <span className="text-[var(--eco-flame)]">Trujillo, Perú</span>
            </div>
          </div>
          <div className="text-center">
            <TrujilloClock />
          </div>
          <div className="flex items-center justify-end gap-8 eco-mono">
            <Link href="/" className="text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)] transition-colors">ActivosYA</Link>
            <Link href="/ecodriveplus/garaje" className="text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)] transition-colors">Garaje</Link>
            <Link href="/ecodriveplus/sorteos" className="text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)] transition-colors">Sorteos</Link>
            <a href={PASAJERO_WA} className="text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)] transition-colors">Soporte</a>
          </div>
        </div>
      </footer>

      {/* === FLOATING WHATSAPP === */}
      <a
        href={PASAJERO_WA}
        aria-label="Hablar con Eco por WhatsApp"
        className="fixed bottom-6 right-6 z-40 group"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
        <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#22C35E] shadow-2xl shadow-[#25D366]/40 transition transform group-hover:scale-110">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </span>
      </a>
    </main>
  );
}
