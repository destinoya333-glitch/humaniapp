import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "Eliminación de datos — EcoDrive+",
  description:
    "Cómo eliminar tu cuenta y todos los datos personales asociados a EcoDrive+, requisito obligatorio para Google Play y Apple App Store.",
};

export default function EcoDriveDataDeletionPage() {
  return (
    <LegalLayout
      title="Eliminación de datos"
      subtitle="Cómo borrar tu cuenta y los datos asociados en EcoDrive+ y EcoDrive+ Conductor."
      lastUpdated="14 de mayo de 2026"
      brand="ecodrive"
    >
      <h2>Desde la app</h2>
      <ol>
        <li>Abrí <strong>EcoDrive+</strong> o <strong>EcoDrive+ Conductor</strong>.</li>
        <li>Tocá tu perfil (esquina inferior derecha).</li>
        <li>Tocá <strong>Settings</strong> → <strong>Privacidad</strong> → <strong>Eliminar mi cuenta</strong>.</li>
        <li>Confirmá leyendo lo que se borra.</li>
        <li>Tocá <strong>Sí, borrar todo</strong> y volvé a confirmar tu correo.</li>
      </ol>
      <p>
        Recibirás un email de confirmación. La cuenta se desactiva inmediatamente
        y se borra en <strong>30 días</strong> (período de seguridad para revertir errores).
      </p>

      <h2>Sin acceso a la app</h2>
      <p>
        Enviá un email a{" "}
        <a href="mailto:legal@ecodriveplus.com">legal@ecodriveplus.com</a>{" "}
        desde el correo registrado, con asunto{" "}
        <strong>"Solicitud de eliminación de cuenta"</strong> y tu nombre completo
        + DNI (si sos chofer). Respondemos en <strong>48 horas hábiles</strong>.
      </p>
      <p>
        Alternativamente: WhatsApp al <strong>+51 965 470 319</strong>.
      </p>

      <h2>Qué se borra</h2>
      <ul>
        <li>Tu perfil (nombre, foto, correo, teléfono).</li>
        <li>Tus contactos de emergencia.</li>
        <li>Tu historial de viajes detallado.</li>
        <li>Lugares guardados (Casa, Trabajo, etc.).</li>
        <li>Tokens de notificaciones push.</li>
        <li>Datos de wallet (saldo no reembolsable).</li>
        <li>Calificaciones recibidas.</li>
        <li>Documentos del chofer (DNI, brevete, fotos del vehículo).</li>
      </ul>

      <h2>Qué se retiene (obligación legal)</h2>
      <ul>
        <li><strong>Logs anonimizados</strong>: 24 meses para estadística operativa.</li>
        <li><strong>Recibos / comprobantes Yape</strong>: 5 años (obligación SUNAT).</li>
        <li><strong>Reclamos formales</strong>: 5 años (INDECOPI).</li>
        <li><strong>Requerimientos judiciales</strong>: el plazo que la ley exija.</li>
      </ul>
      <p>
        Esos datos no permiten identificarte directamente después de la
        anonimización.
      </p>

      <h2>Tiempo de procesamiento</h2>
      <ul>
        <li>Desactivación de cuenta: <strong>inmediata</strong>.</li>
        <li>Borrado completo en BD: <strong>30 días</strong> después de la solicitud.</li>
        <li>Backups: purga en el siguiente ciclo (máximo 90 días).</li>
        <li>Sistemas de terceros (Supabase, FCM, Sentry): borrado en máximo 30 días.</li>
      </ul>
      <p>
        Si después de 90 días seguís viendo datos personales tuyos, escribinos a{" "}
        <a href="mailto:legal@ecodriveplus.com">legal@ecodriveplus.com</a>.
      </p>

      <h2>Reactivación</h2>
      <p>
        Si eliminaste por error y aún estás dentro de los 30 días, escribinos a{" "}
        <a href="mailto:legal@ecodriveplus.com">legal@ecodriveplus.com</a> y reactivamos
        tu cuenta tal como estaba. Después podés crear una cuenta nueva pero no
        recuperamos el historial anterior.
      </p>

      <h2>Preguntas frecuentes</h2>
      <p>
        <strong>¿Borrar mi cuenta cancela viajes pendientes?</strong>
        <br />
        Sí. Cualquier viaje en curso debe completarse o cancelarse antes.
      </p>
      <p>
        <strong>¿Pierdo el saldo de mi wallet?</strong>
        <br />
        Si querés recuperar el saldo, hacé un retiro antes de eliminar la cuenta.
      </p>
      <p>
        <strong>¿Es realmente irreversible?</strong>
        <br />
        Sí, después de los 30 días el borrado es definitivo.
      </p>

      <h2>Contacto</h2>
      <p>
        Email legal:{" "}
        <a href="mailto:legal@ecodriveplus.com">legal@ecodriveplus.com</a>
        <br />
        Soporte:{" "}
        <a href="mailto:soporte@ecodriveplus.com">soporte@ecodriveplus.com</a>
        <br />
        WhatsApp: +51 965 470 319.
      </p>
    </LegalLayout>
  );
}
