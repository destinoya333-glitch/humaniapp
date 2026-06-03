export const metadata = {
  title: "Política de Privacidad — Miss Sofia",
  description: "Cómo Miss Sofia trata tus datos.",
};

export default function PrivacidadMissSofia() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-zinc-200 px-5 py-10">
      <div className="max-w-2xl mx-auto space-y-5 text-sm leading-relaxed">
        <h1 className="text-2xl font-bold text-white">Política de Privacidad — Miss Sofia</h1>
        <p className="text-zinc-500">Última actualización: junio 2026</p>

        <p>
          Miss Sofia es una aplicación de aprendizaje de inglés operada por <strong>ECO DRIVE PLUS S.A.C.</strong>{" "}
          (RUC 20613413228), Trujillo, Perú. Esta política explica qué datos recolectamos y cómo los usamos.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">1. Datos que recolectamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Cuenta:</strong> tu correo electrónico y nombre (para crear tu perfil).</li>
          <li><strong>Progreso de aprendizaje:</strong> tu fase, racha, palabras aprendidas y sesiones de escucha/práctica.</li>
          <li><strong>Audio de práctica:</strong> si usas la práctica de pronunciación, tu voz se procesa para darte retroalimentación; no se comparte con terceros.</li>
          <li><strong>Datos de pago:</strong> si te suscribes, registramos el monto y el código de operación. <strong>El pago se realiza fuera de la app</strong> (Yape u otra pasarela); no almacenamos datos de tu tarjeta.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white pt-2">2. Cómo usamos tus datos</h2>
        <p>
          Usamos tus datos solo para: ofrecerte las lecciones, guardar tu progreso, activar tu suscripción y
          enviarte recordatorios para mantener tu racha. No vendemos tus datos.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">3. Dónde se guardan</h2>
        <p>
          Tus datos se almacenan de forma segura en Supabase (infraestructura con cifrado). El acceso está
          restringido y protegido por autenticación.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">4. Tus derechos</h2>
        <p>
          Puedes solicitar acceso, corrección o eliminación de tus datos escribiéndonos. Al eliminar tu cuenta,
          borramos tu información personal asociada.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">5. Menores de edad</h2>
        <p>Miss Sofia está dirigida a mayores de 13 años. Si eres menor, usa la app con permiso de un adulto.</p>

        <h2 className="text-lg font-semibold text-white pt-2">6. Contacto</h2>
        <p>
          Para cualquier consulta sobre privacidad: <a className="text-amber-400" href="mailto:soporte@activosya.com">soporte@activosya.com</a>.
        </p>

        <p className="pt-4">
          <a className="text-amber-400" href="/miss-sofia/terminos">Términos y Condiciones →</a>
        </p>
      </div>
    </main>
  );
}
