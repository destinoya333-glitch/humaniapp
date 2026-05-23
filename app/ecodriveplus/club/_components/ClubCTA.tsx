"use client";

import { useState } from "react";

type Perfil = "publico" | "interno_pasajero" | "interno_conductor";
type Step = "form" | "reservado" | "error";

const WSP_ADMIN = "51994810242";

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
  const [reservaResult, setReservaResult] = useState<{ numero: number; precio: number; expira: string; yape_glosa: string; reserva_id: string } | null>(null);

  const precio = perfil === "publico" ? props.passPublico : props.passInterno;

  const reservar = async () => {
    setErrorMsg("");
    if (dni.length !== 8 || !/^\d{8}$/.test(dni)) { setErrorMsg("DNI debe ser 8 dígitos"); return; }
    if (nombre.trim().length < 3) { setErrorMsg("Ingresá tu nombre completo"); return; }
    const waDigits = whatsapp.replace(/\D/g, "");
    if (waDigits.length < 9) { setErrorMsg("WhatsApp debe ser de 9 dígitos"); return; }
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
          metodo_pago_preferido: "yape",
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErrorMsg(d.error || "Error reservando");
        setStep("error");
        return;
      }
      setReservaResult({
        numero: d.numero_correlativo,
        precio: d.precio,
        expira: d.expira_en,
        yape_glosa: d.pagar?.yape?.glosa ?? `CLUB-${d.numero_correlativo}`,
        reserva_id: d.reserva_id,
      });
      setStep("reservado");
    } catch (e) {
      setErrorMsg((e as Error).message);
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  if (step === "reservado" && reservaResult) {
    const wsConfirm = `https://wa.me/${WSP_ADMIN}?text=${encodeURIComponent(`Hola! Acabo de yapear S/.${reservaResult.precio} por mi Club Pass ${reservaResult.yape_glosa}. Mi DNI es ${dni}. Acá va captura:`)}`;
    return (
      <div className="bg-green-500/10 border border-green-500/40 rounded-2xl p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="text-green-300 text-sm font-bold mb-2">✅ PASS RESERVADO</div>
          <h2 className="text-4xl md:text-5xl font-black text-white">#{reservaResult.numero}</h2>
          <p className="text-gray-300 text-sm mt-2">
            Club Pass anual a nombre de <strong className="text-white">{nombre}</strong>
          </p>
        </div>

        <div className="bg-black/40 rounded-xl p-5 mb-5">
          <div className="text-gray-300 text-sm mb-2">PASO 1 — Yapeá</div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-3xl font-black text-white">S/.{reservaResult.precio}</p>
              <p className="text-sm text-gray-400">al celular</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#E1811B]">998 102 258</p>
              <p className="text-sm text-gray-400">EcoDrive Plus SAC</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-3">
            <p className="text-sm text-gray-300 mb-1">En la <strong>glosa/mensaje</strong> escribí exactamente:</p>
            <code className="block bg-[#E1811B]/20 text-[#FFA84A] px-3 py-2 rounded text-center text-lg font-bold tracking-wider">
              {reservaResult.yape_glosa}
            </code>
            <p className="text-xs text-gray-500 mt-2">⚠️ Sin la glosa exacta, no podemos identificar tu pago automáticamente.</p>
          </div>
        </div>

        <div className="bg-black/40 rounded-xl p-5 mb-5">
          <div className="text-gray-300 text-sm mb-3">PASO 2 — Mandanos captura del Yape</div>
          <a href={wsConfirm} target="_blank" rel="noopener noreferrer" className="block w-full bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold py-4 rounded-xl text-center transition">
            📲 Avisar pago por WhatsApp
          </a>
          <p className="text-xs text-gray-500 mt-2 text-center">Te abre WhatsApp con mensaje pre-llenado. Adjuntá captura del Yape.</p>
        </div>

        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>⏱️ Tu Pass queda reservado por <strong className="text-white">15 minutos</strong>.</p>
          <p>Una vez confirmemos tu pago, tu Pass se activa por 12 meses y participás en cada sorteo del año.</p>
          <p>Consultá tu Pass en cualquier momento: <a href="/ecodriveplus/club/mi-cuenta" className="text-[#E1811B] underline">/club/mi-cuenta</a></p>
        </div>

        <button onClick={() => { setStep("form"); setReservaResult(null); setDni(""); setNombre(""); setWhatsapp(""); }} className="mt-4 w-full bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-lg text-sm transition">
          Comprar otro Pass
        </button>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-6 text-center">
        <h2 className="text-xl font-bold text-red-300 mb-3">⚠️ {errorMsg}</h2>
        <button onClick={() => { setStep("form"); setErrorMsg(""); }} className="bg-[#E1811B] text-black px-6 py-2 rounded-lg font-bold">
          Volver al formulario
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-lg">👑 Club Pass anual</span>
          <span className="text-xs bg-[#E1811B] text-black px-2 py-1 rounded-full">12 MESES</span>
        </div>
        <p className="text-sm text-gray-300 mb-3">
          Participás en <strong>TODOS</strong> los sorteos del año + bonus por lealtad (+1 número por edición consumida, cap 5).
        </p>
        <p className="text-3xl font-bold">
          S/.{precio}
        </p>
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
        <p className="text-xs text-green-300 mb-3">
          ✓ Beneficio incluido: 18 primeros viajes del mes sin comisión EcoDrive+
        </p>
      )}
      {perfil === "interno_pasajero" && (
        <p className="text-xs text-green-300 mb-3">
          ✓ Beneficio incluido: 1 mes con cashback al 10% en tus viajes (vs 5% normal)
        </p>
      )}

      {errorMsg && <p className="text-red-400 text-sm mb-3">⚠️ {errorMsg}</p>}

      <button
        onClick={reservar}
        disabled={loading || !dni || !nombre || !whatsapp}
        className="w-full bg-[#E1811B] hover:bg-[#FFA84A] text-black font-bold py-4 rounded-xl disabled:opacity-50 transition"
      >
        {loading ? "Reservando..." : "Quiero mi Pass anual →"}
      </button>
      <p className="text-xs text-gray-500 mt-3 text-center">
        Total a pagar: <strong className="text-white">S/.{precio}</strong> · Yape al 998 102 258 · Reserva válida 15 min
      </p>
    </div>
  );
}
