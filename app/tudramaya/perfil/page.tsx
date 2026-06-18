"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "../_components/BottomNav";

type Perfil = { monedas: number; puntos: number; vip_hasta: string | null };

export default function PerfilPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/tudramaya/perfil")
      .then((r) => r.json())
      .then((j) => {
        setEmail(j.user?.email ?? null);
        setPerfil(j.perfil ?? null);
      })
      .finally(() => setCargando(false));
  }, []);

  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    location.reload();
  }

  const vip = perfil?.vip_hasta && new Date(perfil.vip_hasta) > new Date();

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Encabezado */}
      <header className="px-5 pt-8 pb-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center text-2xl">🎬</div>
        <div className="flex-1">
          <p className="font-bold text-lg">{email ? email.split("@")[0] : "Invitado"}</p>
          {!email && <p className="text-neutral-500 text-xs">Inicia sesión para guardar tu progreso</p>}
        </div>
        {!email ? (
          <Link href="/tudramaya/login" className="text-rose-500 font-semibold text-sm">
            Iniciar sesión ›
          </Link>
        ) : (
          <button onClick={salir} className="text-neutral-500 text-xs">
            Salir
          </button>
        )}
      </header>

      {/* Banner VIP */}
      <div className="mx-4 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-neutral-900 p-4">
        <p className="font-extrabold">Hazte VIP de TuDramaYa 👑</p>
        <div className="flex gap-4 text-xs font-semibold mt-2">
          <span>🔓 Caps ilimitados</span>
          <span>🚫 Sin anuncios</span>
          <span>⬇️ Descargas</span>
        </div>
        <button className="mt-3 w-full bg-neutral-900 text-amber-300 rounded-xl py-2.5 font-bold">Activar →</button>
      </div>

      {/* Billetera */}
      <div className="grid grid-cols-3 gap-2 px-4 mt-4">
        <div className="bg-neutral-900 rounded-xl p-3 text-center border border-neutral-800">
          <p className="text-2xl font-extrabold text-amber-400">{cargando ? "…" : perfil?.monedas ?? 0}</p>
          <p className="text-[11px] text-neutral-400">🪙 Billetera</p>
        </div>
        <div className="bg-neutral-900 rounded-xl p-3 text-center border border-neutral-800">
          <p className="text-2xl font-extrabold">{cargando ? "…" : perfil?.puntos ?? 0}</p>
          <p className="text-[11px] text-neutral-400">⭐ Puntos</p>
        </div>
        <div className="bg-neutral-900 rounded-xl p-3 text-center border border-neutral-800">
          <p className="text-2xl font-extrabold">0</p>
          <p className="text-[11px] text-neutral-400">🎫 Cupones</p>
        </div>
      </div>

      {vip && <p className="text-center text-amber-400 text-xs mt-2">VIP activo ✨</p>}

      {/* Menú */}
      <div className="mx-4 mt-5 bg-neutral-900 rounded-2xl border border-neutral-800 divide-y divide-neutral-800">
        <Item href="/tudramaya/recompensas" icon="🎁" label="Gana recompensas (check-in diario)" />
        <Item href="/tudramaya/mi-lista" icon="🕒" label="Historial / Mi Lista" />
        <Item href="/tudramaya" icon="🎬" label="Explorar dramas" />
      </div>

      <p className="text-center text-neutral-700 text-xs mt-6">TuDramaYa · v1</p>

      <BottomNav />
    </main>
  );
}

function Item({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-4">
      <span className="text-lg">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-neutral-600">›</span>
    </Link>
  );
}
