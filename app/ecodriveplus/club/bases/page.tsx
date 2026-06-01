import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Bases legales — EcoDrive+ Club",
  description: "Bases legales notariadas del programa de membresía con bonificación de sorteo. EcoDrive Plus SAC RUC 20613413228.",
  alternates: { canonical: "https://ecodriveplus.com/club/bases" },
};

export default function BasesPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <section className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/ecodriveplus/club" className="text-[#E1811B] text-sm mb-6 inline-block">
          ← Volver al Club
        </Link>
        <h1 className="text-4xl font-bold mb-3">Bases legales</h1>
        <p className="text-gray-400 mb-10">
          Programa EcoDrive+ Club. Documento en proceso de legalización ante notario Olva Huanchaco.
        </p>

        <article className="prose prose-invert max-w-none space-y-6">
          <Clause n={1} t="Organizador">
            <p>
              EcoDrive Plus SAC, con RUC <strong>20613413228</strong>, domicilio fiscal en Trujillo, La Libertad, Perú.
              Programa amparado en <strong>DS 006-2000-ITINCI Art. 2 inciso b</strong> — promociones que incentivan
              la venta de bienes o servicios reales, sin requerir autorización Mincetur.
            </p>
          </Clause>
          <Clause n={2} t="Naturaleza del programa">
            <p>
              Programa de membresía denominado <strong>EcoDrive+ Club</strong>, mediante el cual el participante
              accede a beneficios tangibles del ecosistema EcoDrive+ y recibe como bonificación uno o más números
              de participación en sorteos de vehículos eléctricos cuando se cumple la meta de venta de la edición vigente.
            </p>
          </Clause>
          <Clause n={3} t="Modalidad de participación">
            <ul>
              <li>
                <strong>Club Pass</strong>: S/.30 (precio único). Cada Pass está atado a la edición vigente al momento
                de compra y otorga <strong>1 (uno) número del sorteo</strong> del premio de esa edición específica. Una vez
                ejecutado el sorteo de la edición, el Pass cumple su finalidad y no se traslada a ediciones posteriores.
              </li>
              <li>
                <strong>Bonus de lealtad</strong>: el miembro que adquirió Pass en una edición anterior cerrada o sorteada
                accede a un descuento de <strong>S/.3</strong> al adquirir Pass en la edición vigente (precio efectivo S/.27).
                El descuento es fijo, sin acumulación por número de ediciones previas.
              </li>
              <li>
                <strong>Cap máximo</strong>: hasta <strong>9 Pass por DNI por edición vigente</strong>. El contador se reinicia
                cuando la edición se cierra y abre la siguiente.
              </li>
              <li>
                Modalidad única. El programa NO ofrece tickets sueltos ni rifas independientes — toda
                participación deriva exclusivamente de la membresía Club Pass.
              </li>
            </ul>
          </Clause>
          <Clause n={4} t="Beneficios reales que incluye el Pass">
            <p>
              Además del número del sorteo, cada Pass otorga acceso a beneficios tangibles del ecosistema
              EcoDrive+ y ActivosYA durante un plazo de 30 días calendario contados desde la activación,
              salvo indicación expresa de duración distinta.
            </p>
            <ul>
              <li>
                <strong>A1 — Descuento BilleteraEco 3%</strong>: durante 30 días, cualquier recarga o uso de la
                billetera in-app EcoDrive+ recibe 3% de descuento.
              </li>
              <li>
                <strong>A2 — Cashback boost 5%</strong>: el cashback fijo del pasajero se incrementa al 5% durante
                30 días, por encima del % de su nivel actual en EcoDrive+ (0.3% — 2.7% según nivel).
              </li>
              <li>
                <strong>A3 — Exoneración de comisión (conductor)</strong>: los conductores EcoDrive+ activos
                ejecutan los primeros 18 viajes del mes de compra del Pass con 0% de comisión.
              </li>
              <li>
                <strong>B1 — Prioridad operativa</strong>: asignación prioritaria de chofer en zonas y horarios de
                alta demanda.
              </li>
              <li>
                <strong>B2 — Acceso anticipado</strong>: 24 a 48 horas de prelación para adquirir Pass en la siguiente
                edición, antes de la apertura al público general.
              </li>
              <li>
                <strong>B3 — Pre-asignación de número</strong>: posibilidad de seleccionar número específico
                (capicúa, palíndromo, fecha personal) antes del random, dentro del pool disponible.
              </li>
              <li>
                <strong>C1 — Miss Sofia 30 días</strong>: acceso completo al curso de idiomas con IA por 30 días.
              </li>
              <li>
                <strong>C2 — Activos digitales beta</strong>: acceso a TuDestinoYa y TuCuentoYa durante la vigencia
                del Pass.
              </li>
              <li>
                <strong>C3 — Sorteos secundarios</strong>: participación en sorteos consuelo (cenas, viajes, vouchers)
                ejecutados antes del sorteo principal de la edición.
              </li>
              <li>
                <strong>C4 — Distintivo Pass holder</strong>: insignia y avatar exclusivos en la aplicación EcoDrive+
                mientras el Pass se encuentre vigente.
              </li>
            </ul>
            <p>
              La activación efectiva de cada beneficio depende de la disponibilidad operativa de los sistemas
              respectivos. La indisponibilidad temporal de un beneficio individual no afecta la validez del
              Pass ni del número de sorteo asignado.
            </p>
          </Clause>
          <Clause n={5} t="Premio y ediciones">
            <p>
              Cada edición tiene un premio definido (típicamente un vehículo 100% eléctrico). La edición #1 es:
              <strong> BYD Yuan Pro, 320 km de autonomía, kilometraje 16,000 km</strong>, valor referencial
              S/.60,000. El premio se entrega mediante transferencia notarial en notaría Olva Huanchaco.
            </p>
          </Clause>
          <Clause n={6} t="Mecánica del sorteo">
            <p>
              Al asignarse el número 3,000 de la edición vigente entre los miembros del programa, el Organizador
              programa el sorteo en vivo dentro de los <strong>7 (siete) días calendario</strong> siguientes. El
              acto se ejecuta presencialmente con la siguiente mecánica:
            </p>
            <ul>
              <li>Notario público <strong>Olva (Huanchaco)</strong> presente y dando fe del acto.</li>
              <li>Casino/ánfora oficial con <strong>3,000 tarjetas físicas numeradas correlativamente</strong>
                  (una por cada número asignado a miembros), depositadas en presencia del notario.</li>
              <li>El notario revuelve el ánfora y extrae una sola tarjeta al azar, frente a cámara, sin que
                  ninguna persona del equipo intervenga en la selección.</li>
              <li>El número extraído es el ticket ganador. El notario lo anuncia y se contacta al ganador
                  por WhatsApp en el mismo acto.</li>
              <li>Como <strong>sello de transparencia adicional</strong>, en el momento del sorteo se publica
                  el hash del último bloque de la blockchain Bitcoin (referencia:
                  https://blockchain.info/q/latesthash). Este hash queda registrado en el acta notarial y
                  garantiza que la fecha y hora exactas del sorteo son inalterables y verificables por
                  cualquier tercero.</li>
              <li>El sorteo se transmite en vivo por las cuentas oficiales de EcoDrive+ en Facebook,
                  Instagram y TikTok. La grabación queda publicada permanentemente en
                  https://ecodriveplus.com/club/historial.</li>
            </ul>
          </Clause>
          <Clause n={7} t="Plazo de venta, re-rifa y reembolso">
            <p>
              Cada edición tiene un plazo máximo de <strong>12 meses calendario</strong> desde su apertura para
              alcanzar la meta de 3,000 números asignados. Si transcurrido ese plazo no se alcanza la meta, se
              ejecuta una <strong>prórroga de venta de hasta 6 meses adicionales</strong>. Si tras dicha prórroga
              subsiste el incumplimiento, se procede al <strong>reembolso íntegro del importe pagado</strong> por
              cada miembro de esa edición, sin descuentos ni penalidades. Los Pass se anulan y los miembros
              quedan habilitados para adquirir Pass en ediciones futuras conservando los beneficios de lealtad
              que correspondan.
            </p>
          </Clause>
          <Clause n={8} t="Plazo de entrega del premio">
            <p>
              El ganador dispone de 30 días calendario desde la notificación oficial para reclamar el premio y
              completar la transferencia notarial. Pasado dicho plazo sin respuesta verificable, EcoDrive Plus
              SAC se reserva el derecho a ejecutar un segundo sorteo entre los participantes restantes.
            </p>
          </Clause>
          <Clause n={9} t="Exclusiones">
            <p>
              No podrán participar: socios, trabajadores, asesores y familiares directos (hasta segundo grado)
              de EcoDrive Plus SAC, ni proveedores que tengan injerencia operativa en la edición.
            </p>
          </Clause>
          <Clause n={10} t="Datos personales">
            <p>
              EcoDrive Plus SAC trata los datos personales (DNI, nombres, WhatsApp, email) conforme a la
              <strong> Ley N° 29733</strong> de Protección de Datos Personales. Finalidad exclusiva: validar
              compra, notificar resultado del sorteo y emitir factura SUNAT. No se ceden a terceros. El titular
              puede ejercer derechos ARCO escribiendo a <strong>privacidad@ecodriveplus.com</strong>.
            </p>
          </Clause>
          <Clause n={11} t="Facturación">
            <p>
              Cada compra de Club Pass genera factura electrónica SUNAT con IGV incluido, emitida bajo el
              RUC 20613413228. El comprobante se envía al email registrado por el miembro en un plazo
              máximo de 48 horas hábiles.
            </p>
          </Clause>
          <Clause n={12} t="Jurisdicción">
            <p>
              Las controversias se resuelven de buena fe entre las partes. En su defecto, son competentes los
              tribunales de Trujillo, La Libertad, Perú. El consumidor puede acudir a <strong>INDECOPI</strong>
              en defensa de sus derechos.
            </p>
          </Clause>
        </article>

        <div className="mt-12 p-6 bg-yellow-500/10 border border-yellow-500/40 rounded-xl text-sm text-gray-300">
          <strong className="text-yellow-300">⚠️ Versión preliminar.</strong> Este documento está en proceso de
          legalización ante notario Olva Huanchaco. La versión notariada estará disponible para descarga en PDF
          desde esta misma página antes de la apertura oficial de la edición #1.
        </div>
      </section>
    </main>
  );
}

function Clause(props: { n: number; t: string; children: React.ReactNode }) {
  return (
    <section className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-3">
        <span className="text-[#E1811B] mr-2">{props.n}.</span>
        {props.t}
      </h2>
      <div className="text-gray-300 leading-relaxed">{props.children}</div>
    </section>
  );
}
