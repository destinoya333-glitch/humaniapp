"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "../_components/BottomNav";

const DIAS = [10, 15, 20, 25, 30, 40, 60]; // monedas por día de racha

export default function RecompensasPage() {
  const [logueado, setLogueado] = useState<boolean | null>(null);
  const [saldo, setSaldo] = useState<number>(0);
  const [racha, setRacha] = useState<number>(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/tudramaya/perfil")
      .then((r) => r.json())
      .then((j) => {
        setLogueado(!!j.user);
        setSaldo(j.perfil?.monedas ?? 0);
      });
  }, []);

  async function reclamar() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/tudramaya/checkin", { method: "POST" });
      const j = await r.json();
      if (j.error === "no_auth") {
        setMsg("Inicia sesión para reclamar tus monedas.");
        return;
      }
      setRacha(j.dia_racha ?? 0);
      setSaldo(j.saldo ?? saldo);
      setMsg(j.ya_hizo ? "Ya reclamaste hoy. ¡Vuelve mañana! 😉" : `🎉 +${j.ganadas} monedas (día ${j.dia_racha})`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-24">
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-2xl font-extrabold">Recompensas 🎁</h1>
        <p className="text-neutral-400 text-sm">Entra cada día y gana monedas para desbloquear capítulos.</p>
        <p className="mt-3 text-amber-400 font-bold">🪙 Tienes {saldo} monedas</p>
      </header>

      {/* Calendario de racha */}
      <div className="mx-4 bg-neutral-900 rounded-2xl border border-neutral-800 p-4">
        <p className="font-semibold mb-3">Check-in diario (racha de 7 días)</p>
        <div className="grid grid-cols-4 gap-2">
          {DIAS.map((m, i) => {
            const dia = i + 1;
            const hecho = dia <= racha;
            return (
              <div
                key={dia}
                className={`rounded-xl p-3 text-center border ${
                  hecho ? "border-amber-400 bg-amber-400/10" : "border-neutral-700 bg-neutral-800"
                } ${dia === 7 ? "col-span-1" : ""}`}
              >
                <p className="text-amber-400 font-extrabold text-sm">+{m}</p>
                <p className="text-[10px] text-neutral-400">Día {dia}</p>
                {hecho && <p className="text-[10px] text-amber-400">✓</p>}
              </div>
            );
          })}
        </div>
        <button
          onClick={reclamar}
          disabled={loading || logueado === false}
          className="mt-4 w-full bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-700 rounded-xl py-3 font-bold"
        >
          {loading ? "…" : "Reclamar recompensa de hoy"}
        </button>
        {logueado === false && (
          <Link href="/tudramaya/login" className="block text-center text-rose-400 text-sm mt-3">
            Inicia sesión para ganar monedas →
          </Link>
        )}
        {msg && <p className="text-center text-sm mt-3 text-green-400">{msg}</p>}
      </div>

      <div className="mx-4 mt-4 bg-neutral-900 rounded-2xl border border-neutral-800 p-4">
        <p className="font-semibold mb-1">¿Para qué sirven las monedas? 🪙</p>
        <p className="text-neutral-400 text-sm">
          Cada capítulo de pago cuesta <b className="text-amber-400">30 monedas</b>. Junta con el check-in diario o recárgalas por Yape.
        </p>
      </div>

      <BottomNav />
    </main>
  );
}
