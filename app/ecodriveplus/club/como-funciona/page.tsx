import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cómo funciona EcoDrive+ Club — Membresía anual y FAQ",
  description: "Mecánica del programa Club: Membresía anual, bonus por lealtad, beneficios chofer/pasajero, sorteo con notario y acta blockchain.",
  alternates: { canonical: "https://ecodriveplus.com/club/como-funciona" },
};

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "¿Qué es la Membresía Club?",
    a: "Es la membresía del programa EcoDrive+ Club. Pagás S/.30 y obtenés 1 número del sorteo del carro de la edición vigente, más una lista de beneficios reales en EcoDrive+ y los activos digitales de ActivosYA (cashback boost, descuento en BilleteraEco, prioridad de chofer, Miss Sofia 30 días, etc.). El programa NO vende tickets sueltos — la única forma de participar es haciéndose Miembro.",
  },
  {
    q: "¿Cómo se ejecuta el sorteo?",
    a: "Al asignarse el número 3,000 de la edición entre los miembros del programa, programamos el sorteo en vivo (típicamente 3 a 7 días después). En la fecha se transmite por Facebook, Instagram y TikTok desde el local de EcoDrive+ Trujillo, con notario Olva Huanchaco presente y un casino/ánfora oficial con 3,000 tarjetas numeradas. El notario revuelve, saca una tarjeta al azar y anuncia el número ganador frente a cámara. Acto seguido se llama al ganador por WhatsApp. El notario levanta acta. Como sello de transparencia adicional, publicamos el hash del bloque público de Bitcoin del momento exacto del sorteo — eso garantiza que la fecha y hora del acta son inalterables y verificables por cualquiera en blockchain.info.",
  },
  {
    q: "Si me hago Miembro hoy y el sorteo es la próxima semana, ¿con cuántos números participo?",
    a: "Con 1 número (1 Membresía = 1 número del sorteo de esa edición). Cada Membresía está atada a la edición en que se compra — cuando se sortea ese carro, esa Membresía ya cumplió. Para el siguiente carro arranca una edición nueva con tickets nuevos.",
  },
  {
    q: "¿Y el bonus por lealtad cómo funciona?",
    a: "Si ya tenés una Membresía de una edición pasada y volvés a comprar Membresía en la siguiente edición, te cobramos S/.27 en vez de S/.30 (S/.3 de descuento por ser miembro recurrente). Sin acumulación: el descuento es siempre S/.3, no importa cuántas ediciones anteriores hayas comprado. Es un agradecimiento concreto a los que vuelven.",
  },
  {
    q: "¿Puedo comprar más de una Membresía?",
    a: "Sí, hasta 9 Membresías por DNI por mes (mientras dura la edición vigente). Cada Membresía te suma 1 número distinto. El contador se resetea cuando cierra la edición y abre la siguiente.",
  },
  {
    q: "¿Qué pasa si no se completan los 3,000 números nunca?",
    a: "Las bases legales contemplan re-rifa por hasta 6 meses adicionales. Si tras ese plazo no se llega a la meta, se reembolsa el 100% del dinero a todos los miembros afectados.",
  },
  {
    q: "Soy chofer EcoDrive+, ¿cuál es mi beneficio extra?",
    a: "Los primeros 18 viajes del mes en que compraste la Membresía van sin comisión EcoDrive+. Equivale a ganar S/.13-20 extra ese mes, MÁS tu participación en el sorteo.",
  },
  {
    q: "Soy pasajero EcoDrive+, ¿cuál es mi beneficio extra?",
    a: "Tu cashback en viajes salta a 5% fijo durante 30 días (por encima del % de tu nivel actual, que va de 0.3% Iniciante a 2.7% Diamante). En un consumo típico de S/.200/mes ahorrás ~S/.10 extra. Además: 3% de descuento en BilleteraEco durante esos 30 días.",
  },
  {
    q: "¿Puedo elegir mi número?",
    a: "El número se asigna aleatoriamente del pool disponible al momento de activar tu Membresía. Si tenés más de 1 Membresía, recibís un número distinto por cada una.",
  },
  {
    q: "¿Cómo pago?",
    a: "Directo en la web, con tarjeta o Yape, de forma segura a través de Culqi (la pasarela de pagos). Apenas se aprueba el pago tu Membresía queda activada al instante y te llega por WhatsApp tu confirmación y tu número — sin subir capturas ni esperar validación manual.",
  },
  {
    q: "¿Cómo entregan el auto al ganador?",
    a: "Transferencia notarial en notaría Olva Huanchaco, plazo máximo 30 días post-sorteo. Si el ganador vive fuera de Trujillo, podemos coordinar la entrega en su ciudad (con cargo de logística a evaluar caso por caso).",
  },
  {
    q: "¿Esto es legal? ¿No necesita autorización Mincetur?",
    a: "Sí es legal. EcoDrive+ Club es un programa de membresía con bonificación de sorteo, amparado en DS 006-2000-ITINCI Art. 2 inc. b. Como se vende membresía (Membresía con beneficios reales del ecosistema EcoDrive+ — cashback boost, descuento BilleteraEco, prioridad de chofer, activos digitales) y NO ticket suelto independiente, no requiere autorización Mincetur. Las bases están notariadas. Reclamos vía INDECOPI Perú.",
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
        <Link href="/ecodriveplus/club" className="text-[#E1811B] text-sm mb-6 inline-block">
          ← Volver al Club
        </Link>
        <h1 className="text-4xl font-bold mb-3">Cómo funciona EcoDrive+ Club</h1>
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
            href="https://wa.me/51994810242?text=Hola,%20tengo%20una%20pregunta%20de%20Club%20EcoDrive%2B"
            className="inline-block bg-[#E1811B] text-black px-6 py-3 rounded-full font-bold"
          >
            Escribinos por WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
