import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Cómo ActivosYA recolecta, usa y protege tu información personal y datos de tu negocio.",
};

export default function PrivacidadPage() {
  return (
    <LegalLayout
      title="Política de Privacidad"
      subtitle="Tu información, tratada con el respeto que merece. Esta política explica qué datos recolectamos, por qué, y qué hacemos con ellos."
      lastUpdated="26 de abril de 2026"
    >
      <h2>1. Resumen rápido</h2>
      <p>
        En ActivosYA tomamos en serio tu privacidad. <strong>No vendemos tus
        datos a terceros.</strong> Solo recolectamos lo necesario para operar
        los servicios, y los protegemos con encriptación en tránsito y en
        reposo. Cumplimos con la Ley 29733 de Protección de Datos Personales
        del Perú.
      </p>

      <h2>2. Quién es responsable</h2>
      <p>
        ActivosYA es responsable del tratamiento de tus datos. Para cualquier
        consulta sobre privacidad, contacta a nuestro responsable de
        protección de datos por WhatsApp{" "}
        <a href="https://wa.me/51961347233">+51 961 347 233</a> o vía el{" "}
        <a href="/#contacto">formulario de contacto</a>.
      </p>

      <h2>3. Qué datos recolectamos</h2>
      <h3>3.1 De Operadores (clientes B2B)</h3>
      <ul>
        <li>Nombre completo, email, teléfono, RUC y razón social.</li>
        <li>Información de pago (procesada por Stripe/Culqi, no la almacenamos).</li>
        <li>Datos del activo que operan: usuarios, sesiones, métricas de negocio.</li>
        <li>Comunicaciones por WhatsApp, email o Slack para soporte.</li>
      </ul>
      <h3>3.2 De Usuarios Finales</h3>
      <ul>
        <li>Nombre y número de WhatsApp (cuando interactúas por ese canal).</li>
        <li>Email y datos de cuenta (si te registras en la web app).</li>
        <li>
          Contenido de las conversaciones con la IA, necesario para mantener
          memoria contextual y mejorar la experiencia.
        </li>
        <li>
          Datos de pago procesados por Yape, Culqi o Stripe (la información
          completa de tarjeta no llega a nuestros servidores).
        </li>
        <li>Métricas de uso, progreso (Miss Sofia), historial de consultas.</li>
      </ul>
      <h3>3.3 Datos automáticos</h3>
      <ul>
        <li>Dirección IP, navegador, sistema operativo, páginas visitadas.</li>
        <li>Cookies técnicas necesarias y cookies de analytics.</li>
      </ul>

      <h2>4. Por qué recolectamos estos datos</h2>
      <ul>
        <li>
          <strong>Operación del servicio</strong>: para que la IA pueda
          responderte, mantener sesiones, cobrar pagos.
        </li>
        <li>
          <strong>Soporte</strong>: para responder tus consultas y resolver
          incidencias.
        </li>
        <li>
          <strong>Mejora del producto</strong>: análisis agregado de uso, sin
          identificarte personalmente.
        </li>
        <li>
          <strong>Cumplimiento legal</strong>: facturación electrónica SUNAT,
          retención de evidencia para fines tributarios.
        </li>
      </ul>

      <h2>5. Procesadores de datos (terceros)</h2>
      <p>
        Compartimos datos estrictamente necesarios con estos proveedores
        técnicos, todos sujetos a sus propias políticas de privacidad y
        contratos de procesamiento de datos:
      </p>
      <ul>
        <li><strong>Vercel</strong> — hosting y entrega de las webs</li>
        <li><strong>Supabase</strong> — base de datos y autenticación</li>
        <li><strong>Twilio</strong> — envío de mensajes de WhatsApp</li>
        <li><strong>Anthropic (Claude)</strong> — procesamiento del lenguaje natural</li>
        <li><strong>ElevenLabs</strong> — síntesis de voz IA</li>
        <li><strong>Groq</strong> — transcripción de audio (Whisper)</li>
        <li><strong>Stripe / Culqi / Yape</strong> — procesamiento de pagos</li>
        <li><strong>Vercel Analytics / PostHog</strong> — métricas de uso del sitio</li>
        <li><strong>Resend</strong> — envío de emails transaccionales</li>
      </ul>

      <h2>6. Tiempo de conservación</h2>
      <ul>
        <li>
          <strong>Datos de cuenta activa</strong>: mientras tu cuenta exista.
        </li>
        <li>
          <strong>Conversaciones IA</strong>: hasta 12 meses después de la
          última interacción.
        </li>
        <li>
          <strong>Datos de facturación</strong>: 5 años (por exigencia
          tributaria peruana).
        </li>
        <li>
          <strong>Logs técnicos</strong>: 90 días, salvo investigación de
          incidentes.
        </li>
      </ul>

      <h2>7. Tus derechos</h2>
      <p>
        Conforme a la Ley 29733, tienes derecho a:
      </p>
      <ul>
        <li><strong>Acceso</strong>: solicitar copia de tus datos.</li>
        <li><strong>Rectificación</strong>: corregir datos inexactos.</li>
        <li><strong>Cancelación</strong>: pedir que eliminemos tus datos.</li>
        <li><strong>Oposición</strong>: rechazar usos específicos.</li>
        <li><strong>Portabilidad</strong>: recibir tus datos en formato estándar.</li>
      </ul>
      <p>
        Para ejercer cualquier derecho, contáctanos por{" "}
        <a href="https://wa.me/51961347233">WhatsApp</a>. Respondemos en hasta
        20 días hábiles.
      </p>

      <h2>8. Seguridad</h2>
      <ul>
        <li>Encriptación TLS 1.3 en todas las comunicaciones.</li>
        <li>Encriptación en reposo en Supabase (AES-256).</li>
        <li>Row Level Security (RLS) en todas las tablas multi-tenant.</li>
        <li>Backups diarios automatizados.</li>
        <li>Auditoría de accesos al panel de administración.</li>
      </ul>

      <h2>9. Cookies</h2>
      <p>
        Usamos cookies técnicas necesarias para el funcionamiento del sitio
        (sesión, preferencias) y cookies analíticas para entender qué
        funciona. Puedes configurarlas en tu navegador. Bloquear cookies
        técnicas puede degradar la experiencia.
      </p>

      <h2>10. Menores de edad</h2>
      <p>
        ActivosYA y sus productos están dirigidos a personas mayores de 18
        años. Si descubrimos datos de menores recolectados sin consentimiento
        de sus padres o tutores, los eliminaremos.
      </p>

      <h2>11. Transferencias internacionales</h2>
      <p>
        Algunos procesadores (Vercel, Anthropic, Stripe, ElevenLabs) operan en
        Estados Unidos y otros países. Solo trabajamos con proveedores que
        ofrecen garantías adecuadas equivalentes a la legislación peruana.
      </p>

      <h2>12. Cambios a esta política</h2>
      <p>
        Podemos actualizar esta política. La fecha de última actualización se
        muestra al inicio de la página. Los cambios significativos se
        notifican por email a usuarios con cuenta activa.
      </p>
    </LegalLayout>
  );
}
