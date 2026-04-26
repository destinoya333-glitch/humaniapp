"use client";

import { useState } from "react";

const faqs = [
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

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Preguntas frecuentes
          </p>
          <h2 className="text-4xl font-bold mb-4">Antes de invertir</h2>
          <p className="text-zinc-400">
            Lo que más nos preguntan los emprendedores antes de adquirir su activo.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="card-surface rounded-2xl overflow-hidden transition-colors hover:border-amber-500/20"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
              >
                <span className="font-medium text-sm md:text-base">{faq.q}</span>
                <span
                  className="text-amber-400 shrink-0 transition-transform duration-300"
                  style={{ transform: open === i ? "rotate(45deg)" : "rotate(0deg)" }}
                >
                  +
                </span>
              </button>

              {open === i && (
                <div className="px-6 pb-5">
                  <div className="border-t border-[#2A2A2A] pt-4">
                    <p className="text-zinc-400 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-zinc-500 text-sm mb-3">¿Tienes otra pregunta?</p>
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#2A2A2A] text-zinc-300 rounded-full hover:border-amber-500/40 hover:text-amber-400 transition-colors text-sm"
          >
            Hablar con un asesor →
          </a>
        </div>
      </div>
    </section>
  );
}
