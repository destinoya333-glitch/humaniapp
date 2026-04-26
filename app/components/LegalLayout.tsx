import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export default function LegalLayout({ title, subtitle, lastUpdated, children }: Props) {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <section className="px-6 pt-24 pb-12 border-b border-[#2A2A2A]">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-amber-400 transition-colors mb-8"
          >
            ← Volver al inicio
          </Link>
          <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase">
            Documento legal
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {title}
          </h1>
          {subtitle && (
            <p className="text-zinc-400 text-lg leading-relaxed">{subtitle}</p>
          )}
          <p className="text-zinc-500 text-xs mt-6">
            Última actualización: {lastUpdated}
          </p>
        </div>
      </section>

      <article className="px-6 py-12">
        <div className="mx-auto max-w-3xl prose-legal">{children}</div>
      </article>

      <footer className="border-t border-[#2A2A2A] py-8 px-6">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <span>
            <span className="text-amber-400">✦</span>{" "}
            <Link href="/" className="hover:text-amber-400 transition-colors">
              ActivosYA
            </Link>
            {" · "}Hecho en Perú · 2026
          </span>
          <div className="flex gap-4">
            <Link href="/terminos" className="hover:text-amber-400 transition-colors">Términos</Link>
            <Link href="/privacidad" className="hover:text-amber-400 transition-colors">Privacidad</Link>
            <Link href="/devoluciones" className="hover:text-amber-400 transition-colors">Devoluciones</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
