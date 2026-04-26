"use client";

import { useState } from "react";

type Form = {
  name: string;
  email: string;
  phone: string;
  asset: string;
  budget: string;
  timing: string;
  message: string;
};

const initialForm: Form = {
  name: "",
  email: "",
  phone: "",
  asset: "indeciso",
  budget: "1800-3000",
  timing: "1-3-meses",
  message: "",
};

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState<Form>(initialForm);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const summary = [
      `Hola ActivosYA — solicito acceso al data room.`,
      ``,
      `Nombre: ${form.name}`,
      `Email: ${form.email}`,
      `Teléfono: ${form.phone}`,
      `Activo de interés: ${form.asset}`,
      `Presupuesto mensual: S/ ${form.budget}`,
      `Cuándo quiero arrancar: ${form.timing}`,
      ``,
      `Notas: ${form.message || "(sin notas)"}`,
    ].join("\n");
    const whatsapp = `https://wa.me/51961347233?text=${encodeURIComponent(summary)}`;
    window.open(whatsapp, "_blank");
    setSent(true);
  }

  return (
    <section id="contacto" className="py-24 px-6 bg-[#0D0D0D] scroll-mt-24">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-12">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Solicitar acceso
          </p>
          <h2 className="text-4xl font-bold mb-4">Activa tu data room</h2>
          <p className="text-zinc-400">
            Completa estos campos y te contactamos en menos de 24 horas con
            métricas detalladas, P&L, contratos modelo y disponibilidad
            del activo que te interese.
          </p>
        </div>

        {sent ? (
          <div className="text-center card-surface rounded-2xl p-12">
            <div className="text-4xl mb-4">✦</div>
            <h3 className="text-xl font-bold mb-2 text-amber-400">
              ¡Solicitud enviada!
            </h3>
            <p className="text-zinc-400">
              Abrimos WhatsApp para coordinar la siguiente reunión. Si no se
              abrió, escríbenos directamente al +51 961 347 233.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="card-surface rounded-2xl p-8 flex flex-col gap-5"
          >
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Nombre completo</label>
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
              <label className="block text-sm text-zinc-400 mb-2">WhatsApp</label>
              <input
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="+51 9XX XXX XXX"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Activo que me interesa</label>
              <select
                name="asset"
                value={form.asset}
                onChange={handleChange}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
              >
                <option value="miss-sofia">Miss Sofia (idiomas con IA)</option>
                <option value="tudestinoya">TuDestinoYa (tarot y orientación)</option>
                <option value="tunoviaia">TuNoviaIA (compañía IA)</option>
                <option value="tupedidoya">TuPedidoYa (pedidos para restaurantes)</option>
                <option value="tureservaya">TuReservaYa (reservas para consultorios)</option>
                <option value="indeciso">Estoy evaluando, quiero ver el catálogo completo</option>
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Presupuesto mensual (S/)
                </label>
                <select
                  name="budget"
                  value={form.budget}
                  onChange={handleChange}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="1800-3000">S/ 1,800 – 3,000</option>
                  <option value="3000-5000">S/ 3,000 – 5,000</option>
                  <option value="5000-10000">S/ 5,000 – 10,000</option>
                  <option value="compra">Modelo de compra (no renta)</option>
                  <option value="evaluando">Evaluando opciones</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">¿Cuándo arrancar?</label>
                <select
                  name="timing"
                  value={form.timing}
                  onChange={handleChange}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="inmediato">Esta semana / inmediato</option>
                  <option value="1-3-meses">1 – 3 meses</option>
                  <option value="3-6-meses">3 – 6 meses</option>
                  <option value="explorando">Solo explorando por ahora</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Notas adicionales (opcional)
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={3}
                placeholder="Cuéntanos en qué mercado/ciudad operas, experiencia previa, etc."
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors glow-gold"
            >
              Solicitar acceso al data room →
            </button>

            <p className="text-xs text-zinc-500 text-center">
              Tu información va directamente a nuestro asesor por WhatsApp.
              No spam, no listas, no terceros.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
