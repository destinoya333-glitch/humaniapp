"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Tier = "cap" | "pack5" | "completo";

const TIERS: { id: Tier; label: string; precio: number; nota?: string }[] = [
  { id: "cap", label: "Este capítulo", precio: 1.0 },
  { id: "pack5", label: "Los próximos 5 capítulos", precio: 3.3 },
  { id: "completo", label: "Serie completa (63 caps)", precio: 12.0, nota: "★ mejor precio" },
];

export default function Paywall({
  serieId,
  episodioNumero,
  userId,
  yapeNumero,
  yapeNombre,
}: {
  serieId: string;
  episodioNumero: number;
  userId: string | null;
  yapeNumero: string;
  yapeNombre: string;
}) {
  const [tier, setTier] = useState<Tier>("completo");
  const [step, setStep] = useState<"elegir" | "yape">("elegir");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const precio = TIERS.find((t) => t.id === tier)!.precio;

  // Culqi Checkout v4 (pago con tarjeta) — se carga una sola vez.
  const CULQI_PK = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
  const [culqiReady, setCulqiReady] = useState(false);
  useEffect(() => {
    if (!CULQI_PK) return;
    if ((window as unknown as { Culqi?: unknown }).Culqi) {
      setCulqiReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.culqi.com/js/v4";
    s.async = true;
    s.onload = () => setCulqiReady(true);
    document.body.appendChild(s);
  }, [CULQI_PK]);

  function pagarTarjeta() {
    setErr(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Culqi = (window as unknown as { Culqi?: any }).Culqi;
    if (!CULQI_PK || !Culqi || !culqiReady) {
      setErr("El pago con tarjeta aún se está cargando, intenta en un segundo.");
      return;
    }
    Culqi.publicKey = CULQI_PK;
    Culqi.settings({
      title: "TuDramaYa",
      currency: "PEN",
      amount: Math.round(precio * 100),
      description: `TuDramaYa — ${TIERS.find((t) => t.id === tier)!.label}`,
    });
    Culqi.options({
      lang: "es",
      paymentMethods: { tarjeta: true, yape: true, billetera: false, bancaMovil: false },
      style: { buttonText: "Pagar", buttonTextColor: "#ffffff", buttonBackgroundColor: "#E11D48" },
    });
    (window as unknown as { culqi?: () => void }).culqi = async () => {
      if (Culqi.token) {
        const token = Culqi.token.id as string;
        const email = (Culqi.token.email as string) || `tdy_${(userId ?? "anon").slice(0, 8)}@activosya.com`;
        setLoading(true);
        try {
          const res = await fetch("/api/tudramaya/culqi-charge", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token, email, user_id: userId, serie_id: serieId, tier, episodio: episodioNumero }),
          });
          const j = await res.json();
          if (!j.ok) throw new Error(j.error || "No se pudo procesar la tarjeta");
          Culqi.close();
          setMsg("¡Pago confirmado! Desbloqueando…");
          setTimeout(() => location.reload(), 900);
        } catch (e) {
          setErr((e as Error).message);
        } finally {
          setLoading(false);
        }
      } else if (Culqi.error) {
        setErr(Culqi.error.user_message || "La tarjeta fue rechazada. Intenta con otra.");
      }
    };
    Culqi.open();
  }

  // Billetera de monedas (para desbloquear sin pagar)
  const [monedas, setMonedas] = useState<number | null>(null);
  useEffect(() => {
    if (!userId) return;
    fetch("/api/tudramaya/perfil")
      .then((r) => r.json())
      .then((j) => setMonedas(j.perfil?.monedas ?? 0))
      .catch(() => {});
  }, [userId]);

  async function desbloquearMonedas() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/tudramaya/desbloquear-monedas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ serie_id: serieId, episodio: episodioNumero }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo desbloquear");
      setMsg("¡Desbloqueado con monedas! 🪙 Cargando…");
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // INSTANTÁNEO (Supabase Realtime): la página se suscribe a la inserción del
  // acceso; cuando MacroDroid confirma el pago, Supabase lo empuja al toque.
  useEffect(() => {
    if (step !== "yape" || !userId) return;
    const supabase = createClient();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      // Autorizar el canal con la sesión del usuario para que RLS le entregue SUS accesos.
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      ch = supabase
        .channel(`tdy-acceso-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "tdy_accesos", filter: `user_id=eq.${userId}` },
          () => {
            setMsg("¡Pago confirmado! Desbloqueando…");
            location.reload();
          }
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (ch) supabase.removeChannel(ch);
    };
  }, [step, userId]);

  // RESPALDO (sondeo cada 4s): por si Realtime no está activo o se cae la conexión.
  useEffect(() => {
    if (step !== "yape" || !userId) return;
    let stop = false;
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/tudramaya/acceso-estado", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ user_id: userId, serie_id: serieId, numero: episodioNumero }),
        });
        const j = await r.json();
        if (j.desbloqueado && !stop) {
          stop = true;
          clearInterval(t);
          setMsg("¡Pago confirmado! Desbloqueando…");
          location.reload();
        }
      } catch {
        /* reintenta en el próximo tick */
      }
    }, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [step, userId, serieId, episodioNumero]);

  if (!userId) {
    return (
      <div className="max-w-md mx-auto text-center bg-neutral-900 rounded-2xl p-7">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-xl font-bold mb-1">Capítulo {episodioNumero}</h2>
        <p className="text-neutral-400 mb-6">Inicia sesión para desbloquear y seguir viendo.</p>
        <a
          href="/tudramaya/login"
          className="block w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-lg rounded-xl py-4"
        >
          Iniciar sesión
        </a>
        <p className="text-neutral-500 text-xs mt-3">Con Google, Facebook o tu correo.</p>
      </div>
    );
  }

  async function iniciarYape() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/tudramaya/yape-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: userId, serie_id: serieId, tier, episodio: episodioNumero }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo iniciar el pago");
      setStep("yape");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function subirCaptura(file: File) {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("captura", file);
      fd.append("user_id", userId!);
      fd.append("serie_id", serieId);
      fd.append("tier", tier);
      fd.append("episodio", String(episodioNumero));
      const r = await fetch("/api/tudramaya/yape-capture", { method: "POST", body: fd });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No pudimos validar tu Yape");
      setMsg("¡Pago confirmado! Desbloqueando…");
      setTimeout(() => location.reload(), 1300);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-neutral-900 rounded-2xl p-6 text-white">
      <h2 className="text-lg font-bold mb-1">🔒 Capítulo {episodioNumero}</h2>
      <p className="text-neutral-400 text-sm mb-4">Desbloquea para seguir la historia.</p>

      {step === "elegir" && (
        <>
          {/* Desbloquear con monedas (gratis si tienes saldo) */}
          {monedas != null && (
            <>
              <button
                onClick={desbloquearMonedas}
                disabled={loading || monedas < 30}
                className="w-full mb-2 rounded-xl py-3 font-bold bg-amber-400 text-neutral-900 disabled:bg-neutral-700 disabled:text-neutral-400"
              >
                🪙 Desbloquear con 30 monedas · tienes {monedas}
              </button>
              <p className="text-center text-[11px] text-neutral-500 mb-4">
                {monedas < 30 ? (
                  <>
                    Te faltan monedas — gánalas gratis en{" "}
                    <a href="/tudramaya/recompensas" className="text-rose-400">
                      Recompensas
                    </a>
                    , o paga con Yape:
                  </>
                ) : (
                  <>— o paga con Yape —</>
                )}
              </p>
            </>
          )}
          <div className="space-y-2 mb-4">
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTier(t.id)}
                className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border transition ${
                  tier === t.id
                    ? "border-rose-500 bg-rose-500/10"
                    : "border-neutral-700 hover:border-neutral-500"
                }`}
              >
                <span className="text-sm">
                  {t.label}
                  {t.nota && <span className="ml-2 text-rose-400 text-xs">{t.nota}</span>}
                </span>
                <span className="font-bold">S/ {t.precio.toFixed(2)}</span>
              </button>
            ))}
          </div>
          <button
            onClick={iniciarYape}
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-600 text-white font-semibold rounded-xl py-3"
          >
            {loading ? "…" : `Pagar con Yape · S/ ${precio.toFixed(2)}`}
          </button>
          {CULQI_PK && (
            <button
              onClick={pagarTarjeta}
              disabled={loading || !culqiReady}
              className="w-full mt-2 border border-neutral-600 hover:border-neutral-400 disabled:opacity-50 text-white font-semibold rounded-xl py-3"
            >
              💳 {culqiReady ? `Pagar con tarjeta · S/ ${precio.toFixed(2)}` : "Cargando tarjeta…"}
            </button>
          )}
          <p className="text-center text-xs text-neutral-500 mt-2">Pago único, sin suscripción.</p>
        </>
      )}

      {step === "yape" && (
        <div className="space-y-3">
          <div className="rounded-xl bg-neutral-800 p-4 text-center">
            <p className="text-sm text-neutral-300">Yapea exactamente</p>
            <p className="text-2xl font-extrabold text-rose-400">S/ {precio.toFixed(2)}</p>
            <p className="text-sm text-neutral-300 mt-1">al número</p>
            <p className="text-xl font-bold tracking-wider">{yapeNumero}</p>
            <p className="text-xs text-neutral-400 mt-1">a nombre de {yapeNombre}</p>
          </div>
          <p className="text-xs text-neutral-400 text-center">
            Si el pago no se desbloquea solo en 1 min, sube tu captura del Yape:
          </p>
          <label className="block">
            <span className="sr-only">Subir captura</span>
            <input
              type="file"
              accept="image/*"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) subirCaptura(f);
              }}
              className="block w-full text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-600 file:px-4 file:py-2 file:text-white"
            />
          </label>
          <button
            onClick={() => setStep("elegir")}
            className="w-full text-xs text-neutral-500 hover:text-neutral-300"
          >
            ← Cambiar plan
          </button>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-green-400 text-center">{msg}</p>}
      {err && <p className="mt-3 text-sm text-red-400 text-center">{err}</p>}
    </div>
  );
}
