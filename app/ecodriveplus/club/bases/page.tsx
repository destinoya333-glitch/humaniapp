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
                <strong>Club Pass anual</strong>: S/.99 (público) o S/.69 (interno EcoDrive+). Vigencia 12 meses
                desde la fecha de compra. Otorga 1 número en cada edición que se ejecute durante la vigencia,
                más bonus por lealtad (1 número adicional por cada edición consumida, hasta 5 totales por Pass por edición).
              </li>
              <li>Cap máximo: 5 Pass activos por DNI.</li>
              <li>
                Modalidad única. El programa NO ofrece tickets sueltos ni rifas independientes — toda
                participación deriva exclusivamente de la membresía Club Pass.
              </li>
            </ul>
          </Clause>
          <Clause n={4} t="Beneficios in-app para miembros internos">
            <ul>
              <li>
                <strong>Conductor EcoDrive+</strong>: los primeros 18 viajes del mes de compra del Pass se ejecutan
                con comisión 0% (exoneración total de la comisión EcoDrive+).
              </li>
              <li>
                <strong>Pasajero EcoDrive+</strong>: el cashback en viajes sube del 5% habitual al 10% durante
                30 días desde la fecha de compra.
              </li>
            </ul>
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
          <Clause n={7} t="Re-rifa y reembolso">
            <p>
              Si transcurren 12 meses calendario desde la apertura de la edición sin alcanzar la meta de 3,000
              números asignados, se procede con <strong>re-rifa por hasta 6 meses adicionales</strong>. Si tras
              dicho periodo subsiste el incumplimiento, se procede al <strong>reembolso íntegro</strong> del
              importe pagado por cada miembro afectado, sin descuentos ni penalidades. Los miembros mantienen
              sus números válidos durante toda la vigencia del proceso.
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
