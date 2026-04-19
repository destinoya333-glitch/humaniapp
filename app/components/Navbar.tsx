"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "./Logo";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#2A2A2A] bg-[#0A0A0A]/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={56} />
          <span className="text-2xl font-bold tracking-tight">
            <span className="gold-gradient">Humani</span>
            <span className="text-white">App</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#servicios" className="hover:text-white transition-colors">Servicios</a>
          <a href="#plataformas" className="hover:text-white transition-colors">Emprendedores</a>
          <a href="#por-que" className="hover:text-white transition-colors">Por qué HumaniApp</a>
          <a href="#contacto" className="hover:text-white transition-colors">Contacto</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a
            href="#servicios"
            className="px-4 py-2 text-sm text-zinc-300 hover:text-white border border-[#2A2A2A] rounded-full transition-colors hover:border-amber-500/40"
          >
            Ver servicios
          </a>
          <a
            href="#plataformas"
            className="px-4 py-2 text-sm font-medium bg-amber-500 text-black rounded-full hover:bg-amber-400 transition-colors"
          >
            Quiero mi plataforma
          </a>
        </div>

        <button
          className="md:hidden text-zinc-400 hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label="Menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#2A2A2A] bg-[#0A0A0A] px-6 py-4 flex flex-col gap-4 text-sm">
          <a href="#servicios" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white">Servicios</a>
          <a href="#plataformas" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white">Emprendedores</a>
          <a href="#por-que" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white">Por qué HumaniApp</a>
          <a href="#contacto" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white">Contacto</a>
          <a
            href="#plataformas"
            onClick={() => setOpen(false)}
            className="mt-2 px-4 py-2 text-center font-medium bg-amber-500 text-black rounded-full hover:bg-amber-400"
          >
            Quiero mi plataforma
          </a>
        </div>
      )}
    </nav>
  );
}
