"use client";

import { useState } from "react";
import { faqs } from "./faq-data";

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
