import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TuDestinoYa — Consultas IA por WhatsApp · Tarot, astrología y más",
  description:
    "Plataforma de consultas IA por WhatsApp: astrología, lectura de palma, orientación profesional y exprés. Pagos Yape + planes VIP recurrentes. Activo digital de ActivosYA.",
};

const services = [
  { icon: "🔮", title: "Astrología personalizada", desc: "Carta natal, compatibilidad y predicciones según tu signo y fecha de nacimiento." },
  { icon: "✋", title: "Lectura de palma", desc: "Envía una foto de tu mano. Claude Vision analiza líneas y entrega lectura detallada en minutos." },
  { icon: "💼", title: "Orientación profesional", desc: "Decisiones de carrera, encrucijadas laborales, búsqueda de propósito. Respuestas claras y empáticas." },
  { icon: "⚡", title: "Servicio exprés", desc: "Pregunta puntual, respuesta concreta. Para cuando necesitas claridad ya y al menor costo." },
];

const features = [
  { icon: "🕐", title: "24/7 sin esperas", desc: "El bot responde al instante. Cero filas, cero citas, cero horarios." },
  { icon: "💎", title: "Planes VIP recurrentes", desc: "S/ 18/mes ilimitado · S/ 63/año. El cliente engancha, tú facturas predecible." },
  { icon: "💳", title: "Yape integrado", desc: "Cobro automático verificado por número y monto. Sin manuales, sin errores." },
  { icon: "🧠", title: "Memoria del cliente", desc: "Recuerda nombre, signo, consultas previas. Cada conversación se siente personal." },
  { icon: "📸", title: "Análisis de imágenes", desc: "Lectura de palma con Claude Vision. Detecta líneas, montes y características únicas." },
  { icon: "📊", title: "Dashboard del operador", desc: "MRR, suscriptores VIP, retención, top consultas. Métricas en tiempo real." },
];

const sampleChat = [
  { from: "user", text: "Hola, quiero saber qué me espera en el amor 💕" },
  { from: "bot", text: "✨ Bienvenida. Soy TuDestinoYa.\n\nElige una consulta:\n\n🔮 Astrología — S/ 6\n💼 Profesional — S/ 9\n⚡ Exprés — S/ 3\n\nO únete al *Plan VIP* (S/ 18/mes) y consulta sin límite." },
  { from: "user", text: "Astrología" },
  { from: "bot", text: "Perfecto. Para tu lectura amorosa necesito:\n\n📅 Tu fecha de nacimiento\n🕐 Hora aproximada\n📍 Lugar\n\nResponde en un solo mensaje y te entrego la lectura completa en 2 minutos." },
];

export default function TuDestinoYaPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero */}
      <section className="relative px-6 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="orb absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px]"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)" }}
          />
          <div
            className="orb absolute top-2/3 right-1/4 w-[400px] h-[400px]"
            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)", animationDelay: "3s" }}
          />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <Link
            href="https://activosya.com"
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-amber-400 transition-colors mb-8"
          >
            ← Volver a ActivosYA
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            Activo digital · Operativo
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Tu destino,{" "}
            <span className="gold-gradient-animated">por WhatsApp</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Astrología, lectura de palma, orientación profesional y consultas
            exprés. Respuestas reales de IA en minutos. Sin citas, sin esperas,
            sin pasar vergüenza con nadie.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/51961347233?text=Hola"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-amber-500 text-black rounded-full hover:bg-amber-400 transition-all glow-gold"
            >
              Probar ahora en WhatsApp →
            </a>
            <a
              href="https://activosya.com/#contacto"
              className="w-full sm:w-auto px-8 py-4 text-base font-medium border border-[#2A2A2A] text-zinc-300 rounded-full hover:border-amber-500/40 hover:text-white transition-all"
            >
              Adquirir el activo (B2B)
            </a>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-md mx-auto pt-8 border-t border-[#2A2A2A]">
            <div>
              <div className="text-2xl font-bold gold-gradient">S/ 18</div>
              <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">VIP mensual</div>
            </div>
            <div>
              <div className="text-2xl font-bold gold-gradient">24/7</div>
              <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">Disponible</div>
            </div>
            <div>
              <div className="text-2xl font-bold gold-gradient">2 min</div>
              <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">Respuesta</div>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section className="px-6 py-20 bg-[#0D0D0D]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Servicios disponibles</p>
            <h2 className="text-3xl md:text-4xl font-bold">4 tipos de consulta</h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {services.map((s) => (
              <div
                key={s.title}
                className="card-surface rounded-2xl p-6 hover:border-amber-500/30 transition-colors"
              >
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo chat */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Cómo funciona</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Escríbele.<br />
              <span className="gold-gradient">Recibe respuesta.</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-6">
              Sin descargar apps. Sin crear cuentas. Solo escribes &quot;hola&quot; y
              el bot te guía. Si te gusta, paga con Yape. Si quieres ilimitado,
              activa el plan VIP por S/ 18/mes.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-zinc-300">
              <li>✦ Detección de intención con Claude</li>
              <li>✦ Cobro automático Yape verificado</li>
              <li>✦ Memoria persistente por cliente</li>
              <li>✦ Lectura de palma con Claude Vision</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[#2A2A2A] bg-[#0F0F0F] p-5 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-[#2A2A2A] mb-4">
              <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-xs font-bold">
                ✨
              </div>
              <div>
                <p className="text-sm font-semibold">TuDestinoYa</p>
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
                      : "self-start bg-[#181818] border border-[#2A2A2A] rounded-bl-sm"
                  }`}
                >
                  <p className="text-zinc-200 whitespace-pre-line">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-[#0D0D0D]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Funcionalidades</p>
            <h2 className="text-3xl md:text-4xl font-bold">Todo el motor que necesitas</h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="card-surface rounded-2xl p-6 hover:border-amber-500/30 transition-colors"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plan VIP highlight */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="card-surface rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/8 to-transparent p-10 text-center">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Plan VIP</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Consulta sin límite por <span className="gold-gradient">S/ 18/mes</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-6 max-w-xl mx-auto">
              Acceso a los 4 tipos de consulta sin restricción. Renovación
              automática. Cancela cuando quieras. La forma más rentable de
              tener orientación constante.
            </p>
            <div className="grid grid-cols-2 gap-6 max-w-md mx-auto mb-8">
              <div>
                <div className="text-3xl font-bold gold-gradient">S/ 18</div>
                <p className="text-zinc-500 text-xs mt-1">Mensual</p>
              </div>
              <div>
                <div className="text-3xl font-bold gold-gradient">S/ 63</div>
                <p className="text-zinc-500 text-xs mt-1">Anual (ahorras 71%)</p>
              </div>
            </div>
            <a
              href="https://wa.me/51961347233?text=Quiero%20el%20Plan%20VIP"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors"
            >
              Activar Plan VIP →
            </a>
          </div>
        </div>
      </section>

      {/* B2B CTA */}
      <section className="px-6 py-20 bg-[#0D0D0D]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">¿Quieres operar TuDestinoYa con tu marca?</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Adquiere el activo digital
          </h2>
          <p className="text-zinc-400 leading-relaxed mb-8">
            Plataforma probada con flujo de caja recurrente. Tu marca,
            tu número de WhatsApp, tu Yape. Onboarding 7-14 días. Soporte 90
            días incluido. Modelo de renta mensual o compra única.
          </p>
          <a
            href="https://activosya.com/#contacto"
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors glow-gold"
          >
            Solicitar acceso al activo →
          </a>
          <p className="text-zinc-500 text-xs mt-4">
            Desde S/ 2,500/mes en modelo de renta · Compra disponible
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2A] py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <span>
            <span className="text-amber-400">✦</span> TuDestinoYa · Un activo de{" "}
            <Link href="https://activosya.com" className="hover:text-amber-400 transition-colors">
              ActivosYA
            </Link>
          </span>
          <span>Hecho en Perú · 2026</span>
        </div>
      </footer>
    </main>
  );
}
