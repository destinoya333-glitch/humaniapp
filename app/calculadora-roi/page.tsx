"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export default function CalculadoraROI() {
  const [modelo, setModelo] = useState<"renta" | "compra">("renta");
  const [precioRenta, setPrecioRenta] = useState(2000);
  const [precioCompra, setPrecioCompra] = useState(40000);
  const [clientesMes, setClientesMes] = useState(50);
  const [ticketProm, setTicketProm] = useState(15);
  const [retencion, setRetencion] = useState(70);
  const [marketing, setMarketing] = useState(500);

  const calc = useMemo(() => {
    const arpu = ticketProm;
    const clientesActivos = Math.round(clientesMes * (retencion / 100));
    const ingresosMensuales = clientesActivos * arpu;
    const costoMensual = (modelo === "renta" ? precioRenta : 0) + marketing;
    const utilidadMensual = ingresosMensuales - costoMensual;
    const margen = ingresosMensuales > 0 ? (utilidadMensual / ingresosMensuales) * 100 : 0;
    const inversionInicial = modelo === "compra" ? precioCompra : precioRenta + marketing;
    const breakeven = utilidadMensual > 0 ? Math.ceil(inversionInicial / utilidadMensual) : Infinity;
    const utilidad12m = utilidadMensual * 12 - (modelo === "compra" ? precioCompra : 0);
    const utilidad24m = utilidadMensual * 24 - (modelo === "compra" ? precioCompra : 0);
    return {
      ingresosMensuales,
      costoMensual,
      utilidadMensual,
      margen,
      breakeven,
      utilidad12m,
      utilidad24m,
      arpu,
      clientesActivos,
    };
  }, [modelo, precioRenta, precioCompra, clientesMes, ticketProm, retencion, marketing]);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-xs text-zinc-500 hover:text-amber-400">
          ← Volver al marketplace
        </Link>

        <h1 className="mt-6 text-4xl font-bold leading-tight">
          Calculadora <span className="text-amber-400">ROI</span>
        </h1>
        <p className="mt-3 text-zinc-400 max-w-2xl">
          Estima cuánto puedes ganar adquiriendo un activo de ActivosYA. Ajusta los parámetros según
          tu mercado y proyecta utilidad mensual + breakeven.
        </p>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Modelo
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setModelo("renta")}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition ${
                    modelo === "renta"
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  Renta mensual
                </button>
                <button
                  onClick={() => setModelo("compra")}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition ${
                    modelo === "compra"
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  Compra única
                </button>
              </div>
            </div>

            {modelo === "renta" ? (
              <Input
                label="Costo de renta mensual"
                value={precioRenta}
                onChange={setPrecioRenta}
                prefix="S/."
                hint="Desde S/.1,800 a S/.3,000 según activo"
              />
            ) : (
              <Input
                label="Precio de compra única"
                value={precioCompra}
                onChange={setPrecioCompra}
                prefix="S/."
                hint="Cotización individual por activo"
              />
            )}

            <Input
              label="Clientes nuevos esperados / mes"
              value={clientesMes}
              onChange={setClientesMes}
              hint="Realista: 30-100 con marketing local"
            />

            <Input
              label="Ticket promedio por cliente"
              value={ticketProm}
              onChange={setTicketProm}
              prefix="S/."
              hint="Lo que paga un cliente al mes (Plan VIP DestinoYa = S/.18)"
            />

            <Input
              label="Tasa de retención mensual"
              value={retencion}
              onChange={setRetencion}
              suffix="%"
              hint="% de clientes que siguen activos cada mes"
            />

            <Input
              label="Inversión en marketing / mes"
              value={marketing}
              onChange={setMarketing}
              prefix="S/."
              hint="Ads Facebook, influencers locales, referidos"
            />
          </div>

          {/* Resultados */}
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent p-6">
              <div className="text-xs uppercase tracking-wider text-amber-400">
                Utilidad neta mensual
              </div>
              <div className="mt-2 text-4xl font-bold">
                {fmtSoles(calc.utilidadMensual)}
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                Margen {calc.margen.toFixed(1)}%
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Clientes activos / mes" value={String(calc.clientesActivos)} />
              <Stat label="Ingresos mensuales" value={fmtSoles(calc.ingresosMensuales)} />
              <Stat label="Costos mensuales" value={fmtSoles(calc.costoMensual)} />
              <Stat
                label="Breakeven"
                value={
                  calc.breakeven === Infinity
                    ? "—"
                    : `${calc.breakeven} ${calc.breakeven === 1 ? "mes" : "meses"}`
                }
              />
            </div>

            <div className="rounded-xl border border-zinc-800 p-5">
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                Proyección
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-zinc-500">Utilidad 12 meses</div>
                  <div
                    className={`text-2xl font-bold ${
                      calc.utilidad12m >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {fmtSoles(calc.utilidad12m)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Utilidad 24 meses</div>
                  <div
                    className={`text-2xl font-bold ${
                      calc.utilidad24m >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {fmtSoles(calc.utilidad24m)}
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/#contacto"
              className="block w-full text-center px-6 py-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold transition"
            >
              Hablar con un asesor →
            </Link>

            <p className="text-xs text-zinc-500 leading-relaxed">
              ⚠️ Estimación de referencia. Resultados reales dependen de mercado, ejecución y
              estacionalidad. ActivosYA no garantiza utilidades específicas.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Input(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
        {props.label}
      </label>
      <div className="relative">
        {props.prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
            {props.prefix}
          </span>
        )}
        <input
          type="number"
          value={props.value}
          onChange={(e) => props.onChange(Number(e.target.value) || 0)}
          className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 ${
            props.prefix ? "pl-10" : "pl-4"
          } ${props.suffix ? "pr-10" : "pr-4"} text-white focus:border-amber-500 focus:outline-none`}
        />
        {props.suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
            {props.suffix}
          </span>
        )}
      </div>
      {props.hint && <div className="mt-1 text-xs text-zinc-500">{props.hint}</div>}
    </div>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-xs text-zinc-500">{props.label}</div>
      <div className="mt-1 text-lg font-semibold">{props.value}</div>
    </div>
  );
}

function fmtSoles(n: number) {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  return `${sign}S/. ${abs.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`;
}
