"use client";

import { useEffect, useState } from "react";

type Perfil = "publico" | "interno_pasajero" | "interno_conductor";
type Step = "form" | "ok" | "error";

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

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [okResult, setOkResult] = useState<{ numero: number; fecha_fin?: string } | null>(null);

  const precio = perfil === "publico" ? props.passPublico : props.passInterno;

  // Culqi Checkout v4 (tarjeta + Yape) — se carga una sola vez.
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

  const validar = (): string | null => {
    if (dni.length !== 8 || !/^\d{8}$/.test(dni)) return "DNI debe ser 8 dígitos";
    if (nombre.trim().length < 3) return "Ingresá tu nombre completo";
    if (whatsapp.replace(/\D/g, "").length < 9) return "WhatsApp debe ser de 9 dígitos";
    return null;
  };

  const pagar = async () => {
    setErrorMsg("");
    const invalido = validar();
    if (invalido) {
      setErrorMsg(invalido);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Culqi = (window as unknown as { Culqi?: any }).Culqi;
    if (!CULQI_PK || !Culqi || !culqiReady) {
      setErrorMsg("El pago aún se está cargando, intentá en un segundo.");
      return;
    }

    setLoading(true);
    try {
      // 1) Reservar el número (asigna correlativo + precio real con bonus de lealtad)
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
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErrorMsg(d.error || "No se pudo iniciar el pago");
        setLoading(false);
        return;
      }
      const reservaId: string = d.reserva_id;
      const montoReal: number = Number(d.precio);
      const numero: number = d.numero_correlativo;

      // 2) Abrir Culqi Checkout con tarjeta + Yape
      Culqi.publicKey = CULQI_PK;
      Culqi.settings({
        title: "EcoDrive+ Club",
        currency: "PEN",
        amount: Math.round(montoReal * 100),
        description: `Membresía Club anual — N° ${numero}`,
      });
      Culqi.options({
        lang: "es",
        paymentMethods: { tarjeta: true, yape: true, billetera: false, bancaMovil: false },
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
              body: JSON.stringify({ token, email, reserva_id: reservaId }),
            });
            const j = await res.json();
            if (!j.ok) throw new Error(j.error || "No se pudo procesar el pago");
            Culqi.close();
            setOkResult({ numero: j.numero_correlativo ?? numero, fecha_fin: j.fecha_fin });
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
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "ok" && okResult) {
    return (
      <div className="bg-green-500/10 border border-green-500/40 rounded-2xl p-6 md:p-8 text-center">
        <div className="text-green-300 text-sm font-bold mb-2">✅ MEMBRESÍA ACTIVADA</div>
        <h2 className="text-4xl md:text-5xl font-black text-white">#{okResult.numero}</h2>
        <p className="text-gray-300 text-sm mt-3">
          Tu Membresía Club anual a nombre de <strong className="text-white">{nombre}</strong> quedó activa
          {okResult.fecha_fin ? <> hasta <strong className="text-white">{okResult.fecha_fin}</strong></> : null}.
        </p>
        <p className="text-gray-400 text-xs mt-3">
          Te enviamos la confirmación y tu número por WhatsApp. Participás en cada sorteo del año.
        </p>
        <a
          href="/ecodriveplus/club/mi-cuenta"
          className="inline-block mt-5 bg-[#E1811B] hover:bg-[#FFA84A] text-black font-bold px-6 py-3 rounded-xl transition"
        >
          Ver mi cuenta
        </a>
        <button
          onClick={() => {
            setStep("form");
            setOkResult(null);
            setDni("");
            setNombre("");
            setWhatsapp("");
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
            setStep("form");
            setErrorMsg("");
          }}
          className="bg-[#E1811B] text-black px-6 py-2 rounded-lg font-bold"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-lg">👑 Membresía Club anual</span>
          <span className="text-xs bg-[#E1811B] text-black px-2 py-1 rounded-full">12 MESES</span>
        </div>
        <p className="text-sm text-gray-300 mb-3">
          Participás en <strong>TODOS</strong> los sorteos del año + bonus por lealtad (+1 número por edición consumida, cap 5).
        </p>
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
        onClick={pagar}
        disabled={loading || !dni || !nombre || !whatsapp || !culqiReady}
        className="w-full bg-[#E1811B] hover:bg-[#FFA84A] text-black font-bold py-4 rounded-xl disabled:opacity-50 transition"
      >
        {loading ? "Procesando..." : culqiReady ? `Pagar S/.${precio} →` : "Cargando pago…"}
      </button>
      <p className="text-xs text-gray-500 mt-3 text-center">
        💳 Tarjeta o Yape · Pago seguro con Culqi · Sin suscripción
      </p>
    </div>
  );
}
