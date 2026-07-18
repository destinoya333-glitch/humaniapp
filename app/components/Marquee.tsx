const ITEMS = [
  "Flujo de caja verificado",
  "Multi-tenant nativo",
  "Comisión más baja del Perú",
  "Soporte 24/7 · 90 días",
  "Data room real",
  "Llave en mano",
  "Garantía 30 días",
  "Hecho en Perú",
];

export default function Marquee() {
  return (
    <section className="relative border-y border-[var(--au-line)] py-5 overflow-hidden">
      <div className="flex">
        <div className="au-marquee au-mono text-[var(--au-ink-mute)]">
          {[...ITEMS, ...ITEMS].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-3.5">
              <span className="text-[var(--au-gold)]">✦</span>
              {t}
            </span>
          ))}
        </div>
        <div className="au-marquee au-mono text-[var(--au-ink-mute)]" aria-hidden>
          {[...ITEMS, ...ITEMS].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-3.5">
              <span className="text-[var(--au-gold)]">✦</span>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
