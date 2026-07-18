"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const SECTIONS = [
  ["Catálogo", "catalogo"],
  ["Cómo funciona", "como-funciona"],
  ["Por qué ActivosYA", "por-que"],
  ["Contacto", "contacto"],
] as const;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  // En la home usamos anclas in-page; fuera, prefijamos "/" para volver y saltar.
  const to = (id: string) => (isHome ? `#${id}` : `/#${id}`);
  const LINKS = SECTIONS.map(([label, id]) => [label, to(id)] as const);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-[var(--au-line)] bg-[var(--au-bg)]/80 backdrop-blur-xl py-3"
          : "border-b border-transparent py-5"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo size={40} />
          <span className="text-xl font-semibold tracking-tight">
            <span className="au-gold-text">Activos</span>
            <span className="text-[var(--au-ink)]">YA</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-9">
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="au-mono-md text-[var(--au-ink-mute)] hover:text-[var(--au-ink)] transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a
            href={to("catalogo")}
            className="au-mono-md text-[var(--au-ink-soft)] hover:text-[var(--au-ink)] px-4 py-2 rounded-full border border-[var(--au-line-strong)] hover:border-[var(--au-gold)]/50 transition-colors"
          >
            Ver catálogo
          </a>
          <a
            href={to("contacto")}
            className="au-btn-gold !px-5 !py-2.5 text-sm"
          >
            Solicitar acceso
          </a>
        </div>

        <button
          className="md:hidden text-[var(--au-ink-soft)] hover:text-[var(--au-ink)]"
          onClick={() => setOpen(!open)}
          aria-label="Menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--au-line)] bg-[var(--au-bg)] px-6 py-5 flex flex-col gap-4">
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="au-mono-md text-[var(--au-ink-soft)] hover:text-[var(--au-ink)]"
            >
              {label}
            </a>
          ))}
          <a
            href={to("contacto")}
            onClick={() => setOpen(false)}
            className="au-btn-gold mt-2 text-sm"
          >
            Solicitar acceso
          </a>
        </div>
      )}
    </nav>
  );
}
