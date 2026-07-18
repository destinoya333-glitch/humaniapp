import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "Política de Privacidad — EcoDrive+",
  description:
    "Cómo EcoDrive+ recopila, usa, almacena y comparte tu información personal. Cumplimos con la Ley peruana 29733.",
};

export default function EcoDrivePrivacyPage() {
  return (
    <LegalLayout
      title="Política de Privacidad"
      subtitle="EcoDrive+ es la app local de viajes en Trujillo. Esta política explica qué datos recopilamos y cómo los usamos. Cumplimos la Ley peruana 29733."
      lastUpdated="14 de mayo de 2026"
      brand="ecodrive"
    >
      <h2>1. Quiénes somos</h2>
      <p>
        EcoDrive+ S.A.C. (en formación), Trujillo, La Libertad, Perú.
        Email legal: <a href="mailto:legal@ecodriveplus.com">legal@ecodriveplus.com</a>.
        Soporte: <a href="mailto:soporte@ecodriveplus.com">soporte@ecodriveplus.com</a>.
        WhatsApp: +51 965 470 319.
      </p>

      <h2>2. Qué datos recopilamos</h2>
      <h3>2.1 Datos que vos nos das directamente</h3>
      <ul>
        <li><strong>Identificación</strong>: nombre, apellido, fecha de nacimiento, foto opcional.</li>
        <li><strong>Contacto</strong>: correo electrónico, número de teléfono (Perú).</li>
        <li><strong>Documentación de chofer</strong>: DNI, brevete, foto del vehículo, SOAT.</li>
        <li><strong>Pagos</strong>: método preferido (Yape, efectivo, wallet). No almacenamos PINs ni datos bancarios.</li>
        <li><strong>Contactos de emergencia</strong> (opcional): hasta 2 contactos que vos elijás.</li>
      </ul>

      <h3>2.2 Datos automáticos</h3>
      <ul>
        <li><strong>Ubicación GPS</strong> en tiempo real durante el viaje, con tu autorización expresa.</li>
        <li><strong>Identificador del dispositivo</strong>: ID, modelo, OS, versión.</li>
        <li><strong>Datos de uso</strong>: páginas visitadas, errores, tiempos.</li>
        <li><strong>Logs de viaje</strong>: origen, destino, ruta, duración, distancia, tarifa, calificación.</li>
        <li><strong>Token de notificaciones push</strong> (Firebase Cloud Messaging).</li>
      </ul>

      <h3>2.3 Datos recibidos de terceros</h3>
      <ul>
        <li><strong>Google Maps Platform</strong>: geocoding, autocompletado, ruteo.</li>
        <li><strong>Supabase</strong>: hosting de base de datos cifrada.</li>
        <li><strong>Meta WhatsApp Cloud API</strong>: cuando interactuás con nuestro bot.</li>
      </ul>

      <h2>3. Para qué usamos tus datos</h2>
      <ul>
        <li>Prestar el servicio de transporte (matching, ruteo, cobro).</li>
        <li>Seguridad: verificar al chofer, botón de pánico, contacto de emergencia.</li>
        <li>Comunicaciones operativas: notificaciones, recibos, soporte.</li>
        <li>Mejora del servicio: detectar bugs, optimizar tiempos.</li>
        <li>Cumplimiento legal: responder requerimientos de autoridades cuando aplique.</li>
      </ul>

      <p>
        <strong>Lo que NO hacemos:</strong> no vendemos tus datos, no los compartimos con
        empresas de marketing, no accedemos a galería ni contactos salvo autorización expresa.
      </p>

      <h2>4. Quién más ve tus datos</h2>
      <p>
        Compartimos los datos mínimos necesarios con:
      </p>
      <ul>
        <li><strong>Supabase</strong> — hosting de base de datos.</li>
        <li><strong>Google LLC</strong> — Maps, FCM push.</li>
        <li><strong>Meta Platforms</strong> — WhatsApp Cloud API.</li>
        <li><strong>Vercel</strong> — hosting de sitio web y APIs.</li>
        <li><strong>Railway</strong> — hosting del bot WhatsApp.</li>
        <li><strong>Sentry</strong> — error tracking.</li>
      </ul>

      <h2>5. Cuánto tiempo guardamos los datos</h2>
      <ul>
        <li><strong>Cuenta activa</strong>: mientras tu cuenta exista.</li>
        <li><strong>Logs de viaje</strong>: 24 meses, luego anonimizados.</li>
        <li><strong>Documentos de chofer</strong>: vigencia + 12 meses.</li>
        <li><strong>Reclamos formales</strong>: 5 años (obligación legal).</li>
        <li><strong>Cuenta eliminada</strong>: 30 días para reactivación, luego borrado completo.</li>
      </ul>

      <h2>6. Tus derechos (Ley 29733)</h2>
      <ul>
        <li><strong>Acceder</strong> a tus datos personales.</li>
        <li><strong>Rectificar</strong> datos inexactos.</li>
        <li><strong>Suprimir / cancelar</strong> tu cuenta.</li>
        <li><strong>Oponerte</strong> a usos específicos.</li>
        <li><strong>Portabilidad</strong>: pedir tus datos en formato legible (JSON).</li>
        <li><strong>Revocar consentimientos</strong> previamente otorgados.</li>
      </ul>
      <p>
        Para ejercerlos: email <a href="mailto:legal@ecodriveplus.com">legal@ecodriveplus.com</a> con
        asunto "Solicitud ARCO" o desde Settings → "Mis datos" en la app.
        Respondemos en máximo 20 días hábiles según ART. 19 de la Ley 29733.
      </p>

      <h2>7. Seguridad</h2>
      <ul>
        <li>Toda comunicación con nuestros servidores usa TLS 1.2+.</li>
        <li>Contraseñas con hash bcrypt (Supabase Auth).</li>
        <li>Acceso por roles (RLS) con logs auditables.</li>
        <li>Backups cifrados diarios en zonas distintas.</li>
        <li>Notificación de incidentes en máximo 72 horas.</li>
      </ul>

      <h2>8. Menores de edad</h2>
      <p>
        EcoDrive+ no está dirigido a menores de 18 años. Si detectamos una cuenta de
        menor de edad sin autorización del tutor, la suspendemos y notificamos.
      </p>

      <h2>9. Cookies (sitio web)</h2>
      <p>
        El sitio <a href="https://ecodriveplus.com">ecodriveplus.com</a> usa
        cookies estrictamente necesarias y cookies analíticas anónimas.
      </p>

      <h2>10. Transferencias internacionales</h2>
      <p>
        Los datos se almacenan en infraestructura de Supabase (región US-East / EU)
        bajo cláusulas contractuales tipo aceptadas por la Autoridad Nacional de
        Protección de Datos Personales del Perú.
      </p>

      <h2>11. Cambios a esta política</h2>
      <p>
        Cambios sustanciales se notifican vía email + push con al menos 15 días
        de anticipación. La fecha vigente figura en la cabecera.
      </p>

      <h2>12. Contacto y reclamos</h2>
      <p>
        <strong>DPO / Legal:</strong>{" "}
        <a href="mailto:legal@ecodriveplus.com">legal@ecodriveplus.com</a>
        <br />
        <strong>Soporte general:</strong>{" "}
        <a href="mailto:soporte@ecodriveplus.com">soporte@ecodriveplus.com</a>
        <br />
        <strong>Autoridad de control:</strong> Autoridad Nacional de Protección
        de Datos Personales — Ministerio de Justicia y Derechos Humanos del Perú.
      </p>
    </LegalLayout>
  );
}
