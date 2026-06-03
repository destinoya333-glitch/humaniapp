export const metadata = {
  title: "Términos y Condiciones — Miss Sofia",
  description: "Términos de uso de Miss Sofia.",
};

export default function TerminosMissSofia() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-zinc-200 px-5 py-10">
      <div className="max-w-2xl mx-auto space-y-5 text-sm leading-relaxed">
        <h1 className="text-2xl font-bold text-white">Términos y Condiciones — Miss Sofia</h1>
        <p className="text-zinc-500">Última actualización: junio 2026</p>

        <p>
          Al usar Miss Sofia aceptas estos términos. El servicio es operado por{" "}
          <strong>ECO DRIVE PLUS S.A.C.</strong> (RUC 20613413228), Trujillo, Perú.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">1. El servicio</h2>
        <p>
          Miss Sofia es una app de aprendizaje de inglés por el método de inmersión (escuchar primero). El
          contenido es educativo y los resultados dependen de tu constancia.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">2. Suscripción y pagos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>La app tiene un plan gratuito con límites diarios y planes de pago (Regular y Premium).</li>
          <li>El pago se realiza fuera de la aplicación (Yape u otra pasarela autorizada).</li>
          <li>La suscripción se activa al confirmar tu pago y dura el periodo contratado (mensual o anual).</li>
          <li><strong>Garantía:</strong> ofrecemos garantía de satisfacción de 6 meses según las condiciones publicadas.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white pt-2">3. Uso adecuado</h2>
        <p>
          No puedes copiar, revender ni redistribuir el contenido de la app. Tu cuenta es personal e
          intransferible.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">4. Disponibilidad</h2>
        <p>
          Hacemos nuestro mejor esfuerzo por mantener el servicio disponible, pero puede haber interrupciones por
          mantenimiento o causas externas.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">5. Cambios</h2>
        <p>Podemos actualizar estos términos; los cambios se publicarán en esta página.</p>

        <h2 className="text-lg font-semibold text-white pt-2">6. Contacto</h2>
        <p>
          Consultas: <a className="text-amber-400" href="mailto:soporte@activosya.com">soporte@activosya.com</a>.
        </p>

        <p className="pt-4">
          <a className="text-amber-400" href="/miss-sofia/privacidad">← Política de Privacidad</a>
        </p>
      </div>
    </main>
  );
}
