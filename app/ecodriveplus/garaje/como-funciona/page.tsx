import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cómo funciona EcoDrive+ Garaje — Membresía anual y FAQ",
  description: "Mecánica del programa Garaje: Pass anual, bonus por lealtad, beneficios chofer/pasajero, sorteo con notario y acta blockchain.",
  alternates: { canonical: "https://ecodriveplus.com/garaje/como-funciona" },
};

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "¿Qué es Garaje Pass?",
    a: "Es la membresía anual del programa EcoDrive+ Garaje. Pagás una sola vez S/.99 (o S/.69 si sos pasajero/chofer EcoDrive+) y quedás activo 12 meses. Durante esos 12 meses participás en cada edición del sorteo que se ejecute, con número(s) asignados a tu nombre. El programa NO vende tickets sueltos — la única forma de participar es haciéndose Pass.",
  },
  {
    q: "¿Cómo se ejecuta el sorteo?",
    a: "Al asignarse el número 3,000 de la edición entre los miembros del programa, programamos el sorteo en vivo (típicamente 3 a 7 días después). En la fecha se transmite por Facebook, Instagram y TikTok desde el local de EcoDrive+ Trujillo, con notario Olva Huanchaco presente y un casino/ánfora oficial con 3,000 tarjetas numeradas. El notario revuelve, saca una tarjeta al azar y anuncia el número ganador frente a cámara. Acto seguido se llama al ganador por WhatsApp. El notario levanta acta. Como sello de transparencia adicional, publicamos el hash del bloque público de Bitcoin del momento exacto del sorteo — eso garantiza que la fecha y hora del acta son inalterables y verificables por cualquiera en blockchain.info.",
  },
  {
    q: "Si me hago Pass hoy y el sorteo es la próxima semana, ¿con cuántos números participo?",
    a: "En esa edición participás con 1 número. Pero tu Pass sigue activo 12 meses, así que en las próximas ediciones (2-3 por año) participás con MÁS números gracias al bonus por lealtad: 2 en la siguiente, 3 en la subsiguiente, hasta 5.",
  },
  {
    q: "¿Puedo comprar más de un Pass?",
    a: "Sí, hasta 5 Pass por DNI. Cada Pass extra suma 1 número más por sorteo + duplica/triplica el beneficio in-app (más viajes sin comisión / más meses de cashback boost).",
  },
  {
    q: "¿Qué pasa si no se completan los 3,000 números nunca?",
    a: "Las bases legales contemplan re-rifa por hasta 6 meses adicionales. Si tras ese plazo no se llega a la meta, se reembolsa el 100% del dinero a todos los miembros afectados.",
  },
  {
    q: "Soy chofer EcoDrive+, ¿cuál es mi beneficio extra?",
    a: "Los primeros 18 viajes del mes en que compraste el Pass van sin comisión EcoDrive+. Equivale a ganar S/.13-20 extra ese mes, MÁS tu participación en el sorteo.",
  },
  {
    q: "Soy pasajero EcoDrive+, ¿cuál es mi beneficio extra?",
    a: "Tu cashback en viajes sube de 5% a 10% durante el mes siguiente a tu compra del Pass. En un consumo típico ahorrás S/.10-20 extra.",
  },
  {
    q: "¿Puedo elegir mi número?",
    a: "El número se asigna aleatoriamente del pool disponible al momento de activar tu Pass. Si tenés más de 1 Pass, recibís un número distinto por cada uno.",
  },
  {
    q: "¿Cómo pago?",
    a: "Yape al 998 102 258 con la glosa que te indicamos (ej: GARAJE-0042). MacroDroid detecta el pago automático y en menos de 2 minutos te llega WhatsApp con tu Pass confirmado.",
  },
  {
    q: "¿Cómo entregan el auto al ganador?",
    a: "Transferencia notarial en notaría Olva Huanchaco, plazo máximo 30 días post-sorteo. Si el ganador vive fuera de Trujillo, podemos coordinar la entrega en su ciudad (con cargo de logística a evaluar caso por caso).",
  },
  {
    q: "¿Esto es legal? ¿No necesita autorización Mincetur?",
    a: "Sí es legal. EcoDrive+ Garaje es un programa de membresía con bonificación de sorteo, amparado en DS 006-2000-ITINCI Art. 2 inc. b. Como solo se vende membresía (Pass anual con beneficios reales del ecosistema EcoDrive+) y NO ticket suelto independiente, no requiere autorización Mincetur. Las bases están notariadas. Reclamos vía INDECOPI Perú.",
  },
  {
    q: "¿Quién está detrás del programa?",
    a: "EcoDrive Plus SAC, RUC 20613413228. Empresa peruana con operación rideshare en Trujillo. Te emitimos factura electrónica SUNAT por tu compra.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. Tratamos tus datos según Ley 29733 (Protección de Datos Personales). Solo usamos tu DNI para validar la compra y tu WhatsApp para notificarte del sorteo. No vendemos ni compartimos datos.",
  },
];

export default function ComoFunciona() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <section className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/ecodriveplus/garaje" className="text-[#E1811B] text-sm mb-6 inline-block">
          ← Volver al Garaje
        </Link>
        <h1 className="text-4xl font-bold mb-3">Cómo funciona EcoDrive+ Garaje</h1>
        <p className="text-gray-400 mb-10">Todo lo que querés saber del programa.</p>

        <div className="space-y-4">
          {FAQ.map((item, i) => (
            <details key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 group">
              <summary className="cursor-pointer font-bold text-lg flex items-center justify-between">
                {item.q}
                <span className="text-[#E1811B] group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-gray-300 mt-4 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 p-6 bg-[#E1811B]/10 border border-[#E1811B]/40 rounded-xl text-center">
          <p className="text-sm text-gray-300 mb-3">¿Más preguntas?</p>
          <a
            href="https://wa.me/51994810242?text=Hola,%20tengo%20una%20pregunta%20de%20Garaje%20EcoDrive%2B"
            className="inline-block bg-[#E1811B] text-black px-6 py-3 rounded-full font-bold"
          >
            Escribinos por WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
