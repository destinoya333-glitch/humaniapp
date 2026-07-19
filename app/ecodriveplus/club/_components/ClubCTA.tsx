"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Perfil = "publico" | "interno_pasajero" | "interno_conductor";
type Step = "form" | "numeros" | "ok" | "error";

export function ClubCTA(props: {
  edicionId: string;
  ticketPublico: number;
  ticketInterno: number;
  passPublico: number;
  passInterno: number;
  meta: number;
}) {
  const [step, setStep] = useState<Step>("form");
  const [perfil, setPerfil] = useState<Perfil>("publico");
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cantidad, setCantidad] = useState(1);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Post-pago
  const [passIds, setPassIds] = useState<string[]>([]);
  const [numeros, setNumeros] = useState<(number | null)[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  // Selección de número (para el slot activo)
  const [ocupados, setOcupados] = useState<Set<number>>(new Set());
  const [spinning, setSpinning] = useState(false);
  const [spinDisplay, setSpinDisplay] = useState<number | null>(null);
  const [verGrilla, setVerGrilla] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const spinRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const precio = perfil === "publico" ? props.passPublico : props.passInterno;
  const total = precio * cantidad;

  // Culqi Checkout v4
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

  const cargarOcupados = useCallback(async () => {
    try {
      const r = await fetch(`/api/ecodrive/club/numeros-ocupados?edicion_id=${props.edicionId}`);
      const j = await r.json();
      if (j.ok && Array.isArray(j.ocupados)) setOcupados(new Set<number>(j.ocupados));
    } catch {
      /* la reserva valida igual */
    }
  }, [props.edicionId]);

  useEffect(() => {
    return () => {
      if (spinRef.current) clearInterval(spinRef.current);
    };
  }, []);

  const validar = (): string | null => {
    if (dni.length !== 8) return "DNI debe ser 8 dígitos";
    if (nombre.trim().length < 3) return "Ingresá tu nombre completo";
    if (whatsapp.replace(/\D/g, "").length < 9) return "WhatsApp debe ser de 9 dígitos";
    return null;
  };

  // Paga N membresías → abre Culqi por el total.
  const pagar = () => {
    setErrorMsg("");
    const inv = validar();
    if (inv) return setErrorMsg(inv);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Culqi = (window as unknown as { Culqi?: any }).Culqi;
    if (!CULQI_PK || !Culqi || !culqiReady) return setErrorMsg("El pago se está cargando, intentá en un segundo.");

    Culqi.publicKey = CULQI_PK;
    Culqi.settings({
      title: "EcoDrive+ Club",
      currency: "PEN",
      amount: Math.round(total * 100),
      description: `${cantidad} Membresía${cantidad > 1 ? "s" : ""} Club`,
    });
    Culqi.options({
      lang: "es",
      installments: false,
      paymentMethods: { tarjeta: true, yape: true, billetera: false, bancaMovil: false, agente: false, cuotealo: false },
      style: { buttonText: "Pagar", buttonTextColor: "#0A0908", buttonBackgroundColor: "#E1811B" },
    });

    (window as unknown as { culqi?: () => void }).culqi = async () => {
      if (Culqi.token) {
        const token = Culqi.token.id as string;
        const email = (Culqi.token.email as string) || `club_${dni}@ecodriveplus.com`;
        setLoading(true);
        try {
          const res = await fetch("/api/ecodrive/club/comprar-membresias", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, email, dni, nombre, whatsapp, tipo_perfil: perfil, cantidad }),
          });
          const j = await res.json();
          if (!j.ok) throw new Error(j.error || "No se pudo procesar el pago");
          Culqi.close();
          setPassIds(j.pass_ids || []);
          setNumeros(new Array((j.pass_ids || []).length).fill(null));
          await cargarOcupados();
          setStep("numeros");
        } catch (e) {
          setErrorMsg((e as Error).message);
          setStep("error");
        } finally {
          setLoading(false);
        }
      } else if (Culqi.error) {
        setErrorMsg(Culqi.error.user_message || "El pago fue rechazado. Intentá con otro método.");
      }
    };
    Culqi.open();
  };

  // Ruleta para el slot activo
  const girar = async () => {
    if (spinning) return;
    setSpinning(true);
    setErrorMsg("");
    spinRef.current = setInterval(() => setSpinDisplay(1 + Math.floor(Math.random() * props.meta)), 60);
    let n = 1 + Math.floor(Math.random() * props.meta);
    try {
      const r = await fetch(`/api/ecodrive/club/sugerir-numeros?edicion_id=${props.edicionId}&count=1`);
      const j = await r.json();
      if (Array.isArray(j.numeros) && j.numeros.length) n = j.numeros[0];
    } catch {
      /* usa el random */
    }
    await new Promise((res) => setTimeout(res, 1200));
    if (spinRef.current) clearInterval(spinRef.current);
    setSpinDisplay(n);
    await asignar(n);
  };

  // Asigna (o cambia) el número del slot activo → crea el boleto en BD.
  const asignar = async (n: number) => {
    if (activeSlot == null || ocupados.has(n)) {
      if (ocupados.has(n)) setErrorMsg(`El ${n} ya está ocupado, elegí otro.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ecodrive/club/asignar-numero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pass_id: passIds[activeSlot], numero: n, edicion_id: props.edicionId }),
      });
      const j = await res.json();
      if (!j.ok) {
        setErrorMsg(j.error || "No se pudo asignar el número");
        await cargarOcupados();
        return;
      }
      setNumeros((prev) => {
        const next = [...prev];
        const anterior = next[activeSlot];
        next[activeSlot] = n;
        setOcupados((o) => {
          const s = new Set(o);
          if (anterior != null) s.delete(anterior);
          s.add(n);
          return s;
        });
        return next;
      });
      setActiveSlot(null);
      setSpinDisplay(null);
      setVerGrilla(false);
      setBusqueda("");
    } finally {
      setLoading(false);
    }
  };

  const todosElegidos = numeros.length > 0 && numeros.every((x) => x != null);

  // ---- OK ----
  if (step === "ok") {
    return (
      <div className="bg-green-500/10 border border-green-500/40 rounded-2xl p-6 md:p-8 text-center">
        <div className="text-green-300 text-sm font-bold mb-2">✅ ¡LISTO!</div>
        <div className="flex flex-wrap justify-center gap-2 my-3">
          {numeros.map((n, i) => (
            <span key={i} className="text-2xl font-black text-white bg-[#E1811B]/20 border border-[#E1811B]/40 rounded-xl px-3 py-1">
              #{String(n ?? 0).padStart(4, "0")}
            </span>
          ))}
        </div>
        <p className="text-gray-300 text-sm">
          {numeros.length === 1 ? "Tu número quedó" : "Tus números quedaron"} a nombre de <strong className="text-white">{nombre}</strong>.
          Te enviamos {numeros.length === 1 ? "tu boleto" : "tus boletos"} por WhatsApp. 🍀
        </p>
        <a href="/ecodriveplus/club/mi-cuenta" className="inline-block mt-5 bg-[#E1811B] hover:bg-[#FFA84A] text-black font-bold px-6 py-3 rounded-xl transition">
          Ver mi cuenta
        </a>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-6 text-center">
        <h2 className="text-xl font-bold text-red-300 mb-3">⚠️ {errorMsg}</h2>
        <button onClick={() => { setErrorMsg(""); setStep(passIds.length ? "numeros" : "form"); }} className="bg-[#E1811B] text-black px-6 py-2 rounded-lg font-bold">
          Volver
        </button>
      </div>
    );
  }

  // ---- Elegir los N números ----
  if (step === "numeros") {
    const nums = busqueda.trim()
      ? Array.from({ length: props.meta }, (_, i) => i + 1).filter((x) => String(x).includes(busqueda.trim().replace(/\D/g, "")))
      : Array.from({ length: props.meta }, (_, i) => i + 1);
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="eco-mono tracking-[0.2em] text-[11px] text-[var(--eco-ink-mute)] text-center mb-1">
          ¡PAGO CONFIRMADO! ELEGÍ TUS NÚMEROS
        </div>
        <p className="text-center text-sm text-gray-400 mb-4">
          {numeros.filter((x) => x != null).length} de {numeros.length} elegidos
        </p>

        {/* Slots */}
        <div className="flex flex-col gap-2 mb-4">
          {numeros.map((n, i) => (
            <div key={i} className="flex items-center justify-between bg-black/30 border border-white/10 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-300">Membresía {i + 1}</span>
              {n != null ? (
                <div className="flex items-center gap-3">
                  <span className="eco-display text-xl text-[#E1811B]">#{String(n).padStart(4, "0")}</span>
                  <button onClick={() => { setActiveSlot(i); setSpinDisplay(null); }} className="text-xs text-gray-400 underline hover:text-white">cambiar</button>
                </div>
              ) : (
                <button onClick={() => { setActiveSlot(i); setSpinDisplay(null); }} className="bg-[#E1811B] text-black text-sm font-bold px-4 py-1.5 rounded-lg">Elegir</button>
              )}
            </div>
          ))}
        </div>

        {/* Selector para el slot activo */}
        {activeSlot != null && (
          <div className="bg-black/20 rounded-xl p-4 mb-4">
            <div className="text-center text-xs text-gray-400 mb-2">Membresía {activeSlot + 1}</div>
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full border-4 border-[#E1811B] flex items-center justify-center bg-black/40">
                <span className="eco-display text-4xl text-[#E1811B]">{spinDisplay != null ? spinDisplay : "?"}</span>
              </div>
              <button onClick={girar} disabled={spinning || loading} className="mt-4 w-full max-w-xs bg-[#E1811B] hover:bg-[#FFA84A] disabled:opacity-60 text-black font-bold py-3 rounded-xl">
                {spinning ? "Girando…" : "🎰 Número de la suerte"}
              </button>
              <button onClick={() => setVerGrilla((v) => !v)} className="mt-3 text-sm text-[#E1811B] hover:text-[#FFA84A]">
                {verGrilla ? "▲ Ocultar cartilla" : "▼ Elegir de la cartilla"}
              </button>
            </div>
            {verGrilla && (
              <div className="mt-3">
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} inputMode="numeric" placeholder="Buscar (ej. 777)" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white mb-2" />
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-[240px] overflow-y-auto p-1 rounded-lg bg-black/20">
                  {nums.map((x) => {
                    const taken = ocupados.has(x);
                    return (
                      <button key={x} disabled={taken || loading} onClick={() => asignar(x)}
                        className={`text-[10px] py-2 rounded ${taken ? "bg-white/[0.03] text-gray-600 line-through cursor-not-allowed" : "bg-white/10 text-gray-200 hover:bg-white/20"}`}>
                        {x}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => { setActiveSlot(null); setVerGrilla(false); }} className="mt-3 w-full text-xs text-gray-500 hover:text-gray-300">cerrar</button>
          </div>
        )}

        {errorMsg && <p className="text-red-400 text-sm mb-3 text-center">⚠️ {errorMsg}</p>}

        <button onClick={() => setStep("ok")} disabled={!todosElegidos} className="w-full bg-[#E1811B] hover:bg-[#FFA84A] text-black font-bold py-4 rounded-xl disabled:opacity-40 transition">
          {todosElegidos ? "¡Listo, estos son mis números! →" : `Falta elegir ${numeros.filter((x) => x == null).length}`}
        </button>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Si cerrás sin elegir todos, podés completarlos después desde Mi Cuenta. Te recordamos por WhatsApp.
        </p>
      </div>
    );
  }

  // ---- Form: cantidad + datos + pago ----
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-lg">👑 Membresía Club anual</span>
        <span className="text-xs bg-[#E1811B] text-black px-2 py-1 rounded-full">S/.{precio} c/u</span>
      </div>

      <label className="block text-sm text-gray-300 mb-2">¿Cuántas membresías querés? (máx 9)</label>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setCantidad((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg bg-white/10 text-white text-xl">−</button>
        <div className="text-center">
          <div className="text-3xl font-black text-white">{cantidad}</div>
          <div className="text-xs text-gray-400">{cantidad === 1 ? "membresía" : "membresías"}</div>
        </div>
        <button onClick={() => setCantidad((q) => Math.min(9, q + 1))} className="w-10 h-10 rounded-lg bg-white/10 text-white text-xl">+</button>
        <div className="ml-auto text-right">
          <div className="text-xs text-gray-400">Total</div>
          <div className="text-2xl font-black text-[#E1811B]">S/.{total}</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Cada membresía = 1 número en el sorteo del auto. {cantidad > 1 ? `Elegís tus ${cantidad} números después de pagar.` : "Elegís tu número después de pagar."}
        {" "}🎁 Bonus lealtad: tu próxima membresía (siguiente edición) costará S/.27.
      </p>

      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">Soy:</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "publico" as Perfil, l: "Público" },
            { v: "interno_pasajero" as Perfil, l: "Pasajero EcoDrive+" },
            { v: "interno_conductor" as Perfil, l: "Conductor EcoDrive+" },
          ].map((o) => (
            <button key={o.v} onClick={() => setPerfil(o.v)}
              className={`px-3 py-2 rounded-lg text-sm transition ${perfil === o.v ? "bg-[#E1811B] text-black font-bold" : "bg-white/5 hover:bg-white/10 text-gray-300"}`}>
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

      {errorMsg && <p className="text-red-400 text-sm mb-3">⚠️ {errorMsg}</p>}

      <button onClick={pagar} disabled={loading || !dni || !nombre || !whatsapp || !culqiReady}
        className="w-full bg-[#E1811B] hover:bg-[#FFA84A] text-black font-bold py-4 rounded-xl disabled:opacity-50 transition">
        {loading ? "Procesando..." : `Pagar S/.${total} →`}
      </button>
      <p className="text-xs text-gray-500 mt-3 text-center">
        💳 Tarjeta o Yape · Culqi · Elegís {cantidad > 1 ? "tus números" : "tu número"} apenas confirmes el pago
      </p>
    </div>
  );
}
