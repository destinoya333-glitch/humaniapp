"use client";

import { useState } from "react";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", type: "usuario", message: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const whatsapp = `https://wa.me/51979385499?text=${encodeURIComponent(
      `Hola HumaniApp! Soy ${form.name} (${form.email}). Tipo: ${form.type}. ${form.message}`
    )}`;
    window.open(whatsapp, "_blank");
    setSent(true);
  }

  return (
    <section id="contacto" className="py-24 px-6 bg-[#0D0D0D]">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-12">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Contacto</p>
          <h2 className="text-4xl font-bold mb-4">Hablemos</h2>
          <p className="text-zinc-400">
            ¿Usuario final o emprendedor? Cuéntanos y te respondemos en menos de 24 horas.
          </p>
        </div>

        {sent ? (
          <div className="text-center card-surface rounded-2xl p-12">
            <div className="text-4xl mb-4">✦</div>
            <h3 className="text-xl font-bold mb-2 text-amber-400">¡Gracias por escribirnos!</h3>
            <p className="text-zinc-400">Te abrimos WhatsApp para continuar la conversación.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-surface rounded-2xl p-8 flex flex-col gap-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Nombre</label>
                <input
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Soy</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
              >
                <option value="usuario">Usuario final — quiero usar un servicio IA</option>
                <option value="emprendedor">Emprendedor — quiero mi propia plataforma IA</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Mensaje</label>
              <textarea
                name="message"
                required
                value={form.message}
                onChange={handleChange}
                rows={4}
                placeholder="Cuéntanos en qué podemos ayudarte..."
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors glow-gold"
            >
              Enviar por WhatsApp →
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
