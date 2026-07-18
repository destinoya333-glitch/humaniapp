// FAQ data for ActivosYA — shared between the UI (FAQ.tsx) and the
// server-rendered FAQPage JSON-LD (page.tsx). Plain text only so it can be
// serialized into structured data that search engines and LLMs can cite.

export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "¿Qué exactamente compro o rento cuando adquiero un activo?",
    a: "Recibes el código fuente operativo, dominio personalizado, integración de pagos, base de datos y cuentas técnicas (Twilio, Supabase, Stripe). En el modelo de renta accedes a todo eso bajo licencia mensual; en el de compra pasa a ser 100% tuyo, incluyendo la base de usuarios existente.",
  },
  {
    q: "¿Cómo verifico las métricas declaradas (MRR, retención, margen)?",
    a: "Antes de firmar te damos acceso de lectura al dashboard real del activo: Supabase para usuarios y conversiones, Stripe para flujos de cobro. También puedes pedir una llamada con nuestro equipo técnico para revisar el código y la arquitectura.",
  },
  {
    q: "¿Qué soporte recibo después de la compra?",
    a: "90 días de soporte 24/7 incluidos. Slack privado con nuestro equipo, onboarding técnico completo, configuración de tu dominio y procesadores de pago, migración de datos y resolución de incidencias. Después puedes contratar soporte extendido.",
  },
  {
    q: "¿Puedo poner mi propia marca, dominio y colores?",
    a: "Sí. Todos los activos son white-label completos. Tu marca, tu dominio (ej. tunegocio.com), tu paleta de colores, tu tono de voz. Tus clientes finales nunca verán mención a ActivosYA.",
  },
  {
    q: "¿Qué pasa si el activo no rinde como las métricas declaradas?",
    a: "Tienes garantía de 30 días. Si en el primer mes operativo no se replican las métricas declaradas, devolvemos el 100% del setup y los días no consumidos. Es nuestra forma de poner skin-in-the-game junto al comprador.",
  },
  {
    q: "¿Cada cuánto agregan nuevos activos al catálogo?",
    a: "Apuntamos a 1-2 activos nuevos por trimestre. La pipeline pública incluye TuNoviaIA Plus, evoluciones de TuPedidoYa y TuReservaYa, y nuevos verticales en evaluación. Suscríbete para que te avisemos cuando lance algo que te interese.",
  },
  {
    q: "¿Necesito ser desarrollador para operar un activo?",
    a: "No. Todo el setup técnico lo hacemos nosotros durante el onboarding. Tú te enfocas en marketing y atención al cliente. Si quieres modificar algo del producto necesitarás un dev (o nos contratas para evolucionar el activo).",
  },
  {
    q: "¿Atienden fuera de Perú?",
    a: "Sí. El stack soporta multi-país nativo: Stripe internacional, Twilio global, idioma español por defecto (próximamente portugués e inglés). Si estás en México, Colombia, Chile o Brasil, hablamos.",
  },
];
