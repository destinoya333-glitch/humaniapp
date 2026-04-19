"use client";

import { useState } from "react";

const faqs = [
  {
    q: "¿Cómo funciona DestinoYA?",
    a: "Escríbenos por WhatsApp, elige tu tipo de consulta, paga con Yape o tarjeta, y en segundos recibes tu respuesta personalizada generada por IA. Sin esperas, sin citas, sin complicaciones.",
  },
  {
    q: "¿Las respuestas las da una persona o una IA?",
    a: "Las respuestas son generadas por inteligencia artificial avanzada (Claude de Anthropic), entrenada para dar orientación precisa y empática. No son robots genéricos — cada respuesta es única y personalizada para ti.",
  },
  {
    q: "¿Cómo pago? ¿Es seguro?",
    a: "Aceptamos Yape (el más usado en Perú), tarjetas de crédito/débito vía Culqi, y Stripe para pagos internacionales. Todos los pagos son 100% seguros y encriptados.",
  },
  {
    q: "¿Qué incluye el Plan VIP?",
    a: "El Plan VIP te da acceso ilimitado a TODOS los servicios de DestinoYA (Astrología, Consulta Profesional y Exprés) sin límite de consultas. Mensual a S/ 18 o anual a S/ 63.",
  },
  {
    q: "¿Cuándo estará disponible Mi Novia IA?",
    a: "Estamos en fase de desarrollo. Puedes unirte a la lista de espera y serás de los primeros en acceder cuando lancemos. Escríbenos por WhatsApp para reservar tu lugar.",
  },
  {
    q: "¿Puedo tener mi propia plataforma IA con mi marca?",
    a: "Sí. Ofrecemos licencias white-label para emprendedores que quieren lanzar su propio negocio IA. Tu marca, tus precios, tus clientes — nosotros ponemos la tecnología. Contáctanos para saber más.",
  },
  {
    q: "¿Están disponibles fuera de Perú?",
    a: "DestinoYA opera principalmente en Perú, pero aceptamos pagos internacionales vía Stripe. Si eres de otro país, escríbenos y buscamos la forma de atenderte.",
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
          <h2 className="text-4xl font-bold mb-4">¿Tienes dudas?</h2>
          <p className="text-zinc-400">Las respuestas más comunes, resueltas.</p>
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
            href="https://wa.me/51979385499"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#2A2A2A] text-zinc-300 rounded-full hover:border-amber-500/40 hover:text-amber-400 transition-colors text-sm"
          >
            Escríbenos por WhatsApp →
          </a>
        </div>
      </div>
    </section>
  );
}
