import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Descargá la app EcoDrive+ — Pasajero y Conductor",
  description:
    "Descargá la app EcoDrive+ para Android e iOS. App pasajero: mapa GPS, BilleteraEco, ranking, sorteo del Club. App conductor: aceptar viajes, retirar Yape al toque, niveles.",
  alternates: { canonical: "https://ecodriveplus.com/descargar-app" },
};

const PASAJERO_WA = "https://wa.me/51994810242?text=Hola,%20quiero%20pedir%20un%20taxi";

// TODO: Cuando las apps esten publicadas en stores reemplazar estos placeholders.
// Cuentas: ecodriveplus.service@gmail.com (Play Console ID 6068499656413554334).
const APP_PASAJERO_PLAY = ""; // ej "https://play.google.com/store/apps/details?id=com.ecodriveplus.pasajero"
const APP_PASAJERO_IOS = "";  // ej "https://apps.apple.com/pe/app/ecodriveplus-pasajero/id..."
const APP_CHOFER_PLAY = "";
const APP_CHOFER_IOS = "";

function StoreCard(props: { titulo: string; subtitulo: string; play: string; ios: string; color: string }) {
  return (
    <div className="border border-[var(--eco-line-strong)] rounded-3xl p-8 md:p-10 bg-[var(--eco-bg-soft)]/40 backdrop-blur">
      <div className="eco-mono text-[var(--eco-flame)] mb-3" style={{ color: props.color }}>{props.subtitulo}</div>
      <h2 className="eco-display text-[36px] md:text-[48px] text-[var(--eco-ink)] leading-[0.95] mb-6">
        {props.titulo}
      </h2>
      <div className="space-y-3">
        {props.play ? (
          <a
            href={props.play}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-full bg-black border border-white/30 text-white hover:border-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M3 20.5V3.5c0-.7.4-1.3 1-1.5l11.6 10L4 21c-.6-.3-1-.8-1-1.5zm14.3-9L6.1 1.5l11 6.5 3.7-2.1c.8.5.8 1.7 0 2.2l-3.5 1.4zm0 1l3.5 1.5c.8.5.8 1.7 0 2.2l-3.7-2.1L6.1 22.5l11.2-9.9z"/></svg>
            Google Play
          </a>
        ) : (
          <div className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-full border border-dashed border-white/20 text-[var(--eco-ink-mute)] cursor-not-allowed">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M3 20.5V3.5c0-.7.4-1.3 1-1.5l11.6 10L4 21c-.6-.3-1-.8-1-1.5zm14.3-9L6.1 1.5l11 6.5 3.7-2.1c.8.5.8 1.7 0 2.2l-3.5 1.4zm0 1l3.5 1.5c.8.5.8 1.7 0 2.2l-3.7-2.1L6.1 22.5l11.2-9.9z"/></svg>
            Próximamente en Google Play
          </div>
        )}
        {props.ios ? (
          <a
            href={props.ios}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-full bg-black border border-white/30 text-white hover:border-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            App Store
          </a>
        ) : (
          <div className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-full border border-dashed border-white/20 text-[var(--eco-ink-mute)] cursor-not-allowed">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Próximamente en App Store
          </div>
        )}
      </div>
    </div>
  );
}

export default function DescargarAppPage() {
  const noStores = !APP_PASAJERO_PLAY && !APP_PASAJERO_IOS && !APP_CHOFER_PLAY && !APP_CHOFER_IOS;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[50vw] h-[50vw] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(224,136,33,0.15), transparent 70%)", filter: "blur(120px)" }} />
        <div className="absolute -bottom-1/3 -right-1/4 w-[45vw] h-[45vw] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(184,106,18,0.18), transparent 70%)", filter: "blur(120px)" }} />
      </div>

      <header className="relative z-40 border-b border-[var(--eco-line)]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 h-24 md:h-32 flex items-center justify-between">
          <Link href="/ecodriveplus" className="flex items-center group">
            <div
              role="img"
              aria-label="EcoDrive+"
              className="h-14 md:h-18 w-[180px] md:w-[240px] bg-[url('https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/brand-assets/ecodrive/logo-final-naranja-trim.png')] bg-contain bg-no-repeat bg-left group-hover:opacity-90 transition-opacity duration-500"
            />
          </Link>
          <Link
            href="/ecodriveplus"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[var(--eco-line-strong)] eco-mono text-[var(--eco-ink-soft)] hover:border-[var(--eco-flame)] hover:text-[var(--eco-flame)] transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-[1100px] px-6 lg:px-12 py-16 md:py-24">
        <div className="text-center mb-16">
          <div className="eco-mono text-[var(--eco-flame)] mb-4">— Apps EcoDrive+</div>
          <h1 className="eco-display text-[48px] md:text-[80px] leading-[0.95] text-[var(--eco-ink)] mb-8">
            Descargá la app
          </h1>
          <p className="max-w-xl mx-auto text-[var(--eco-ink-soft)] leading-relaxed">
            La app le suma a WhatsApp: mapa GPS en vivo, BilleteraEco, ranking, sorteos del Club.
            Para conductores es obligatoria para operar.
          </p>
        </div>

        {noStores && (
          <div className="mb-12 mx-auto max-w-2xl p-6 rounded-2xl border border-yellow-500/40 bg-yellow-500/5 text-center">
            <p className="eco-mono text-yellow-300 mb-2">📲 Apps en preparación</p>
            <p className="text-[var(--eco-ink-soft)] text-sm leading-relaxed">
              Estamos puliendo las apps antes de publicarlas oficialmente en Google Play y App Store.
              Mientras tanto, podés pedir tu taxi por WhatsApp ahora mismo.
            </p>
            <a
              href={PASAJERO_WA}
              className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-full bg-[var(--eco-flame)] hover:bg-[var(--eco-flame-soft)] text-[var(--eco-bg-deep)] font-semibold eco-mono transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487 1.262.547 2.247.873 3.016 1.117.987.295 1.886.253 2.598.155.793-.119 2.444-.99 2.79-1.946.346-.957.346-1.78.243-1.946-.103-.165-.376-.265-.792-.473"/></svg>
              Pedir taxi por WhatsApp ahora
            </a>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <StoreCard
            titulo="App Pasajero"
            subtitulo="— Para vos"
            play={APP_PASAJERO_PLAY}
            ios={APP_PASAJERO_IOS}
            color="var(--eco-flame)"
          />
          <StoreCard
            titulo="App Conductor"
            subtitulo="— Para trabajar"
            play={APP_CHOFER_PLAY}
            ios={APP_CHOFER_IOS}
            color="var(--eco-flame)"
          />
        </div>

        <div className="mt-20 text-center">
          <h3 className="eco-display text-[28px] md:text-[40px] text-[var(--eco-ink)] mb-6">
            ¿Por qué la app si ya pido por WhatsApp?
          </h3>
          <div className="grid md:grid-cols-3 gap-6 mt-8 text-left">
            <div className="border border-[var(--eco-line)] p-6 rounded-2xl">
              <div className="eco-mono text-[var(--eco-flame)] mb-2">— 01</div>
              <h4 className="eco-display text-[22px] text-[var(--eco-ink)] mb-3">Mapa GPS en vivo</h4>
              <p className="text-sm text-[var(--eco-ink-soft)] leading-relaxed">
                Ves a tu chofer venir en el mapa. Tu familia puede seguir tu viaje en tiempo real.
              </p>
            </div>
            <div className="border border-[var(--eco-line)] p-6 rounded-2xl">
              <div className="eco-mono text-[var(--eco-flame)] mb-2">— 02</div>
              <h4 className="eco-display text-[22px] text-[var(--eco-ink)] mb-3">BilleteraEco</h4>
              <p className="text-sm text-[var(--eco-ink-soft)] leading-relaxed">
                Recarga una vez, paga al toque. Bono S/.5 al primer viaje. Cashback automático.
              </p>
            </div>
            <div className="border border-[var(--eco-line)] p-6 rounded-2xl">
              <div className="eco-mono text-[var(--eco-flame)] mb-2">— 03</div>
              <h4 className="eco-display text-[22px] text-[var(--eco-ink)] mb-3">Club + Ranking</h4>
              <p className="text-sm text-[var(--eco-ink-soft)] leading-relaxed">
                Ves tu nivel, tus Números de Socio, las próximas ediciones del sorteo de auto eléctrico.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative py-12 border-t border-[var(--eco-line)] mt-16">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="eco-mono text-[var(--eco-ink-soft)] text-sm">
            EcoDrive+ © 2026 — Perú
          </div>
          <div className="flex gap-6 eco-mono text-sm">
            <Link href="/ecodriveplus" className="text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)]">Inicio</Link>
            <Link href="/ecodriveplus/club" className="text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)]">Club</Link>
            <a href={PASAJERO_WA} className="text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)]">Soporte</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
