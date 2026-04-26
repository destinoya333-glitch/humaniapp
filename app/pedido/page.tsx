import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TuPedidoYa — Pide por WhatsApp · sin app, sin filas",
  description:
    "Bot de pedidos por WhatsApp para pollerías, pizzerías y restaurantes. Tus clientes piden en segundos, tú vendes 24/7. Activo digital de ActivosYA.",
};

const features = [
  { icon: "⚡", title: "Pedidos en segundos", desc: "Menú interactivo por WhatsApp. Sin descargar apps, sin crear cuentas." },
  { icon: "🕐", title: "Atención 24/7", desc: "El bot atiende mientras tu cocina descansa. Programa horarios y promociones." },
  { icon: "🔔", title: "Cocina en tiempo real", desc: "Cada pedido llega a Telegram con detalle, hora y dirección. Cero confusión." },
  { icon: "📊", title: "Reportes diarios", desc: "Ventas, productos top, horas pico. Decisiones basadas en datos reales." },
  { icon: "💳", title: "Pagos integrados", desc: "Yape, Plin, transferencia. Confirmación automática. Cobras al instante." },
  { icon: "🚚", title: "Listo para delivery", desc: "Integración con motorizados o delivery propio. Tracking del pedido en vivo." },
];

const sampleChat = [
  { from: "user", text: "Hola, ¿qué tienen hoy?" },
  { from: "bot", text: "¡Hola! 👋 Estos son nuestros combos del día:\n\n🍗 1/4 pollo + papas: S/ 22\n🍗 1/2 pollo + papas: S/ 38\n🍗 Pollo entero: S/ 65" },
  { from: "user", text: "Quiero medio pollo" },
  { from: "bot", text: "Perfecto. ¿A qué dirección entregamos?" },
];

export default function TuPedidoYaPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero */}
      <section className="relative px-6 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="orb absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px]"
            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)" }}
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
            Activo digital · Beta operativa
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Tu pedido,{" "}
            <span className="gold-gradient-animated">por WhatsApp</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sin descargar apps. Sin filas. Sin perder tiempo.
            Tu pollería, pizzería o restaurante favorito atendiéndote 24/7
            por el chat que ya usas todos los días.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/51961347233?text=Quiero%20probar%20TuPedidoYa"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-amber-500 text-black rounded-full hover:bg-amber-400 transition-all glow-gold"
            >
              Probar demo en WhatsApp →
            </a>
            <a
              href="https://activosya.com/#contacto"
              className="w-full sm:w-auto px-8 py-4 text-base font-medium border border-[#2A2A2A] text-zinc-300 rounded-full hover:border-amber-500/40 hover:text-white transition-all"
            >
              Adquirir el activo (B2B)
            </a>
          </div>
        </div>
      </section>

      {/* Demo chat */}
      <section className="px-6 py-16 bg-[#0D0D0D]">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Así de simple</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              El cliente escribe.<br />
              <span className="gold-gradient">El bot vende.</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-6">
              Sin entrenamiento, sin complicaciones. Configura tu menú una vez
              y el bot atiende a tus clientes en segundos, recoge dirección,
              cobra y avisa a la cocina.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-zinc-300">
              <li>✦ Menú interactivo personalizado</li>
              <li>✦ Detección de intención con Claude</li>
              <li>✦ Cobra con Yape automático</li>
              <li>✦ Cocina recibe ticket en Telegram</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[#2A2A2A] bg-[#0F0F0F] p-5 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-[#2A2A2A] mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold">
                🍗
              </div>
              <div>
                <p className="text-sm font-semibold">Pollería El Roble</p>
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
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Funcionalidades</p>
            <h2 className="text-3xl md:text-4xl font-bold">Todo lo que tu negocio necesita</h2>
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

      {/* B2B CTA */}
      <section className="px-6 py-20 bg-[#0D0D0D]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">¿Eres dueño de un restaurante?</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Adquiere TuPedidoYa para tu negocio
          </h2>
          <p className="text-zinc-400 leading-relaxed mb-8">
            Plataforma llave-en-mano. Tu menú, tu marca, tu número de WhatsApp.
            Lanzamos en 7-14 días con onboarding completo y soporte 90 días.
            Modelo de renta mensual o compra única.
          </p>
          <a
            href="https://activosya.com/#contacto"
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors glow-gold"
          >
            Solicitar acceso al activo →
          </a>
          <p className="text-zinc-500 text-xs mt-4">
            Desde S/ 1,800/mes en modelo de renta · Compra disponible
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2A] py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <span>
            <span className="text-amber-400">✦</span> TuPedidoYa · Un activo de{" "}
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
