import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "Términos y Condiciones — EcoDrive+",
  description:
    "Términos y condiciones de uso de EcoDrive+, plataforma local de viajes en Trujillo.",
};

export default function EcoDriveTermsPage() {
  return (
    <LegalLayout
      title="Términos y Condiciones"
      subtitle="Reglas que rigen el uso de EcoDrive+ (pasajero) y EcoDrive+ Conductor. Al crear una cuenta, aceptás estos Términos."
      lastUpdated="14 de mayo de 2026"
      brand="ecodrive"
    >
      <h2>1. Quiénes somos</h2>
      <p>EcoDrive+ S.A.C. (en formación), Trujillo, Perú.</p>

      <h2>2. Naturaleza del servicio</h2>
      <p>
        EcoDrive+ es una <strong>plataforma tecnológica de intermediación</strong>{" "}
        entre Pasajeros y Choferes independientes.{" "}
        <strong>NO somos una empresa de transporte ni empleador del Chofer.</strong>
        El Chofer presta su servicio de manera independiente bajo su propia
        responsabilidad civil y tributaria.
      </p>

      <h2>3. Registro y cuenta</h2>
      <h3>Pasajero</h3>
      <ul>
        <li>Edad mínima: 18 años.</li>
        <li>Datos verídicos: nombre, correo válido, teléfono.</li>
        <li>Una cuenta por persona.</li>
      </ul>
      <h3>Chofer</h3>
      <ul>
        <li>Edad mínima: 21 años.</li>
        <li>DNI peruano vigente.</li>
        <li>Brevete A-IIA o superior, vigente.</li>
        <li>Vehículo con SOAT vigente.</li>
        <li>Aprobación previa de documentos (24-72 horas).</li>
        <li>Cumplimiento del reglamento de tránsito (D.S. 016-2009-MTC).</li>
      </ul>

      <h2>4. Reglas del servicio</h2>
      <h3>Pasajero</h3>
      <ul>
        <li>Pago al finalizar cada viaje (o desde wallet con saldo).</li>
        <li>Comportamiento respetuoso. Daños al vehículo: responde el Pasajero.</li>
        <li>Prohibido: alcohol/drogas en el vehículo, armas, bienes ilícitos.</li>
      </ul>
      <h3>Chofer</h3>
      <ul>
        <li>Aceptar / rechazar viajes con responsabilidad.</li>
        <li>Conducir respetando normas de tránsito.</li>
        <li>Mantener el vehículo limpio, seguro y mecánicamente apto.</li>
        <li>Reportar incidentes a soporte EcoDrive+.</li>
      </ul>

      <h2>5. Tarifas y pagos</h2>
      <ul>
        <li>Tarifa base: <strong>S/4.00</strong> (Trujillo, 2026).</li>
        <li>Tarifa por kilómetro: <strong>S/1.50</strong>.</li>
        <li>Tarifa de espera: S/0.30/min después de 3 min en pickup.</li>
        <li>Tarifa mínima: S/5.00.</li>
        <li>Recargo nocturno (22:00-06:00): <strong>+15%</strong>.</li>
        <li>Comisión EcoDrive+ sobre el chofer: 15% (0% en los primeros 50 viajes de cada chofer nuevo).</li>
      </ul>
      <p>Los valores podrán actualizarse con preaviso de 15 días en la app.</p>

      <h3>Métodos de pago</h3>
      <ul>
        <li><strong>Yape</strong>: comprobante validado dentro de la app.</li>
        <li><strong>Efectivo</strong>: liquidación directa.</li>
        <li><strong>Wallet EcoDrive+</strong>: recarga manual al inicio.</li>
        <li><strong>Tarjeta (próximamente)</strong>: integración con Niubiz.</li>
      </ul>

      <h3>Reembolsos</h3>
      <p>
        Cancelación antes del pickup: sin cargo. Interrupción por causa atribuible al
        Chofer o a EcoDrive+: reembolso total o parcial. Reclamos a{" "}
        <a href="mailto:soporte@ecodriveplus.com">soporte@ecodriveplus.com</a> en 7 días.
      </p>

      <h2>6. Cancelaciones</h2>
      <ul>
        <li><strong>Pasajero</strong>: gratis dentro de los primeros 2 min después de asignación. Después S/2.00.</li>
        <li><strong>Chofer</strong>: cancelaciones recurrentes (&gt;10%) pueden suspender la cuenta.</li>
      </ul>

      <h2>7. Calificaciones</h2>
      <p>
        Pasajero y Chofer se califican mutuamente. Afectan el matching futuro.
        Manipular calificaciones implica suspensión.
      </p>

      <h2>8. Conducta prohibida</h2>
      <ul>
        <li>Acoso, discriminación o violencia.</li>
        <li>Transporte de mercancías ilícitas.</li>
        <li>Suplantación de identidad.</li>
        <li>Ingeniería inversa o scraping masivo.</li>
        <li>Uso fuera del propósito de transporte personal sin autorización.</li>
      </ul>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        EcoDrive+ no garantiza disponibilidad ininterrumpida. En la medida
        permitida por ley peruana, EcoDrive+ no responde por pérdida de objetos
        personales en el vehículo, daños cubiertos por SOAT o conducta criminal
        de un usuario en violación de estos Términos. La responsabilidad máxima
        de EcoDrive+ se limita al monto pagado por el Pasajero en los 12 meses
        previos al hecho que origina el reclamo. Nada afecta los derechos del
        consumidor garantizados por la Ley 29571 (Código de Consumo).
      </p>

      <h2>10. Seguro</h2>
      <p>
        El SOAT del vehículo cubre a los pasajeros conforme a la ley peruana.
        Estamos evaluando un seguro complementario para Choferes activos (plan
        piloto desde 2026-Q3).
      </p>

      <h2>11. Propiedad intelectual</h2>
      <p>
        Logos, diseño, código fuente y contenido son propiedad de EcoDrive+,
        protegidos por leyes peruanas e internacionales.
      </p>

      <h2>12. Modificaciones</h2>
      <p>
        Cambios sustanciales se notifican con 15 días de anticipación. El uso
        continuado implica aceptación.
      </p>

      <h2>13. Resolución de la cuenta</h2>
      <p>
        Podés cerrar tu cuenta desde Settings → "Eliminar cuenta". Detalles en{" "}
        <a href="/legal/data-deletion">Eliminación de datos</a>. EcoDrive+ puede
        cerrar una cuenta con preaviso de 15 días salvo violación grave.
      </p>

      <h2>14. Ley aplicable y jurisdicción</h2>
      <p>
        Leyes de la República del Perú. Controversias en los tribunales de la
        provincia de Trujillo, La Libertad, salvo arbitraje conforme a la
        Cámara de Comercio de La Libertad.
      </p>

      <h2>15. Contacto</h2>
      <p>
        Soporte general:{" "}
        <a href="mailto:soporte@ecodriveplus.com">soporte@ecodriveplus.com</a>
        {" · "}WhatsApp +51 965 470 319
        <br />
        Legal: <a href="mailto:legal@ecodriveplus.com">legal@ecodriveplus.com</a>
        <br />
        Choferes: <a href="mailto:choferes@ecodriveplus.com">choferes@ecodriveplus.com</a>
      </p>
    </LegalLayout>
  );
}
