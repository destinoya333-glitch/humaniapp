import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { getGarajeClient, maskNombre } from "@/lib/ecodrive/garaje";
import { GarajeCounter } from "./_components/GarajeCounter";
import { GarajeCTA } from "./_components/GarajeCTA";
import GarajePhotoCarousel from "./_components/GarajePhotoCarousel";
import Reveal from "../_design/Reveal";
import WordReveal from "../_design/WordReveal";
import Magnetic from "../_design/Magnetic";
import CinematicImage from "../_design/CinematicImage";

const HERO_IMG = "https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/garaje-fotos/edicion-1/01-portada.jpg";
const LOCAL_HERO = "/ecodriveplus/byd-yuan-pro.jpg";

export const metadata: Metadata = {
  title: "EcoDrive+ Garaje — Sorteamos un BYD Yuan Pro 2023",
  description:
    "Sorteo presencial con notario público y casino oficial. Ticket S/.40 (S/.30 interno EcoDrive+). Pass anual S/.99 (S/.69 interno) participa en todos los sorteos del año.",
  alternates: { canonical: "https://ecodriveplus.com/garaje" },
  openGraph: {
    type: "website",
    title: "Gana un BYD Yuan Pro 2023 — EcoDrive+ Garaje",
    description: "Sorteo presencial con notario. 3,000 tickets de S/.40. Pass anual S/.99 participa todo el año.",
    url: "https://ecodriveplus.com/garaje",
    siteName: "EcoDrive+",
    images: [{ url: HERO_IMG, width: 1200, height: 800, alt: "BYD Yuan Pro 2023 — EcoDrive+ Garaje" }],
    locale: "es_PE",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gana un BYD Yuan Pro 2023 — EcoDrive+ Garaje",
    description: "Sorteo presencial con notario. Tickets desde S/.30. Pass anual desde S/.69.",
    images: [HERO_IMG],
  },
};

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

export const revalidate = 30;

type EdicionActual = {
  edicion_id: string;
  numero_edicion: number;
  nombre: string;
  premio_descripcion: string | null;
  premio_valor: number | null;
  premio_fotos: string[] | null;
  premio_video: string | null;
  vendidos: number;
  meta: number;
  porcentaje: number;
  precio_publico: number;
  precio_interno: number;
  bases_pdf: string | null;
};

async function getData() {
  const sb = getGarajeClient();
  const [actualRes, ultimosRes, historialRes, progRes, previewRes] = await Promise.all([
    sb.rpc("garaje_edicion_actual"),
    sb.rpc("garaje_ultimos_vendidos"),
    sb.rpc("garaje_historial_ediciones"),
    sb.from("garaje_programa").select("*").limit(1).single(),
    sb
      .from("garaje_ediciones")
      .select("id,numero_edicion,nombre,premio_descripcion,premio_valor_referencial,premio_fotos_urls,premio_video_url,meta_tickets,ticket_precio_publico,ticket_precio_interno,estado")
      .in("estado", ["borrador", "abierta"])
      .order("numero_edicion", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    actual: (actualRes.data?.[0] as EdicionActual | undefined) ?? null,
    ultimos: ultimosRes.data ?? [],
    historial: historialRes.data ?? [],
    programa: progRes.data,
    preview: previewRes.data,
  };
}

export default async function GarajePage() {
  const { actual, ultimos, historial, programa, preview } = await getData();
  const heroImage = actual?.premio_fotos?.[0] ?? LOCAL_HERO;
  const galleryPhotos =
    (actual?.premio_fotos && actual.premio_fotos.length > 0)
      ? actual.premio_fotos
      : (preview?.premio_fotos_urls && preview.premio_fotos_urls.length > 0)
      ? preview.premio_fotos_urls
      : [LOCAL_HERO];

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Tracking pixels */}
      {META_PIXEL_ID && (
        <>
          <Script id="meta-pixel-garaje" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');fbq('trackCustom','GarajeView');`}</Script>
          <noscript><img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} alt="" /></noscript>
        </>
      )}
      {TIKTOK_PIXEL_ID && (
        <Script id="tiktok-pixel-garaje" strategy="afterInteractive">{`!function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${TIKTOK_PIXEL_ID}');ttq.page();}(window, document, 'ttq');`}</Script>
      )}
      {GA4_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
          <Script id="ga4-garaje" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}',{page_path:'/garaje'});gtag('event','view_garaje_landing');`}</Script>
        </>
      )}
      <Script id="schema-garaje" type="application/ld+json" strategy="afterInteractive">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Event",
        name: "Sorteo BYD Yuan Pro 2023 — EcoDrive+ Garaje Edición #1",
        description: "Sorteo presencial con notario público y casino oficial. 3,000 tickets de S/.40. Garaje Pass anual desde S/.69.",
        image: HERO_IMG,
        organizer: { "@type": "Organization", name: "EcoDrive Plus SAC", url: "https://ecodriveplus.com" },
        location: { "@type": "Place", name: "Trujillo, La Libertad, Perú" },
        offers: { "@type": "Offer", price: "40", priceCurrency: "PEN", availability: "https://schema.org/InStock", url: "https://ecodriveplus.com/garaje" },
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      })}</Script>

      {/* Background atmosférico */}
      <div aria-hidden className="fixed inset-0 pointer-events-none eco-mesh" />
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[55vw] h-[55vw] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(224,136,33,0.18), transparent 70%)", filter: "blur(120px)" }} />
        <div className="absolute -bottom-1/3 -right-1/4 w-[55vw] h-[55vw] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(184,106,18,0.22), transparent 70%)", filter: "blur(140px)" }} />
      </div>

      {/* === HEADER === */}
      <header className="relative z-40 border-b border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 h-24 md:h-28 flex items-center justify-between">
          <Link href="/ecodriveplus" className="flex items-center gap-4 group">
            <div role="img" aria-label="EcoDrive+" className="h-14 w-14 md:h-16 md:w-16 bg-[url('/ecodriveplus/icon.png')] bg-contain bg-no-repeat bg-center group-hover:rotate-[8deg] transition-transform duration-700 shrink-0" />
            <div className="leading-none">
              <div className="eco-display text-[22px] md:text-[26px] tracking-tight">EcoDrive<span className="text-[var(--eco-flame)]">+</span> <span className="text-[var(--eco-ink-mute)] eco-display-italic">Garaje</span></div>
              <div className="eco-mono mt-2 text-[var(--eco-ink-mute)] hidden sm:block">SORTEO PRESENCIAL · NOTARIO PÚBLICO</div>
            </div>
          </Link>
          <Magnetic strength={0.3}>
            <Link href="/ecodriveplus" className="hidden sm:inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[var(--eco-line-strong)] eco-mono text-[var(--eco-ink-soft)] hover:border-[var(--eco-flame)] hover:text-[var(--eco-flame)] transition-colors">
              ← Volver a EcoDrive+
            </Link>
          </Magnetic>
        </div>
      </header>

      {/* === HERO === */}
      <section className="relative pt-12 md:pt-20 pb-24 overflow-hidden isolate">
        {/* Fondo Plaza de Armas Trujillo con Ken Burns + parallax */}
        <CinematicImage src="/ecodriveplus/trujillo-plaza.jpg" alt="" motion="both" parallaxRange={140} objectPosition="center 55%" className="absolute inset-0 z-0">
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,9,8,0.62) 0%, rgba(10,9,8,0.50) 35%, rgba(10,9,8,0.82) 100%)" }} />
          <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(75% 60% at 20% 35%, rgba(224,136,33,0.18), transparent 70%)" }} />
        </CinematicImage>

        <div aria-hidden className="hidden lg:block absolute left-6 top-32 eco-label-vertical z-20">
          GARAJE · 01 — EDICIÓN ABIERTA
        </div>

        <div className="relative z-20 mx-auto max-w-[1400px] px-6 lg:px-24 grid lg:grid-cols-12 gap-y-16 lg:gap-x-12 items-start">
          <div className="lg:col-span-6 relative">
            <Reveal as="div" className="flex items-center gap-3 mb-10">
              <span className="h-px w-12 bg-[var(--eco-flame)]" />
              <span className="eco-mono text-[var(--eco-flame)]">N° 001 · 3,000 TICKETS</span>
            </Reveal>

            <h1 className="eco-display text-[58px] sm:text-[80px] md:text-[104px] xl:text-[128px] text-[var(--eco-ink)]">
              <span className="block"><WordReveal text="Gana un" /></span>
              <span className="block eco-display-italic text-[var(--eco-flame)] -mt-2 md:-mt-4">
                <WordReveal text="auto eléctrico" delay={0.18} />
              </span>
              <span className="block -mt-2 md:-mt-4"><WordReveal text="cada 3,000" delay={0.34} /></span>
              <span className="block -mt-2 md:-mt-4 eco-display-italic text-[var(--eco-flame)]"><WordReveal text="tickets." delay={0.5} /></span>
            </h1>

            <Reveal delay={0.85} className="mt-10 max-w-md text-[17px] md:text-[18px] text-[var(--eco-ink-soft)] leading-[1.55]">
              <p>
                Programa permanente. Sin fecha fija. El sorteo se realiza al venderse el último ticket de cada edición.{" "}
                <strong className="text-[var(--eco-ink)]">Notario público + casino oficial + acta blockchain.</strong>
              </p>
            </Reveal>

            <Reveal delay={1.05} className="mt-12 flex flex-wrap gap-x-6 gap-y-3 eco-mono text-[var(--eco-ink-mute)]">
              <span>⌗ Ticket S/. 40</span>
              <span>⌗ Pasajero/Chofer Eco S/. 30</span>
              <span>⌗ Pass anual S/. 99</span>
              <span>⌗ RUC 20613413228</span>
            </Reveal>
          </div>

          <Reveal delay={0.3} className="lg:col-span-6 relative lg:mt-8">
            <GarajePhotoCarousel photos={galleryPhotos} alt={actual?.nombre ?? preview?.nombre ?? "BYD Yuan Pro 2023"} />
            <div className="mt-6 flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="eco-mono text-[var(--eco-flame)] mb-1">PREMIO ACTUAL</div>
                <div className="eco-display text-[28px] md:text-[40px] text-[var(--eco-ink)] leading-[1.0]">
                  {actual?.nombre ?? preview?.nombre ?? "BYD Yuan Pro 2023"}
                </div>
              </div>
              {(actual?.premio_valor || preview?.premio_valor_referencial) && (
                <div className="text-right">
                  <div className="eco-mono text-[var(--eco-ink-mute)]">valor referencial</div>
                  <div className="eco-display text-[24px] md:text-[32px] text-[var(--eco-flame)] leading-none">
                    S/. {Number(actual?.premio_valor ?? preview?.premio_valor_referencial).toLocaleString("es-PE")}
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* === ESTADO EDICIÓN === */}
      <section className="relative py-24 border-t border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24">
          {actual ? (
            <Reveal className="grid lg:grid-cols-12 gap-y-12 lg:gap-x-12 items-start">
              <div className="lg:col-span-7">
                <div className="eco-mono text-[var(--eco-flame)] mb-4">— Edición #{actual.numero_edicion}</div>
                <h2 className="eco-display text-[42px] md:text-[64px] leading-[0.95] text-[var(--eco-ink)]">{actual.nombre}</h2>
                {actual.premio_descripcion && (
                  <p className="mt-6 max-w-xl text-[var(--eco-ink-soft)] leading-relaxed">{actual.premio_descripcion}</p>
                )}
                <div className="mt-10">
                  <GarajeCounter
                    edicionId={actual.edicion_id}
                    initialVendidos={actual.vendidos}
                    meta={actual.meta}
                    initialPct={actual.porcentaje}
                  />
                </div>
              </div>
              <div className="lg:col-span-5">
                <GarajeCTA
                  edicionId={actual.edicion_id}
                  ticketPublico={Number(actual.precio_publico)}
                  ticketInterno={Number(actual.precio_interno)}
                  passPublico={Number(programa?.pass_precio_publico ?? 99)}
                  passInterno={Number(programa?.pass_precio_interno ?? 69)}
                  meta={actual.meta}
                />
              </div>
            </Reveal>
          ) : preview ? (
            <Reveal className="border border-[var(--eco-line-strong)] rounded-3xl p-8 md:p-12 bg-[var(--eco-bg-soft)]/40 backdrop-blur">
              <div className="eco-mono text-[var(--eco-flame)] mb-4">— Próxima edición · {preview.estado === "borrador" ? "en preparación" : "abriendo pronto"}</div>
              <h2 className="eco-display text-[36px] md:text-[56px] leading-[0.95] text-[var(--eco-ink)]">
                #{preview.numero_edicion} · {preview.nombre}
              </h2>
              {preview.premio_descripcion && (
                <p className="mt-6 max-w-2xl text-[var(--eco-ink-soft)] leading-relaxed">{preview.premio_descripcion}</p>
              )}
              <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Magnetic strength={0.3}>
                  <Link href="https://wa.me/51994810242?text=Quiero%20saber%20cuando%20abre%20la%20edici%C3%B3n%20Garaje" className="inline-flex items-center gap-3 px-8 py-5 rounded-full bg-[var(--eco-flame)] text-[var(--eco-bg-deep)] font-semibold eco-mono hover:bg-[var(--eco-flame-soft)] transition-colors">
                    Avisarme por WhatsApp
                  </Link>
                </Magnetic>
                <p className="eco-mono text-[var(--eco-ink-mute)]">
                  Meta: <strong className="text-[var(--eco-ink)]">{preview.meta_tickets.toLocaleString("es-PE")} tickets</strong>{" · "}
                  Ticket <strong className="text-[var(--eco-ink)]">S/. {Number(preview.ticket_precio_publico || programa?.ticket_precio_publico || 40)}</strong>{" "}
                  (S/. {Number(preview.ticket_precio_interno || programa?.ticket_precio_interno || 30)} interno)
                </p>
              </div>
            </Reveal>
          ) : (
            <Reveal className="border border-[var(--eco-line-strong)] rounded-3xl p-10 md:p-14 text-center bg-[var(--eco-bg-soft)]/40 backdrop-blur">
              <h2 className="eco-display text-[36px] md:text-[48px] text-[var(--eco-ink)]">Próxima edición en preparación</h2>
              <p className="mt-4 text-[var(--eco-ink-soft)] max-w-xl mx-auto">
                Estamos finalizando los detalles del próximo auto. Te avisamos por WhatsApp cuando abramos.
              </p>
              <div className="mt-8">
                <Magnetic strength={0.3}>
                  <Link href="https://wa.me/51994810242?text=Quiero%20saber%20del%20pr%C3%B3ximo%20sorteo%20Garaje" className="inline-flex items-center gap-3 px-8 py-5 rounded-full bg-[var(--eco-flame)] text-[var(--eco-bg-deep)] font-semibold eco-mono hover:bg-[var(--eco-flame-soft)] transition-colors">
                    Avisarme por WhatsApp
                  </Link>
                </Magnetic>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* === CÓMO FUNCIONA — 3 PASOS === */}
      <section className="relative py-32 border-t border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24">
          <Reveal className="mb-20">
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— 03 / Mecánica</div>
            <h2 className="eco-display text-[48px] md:text-[80px] leading-[0.95] text-[var(--eco-ink)]">
              Tres pasos. <span className="eco-display-italic text-[var(--eco-flame)]">Una oportunidad.</span>
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div aria-hidden className="hidden md:block absolute top-12 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-[var(--eco-flame)] to-transparent opacity-40" />
            {[
              ["01", "Eliges", "Ticket suelto S/. 40 (S/. 30 si eres pasajero o chofer EcoDrive+) o Garaje Pass anual S/. 99 (S/. 69 interno) y participas todo el año."],
              ["02", "Pagas", "Yape o tarjeta. En menos de 2 minutos tu número queda confirmado por WhatsApp."],
              ["03", "Participas", "Al venderse el ticket #3,000 se transmite el sorteo en vivo. Notario público + casino oficial sacan tu número del ánfora."],
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

      {/* === ÚLTIMOS VENDIDOS === */}
      {ultimos.length > 0 && (
        <section className="relative py-24 border-t border-[var(--eco-line)]">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-24">
            <Reveal className="flex items-baseline justify-between mb-10 flex-wrap gap-4">
              <div>
                <div className="eco-mono text-[var(--eco-flame)] mb-2">— Últimos números</div>
                <h2 className="eco-display text-[36px] md:text-[56px] text-[var(--eco-ink)]">El ánfora se llena.</h2>
              </div>
              <span className="eco-mono text-[var(--eco-ink-mute)]">{ultimos.length} de {actual?.meta ?? 3000}</span>
            </Reveal>
            <Reveal className="flex flex-wrap gap-3">
              {ultimos.slice(0, 18).map((u: { numero_correlativo: number; nombre_parcial: string }) => (
                <div key={u.numero_correlativo} className="border border-[var(--eco-line-strong)] rounded-xl px-4 py-3 bg-[var(--eco-bg-soft)]/40">
                  <span className="eco-mono text-[var(--eco-flame)]">#{u.numero_correlativo}</span>
                  <span className="ml-2 eco-mono text-[var(--eco-ink-soft)]">— {u.nombre_parcial.replace(/ #\d+$/, "")}</span>
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* === GANADORES ANTERIORES === */}
      {historial.length > 0 && (
        <section className="relative py-32 border-t border-[var(--eco-line)]">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-24">
            <Reveal className="mb-16">
              <div className="eco-mono text-[var(--eco-flame)] mb-4">— Ediciones anteriores</div>
              <h2 className="eco-display text-[48px] md:text-[80px] leading-[0.95] text-[var(--eco-ink)]">
                Hubo <span className="eco-display-italic text-[var(--eco-flame)]">ganadores</span> reales.
              </h2>
            </Reveal>
            <div className="grid md:grid-cols-2 gap-10">
              {historial.map((h: { numero_edicion: number; nombre: string; sorteo_at: string; ganador_nombre_parcial: string; ganador_numero: number; video_youtube: string | null }) => (
                <Reveal key={h.numero_edicion} className="border-t border-[var(--eco-line-strong)] pt-8">
                  <div className="eco-mono text-[var(--eco-flame)] mb-2">EDICIÓN #{h.numero_edicion}</div>
                  <h3 className="eco-display text-[28px] md:text-[36px] text-[var(--eco-ink)]">{h.nombre}</h3>
                  <p className="mt-4 text-[var(--eco-ink-soft)]">
                    Ganador: <strong className="text-[var(--eco-ink)]">{maskNombre(h.ganador_nombre_parcial)}</strong> con número <span className="text-[var(--eco-flame)]">#{h.ganador_numero}</span>
                  </p>
                  {h.video_youtube && (
                    <a href={h.video_youtube} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 eco-mono text-[var(--eco-flame)] hover:text-[var(--eco-flame-soft)] transition-colors">
                      Ver sorteo en video →
                    </a>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === BANDA CINEMÁTICA — RECORDATORIO === */}
      <section className="relative h-[55vh] md:h-[70vh] min-h-[400px] border-y border-[var(--eco-line)]">
        <CinematicImage src={heroImage} alt={actual?.nombre ?? "Premio Garaje"} motion="both" parallaxRange={120} objectPosition="center 45%" className="absolute inset-0">
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.30) 50%, rgba(10,9,8,0.90) 100%)" }} />
          <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 30% 60%, rgba(224,136,33,0.20), transparent 70%)" }} />
        </CinematicImage>
        <div className="relative h-full mx-auto max-w-[1400px] px-6 lg:px-24 flex flex-col justify-end pb-16 md:pb-24">
          <Reveal>
            <div className="eco-mono text-[var(--eco-flame)] mb-4">— Recordatorio</div>
            <h3 className="eco-display text-[44px] sm:text-[60px] md:text-[88px] leading-[0.95] text-[var(--eco-ink)]">
              Cada ticket es <span className="eco-display-italic text-[var(--eco-flame)]">un asiento al volante.</span>
            </h3>
          </Reveal>
        </div>
      </section>

      {/* === ENLACES === */}
      <section className="relative py-24 border-t border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24 grid md:grid-cols-2 gap-px bg-[var(--eco-line)] border border-[var(--eco-line)]">
          <Reveal>
            <Link href="/ecodriveplus/garaje/como-funciona" className="block bg-[var(--eco-bg)] p-8 md:p-10 eco-card cursor-pointer">
              <div className="eco-mono text-[var(--eco-flame)] mb-3">— Reglas</div>
              <h3 className="eco-display text-[32px] md:text-[40px] text-[var(--eco-ink)]">Cómo funciona</h3>
              <p className="mt-4 text-[var(--eco-ink-soft)] leading-relaxed">Reglas del programa, mecánica de Pass, bonus por lealtad y FAQ.</p>
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <Link href="/ecodriveplus/garaje/bases" className="block bg-[var(--eco-bg)] p-8 md:p-10 eco-card cursor-pointer">
              <div className="eco-mono text-[var(--eco-flame)] mb-3">— Legal</div>
              <h3 className="eco-display text-[32px] md:text-[40px] text-[var(--eco-ink)]">Bases legales</h3>
              <p className="mt-4 text-[var(--eco-ink-soft)] leading-relaxed">Bases notariadas. EcoDrive Plus SAC RUC 20613413228. INDECOPI Perú.</p>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="relative py-16 border-t border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-24 grid md:grid-cols-2 gap-8 items-center">
          <div className="flex items-center gap-3">
            <div role="img" aria-label="EcoDrive+" className="h-8 w-8 bg-[url('/ecodriveplus/icon.png')] bg-contain bg-no-repeat bg-center" />
            <div className="eco-mono text-[var(--eco-ink-soft)]">
              EcoDrive+ Garaje © 2026 — <span className="text-[var(--eco-flame)]">RUC 20613413228</span>
            </div>
          </div>
          <div className="flex items-center justify-start md:justify-end gap-6 eco-mono">
            <Link href="/ecodriveplus" className="text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)] transition-colors">EcoDrive+</Link>
            <Link href="/ecodriveplus/garaje/bases" className="text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)] transition-colors">Bases</Link>
            <Link href="https://wa.me/51994810242" className="text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)] transition-colors">Soporte</Link>
          </div>
        </div>
        <p className="mt-10 mx-auto max-w-[1400px] px-6 lg:px-24 eco-mono text-[var(--eco-ink-mute)] leading-loose">
          ⌗ Programa de membresía con bonificación de sorteo amparado en DS 006-2000-ITINCI Art. 2 inc. b.<br />
          ⌗ Datos personales protegidos según Ley 29733. Reclamos: INDECOPI.
        </p>
      </footer>
    </main>
  );
}
