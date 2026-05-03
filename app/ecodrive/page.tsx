import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "EcoDrive+ — Intermediación rideshare por WhatsApp · sin app",
  description:
    "Plataforma rideshare tipo InDrive 100% por WhatsApp. Cliente nombra su precio, conductores aceptan. Sin descargar app, sin comisión escandalosa. Activo digital de ActivosYA.",
};

const features = [
  { icon: "📱", title: "Sin app que descargar", desc: "Pasajero y conductor operan 100% por WhatsApp. Cero descargas, cero registros engorrosos." },
  { icon: "💸", title: "Cero comisión por viaje", desc: "El operador cobra membresía mensual al conductor (modelo predecible). Conductor gana 100% del viaje." },
  { icon: "🤝", title: "Modelo InDrive: tú nombras precio", desc: "Pasajero sugiere precio, conductor acepta o contraoferta. Sin tarifas dinámicas abusivas." },
  { icon: "📍", title: "Matching geolocalizado", desc: "Sistema notifica solo a conductores cercanos. Tiempo de respuesta promedio: 90 segundos." },
  { icon: "🚗", title: "Multi-categoría", desc: "Auto, moto, mototaxi, encomienda. Cada categoría con su tarifa base por ciudad." },
  { icon: "📊", title: "Panel del operador", desc: "Viajes en tiempo real, conductores activos, ingresos recurrentes de membresías, rutas más usadas." },
];

const sampleChat = [
  { from: "user", text: "Necesito un viaje del centro a Av. España. ¿Cuánto?" },
  { from: "bot", text: "🚗 Solicitud recibida.\n\nDe: Plaza Mayor (centro)\nA: Av. España\nDistancia: 4.2 km\n\nPrecio sugerido: S/ 8\n¿Confirmas? Responde el monto que quieras pagar." },
  { from: "user", text: "S/ 7" },
  { from: "bot", text: "✅ Solicitando S/ 7. Te aviso cuando un conductor acepte (1-2 minutos). 🚖" },
];

export default function EcoDrivePlusPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero */}
      <section className="relative px-6 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="orb absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px]"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)" }}
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
            Activo digital · 88 conductores en Trujillo
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Tu viaje,{" "}
            <span className="gold-gradient-animated">por WhatsApp</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sin descargar apps. Sin comisión escandalosa. Tú nombras tu precio,
            los conductores aceptan. Modelo InDrive sobre WhatsApp con
            membresía mensual para el conductor — gana el 100% de cada viaje.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/51961347233?text=Quiero%20probar%20EcoDrive%2B"
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

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-md mx-auto pt-8 border-t border-[#2A2A2A]">
            <div>
              <div className="text-2xl font-bold gold-gradient">88</div>
              <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">Conductores</div>
            </div>
            <div>
              <div className="text-2xl font-bold gold-gradient">231</div>
              <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">Clientes activos</div>
            </div>
            <div>
              <div className="text-2xl font-bold gold-gradient">0%</div>
              <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">Comisión por viaje</div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo chat */}
      <section className="px-6 py-16 bg-[#0D0D0D]">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Cómo funciona</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pides.<br />
              <span className="gold-gradient">Negocias.</span>
              <br />
              Viajas.
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-6">
              El pasajero envía origen, destino y precio sugerido. El sistema
              detecta conductores cercanos y los notifica. El primero que
              acepta se conecta directo con el pasajero. Sin intermediarios,
              sin comisión por viaje, sin demoras.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-zinc-300">
              <li>✦ Matching geolocalizado en 90 segundos</li>
              <li>✦ Pasajero negocia precio (modelo InDrive)</li>
              <li>✦ Conductor gana 100% del viaje</li>
              <li>✦ Plataforma cobra cargo mensual al conductor</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[#2A2A2A] bg-[#0F0F0F] p-5 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-[#2A2A2A] mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold">
                🚗
              </div>
              <div>
                <p className="text-sm font-semibold">EcoDrive+ Trujillo</p>
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
            <h2 className="text-3xl md:text-4xl font-bold">Todo lo que necesita una ciudad intermedia</h2>
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

      {/* Comparison */}
      <section className="px-6 py-16 bg-[#0D0D0D]">
        <div className="mx-auto max-w-4xl">
          <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase text-center">Vs. competencia</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
            Por qué gana el modelo
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="text-left py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Aspecto</th>
                  <th className="text-center py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Uber / DiDi</th>
                  <th className="text-center py-3 px-4 text-amber-400 font-medium uppercase tracking-widest text-xs">EcoDrive+</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Comisión por viaje", "25-30%", "0%"],
                  ["Requiere app", "Sí (passenger + driver)", "No, solo WhatsApp"],
                  ["Pasajero negocia precio", "No", "Sí"],
                  ["Modelo de cobro al driver", "% por viaje", "Membresía mensual fija"],
                  ["Funciona en ciudades intermedias", "Pobre", "Excelente"],
                  ["Ingreso del operador local", "Cero", "100% de membresías"],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-[#2A2A2A]/50">
                    <td className="py-3 px-4 text-zinc-300 font-medium">{row[0]}</td>
                    <td className="py-3 px-4 text-center text-zinc-500">{row[1]}</td>
                    <td className="py-3 px-4 text-center text-amber-400 font-semibold">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Sistema de niveles */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Sistema de niveles</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Mientras más viajas, más ganas
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Pasajeros y conductores suben de nivel acumulando servicios. Una vez subes,
              nunca bajas. Cada nivel desbloquea más beneficios reales.
            </p>
          </div>

          {/* Tabla pasajero */}
          <div className="mb-14">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              🧍 Niveles de pasajero <span className="text-zinc-500 text-sm font-normal">(recompensa escalada por viaje)</span>
            </h3>
            <div className="overflow-x-auto rounded-xl border border-[#2A2A2A]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0F0F0F] border-b border-[#2A2A2A]">
                    <th className="text-left py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Nivel</th>
                    <th className="text-center py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Servicios</th>
                    <th className="text-center py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Recompensa</th>
                    <th className="text-center py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Cancelaciones libres</th>
                    <th className="text-center py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Cargo tardío</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["🌱 Iniciante", "0 - 9", "0.3%", "1/día", "S/.2"],
                    ["🥉 Bronce", "10 - 18", "0.6%", "1/día", "S/.2"],
                    ["🥈 Plata", "19 - 33", "0.9%", "2/día", "S/.2"],
                    ["🥇 Oro", "34 - 63", "1.2%", "2/día +1 extra/mes", "S/.1.5"],
                    ["💎 Platino", "64 - 93", "1.5%", "3/día +2 extra/mes", "S/.1"],
                    ["💙 Zafiro", "94 - 123", "1.8%", "3/día +3 extra/mes", "Sin cargo"],
                    ["❤️ Rubí", "124 - 153", "2.1%", "5/día +4 extra/mes", "Sin cargo"],
                    ["💚 Esmeralda", "154 - 183", "2.4%", "Ilimitadas razonables", "Sin cargo"],
                    ["👑 Diamante", "184+", "2.7%", "Ilimitadas VIP", "Sin cargo"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-[#2A2A2A]/50 hover:bg-[#0F0F0F]/50">
                      <td className="py-3 px-4 text-zinc-200 font-medium">{row[0]}</td>
                      <td className="py-3 px-4 text-center text-zinc-400">{row[1]}</td>
                      <td className="py-3 px-4 text-center text-amber-400 font-semibold">{row[2]}</td>
                      <td className="py-3 px-4 text-center text-zinc-400 text-xs">{row[3]}</td>
                      <td className="py-3 px-4 text-center text-zinc-400">{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla chofer */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              🚗 Niveles de conductor <span className="text-zinc-500 text-sm font-normal">(comisión más baja del Perú: 6.3% → 3.9%)</span>
            </h3>
            <div className="overflow-x-auto rounded-xl border border-[#2A2A2A]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0F0F0F] border-b border-[#2A2A2A]">
                    <th className="text-left py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Nivel</th>
                    <th className="text-center py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Servicios</th>
                    <th className="text-center py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Comisión</th>
                    <th className="text-center py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Bono mensual</th>
                    <th className="text-left py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Beneficios destacados</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["🌱 Aspirante", "0 - 90", "6.3%", "S/.9", "🩺 Chequeo médico anual + bono S/.20 al primer servicio"],
                    ["🥉 Bronce", "91 - 270", "6.0%", "S/.27", "🩺 Chequeo + insignia + soporte prioritario"],
                    ["🥈 Plata", "271 - 450", "5.7%", "S/.45", "🩺 Chequeo + prioridad zonas cercanas"],
                    ["🥇 Oro", "451 - 750", "5.4%", "S/.75", "🩺 Chequeo + insignia Oro + zonas céntricas"],
                    ["💎 Platino", "751 - 1050", "5.1%", "S/.105", "🩺 Chequeo + servicios corporativos + constancia financiera express"],
                    ["💙 Zafiro", "1051 - 1850", "4.8%", "S/.135", "🩺 Chequeo + tarifa dinámica +5% en hora pico"],
                    ["❤️ Rubí", "1851 - 2890", "4.5%", "S/.195", "🩺 Chequeo + análisis · 💵 Préstamo S/.500 (1 mes) · 🎓 1 activo digital ActivosYA · ⭐ Foto destacada"],
                    ["💚 Esmeralda", "2891 - 3930", "4.2%", "S/.255", "🏥 Plan salud anual · 💵 Préstamo S/.1,000 (2 meses) · 🎓 2 activos digitales · ✈️ Vacaciones 3D/2N para 2 personas (S/.1,500/año) · 👥 Referidos doble"],
                    ["👑 Diamante", "3931+", "3.9%", "S/.315", "🏥 Plan salud familiar · 💵 Préstamo S/.1,500 (3 meses) · 🎓 3 activos digitales · ✈️ Vacaciones 3D/2N para 2 personas (S/.2,500/año) · 🎁 Sorteo anual · 🎄 Aguinaldo S/.500"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-[#2A2A2A]/50 hover:bg-[#0F0F0F]/50 align-top">
                      <td className="py-3 px-4 text-zinc-200 font-medium whitespace-nowrap">{row[0]}</td>
                      <td className="py-3 px-4 text-center text-zinc-400 whitespace-nowrap">{row[1]}</td>
                      <td className="py-3 px-4 text-center text-amber-400 font-semibold whitespace-nowrap">{row[2]}</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-semibold whitespace-nowrap">{row[3]}</td>
                      <td className="py-3 px-4 text-zinc-400 text-xs leading-relaxed">{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-zinc-500 text-xs mt-3 leading-relaxed">
              ✦ El bono mensual se abona el último día del mes a conductores activos (mínimo 10 servicios completados ese mes).<br />
              ✦ Préstamos sin intereses con descuento diario prorrateado de los servicios realizados.<br />
              ✦ Los activos digitales son productos del marketplace ActivosYA (Miss Sofia, TuDestinoYa, TuNoviaIA, TuPedidoYa, TuReservaYa) que el conductor canjea según su nivel.<br />
              ✦ Una vez subes de nivel, nunca bajas: la antigüedad cuenta de por vida.
            </p>
          </div>
        </div>
      </section>

      {/* B2B CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">¿Quieres operar EcoDrive+ en tu ciudad?</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Adquiere el activo y domina tu mercado local
          </h2>
          <p className="text-zinc-400 leading-relaxed mb-8">
            Modelo probado en Trujillo (88 conductores activos, 231 clientes).
            Tu marca, tu ciudad, tu base de datos. Lanzamos en 7-14 días con
            onboarding completo. Modelo de renta mensual o compra única.
          </p>
          <a
            href="https://activosya.com/#contacto"
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors glow-gold"
          >
            Solicitar acceso al activo →
          </a>
          <p className="text-zinc-500 text-xs mt-4">
            Desde S/ 2,200/mes en modelo de renta · Compra disponible
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2A] py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <span>
            <span className="text-amber-400">✦</span> EcoDrive+ · Un activo de{" "}
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
