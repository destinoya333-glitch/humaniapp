"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Perfil = "publico" | "interno_pasajero" | "interno_conductor";
type Step = "numero" | "form" | "metodo" | "ok" | "error";

export function ClubCTA(props: {
  edicionId: string;
  ticketPublico: number;
  ticketInterno: number;
  passPublico: number;
  passInterno: number;
  meta: number;
}) {
  const [step, setStep] = useState<Step>("numero");
  const [perfil, setPerfil] = useState<Perfil>("publico");
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [okResult, setOkResult] = useState<{ numero: number; fecha_fin?: string } | null>(null);
  const [reserva, setReserva] = useState<{ id: string; monto: number; numero: number } | null>(null);

  // --- Selección de número (cartilla + ruleta) ---
  const [numeroElegido, setNumeroElegido] = useState<number | null>(null);
  const [ocupados, setOcupados] = useState<Set<number>>(new Set());
  const [loadingNums, setLoadingNums] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinDisplay, setSpinDisplay] = useState<number | null>(null);
  const [verGrilla, setVerGrilla] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const spinRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const precio = perfil === "publico" ? props.passPublico : props.passInterno;

  const cargarOcupados = useCallback(async () => {
    setLoadingNums(true);
    try {
      const r = await fetch(`/api/ecodrive/club/numeros-ocupados?edicion_id=${props.edicionId}`);
      const j = await r.json();
      if (j.ok && Array.isArray(j.ocupados)) setOcupados(new Set<number>(j.ocupados));
    } catch {
      /* si falla, la cartilla muestra todo como libre; la reserva valida igual */
    } finally {
      setLoadingNums(false);
    }
  }, [props.edicionId]);

  useEffect(() => {
    void cargarOcupados();
    return () => {
      if (spinRef.current) clearInterval(spinRef.current);
    };
  }, [cargarOcupados]);

  // Ruleta: gira ~1.4s y cae en un número LIBRE (lo elige el servidor).
  const girarRuleta = async () => {
    if (spinning) return;
    setSpinning(true);
    setErrorMsg("");
    setNumeroElegido(null);
    spinRef.current = setInterval(
      () => setSpinDisplay(1 + Math.floor(Math.random() * props.meta)),
      60,
    );
    try {
      const r = await fetch(`/api/ecodrive/club/sugerir-numeros?edicion_id=${props.edicionId}&count=1`);
      const j = await r.json();
      const n =
        Array.isArray(j.numeros) && j.numeros.length
          ? (j.numeros[0] as number)
          : 1 + Math.floor(Math.random() * props.meta);
      await new Promise((res) => setTimeout(res, 1400));
      if (spinRef.current) clearInterval(spinRef.current);
      setSpinDisplay(n);
      setNumeroElegido(n);
    } catch {
      if (spinRef.current) clearInterval(spinRef.current);
    } finally {
      setSpinning(false);
    }
  };

  const validar = (): string | null => {
    if (dni.length !== 8 || !/^\d{8}$/.test(dni)) return "DNI debe ser 8 dígitos";
    if (nombre.trim().length < 3) return "Ingresá tu nombre completo";
    if (whatsapp.replace(/\D/g, "").length < 9) return "WhatsApp debe ser de 9 dígitos";
    return null;
  };

  // Reserva el número ELEGIDO y pasa a elegir método de pago.
  const iniciar = async () => {
    setErrorMsg("");
    const invalido = validar();
    if (invalido) {
      setErrorMsg(invalido);
      return;
    }
    if (!numeroElegido) {
      setStep("numero");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/ecodrive/club/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edicion_id: props.edicionId,
          modalidad: "pass",
          dni,
          nombre,
          whatsapp,
          tipo_perfil: perfil,
          numero_correlativo: numeroElegido,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        // Si el número se ocupó recién, volvemos a la cartilla.
        setErrorMsg(d.error || "No se pudo iniciar el pago");
        if (/numero|correlativo|ocupad|disponible|duplicad|unique/i.test(d.error || "")) {
          await cargarOcupados();
          setNumeroElegido(null);
          setStep("numero");
        }
        return;
      }
      setReserva({ id: d.reserva_id, monto: Number(d.precio), numero: d.numero_correlativo });
      setStep("metodo");
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Paso final: abrir Culqi con el método elegido (tarjeta O Yape).
  const payWith = (metodo: "tarjeta" | "yape") => {
    if (!reserva) return;
    setErrorMsg("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Culqi = (window as unknown as { Culqi?: any }).Culqi;
    if (!CULQI_PK || !Culqi || !culqiReady) {
      setErrorMsg("El pago aún se está cargando, intentá en un segundo.");
      return;
    }

    Culqi.publicKey = CULQI_PK;
    Culqi.settings({
      title: "EcoDrive+ Club",
      currency: "PEN",
      amount: Math.round(reserva.monto * 100),
      description: `Membresía Club anual — N° ${reserva.numero}`,
    });
    Culqi.options({
      lang: "es",
      installments: false,
      paymentMethods: {
        tarjeta: metodo === "tarjeta",
        yape: metodo === "yape",
        billetera: false,
        bancaMovil: false,
        agente: false,
        cuotealo: false,
      },
      style: { buttonText: "Pagar", buttonTextColor: "#0A0908", buttonBackgroundColor: "#E1811B" },
    });

    (window as unknown as { culqi?: () => void }).culqi = async () => {
      if (Culqi.token) {
        const token = Culqi.token.id as string;
        const email = (Culqi.token.email as string) || `club_${dni}@ecodriveplus.com`;
        setLoading(true);
        try {
          const res = await fetch("/api/ecodrive/club/culqi-charge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, email, reserva_id: reserva.id }),
          });
          const j = await res.json();
          if (!j.ok) throw new Error(j.error || "No se pudo procesar el pago");
          Culqi.close();
          setOkResult({ numero: j.numero_correlativo ?? reserva.numero, fecha_fin: j.fecha_fin });
          setStep("ok");
        } catch (e) {
          setErrorMsg((e as Error).message);
          setStep("error");
        } finally {
          setLoading(false);
        }
      } else if (Culqi.error) {
        setErrorMsg(Culqi.error.user_message || "El pago fue rechazado. Intentá con otro método o tarjeta.");
      }
    };

    Culqi.open();
  };

  // Culqi Checkout v4 (tarjeta / Yape) — se carga una sola vez.
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

  // ---- Pantalla 1: elegir número (ruleta + cartilla) ----
  if (step === "numero") {
    const numerosFiltrados = busqueda.trim()
      ? Array.from({ length: props.meta }, (_, i) => i + 1).filter((n) =>
          String(n).includes(busqueda.trim().replace(/\D/g, "")),
        )
      : Array.from({ length: props.meta }, (_, i) => i + 1);
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="text-center mb-5">
          <div className="eco-mono tracking-[0.2em] text-[11px] text-[var(--eco-ink-mute)]">
            ELEGÍ TU NÚMERO DE LA SUERTE
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {loadingNums
              ? "Cargando disponibilidad…"
              : `${ocupados.size.toLocaleString()} de ${props.meta.toLocaleString()} números ya vendidos`}
          </p>
        </div>

        {/* Ruleta */}
        <div className="flex flex-col items-center">
          <div className="w-40 h-40 rounded-full border-4 border-[#E1811B] flex items-center justify-center bg-black/40 shadow-lg">
            <span className={`eco-display text-5xl text-[#E1811B] ${spinning ? "opacity-70" : ""}`}>
              {numeroElegido != null
                ? `${numeroElegido}`
                : spinDisplay != null
                  ? spinDisplay
                  : "?"}
            </span>
          </div>
          <button
            onClick={girarRuleta}
            disabled={spinning}
            className="mt-5 w-full max-w-xs bg-[#E1811B] hover:bg-[#FFA84A] disabled:opacity-60 text-black font-bold py-4 rounded-xl transition"
          >
            {spinning ? "Girando…" : numeroElegido != null ? "🎰 Girar de nuevo" : "🎰 Número de la suerte"}
          </button>
        </div>

        {/* Cartilla completa */}
        <button
          onClick={() => setVerGrilla((v) => !v)}
          className="mt-6 w-full text-center text-sm text-[#E1811B] hover:text-[#FFA84A] transition"
        >
          {verGrilla ? "▲ Ocultar cartilla" : "▼ Prefiero elegir mi número de la cartilla"}
        </button>

        {verGrilla && (
          <div className="mt-4">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              inputMode="numeric"
              placeholder="Buscar número (ej. 777)"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white mb-3"
            />
            <div className="flex items-center gap-4 text-[11px] text-gray-400 mb-2">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-white/10" /> libre</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-white/[0.03] border border-white/10" /> ocupado</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-[#E1811B]" /> tu número</span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-[320px] overflow-y-auto p-1 rounded-lg bg-black/20">
              {numerosFiltrados.map((n) => {
                const taken = ocupados.has(n);
                const sel = numeroElegido === n;
                return (
                  <button
                    key={n}
                    disabled={taken}
                    onClick={() => setNumeroElegido(n)}
                    className={`text-[10px] leading-none py-2 rounded ${
                      sel
                        ? "bg-[#E1811B] text-black font-bold"
                        : taken
                          ? "bg-white/[0.03] text-gray-600 line-through cursor-not-allowed"
                          : "bg-white/10 text-gray-200 hover:bg-white/20"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {errorMsg && <p className="text-red-400 text-sm mt-3 text-center">⚠️ {errorMsg}</p>}

        <button
          onClick={() => setStep("form")}
          disabled={numeroElegido == null}
          className="mt-6 w-full bg-[#E1811B] hover:bg-[#FFA84A] text-black font-bold py-4 rounded-xl disabled:opacity-40 transition"
        >
          {numeroElegido != null ? `Continuar con el N° ${String(numeroElegido).padStart(4, "0")} →` : "Elegí un número para continuar"}
        </button>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Elegís tu número · luego tus datos · pagás con Culqi (tarjeta o Yape)
        </p>
      </div>
    );
  }

  // ---- Pantalla: elegir método de pago (Yape / tarjeta) ----
  if (step === "metodo" && reserva) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 text-center">
        <div className="eco-mono tracking-[0.2em] text-[11px] text-[var(--eco-ink-mute)] mb-3">
          ECODRIVE+ CLUB · PAGO SEGURO
        </div>
        <div className="eco-display text-[56px] md:text-[64px] leading-none text-[#E1811B]">
          S/ {reserva.monto.toFixed(2)}
        </div>
        <div className="text-gray-400 text-sm mt-3 mb-8">
          Membresía Club anual · N° {String(reserva.numero).padStart(4, "0")}
        </div>

        <button
          onClick={() => payWith("yape")}
          disabled={loading || !culqiReady}
          className="w-full flex items-center justify-center gap-3 bg-[#790699] hover:bg-[#8f1cb0] disabled:opacity-60 text-white font-bold text-lg rounded-2xl py-5 shadow-lg transition"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ecodriveplus/yape-logo.png" alt="Yape" className="h-9 w-auto" />
          {loading ? "Procesando…" : "Pagar con Yape"}
        </button>

        <button
          onClick={() => payWith("tarjeta")}
          disabled={loading || !culqiReady}
          className="w-full mt-3 flex items-center justify-center gap-2 border-2 border-[#E1811B] text-[#E1811B] hover:bg-[#E1811B]/10 disabled:opacity-60 font-bold text-lg rounded-2xl py-5 transition"
        >
          💳 {loading ? "Procesando…" : "Pagar con tarjeta"}
        </button>

        {errorMsg && <p className="text-red-400 text-sm mt-4">⚠️ {errorMsg}</p>}

        <p className="eco-mono text-[11px] text-[var(--eco-ink-mute)] mt-6">
          Pago procesado por Culqi · se confirma al instante
        </p>
        <button
          onClick={() => {
            setStep("form");
            setErrorMsg("");
            setReserva(null);
          }}
          className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition"
        >
          ← Volver
        </button>
      </div>
    );
  }

  if (step === "ok" && okResult) {
    return (
      <div className="bg-green-500/10 border border-green-500/40 rounded-2xl p-6 md:p-8 text-center">
        <div className="text-green-300 text-sm font-bold mb-2">✅ MEMBRESÍA ACTIVADA</div>
        <h2 className="text-4xl md:text-5xl font-black text-white">{okResult.numero}</h2>
        <p className="text-gray-300 text-sm mt-3">
          Tu Membresía Club anual a nombre de <strong className="text-white">{nombre}</strong> quedó activa
          {okResult.fecha_fin ? <> hasta <strong className="text-white">{okResult.fecha_fin}</strong></> : null}.
        </p>
        <p className="text-gray-400 text-xs mt-3">
          Te enviamos la confirmación y tu boleto por WhatsApp. Participás en el sorteo del auto.
        </p>
        <a
          href="/ecodriveplus/club/mi-cuenta"
          className="inline-block mt-5 bg-[#E1811B] hover:bg-[#FFA84A] text-black font-bold px-6 py-3 rounded-xl transition"
        >
          Ver mi cuenta
        </a>
        <button
          onClick={() => {
            setStep("numero");
            setOkResult(null);
            setReserva(null);
            setDni("");
            setNombre("");
            setWhatsapp("");
            setNumeroElegido(null);
            void cargarOcupados();
          }}
          className="mt-4 w-full bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-lg text-sm transition"
        >
          Comprar otra Membresía
        </button>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-6 text-center">
        <h2 className="text-xl font-bold text-red-300 mb-3">⚠️ {errorMsg}</h2>
        <button
          onClick={() => {
            setStep(reserva ? "metodo" : "numero");
            setErrorMsg("");
          }}
          className="bg-[#E1811B] text-black px-6 py-2 rounded-lg font-bold"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  // ---- Pantalla 2: datos (form) ----
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4 bg-[#E1811B]/10 border border-[#E1811B]/30 rounded-xl px-4 py-3">
        <div>
          <div className="text-[11px] text-gray-400">TU NÚMERO</div>
          <div className="eco-display text-2xl text-[#E1811B]">
            {numeroElegido != null ? numeroElegido : "----"}
          </div>
        </div>
        <button
          onClick={() => setStep("numero")}
          className="text-xs text-[#E1811B] hover:text-[#FFA84A] underline"
        >
          Cambiar
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-lg">👑 Membresía Club anual</span>
          <span className="text-xs bg-[#E1811B] text-black px-2 py-1 rounded-full">12 MESES</span>
        </div>
        <p className="text-3xl font-bold">S/.{precio}</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">Soy:</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "publico" as Perfil, l: "Público" },
            { v: "interno_pasajero" as Perfil, l: "Pasajero EcoDrive+" },
            { v: "interno_conductor" as Perfil, l: "Conductor EcoDrive+" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setPerfil(o.v)}
              className={`px-3 py-2 rounded-lg text-sm transition ${
                perfil === o.v ? "bg-[#E1811B] text-black font-bold" : "bg-white/5 hover:bg-white/10 text-gray-300"
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <input value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))} maxLength={8} placeholder="DNI (8 dígitos)" className="bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-white" />
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombres y apellidos" className="bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-white" />
        <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))} maxLength={9} placeholder="WhatsApp (9 dígitos)" className="bg-black/40 border border-white/10 rounded-lg px-3 py-3 text-white" />
      </div>

      {perfil === "interno_conductor" && (
        <p className="text-xs text-green-300 mb-3">✓ Beneficio incluido: 18 primeros viajes del mes sin comisión EcoDrive+</p>
      )}
      {perfil === "interno_pasajero" && (
        <p className="text-xs text-green-300 mb-3">✓ Beneficio incluido: 1 mes con cashback al 10% en tus viajes (vs 5% normal)</p>
      )}

      {errorMsg && <p className="text-red-400 text-sm mb-3">⚠️ {errorMsg}</p>}

      <button
        onClick={iniciar}
        disabled={loading || !dni || !nombre || !whatsapp}
        className="w-full bg-[#E1811B] hover:bg-[#FFA84A] text-black font-bold py-4 rounded-xl disabled:opacity-50 transition"
      >
        {loading ? "Procesando..." : `Ir a pagar S/.${precio} →`}
      </button>
      <p className="text-xs text-gray-500 mt-3 text-center">
        💳 Tarjeta o Yape · Pago seguro con Culqi · Sin suscripción
      </p>
    </div>
  );
}
