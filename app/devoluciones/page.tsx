import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "Política de Devoluciones",
  description:
    "Garantía de 30 días para operadores B2B. Política clara para suscripciones B2C. Cómo solicitar reembolsos en ActivosYA.",
};

export default function DevolucionesPage() {
  return (
    <LegalLayout
      title="Política de Devoluciones"
      subtitle="Sin sorpresas, sin letra chica. Así funcionan las devoluciones en ActivosYA según el tipo de servicio."
      lastUpdated="26 de abril de 2026"
    >
      <h2>1. Resumen rápido</h2>
      <ul>
        <li>
          <strong>Operadores B2B</strong>: garantía de 30 días si las métricas
          declaradas no se cumplen en condiciones de operación normal.
        </li>
        <li>
          <strong>Suscripciones B2C (Miss Sofia, TuDestinoYa, TuNoviaIA)</strong>:
          puedes cancelar cuando quieras; no reembolsamos pagos por períodos
          ya consumidos.
        </li>
        <li>
          <strong>Consultas individuales B2C</strong>: una vez entregada la
          consulta, no es reembolsable. Si el sistema falló y no recibiste
          respuesta, sí.
        </li>
      </ul>

      <h2>2. Devoluciones para Operadores (B2B)</h2>
      <h3>2.1 Garantía de 30 días</h3>
      <p>
        Si en los primeros 30 días naturales después del lanzamiento técnico
        del activo, las métricas declaradas en su ficha (MRR, retención,
        margen) <strong>no se aproximan razonablemente</strong> al rango
        proyectado en condiciones normales de operación, devolvemos el 100%
        del setup pagado y los días de licencia no consumidos.
      </p>
      <h3>2.2 Qué se considera &quot;condiciones normales de operación&quot;</h3>
      <ul>
        <li>El operador realizó el onboarding y siguió las recomendaciones técnicas.</li>
        <li>
          El operador hizo esfuerzos de marketing razonables para atraer al
          menos 100 usuarios elegibles al activo.
        </li>
        <li>
          La caída de métricas no se debe a cambios externos al activo
          (ej. modificaciones que el operador hizo al motor por su cuenta).
        </li>
      </ul>
      <h3>2.3 Qué NO cubre la garantía</h3>
      <ul>
        <li>Decisión subjetiva del operador (ej. &quot;no me gustó cómo se ve&quot;).</li>
        <li>Cambios de mercado o regulatorios fuera de nuestro control.</li>
        <li>Daños o modificaciones causados por el operador o terceros.</li>
      </ul>
      <h3>2.4 Cómo solicitar la devolución</h3>
      <p>
        Envíanos por WhatsApp <a href="https://wa.me/51961347233">+51 961 347 233</a> o
        por email los siguientes datos:
      </p>
      <ul>
        <li>Activo adquirido y fecha de lanzamiento técnico.</li>
        <li>Métricas reales obtenidas en los primeros 30 días.</li>
        <li>Acciones de marketing ejecutadas durante ese período.</li>
        <li>Razón específica por la cual el activo no funcionó.</li>
      </ul>
      <p>
        Revisamos en hasta 7 días hábiles. Si procede, el reembolso se hace
        por el mismo medio de pago en hasta 14 días hábiles adicionales.
      </p>

      <h2>3. Devoluciones para Usuarios Finales (B2C)</h2>
      <h3>3.1 Suscripciones (Miss Sofia, TuDestinoYa Plan VIP, TuNoviaIA Mensual)</h3>
      <p>
        Las suscripciones se renuevan automáticamente. Puedes cancelar en
        cualquier momento desde tu panel o por WhatsApp. La cancelación se
        aplica al final del período pagado: <strong>no reembolsamos
        suscripciones por períodos ya consumidos</strong>.
      </p>
      <p>
        Excepción: si dentro de las primeras 24 horas de tu primer pago
        descubres un problema técnico que te impide usar el servicio, sí
        reembolsamos el 100%.
      </p>
      <h3>3.2 Consultas individuales (TuDestinoYa, sesiones por minuto)</h3>
      <p>
        Una vez la IA entrega la respuesta o la sesión se ha consumido, el
        servicio se considera prestado y no es reembolsable.
      </p>
      <p>
        Sí reembolsamos cuando:
      </p>
      <ul>
        <li>El sistema falló técnicamente y nunca recibiste tu consulta.</li>
        <li>El pago se descontó dos veces por el mismo servicio.</li>
        <li>La consulta entregada está en blanco o es claramente errónea por fallo del sistema.</li>
      </ul>
      <h3>3.3 Cómo solicitar el reembolso B2C</h3>
      <p>
        Escríbenos por WhatsApp <a href="https://wa.me/51961347233">+51 961 347 233</a> con:
      </p>
      <ul>
        <li>Nombre y número con el que pagaste.</li>
        <li>Servicio y fecha de la consulta.</li>
        <li>Captura del comprobante Yape o ID de la transacción Stripe.</li>
        <li>Descripción del problema.</li>
      </ul>
      <p>
        Resolvemos casos B2C en máximo 48 horas. Reembolso por el mismo medio
        de pago en hasta 7 días hábiles.
      </p>

      <h2>4. Cancelaciones de suscripción</h2>
      <p>
        Cancelar la renovación automática NO equivale a un reembolso.
        Significa que tu acceso continúa hasta el final del período pagado y
        después no se vuelve a cobrar.
      </p>

      <h2>5. Cambios entre planes</h2>
      <p>
        Si subes de plan (ej. Miss Sofia Pro → Elite), el cargo se prorratea
        por los días restantes. Si bajas de plan, el cambio se aplica al
        próximo ciclo de facturación.
      </p>

      <h2>6. Disputas con tu banco o procesador</h2>
      <p>
        Si tienes un problema con un cargo, contáctanos primero. La mayoría
        de los casos se resuelven en menos de 48 horas. Iniciar un chargeback
        sin contactarnos primero suspende automáticamente tu cuenta hasta que
        el caso se resuelva.
      </p>

      <h2>7. Tu derecho de retracto</h2>
      <p>
        Conforme al Código de Protección y Defensa del Consumidor (Ley 29571),
        tienes derecho a desistir de los servicios contratados a distancia
        dentro de las primeras 7 días, salvo que el servicio se haya prestado
        completamente con tu acuerdo expreso (lo cual aplica a las consultas
        IA individuales una vez entregadas).
      </p>

      <h2>8. Contacto</h2>
      <p>
        Para cualquier reclamo o solicitud de reembolso:{" "}
        <a href="https://wa.me/51961347233">WhatsApp +51 961 347 233</a> o el{" "}
        <a href="/#contacto">formulario de contacto</a>. Respondemos en
        menos de 24 horas hábiles.
      </p>
    </LegalLayout>
  );
}
