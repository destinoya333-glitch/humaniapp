import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

export const metadata: Metadata = {
  title: "EcoDrive+ — Pides tu carro como pides delivery",
  description:
    "EcoDrive+ es el primer servicio de viajes 100% por WhatsApp en Trujillo. Sin app, sin descargas. Pides taxi, eliges chofer, pagas con BilleteraEco. Más barato que Indrive y Didi.",
  alternates: { canonical: "https://ecodriveplus.com" },
  keywords: [
    "taxi Trujillo WhatsApp",
    "rideshare sin app Perú",
    "EcoDrive Trujillo",
    "taxi por WhatsApp",
    "chofer Trujillo comisión baja",
    "Indrive alternativa Perú",
    "DiDi alternativa Trujillo",
  ],
};

const PASAJERO_WA = "https://wa.me/51994810242?text=Hola,%20quiero%20pedir%20un%20taxi";
const CHOFER_WA = "https://wa.me/51994810242?text=Hola,%20quiero%20ser%20chofer%20EcoDrive";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

export default function EcoDrivePlusPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* === Pixel Meta (Facebook/Instagram ads tracking) === */}
      {META_PIXEL_ID && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* === Google Analytics 4 === */}
      {GA4_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}');`}
          </Script>
        </>
      )}

      {/* === Schema.org structured data === */}
      <Script id="schema-org" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "EcoDrive+",
          url: "https://ecodriveplus.com",
          logo: "https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/ecodrive-content/logo_oficial.png",
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

          {/* CTA principal: WhatsApp grande verde */}
          <div className="mt-10">
            <a
              href={PASAJERO_WA}
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-[#25D366] hover:bg-[#22C35E] text-white font-bold text-lg shadow-lg shadow-[#25D366]/30 hover:shadow-xl hover:shadow-[#25D366]/40 transition transform hover:-translate-y-0.5"
              aria-label="Hablar con Eco por WhatsApp ahora"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Hablar con Eco AHORA
            </a>
          </div>

          <div className="mt-4 text-sm text-zinc-500">
            Te respondemos en menos de 30 segundos · 24/7
          </div>

          {/* CTAs secundarios */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
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
            Bono S/.5 en tu BilleteraEco al primer viaje · Sin tarifa fija, tú comparas precios
          </div>
        </div>
      </section>

      {/* Videos lanzamiento */}
      <section className="px-6 py-16 border-t border-zinc-900">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs uppercase tracking-wider font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
              </span>
              Lanzamiento
            </div>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold">
              Mira EcoDrive+ en acción
            </h2>
            <p className="mt-3 text-zinc-400 max-w-2xl mx-auto">
              Dos formas de empezar: como pasajero o como chofer. Elige la tuya.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Video Pasajero */}
            <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/30">
              <div className="aspect-[9/16] bg-black">
                <video
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  playsInline
                  poster="https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/ecodrive-content/pilar_tutorial.png"
                >
                  <source
                    src="https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/ecodrive-videos/pasajero_final.mp4"
                    type="video/mp4"
                  />
                </video>
              </div>
              <div className="p-5">
                <div className="text-orange-400 text-xs uppercase tracking-wider font-semibold">
                  Para pasajeros
                </div>
                <div className="mt-1 font-bold text-lg">Pides tu taxi por WhatsApp</div>
                <div className="mt-1 text-sm text-zinc-400">
                  Sin descargas, sin registros, en 12 segundos.
                </div>
                <a
                  href={PASAJERO_WA}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-bold transition"
                >
                  🚗 Pedir mi primer viaje
                </a>
              </div>
            </div>

            {/* Video Chofer */}
            <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/30">
              <div className="aspect-[9/16] bg-black">
                <video
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  playsInline
                  poster="https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/ecodrive-content/pilar_comision_choferes.png"
                >
                  <source
                    src="https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/ecodrive-videos/chofer_final.mp4"
                    type="video/mp4"
                  />
                </video>
              </div>
              <div className="p-5">
                <div className="text-orange-400 text-xs uppercase tracking-wider font-semibold">
                  Para choferes
                </div>
                <div className="mt-1 font-bold text-lg">La comisión más baja del Perú</div>
                <div className="mt-1 text-sm text-zinc-400">
                  Más viajes, más ganancia, sin nada que descargar.
                </div>
                <a
                  href={CHOFER_WA}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-orange-500/30 hover:bg-orange-500/10 text-orange-400 font-bold transition"
                >
                  💼 Quiero ser chofer
                </a>
              </div>
            </div>
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
            <Step n={4} title="Listo" desc="El chofer llega. Pagas con tu BilleteraEco o efectivo. Recibes 2% de retorno al toque." />
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

      {/* Tabla comparativa Uber/InDriver/DiDi vs EcoDrive+ */}
      <section className="px-6 py-20 border-t border-zinc-900 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center">
            Compara y elige
          </h2>
          <p className="mt-3 text-zinc-400 text-center max-w-2xl mx-auto">
            EcoDrive+ vs los grandes del mercado. La diferencia es clara.
          </p>

          <div className="mt-12 overflow-hidden rounded-2xl border border-zinc-800">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="bg-zinc-900/60">
                  <th className="text-left p-4 font-semibold text-zinc-400">Característica</th>
                  <th className="text-center p-4 font-semibold text-zinc-500">Uber</th>
                  <th className="text-center p-4 font-semibold text-zinc-500">InDriver</th>
                  <th className="text-center p-4 font-semibold text-zinc-500">DiDi</th>
                  <th className="text-center p-4 font-bold text-orange-400 bg-orange-500/10">EcoDrive+</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <CompareRow label="Comisión chofer" v1="25-30%" v2="10-15%" v3="20-25%" mine="6.3%" highlight />
                <CompareRow label="Tiempo para pedir" v1="60-90s" v2="3-5 min" v3="60-90s" mine="12 seg" />
                <CompareRow label="Necesita app" v1="Sí" v2="Sí" v3="Sí" mine="No, WhatsApp" highlight />
                <CompareRow label="Pago al chofer" v1="Semanal" v2="Variable" v3="Semanal" mine="Yape al toque" />
                <CompareRow label="Modo Mujer" v1="No" v2="No" v3="No" mine="Sí" highlight />
                <CompareRow label="Modo Abuelo (llamada)" v1="No" v2="No" v3="No" mine="Sí" highlight />
                <CompareRow label="Bono bienvenida" v1="Variable" v2="No" v3="Variable" mine="S/.5 + S/.30 chofer" />
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-xs text-zinc-500 text-center">
            Datos referenciales basados en publicaciones públicas de cada plataforma. Pueden variar.
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
            Cobras directo a tu BilleteraEco, retiras por Yape
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

      {/* Testimonios */}
      <section className="px-6 py-20 border-t border-zinc-900">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="mt-3 text-zinc-400 text-center max-w-2xl mx-auto">
            Choferes y pasajeros reales de Trujillo.
          </p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Testimonial
              initials="CM"
              name="Carlos M."
              role="Chofer · 8 años de experiencia"
              stars={5}
              text="Antes ganaba S/.130 al día con otra app. Ahora gano S/.180 con EcoDrive+. La comisión 6.3% me cambió el bolsillo."
            />
            <Testimonial
              initials="AR"
              name="Ana R."
              role="Pasajera · Trujillo"
              stars={5}
              text="Pido mi taxi mientras cocino, sin abrir nada. Mi mamá ve el viaje en vivo y se queda tranquila."
            />
            <Testimonial
              initials="LV"
              name="Luis V."
              role="Chofer · BilleteraEco activa"
              stars={5}
              text="Cobro al instante a mi Yape. Ya no espero el lunes para retirar. Eso me sostiene la semana."
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20 border-t border-zinc-900">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center">
            Preguntas frecuentes
          </h2>
          <div className="mt-10 space-y-3">
            <Faq q="¿Necesito descargar alguna aplicación?">
              No. EcoDrive+ funciona 100% por WhatsApp. Solo guardas el número{" "}
              <strong className="text-orange-400">994 810 242</strong> y le escribes a Eco para
              pedir tu taxi.
            </Faq>
            <Faq q="¿Cómo pago el viaje?">
              Tienes 3 opciones: <strong>Yape</strong> (al toque al chofer), <strong>BilleteraEco</strong>{" "}
              (saldo recargable con bono S/.5 al primer viaje) o <strong>efectivo</strong>. Tú eliges.
            </Faq>
            <Faq q="¿Qué pasa si el chofer no llega?">
              Eco rastrea cada viaje. Si el chofer demora más de lo prometido o cancela, te
              reasignamos otro y te enviamos compensación a tu BilleteraEco automáticamente.
            </Faq>
            <Faq q="¿Cómo me registro como chofer?">
              Escríbele a Eco al WhatsApp <strong>994 810 242</strong> diciendo &ldquo;Quiero ser
              chofer&rdquo;. Te pedimos DNI, foto del vehículo, SOAT y revisión técnica vigente.
              Aprobación en 24-48 horas.
            </Faq>
            <Faq q="¿La comisión 6.3% incluye algo más?">
              No. 6.3% es lo único que descuenta EcoDrive+ por viaje. Sin pagos por uso, sin
              suscripciones, sin sorpresas. Lo demás es tuyo.
            </Faq>
            <Faq q="¿Mi familia puede ver dónde estoy en el viaje?">
              Sí. Al pedir el viaje recibes un link de seguimiento en vivo que puedes compartir
              con quien quieras. Ven la ubicación en tiempo real hasta que llegues.
            </Faq>
          </div>
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
        <div className="mt-2">© 2026 · Hecho con ✦ en Perú</div>
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

function CompareRow({
  label, v1, v2, v3, mine, highlight = false,
}: {
  label: string; v1: string; v2: string; v3: string; mine: string; highlight?: boolean;
}) {
  return (
    <tr className="hover:bg-zinc-900/30 transition">
      <td className="p-4 font-medium text-zinc-300">{label}</td>
      <td className="p-4 text-center text-zinc-500">{v1}</td>
      <td className="p-4 text-center text-zinc-500">{v2}</td>
      <td className="p-4 text-center text-zinc-500">{v3}</td>
      <td className={`p-4 text-center font-bold ${highlight ? "text-orange-400 bg-orange-500/10" : "text-orange-300 bg-orange-500/5"}`}>
        {mine}
      </td>
    </tr>
  );
}

function Testimonial({
  initials, name, role, stars, text,
}: {
  initials: string; name: string; role: string; stars: number; text: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-orange-500/40 transition">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-bold">
          {initials}
        </div>
        <div>
          <div className="font-bold">{name}</div>
          <div className="text-xs text-zinc-500">{role}</div>
        </div>
      </div>
      <div className="mt-3 text-orange-400">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</div>
      <div className="mt-3 text-sm text-zinc-300 leading-relaxed">&ldquo;{text}&rdquo;</div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-orange-500/40 transition open:border-orange-500/50">
      <summary className="flex items-center justify-between cursor-pointer font-semibold text-white list-none">
        <span>{q}</span>
        <span className="text-orange-400 text-xl transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-4 text-sm text-zinc-300 leading-relaxed">{children}</div>
    </details>
  );
}
