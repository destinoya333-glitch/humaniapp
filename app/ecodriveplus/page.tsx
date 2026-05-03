import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";

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

export default function EcoDrivePlusPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden">
      {/* === Pixel Meta === */}
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

      {/* === GA4 === */}
      {GA4_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}');`}
          </Script>
        </>
      )}

      {/* === Schema.org === */}
      <Script id="schema-org" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "EcoDrive+",
          url: "https://ecodriveplus.com",
          logo: "https://ecodriveplus.com/ecodrive-logo.png",
          description: "Servicio de transporte 100% por WhatsApp. Sin app. Comisión 6.3% para choferes.",
          areaServed: { "@type": "City", name: "Trujillo, Perú" },
          contactPoint: { "@type": "ContactPoint", telephone: "+51-994-810-242", contactType: "Customer Service", availableLanguage: "Spanish" },
        })}
      </Script>

      {/* === Background mesh decorativo === */}
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-orange-500/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-amber-500/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* === HEADER STICKY === */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0A]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-40 md:h-48 flex items-center justify-between">
          <Link href="/ecodriveplus" className="flex items-center gap-3 group">
            <Image
              src="/ecodrive-logo.png"
              alt="EcoDrive+"
              width={420}
              height={148}
              priority
              className="h-32 w-auto md:h-40 object-contain group-hover:scale-105 transition-transform"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#como-funciona" className="hover:text-white transition">Cómo funciona</a>
            <a href="#comparativa" className="hover:text-white transition">Compara</a>
            <a href="#choferes" className="hover:text-white transition">Choferes</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>
          <a
            href={PASAJERO_WA}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] hover:bg-[#22C35E] text-white text-sm font-semibold shadow-lg shadow-[#25D366]/30 transition transform hover:-translate-y-0.5"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Hablar con Eco</span>
          </a>
        </div>
      </header>

      {/* === HERO === */}
      <section className="relative px-6 pt-12 md:pt-20 pb-20">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Lado izquierdo: copy */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/5 text-orange-400 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
              </span>
              ACTIVO EN TRUJILLO · 88 conductores · 231 clientes
            </div>

            <h1 className="mt-6 text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight">
              Pides tu carro
              <br />
              como pides{" "}
              <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                delivery
              </span>
            </h1>

            <p className="mt-6 text-lg text-zinc-300 leading-relaxed max-w-xl">
              El primer servicio de movilidad <strong className="text-white">100% por WhatsApp</strong> en
              Perú. Sin app, sin descargas, sin trámites. Solo dile{" "}
              <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-300 font-semibold">
                Hola
              </span>{" "}
              al bot Eco.
            </p>

            {/* CTA principal */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={PASAJERO_WA}
                className="group relative inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-[#25D366] hover:bg-[#22C35E] text-white font-bold shadow-xl shadow-[#25D366]/30 transition transform hover:-translate-y-1"
              >
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition" />
                <WhatsAppIcon className="w-6 h-6" />
                Hablar con Eco AHORA
              </a>
              <a
                href={CHOFER_WA}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 text-white font-semibold transition"
              >
                💼 Ser chofer
              </a>
            </div>

            <div className="mt-4 text-sm text-zinc-500">
              ⚡ Te respondemos en menos de 30 segundos · 24/7
            </div>

            {/* Trust pills */}
            <div className="mt-8 flex flex-wrap gap-2">
              <Pill>🛡️ Choferes verificados</Pill>
              <Pill>💰 Bono S/.5 BilleteraEco</Pill>
              <Pill>📍 GPS en vivo</Pill>
              <Pill>⚡ 12 segundos para pedir</Pill>
            </div>
          </div>

          {/* Lado derecho: mockup chat WhatsApp */}
          <div className="relative">
            <ChatMockup />
          </div>
        </div>
      </section>

      {/* === STATS BAR === */}
      <section className="relative border-y border-white/5 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5">
        <div className="mx-auto max-w-6xl px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <Stat n="88" label="Conductores" />
          <Stat n="231" label="Clientes" />
          <Stat n="6.3%" label="Comisión más baja" highlight />
          <Stat n="24/7" label="Disponibilidad" />
        </div>
      </section>

      {/* === VIDEOS LANZAMIENTO — OCULTO HASTA RELANZAMIENTO CON FLOWS === */}
      {false && (
      <section id="videos" className="relative px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeader badge="LANZAMIENTO" title="Mira EcoDrive+ en acción" subtitle="Dos formas de empezar. Elige la tuya en 24 segundos." />

          <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <VideoCard
              audience="Para pasajeros"
              title="Pides tu taxi por WhatsApp"
              desc="Sin descargas, sin registros, en 12 segundos."
              videoUrl="https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/ecodrive-videos/pasajero_final.mp4"
              poster="https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/ecodrive-content/pilar_tutorial.png"
              ctaText="🚗 Pedir mi primer viaje"
              ctaUrl={PASAJERO_WA}
              ctaStyle="primary"
            />
            <VideoCard
              audience="Para choferes"
              title="La comisión más baja del Perú"
              desc="Más viajes, más ganancia, sin nada que descargar."
              videoUrl="https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/ecodrive-videos/chofer_final.mp4"
              poster="https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/ecodrive-content/pilar_comision_choferes.png"
              ctaText="💼 Quiero ser chofer"
              ctaUrl={CHOFER_WA}
              ctaStyle="outline"
            />
          </div>
        </div>
      </section>
      )}

      {/* === 3 VENTAJAS === */}
      <section className="relative px-6 py-20 border-t border-white/5">
        <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-6">
          <FeatureCard icon="📲" title="Sin app" desc="Solo WhatsApp. Nada que descargar. Funciona en cualquier celular, sin actualizaciones." />
          <FeatureCard icon="💰" title="Sin tarifa fija" desc="Recibes 3 ofertas con precios distintos. Eliges la que más te conviene." />
          <FeatureCard icon="⭐" title="Modo a tu medida" desc="Mujer, Familia, Mascotas, Abuelo, Empresa. El chofer correcto para ti." />
        </div>
      </section>

      {/* === CÓMO FUNCIONA === */}
      <section id="como-funciona" className="relative px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-6xl">
          <SectionHeader title="Así de simple" subtitle="4 pasos. 12 segundos. Tu carro en camino." />
          <div className="mt-14 grid md:grid-cols-4 gap-6 relative">
            <div aria-hidden className="hidden md:block absolute top-8 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
            <Step n={1} title="Dile Hola" desc="Por WhatsApp. Eco te saluda y pregunta a dónde vas." />
            <Step n={2} title="Comparte ubicación" desc="Click clip 📎 → Ubicación. Eco identifica al toque." />
            <Step n={3} title="Elige chofer" desc="3 ofertas con foto, vehículo, rating y precio. Eliges una." />
            <Step n={4} title="Listo" desc="Llega tu chofer. Pagas con BilleteraEco o efectivo. 2% de retorno." />
          </div>
        </div>
      </section>

      {/* === TIPOS DE SERVICIO === */}
      <section className="relative px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-6xl">
          <SectionHeader title="5 tipos de servicio" subtitle="Pides el que necesitas, el bot filtra al chofer correcto automáticamente." />
          <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: "🚗", name: "Normal", desc: "Auto ≥2010, base", recargo: "Tarifa base" },
              { icon: "💎", name: "Premium", desc: "Auto ≥2018 con A/C", recargo: "+20%" },
              { icon: "👑", name: "VIP", desc: "Auto ≥2022 calificación 4.8+", recargo: "+30%" },
              { icon: "🚐", name: "XL", desc: "5-7 personas o equipaje", recargo: "+30%" },
              { icon: "📦", name: "Encomienda", desc: "Solo paquete sin pasajero", recargo: "−5%" },
            ].map((m) => (
              <ModeCard key={m.name} icon={m.icon} name={m.name} desc={`${m.desc} · ${m.recargo}`} />
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-zinc-500">
            🪟 Modificador opcional: <span className="text-white font-semibold">lunas polarizadas</span> sin recargo extra (privacidad y comodidad).
          </p>
        </div>
      </section>

      {/* === SISTEMA DE NIVELES === */}
      <section id="niveles" className="relative px-6 py-24 border-t border-white/5 bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent">
        <div className="mx-auto max-w-6xl">
          <SectionHeader badge="9 NIVELES" title="Mientras más viajas, más ganas" subtitle="Pasajeros y conductores suben de nivel acumulando servicios. Una vez subes, nunca bajas." />

          {/* Tabla Pasajero */}
          <div className="mt-12 mb-12">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              🧍 <span>Pasajero</span> <span className="text-zinc-500 text-sm font-normal">(recompensa escalada por viaje)</span>
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium uppercase tracking-widest text-xs">Nivel</th>
                    <th className="text-center py-3 px-4 text-zinc-400 font-medium uppercase tracking-widest text-xs">Servicios</th>
                    <th className="text-center py-3 px-4 text-zinc-400 font-medium uppercase tracking-widest text-xs">Recompensa</th>
                    <th className="text-center py-3 px-4 text-zinc-400 font-medium uppercase tracking-widest text-xs">Cancelaciones libres</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["🌱 Iniciante", "0 - 9", "0.3%", "1/día"],
                    ["🥉 Bronce", "10 - 18", "0.6%", "1/día"],
                    ["🥈 Plata", "19 - 33", "0.9%", "2/día"],
                    ["🥇 Oro", "34 - 63", "1.2%", "2/día +1 extra/mes"],
                    ["💎 Platino", "64 - 93", "1.5%", "3/día +2 extra/mes"],
                    ["💙 Zafiro", "94 - 123", "1.8%", "3/día +3 extra/mes"],
                    ["❤️ Rubí", "124 - 153", "2.1%", "5/día +4 extra/mes"],
                    ["💚 Esmeralda", "154 - 183", "2.4%", "Ilimitadas"],
                    ["👑 Diamante", "184+", "2.7%", "Ilimitadas VIP"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-zinc-100 font-medium">{row[0]}</td>
                      <td className="py-3 px-4 text-center text-zinc-400">{row[1]}</td>
                      <td className="py-3 px-4 text-center text-orange-400 font-semibold">{row[2]}</td>
                      <td className="py-3 px-4 text-center text-zinc-400 text-xs">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla Conductor */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              🚗 <span>Conductor</span> <span className="text-zinc-500 text-sm font-normal">(comisión más baja del Perú: 6.3% → 3.9%)</span>
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium uppercase tracking-widest text-xs">Nivel</th>
                    <th className="text-center py-3 px-4 text-zinc-400 font-medium uppercase tracking-widest text-xs">Servicios</th>
                    <th className="text-center py-3 px-4 text-zinc-400 font-medium uppercase tracking-widest text-xs">Comisión</th>
                    <th className="text-center py-3 px-4 text-zinc-400 font-medium uppercase tracking-widest text-xs">Bono mensual</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium uppercase tracking-widest text-xs">Beneficios</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["🌱 Aspirante", "0 - 90", "6.3%", "S/.9", "Chequeo médico anual + bono S/.20"],
                    ["🥉 Bronce", "91 - 270", "6.0%", "S/.27", "Chequeo + insignia + soporte prioritario"],
                    ["🥈 Plata", "271 - 450", "5.7%", "S/.45", "Chequeo + prioridad zonas cercanas"],
                    ["🥇 Oro", "451 - 750", "5.4%", "S/.75", "Chequeo + insignia Oro + zonas céntricas"],
                    ["💎 Platino", "751 - 1050", "5.1%", "S/.105", "Servicios corporativos + constancia financiera"],
                    ["💙 Zafiro", "1051 - 1850", "4.8%", "S/.135", "Tarifa dinámica +5% en hora pico"],
                    ["❤️ Rubí", "1851 - 2890", "4.5%", "S/.195", "Préstamo S/.500 + 1 activo digital ActivosYA"],
                    ["💚 Esmeralda", "2891 - 3930", "4.2%", "S/.255", "Plan salud + préstamo S/.1k + vacaciones 3D/2N S/.1500"],
                    ["👑 Diamante", "3931+", "3.9%", "S/.315", "Plan salud familiar + préstamo S/.1.5k + vacaciones S/.2500 + sorteo + aguinaldo S/.500"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-white/5 hover:bg-white/[0.02] align-top">
                      <td className="py-3 px-4 text-zinc-100 font-medium whitespace-nowrap">{row[0]}</td>
                      <td className="py-3 px-4 text-center text-zinc-400 whitespace-nowrap">{row[1]}</td>
                      <td className="py-3 px-4 text-center text-orange-400 font-semibold whitespace-nowrap">{row[2]}</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-semibold whitespace-nowrap">{row[3]}</td>
                      <td className="py-3 px-4 text-zinc-400 text-xs leading-relaxed">{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-zinc-500 text-xs mt-3 leading-relaxed">
              ✦ Bono mensual abonado el último día del mes a conductores activos (≥10 servicios).<br />
              ✦ Préstamos sin intereses con descuento diario prorrateado.<br />
              ✦ Activos digitales: Miss Sofia, TuDestinoYa, TuNoviaIA, TuPedidoYa, TuReservaYa.<br />
              ✦ Una vez subes de nivel, nunca bajas.
            </p>
          </div>
        </div>
      </section>

      {/* === PICHANGA ECO === */}
      <section id="pichanga" className="relative px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl text-center">
          <SectionHeader badge="PROGRAMA DE SALUD" title="⚽ Pichanga Eco" subtitle="Único en LATAM: cuidamos la salud de nuestros conductores. Pagamos cancha, bebidas y agua para que jueguen una vez al mes con otros choferes cerca de tu zona." />

          <div className="mt-12 grid md:grid-cols-3 gap-5 text-left">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <div className="text-4xl mb-3">⚽</div>
              <h3 className="font-semibold mb-2">Fútbol / Fulbito</h3>
              <p className="text-sm text-zinc-400">Cancha sintética, 8v8, sábados o domingos. EcoDrive+ paga la cancha + agua + Gatorade.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <div className="text-4xl mb-3">🏐</div>
              <h3 className="font-semibold mb-2">Vóley</h3>
              <p className="text-sm text-zinc-400">Para los que prefieren menos contacto. Mismo formato, mismo apoyo.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <div className="text-4xl mb-3">🎱</div>
              <h3 className="font-semibold mb-2">Billar</h3>
              <p className="text-sm text-zinc-400">Grupos de 2 a 4. Para los que se relajan en frente de una mesa.</p>
            </div>
          </div>

          <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm">
            <span className="text-lg">💚</span>
            <span>Mientras más activo, más beneficios extras: chequeo médico, polos, bonos.</span>
          </div>
        </div>
      </section>

      {/* === COMPARATIVA === */}
      <section id="comparativa" className="relative px-6 py-24 border-t border-white/5 bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent">
        <div className="mx-auto max-w-6xl">
          <SectionHeader badge="VS LA COMPETENCIA" title="Compara y elige" subtitle="EcoDrive+ vs los grandes. La diferencia es clara." />

          <div className="mt-12 grid md:grid-cols-4 gap-4">
            <CompareCard name="Uber" comision="25-30%" tiempo="60-90s" app="Sí" pago="Semanal" muted />
            <CompareCard name="InDriver" comision="10-15%" tiempo="3-5min" app="Sí" pago="Variable" muted />
            <CompareCard name="DiDi" comision="20-25%" tiempo="60-90s" app="Sí" pago="Semanal" muted />
            <CompareCard name="EcoDrive+" comision="6.3%" tiempo="12 seg" app="No, WhatsApp" pago="Yape al toque" highlight />
          </div>

          <div className="mt-6 text-xs text-zinc-500 text-center">
            * Datos referenciales basados en publicaciones públicas de cada plataforma.
          </div>
        </div>
      </section>

      {/* === CHOFERES === */}
      <section id="choferes" className="relative px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-widest uppercase">
              Para choferes
            </div>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
              Cobras directo a tu BilleteraEco,{" "}
              <span className="text-orange-400">retiras por Yape</span>
            </h2>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            <ChoferCard icon="🎁" title="EcoCredit Welcome" value="S/. 30" desc="Bono inicial al aprobarte. Lo descuentas despacio de comisiones." />
            <ChoferCard icon="💸" title="Comisión más baja" value="6.3%" desc="vs InDrive/DiDi 25%. Más plata para ti." />
            <ChoferCard icon="🚀" title="Tú eliges precio" value="Libre" desc="Sin tarifa fija. Tú pones tu oferta y compites." />
          </div>

          <div className="mt-12 text-center">
            <a href={CHOFER_WA} className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-black font-bold shadow-xl shadow-orange-500/30 transition transform hover:-translate-y-1">
              💼 Quiero ser chofer EcoDrive+
            </a>
          </div>
        </div>
      </section>

      {/* === TESTIMONIOS === */}
      <section className="relative px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-6xl">
          <SectionHeader title="Lo que dicen nuestros usuarios" subtitle="Choferes y pasajeros reales." />
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            <Testimonial initials="CM" name="Carlos M." role="Chofer · 8 años" stars={5} text="Antes ganaba S/.130 al día con otra app. Ahora gano S/.180 con EcoDrive+. La comisión 6.3% me cambió el bolsillo." />
            <Testimonial initials="AR" name="Ana R." role="Pasajera" stars={5} text="Pido mi taxi mientras cocino, sin abrir nada. Mi mamá ve el viaje en vivo y se queda tranquila." />
            <Testimonial initials="LV" name="Luis V." role="Chofer · BilleteraEco activa" stars={5} text="Cobro al instante a mi Yape. Ya no espero el lunes para retirar. Eso me sostiene la semana." />
          </div>
        </div>
      </section>

      {/* === FAQ === */}
      <section id="faq" className="relative px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <SectionHeader title="Preguntas frecuentes" />
          <div className="mt-12 space-y-3">
            <Faq q="¿Necesito descargar alguna aplicación?">
              No. EcoDrive+ funciona 100% por WhatsApp. Solo guardas el número{" "}
              <strong className="text-orange-400">994 810 242</strong> y le escribes a Eco.
            </Faq>
            <Faq q="¿Cómo pago el viaje?">
              3 opciones: <strong>Yape</strong> (al toque al chofer), <strong>BilleteraEco</strong> (con bono S/.5
              al primer viaje) o <strong>efectivo</strong>. Tú eliges.
            </Faq>
            <Faq q="¿Qué pasa si el chofer no llega?">
              Eco rastrea cada viaje. Si demora o cancela, te reasignamos otro y enviamos compensación a tu
              BilleteraEco automáticamente.
            </Faq>
            <Faq q="¿Cómo me registro como chofer?">
              Escribe a Eco al WhatsApp <strong>994 810 242</strong> diciendo &ldquo;Quiero ser chofer&rdquo;. Pedimos
              DNI, foto vehículo, SOAT y revisión técnica. Aprobación en 24-48 horas.
            </Faq>
            <Faq q="¿La comisión 6.3% incluye algo más?">
              No. 6.3% es lo único que descuenta EcoDrive+ por viaje. Sin pagos por uso, sin suscripciones, sin
              sorpresas. Lo demás es tuyo.
            </Faq>
            <Faq q="¿Mi familia puede ver dónde estoy en el viaje?">
              Sí. Al pedir el viaje recibes link de seguimiento en vivo que puedes compartir. Ven la ubicación
              en tiempo real hasta que llegues.
            </Faq>
          </div>
        </div>
      </section>

      {/* === CTA FINAL === */}
      <section className="relative px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-3xl text-center">
          <div className="relative inline-block">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Tu próximo viaje empieza con un{" "}
              <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                Hola
              </span>
            </h2>
          </div>
          <p className="mt-4 text-zinc-400">
            No descargues nada. Solo WhatsApp. Estamos en Trujillo, llegando a Lima pronto.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a href={PASAJERO_WA} className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-[#25D366] hover:bg-[#22C35E] text-white font-bold shadow-xl shadow-[#25D366]/30 transition transform hover:-translate-y-1">
              <WhatsAppIcon className="w-5 h-5" />
              Pedir mi primer viaje
            </a>
            <a href={CHOFER_WA} className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-orange-500/30 hover:bg-orange-500/10 text-orange-400 font-bold transition">
              💼 Ser chofer
            </a>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="relative px-6 py-12 border-t border-white/5">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-3">
            <Image src="/ecodrive-logo.png" alt="EcoDrive+" width={28} height={28} className="object-contain" />
            <span>© 2026 EcoDrive+ · Hecho con <span className="text-orange-400">✦</span> en Perú</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-orange-400 transition">ActivosYA</Link>
            <a href={PASAJERO_WA} className="hover:text-orange-400 transition">Soporte</a>
          </div>
        </div>
      </footer>

      {/* === FLOATING WHATSAPP BUTTON === */}
      <a
        href={PASAJERO_WA}
        aria-label="Hablar con Eco por WhatsApp"
        className="fixed bottom-6 right-6 z-40 group"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
        <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#22C35E] shadow-2xl shadow-[#25D366]/40 transition transform group-hover:scale-110">
          <WhatsAppIcon className="w-7 h-7 text-white" />
        </span>
      </a>
    </main>
  );
}

/* =====================================================
   COMPONENTES
   ===================================================== */

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ChatMockup() {
  return (
    <div className="relative mx-auto max-w-sm">
      <div aria-hidden className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-orange-500/30 via-amber-400/20 to-transparent blur-2xl" />
      <div className="relative rounded-[2.5rem] border border-white/10 bg-zinc-900/80 backdrop-blur-xl p-6 shadow-2xl shadow-black/50">
        {/* Header chat */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/5">
          <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
            E
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-900" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Eco · EcoDrive+</div>
            <div className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              en línea
            </div>
          </div>
          <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
        </div>
        {/* Messages */}
        <div className="mt-4 space-y-3 text-sm">
          <Bubble side="left" delay="0s">¡Hola! Soy Eco 🚗 ¿A dónde vamos hoy?</Bubble>
          <Bubble side="right" delay="0.4s">Al gimnasio</Bubble>
          <Bubble side="left" delay="0.8s">
            Listo. Te muestro 3 opciones:
            <div className="mt-2 space-y-1.5">
              <DriverOption name="Carlos M." rating="4.9" price="S/. 13" eta="3 min" />
              <DriverOption name="Ana T." rating="4.8" price="S/. 14" eta="5 min" highlight />
              <DriverOption name="Luis V." rating="4.7" price="S/. 12" eta="6 min" />
            </div>
          </Bubble>
          <Bubble side="right" delay="1.2s">Voy con Ana 👍</Bubble>
          <Bubble side="left" delay="1.6s">
            ⏱️ Ana llega en <strong className="text-orange-400">5 min</strong>
            <div className="mt-1 text-xs text-zinc-500">Toyota Yaris · ABC-123</div>
          </Bubble>
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, delay, children }: { side: "left" | "right"; delay: string; children: React.ReactNode }) {
  const isLeft = side === "left";
  return (
    <div className={`flex ${isLeft ? "justify-start" : "justify-end"}`} style={{ animation: `fadeInUp 0.5s ${delay} both` }}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${isLeft ? "bg-zinc-800/80 text-zinc-100 rounded-tl-sm" : "bg-orange-500 text-white rounded-tr-sm"}`}>
        {children}
      </div>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function DriverOption({ name, rating, price, eta, highlight = false }: { name: string; rating: string; price: string; eta: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${highlight ? "bg-orange-500/20 border border-orange-400/40" : "bg-zinc-900/50 border border-white/5"}`}>
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-[10px] font-bold">
        {name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate">{name}</div>
        <div className="text-[10px] text-zinc-400">⭐ {rating} · {eta}</div>
      </div>
      <div className="text-sm font-bold text-orange-300">{price}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 backdrop-blur">
      {children}
    </span>
  );
}

function SectionHeader({ badge, title, subtitle }: { badge?: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      {badge && (
        <div className="inline-block px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-widest uppercase">
          {badge}
        </div>
      )}
      <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-zinc-400 text-lg">{subtitle}</p>}
    </div>
  );
}

function VideoCard({ audience, title, desc, videoUrl, poster, ctaText, ctaUrl, ctaStyle }: {
  audience: string; title: string; desc: string; videoUrl: string; poster: string;
  ctaText: string; ctaUrl: string; ctaStyle: "primary" | "outline";
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden hover:border-orange-500/40 transition">
      <div className="aspect-[9/16] bg-black relative max-h-[400px] mx-auto">
        <video className="w-full h-full object-cover" controls preload="metadata" playsInline poster={poster}>
          <source src={videoUrl} type="video/mp4" />
        </video>
      </div>
      <div className="p-5">
        <div className="text-orange-400 text-[10px] uppercase tracking-widest font-bold">{audience}</div>
        <div className="mt-1 font-bold text-base">{title}</div>
        <div className="mt-1 text-sm text-zinc-400">{desc}</div>
        <a
          href={ctaUrl}
          className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition ${
            ctaStyle === "primary"
              ? "bg-orange-500 hover:bg-orange-600 text-black"
              : "border border-orange-500/30 hover:bg-orange-500/10 text-orange-400"
          }`}
        >
          {ctaText}
        </a>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur p-7 hover:border-orange-500/40 hover:bg-white/[0.04] transition">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400/20 to-orange-600/20 flex items-center justify-center text-2xl">
        {icon}
      </div>
      <div className="mt-5 text-xl font-bold">{title}</div>
      <div className="mt-2 text-zinc-400 leading-relaxed">{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="relative text-center">
      <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30 text-2xl font-bold text-black">
        {n}
      </div>
      <div className="mt-4 font-bold">{title}</div>
      <div className="mt-2 text-sm text-zinc-400 leading-relaxed">{desc}</div>
    </div>
  );
}

function ModeCard({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur p-5 hover:border-orange-500/40 hover:-translate-y-1 transition">
      <div className="text-3xl">{icon}</div>
      <div className="mt-3 font-bold">{name}</div>
      <div className="mt-1 text-xs text-zinc-500">{desc}</div>
    </div>
  );
}

function CompareCard({ name, comision, tiempo, app, pago, highlight = false, muted = false }: {
  name: string; comision: string; tiempo: string; app: string; pago: string; highlight?: boolean; muted?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-6 transition ${
        highlight
          ? "border-orange-400/60 bg-gradient-to-br from-orange-500/15 to-orange-600/5 shadow-2xl shadow-orange-500/20 scale-105"
          : "border-white/10 bg-white/[0.02] hover:border-white/20"
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-orange-500 text-black text-[10px] font-bold tracking-wider uppercase shadow-lg">
          Recomendado
        </div>
      )}
      <div className={`text-lg font-bold ${muted ? "text-zinc-400" : "text-white"}`}>{name}</div>
      <div className="mt-5 space-y-3 text-sm">
        <CompareRow label="Comisión" value={comision} highlight={highlight} />
        <CompareRow label="Para pedir" value={tiempo} highlight={highlight} />
        <CompareRow label="App" value={app} highlight={highlight} />
        <CompareRow label="Pago chofer" value={pago} highlight={highlight} />
      </div>
    </div>
  );
}

function CompareRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-white/5 pt-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`font-semibold ${highlight ? "text-orange-300" : "text-zinc-300"}`}>{value}</span>
    </div>
  );
}

function ChoferCard({ icon, title, value, desc }: { icon: string; title: string; value: string; desc: string }) {
  return (
    <div className="group relative rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.07] to-transparent p-7 hover:border-orange-400/40 transition">
      <div className="text-3xl">{icon}</div>
      <div className="mt-3 text-4xl font-bold bg-gradient-to-r from-orange-300 to-orange-500 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="mt-1 text-sm font-semibold">{title}</div>
      <div className="mt-2 text-xs text-zinc-400 leading-relaxed">{desc}</div>
    </div>
  );
}

function Stat({ n, label, highlight = false }: { n: string; label: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-3xl md:text-4xl font-bold ${highlight ? "bg-gradient-to-r from-orange-300 to-amber-400 bg-clip-text text-transparent" : "text-white"}`}>
        {n}
      </div>
      <div className="mt-1 text-xs text-zinc-500 uppercase tracking-widest">{label}</div>
    </div>
  );
}

function Testimonial({ initials, name, role, stars, text }: { initials: string; name: string; role: string; stars: number; text: string }) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur p-7 hover:border-orange-500/40 hover:bg-white/[0.04] transition">
      <div className="absolute top-5 right-6 text-6xl text-orange-500/15 leading-none font-serif">&ldquo;</div>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/20">
          {initials}
        </div>
        <div>
          <div className="font-bold">{name}</div>
          <div className="text-xs text-zinc-500">{role}</div>
        </div>
      </div>
      <div className="mt-3 text-orange-400 text-sm tracking-widest">{"★".repeat(stars)}</div>
      <div className="mt-3 text-sm text-zinc-300 leading-relaxed relative z-10">&ldquo;{text}&rdquo;</div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur p-5 hover:border-orange-500/40 transition open:border-orange-500/50 open:bg-white/[0.04]">
      <summary className="flex items-center justify-between cursor-pointer font-semibold text-white list-none">
        <span>{q}</span>
        <span className="ml-4 flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/15 text-orange-400 text-lg transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-4 text-sm text-zinc-300 leading-relaxed">{children}</div>
    </details>
  );
}
