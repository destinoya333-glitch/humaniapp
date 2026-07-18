import Link from "next/link";

type Brand = "activosya" | "ecodrive";

type Props = {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: React.ReactNode;
  brand?: Brand;
};

const BRANDS: Record<
  Brand,
  { home: string; name: string; links: { label: string; href: string }[] }
> = {
  activosya: {
    home: "/",
    name: "ActivosYA",
    links: [
      { label: "Términos", href: "/terminos" },
      { label: "Privacidad", href: "/privacidad" },
      { label: "Devoluciones", href: "/devoluciones" },
    ],
  },
  ecodrive: {
    home: "/ecodriveplus",
    name: "EcoDrive+",
    links: [
      { label: "Términos", href: "/ecodriveplus/legal/terms" },
      { label: "Privacidad", href: "/ecodriveplus/legal/privacy" },
      { label: "Eliminar datos", href: "/ecodriveplus/legal/data-deletion" },
    ],
  },
};

export default function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  children,
  brand = "activosya",
}: Props) {
  const b = BRANDS[brand];
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <section className="px-6 pt-24 pb-12 border-b border-[#2A2A2A]">
        <div className="mx-auto max-w-3xl">
          <Link
            href={b.home}
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
            <Link href={b.home} className="hover:text-amber-400 transition-colors">
              {b.name}
            </Link>
            {" · "}Hecho en Perú · 2026
          </span>
          <div className="flex gap-4">
            {b.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hover:text-amber-400 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
