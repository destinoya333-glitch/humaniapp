import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description:
    "Términos y condiciones de uso de ActivosYA, marketplace de activos digitales en Latinoamérica.",
};

export default function TerminosPage() {
  return (
    <LegalLayout
      title="Términos y Condiciones"
      subtitle="Las reglas que rigen el uso de ActivosYA, su catálogo y los activos digitales que ofrecemos."
      lastUpdated="26 de abril de 2026"
    >
      <h2>1. Quiénes somos</h2>
      <p>
        ActivosYA (en adelante, &quot;la Plataforma&quot; o &quot;nosotros&quot;) es un marketplace
        de activos digitales — plataformas SaaS llave-en-mano — operado desde
        Perú. Estos términos rigen la relación entre la Plataforma y dos tipos
        de usuarios: <strong>Operadores</strong> (emprendedores que adquieren o
        rentan activos para revenderlos bajo su propia marca) y{" "}
        <strong>Usuarios Finales</strong> (clientes que consumen los servicios
        a través de operadores o de productos directos de ActivosYA).
      </p>

      <h2>2. Aceptación de los términos</h2>
      <p>
        Al usar cualquier servicio, sitio web o subdominio de ActivosYA
        (incluidos <code>activosya.com</code>, <code>sofia.activosya.com</code>,{" "}
        <code>destino.activosya.com</code>, <code>novia.activosya.com</code>,{" "}
        <code>pedido.activosya.com</code>, <code>reserva.activosya.com</code>),
        aceptas estos términos. Si no estás de acuerdo, no debes usar la
        Plataforma.
      </p>

      <h2>3. Servicios para Operadores</h2>
      <h3>3.1 Modelos de adquisición</h3>
      <p>Ofrecemos dos modelos de acceso a los activos del catálogo:</p>
      <ul>
        <li>
          <strong>Renta mensual</strong>: licencia de uso bajo suscripción.
          Acceso a código, dominio personalizado, soporte y actualizaciones.
          Precio publicado en cada ficha del activo.
        </li>
        <li>
          <strong>Compra única</strong>: adquisición total del activo digital.
          Incluye código, base de usuarios existente y transición técnica.
          Precio sujeto a cotización individual.
        </li>
      </ul>

      <h3>3.2 Onboarding y soporte</h3>
      <p>
        Cada activo incluye onboarding técnico de 7 a 14 días hábiles y soporte
        prioritario por 90 días naturales desde la firma del contrato. Después
        de los 90 días, el operador puede contratar soporte extendido a tarifa
        publicada o continuar de forma autónoma.
      </p>

      <h3>3.3 Garantías y responsabilidad</h3>
      <p>
        Las métricas declaradas en cada ficha de activo (MRR, retención,
        margen) son <strong>proyecciones basadas en pilotos reales</strong>.
        ActivosYA no garantiza resultados específicos para el operador, que
        dependen de su ejecución, marketing y mercado objetivo. Sí garantizamos
        el funcionamiento técnico del activo conforme a las especificaciones.
      </p>

      <h2>4. Servicios para Usuarios Finales</h2>
      <p>
        Los productos directos de ActivosYA (Miss Sofia, TuDestinoYa,
        TuNoviaIA, TuPedidoYa, TuReservaYa) son servicios de inteligencia
        artificial conversacional. El usuario reconoce que:
      </p>
      <ul>
        <li>Las respuestas son generadas por modelos de IA, no por humanos.</li>
        <li>
          Los servicios de orientación (astrología, tarot, profesional) tienen
          fines de entretenimiento y reflexión personal — no sustituyen
          asesoría legal, médica, financiera ni psicológica profesional.
        </li>
        <li>
          La precisión y disponibilidad están sujetas a la calidad del modelo
          IA en uso (Claude, ElevenLabs, otros) y a la conectividad del
          usuario.
        </li>
      </ul>

      <h2>5. Pagos y facturación</h2>
      <h3>5.1 Métodos de pago aceptados</h3>
      <p>
        Yape, Plin, transferencia bancaria, tarjetas vía Culqi y Stripe.
        Los pagos internacionales se procesan vía Stripe en USD. Los precios
        en soles incluyen IGV cuando aplique.
      </p>
      <h3>5.2 Recurrencias</h3>
      <p>
        Los planes de suscripción se renuevan automáticamente al vencimiento.
        El usuario puede cancelar en cualquier momento desde su panel o por
        WhatsApp; la cancelación se aplica al final del período pagado.
      </p>
      <h3>5.3 Facturación electrónica</h3>
      <p>
        Para Operadores con RUC, emitimos factura electrónica conforme a la
        normativa SUNAT. Para Usuarios Finales, emitimos boleta electrónica.
      </p>

      <h2>6. Propiedad intelectual</h2>
      <p>
        ActivosYA conserva la propiedad del código fuente, modelos entrenados,
        prompts y arquitectura de cada activo, salvo en el modelo de{" "}
        <strong>compra única</strong>, donde la propiedad se transfiere al
        operador adquirente conforme al contrato firmado. En el modelo de
        renta, el operador recibe una licencia de uso comercial mientras dure
        la suscripción activa.
      </p>

      <h2>7. Uso permitido</h2>
      <p>El usuario y el operador se comprometen a NO utilizar la Plataforma para:</p>
      <ul>
        <li>Actividades ilegales o que vulneren derechos de terceros.</li>
        <li>
          Contenido que promueva odio, violencia, fraude, explotación sexual
          de menores u otros contenidos prohibidos por ley peruana o
          internacional.
        </li>
        <li>Ingeniería inversa con fines maliciosos o copia no autorizada.</li>
        <li>Spam masivo o abuso de los canales de WhatsApp Business.</li>
      </ul>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        ActivosYA no será responsable por daños indirectos, lucro cesante,
        pérdida de datos o consecuencias derivadas del uso de los servicios
        más allá del monto efectivamente pagado por el usuario en los últimos
        12 meses. Los servicios se entregan &quot;tal cual&quot; con las
        garantías expresamente declaradas en estos términos.
      </p>

      <h2>9. Modificaciones</h2>
      <p>
        Podemos actualizar estos términos en cualquier momento. Las
        modificaciones se publican en esta página con la fecha de
        actualización. Los cambios significativos se notificarán por email a
        operadores con suscripción activa con al menos 30 días de anticipación.
      </p>

      <h2>10. Jurisdicción y ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República del Perú. Las
        controversias se someterán a los jueces y tribunales de la ciudad de
        Lima, salvo acuerdo arbitral previo. Los usuarios consumidores
        conservan los derechos que les otorga el Código de Protección y Defensa
        del Consumidor (Ley 29571).
      </p>

      <h2>11. Contacto</h2>
      <p>
        Para reclamos, consultas o ejercicio de derechos: WhatsApp{" "}
        <a href="https://wa.me/51961347233">+51 961 347 233</a> o por el{" "}
        <a href="/#contacto">formulario de contacto</a>. Respondemos en menos
        de 24 horas hábiles.
      </p>
    </LegalLayout>
  );
}
