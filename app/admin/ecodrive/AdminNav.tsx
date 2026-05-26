"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: Array<{ href: string; label: string }> = [
  { href: "/admin/ecodrive", label: "🏠 Dashboard" },
  { href: "/admin/ecodrive/mapa", label: "🗺️ Mapa" },
  { href: "/admin/ecodrive/choferes", label: "🚗 Choferes" },
  { href: "/admin/ecodrive/pasajeros", label: "🧍 Pasajeros" },
  { href: "/admin/ecodrive/tracking", label: "📡 Tracking" },
  { href: "/admin/ecodrive/push", label: "📢 Push" },
  { href: "/admin/ecodrive/tarifas", label: "💰 Tarifas" },
  { href: "/admin/ecodrive/incidencias", label: "⚠️ Incidencias" },
  { href: "/admin/ecodrive/reportes", label: "📊 Reportes" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-30 mb-6 -mx-6 border-b border-zinc-200 bg-white/95 px-6 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-1.5">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition ${
                active
                  ? "bg-[#E1811B] text-white"
                  : "text-zinc-600 hover:bg-[#E1811B]/10 hover:text-[#E1811B]"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
