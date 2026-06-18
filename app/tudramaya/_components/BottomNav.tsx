"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/tudramaya", label: "Inicio", icon: "🏠" },
  { href: "/tudramaya/para-ti", label: "Para ti", icon: "▶️" },
  { href: "/tudramaya/mi-lista", label: "Mi Lista", icon: "🔖" },
  { href: "/tudramaya/recompensas", label: "Recompensas", icon: "🎁" },
  { href: "/tudramaya/perfil", label: "Perfil", icon: "👤" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-neutral-950/95 border-t border-neutral-800 backdrop-blur">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {TABS.map((t) => {
          const active = path === t.href || (t.href !== "/tudramaya" && path.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center py-2 text-[11px] ${active ? "text-rose-500 font-semibold" : "text-neutral-400"}`}
            >
              <span className="text-xl leading-none mb-0.5">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
