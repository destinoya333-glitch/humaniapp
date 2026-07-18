"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DashboardData = {
  chofer: {
    id: string;
    nombre: string;
    slug: string;
    plan: string;
    active: boolean;
    subscription_until: string | null;
    bio: string | null;
    zonas: string[];
    yape: string | null;
    soat_vencimiento: string | null;
  };
  stats_mes: {
    completadas: number;
    ingresos_pen: number;
    pendientes_total: number;
  };
  proximas_reservas: Array<{
    id: string;
    pasajero_nombre: string;
    pasajero_wa_id: string;
    fecha_viaje: string;
    hora_viaje: string;
    origen_direccion: string | null;
    destino_direccion: string | null;
    precio_pen: number;
    estado: string;
  }>;
  alertas: Array<{ tipo: string; mensaje: string }>;
};

export default function DashboardClient({ token }: { token: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/choferya/dashboard?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Error");
        return j;
      })
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading)
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <p className="text-white/50">Cargando tu panel...</p>
      </main>
    );

  if (err || !data)
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="text-red-400 font-medium">Token inválido o expirado</p>
          <p className="text-white/60 text-sm mt-2">{err}</p>
          <a
            href="https://wa.me/51986168409"
            className="inline-block mt-4 text-orange-400 hover:underline"
          >
            Pedir regeneración por WhatsApp
          </a>
        </div>
      </main>
    );

  const { chofer, stats_mes, proximas_reservas, alertas } = data;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-orange-400">TuChoferYa</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">Hola, {chofer.nombre.split(" ")[0]}</h1>
            <p className="text-white/50 text-sm">
              chofer.activosya.com/c/<span className="text-white/80">{chofer.slug}</span>
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              chofer.active
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-red-500/20 text-red-300"
            }`}
          >
            {chofer.active ? "Activo" : "Inactivo"}
          </span>
        </header>

        {/* Alertas */}
        {alertas.length > 0 ? (
          <ul className="mt-6 space-y-2">
            {alertas.map((a, i) => (
              <li
                key={i}
                className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm"
              >
                <span className="text-amber-300 font-medium uppercase text-xs">{a.tipo}</span>
                <p className="text-white/80 mt-0.5">{a.mensaje}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Stats */}
        <section className="grid sm:grid-cols-3 gap-4 mt-8">
          <Stat label="Viajes completados (mes)" value={stats_mes.completadas.toString()} />
          <Stat label="Ingresos (mes)" value={`S/. ${stats_mes.ingresos_pen.toFixed(2)}`} accent />
          <Stat
            label="Reservas pendientes"
            value={stats_mes.pendientes_total.toString()}
            warning={stats_mes.pendientes_total > 0}
          />
        </section>

        {/* Quick links */}
        <nav className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NavLink href={`/mi-choferya/precios?token=${token}`} icon="💰" label="Tarifas" />
          <NavLink href={`/mi-choferya/horarios?token=${token}`} icon="🕒" label="Horarios" />
          <NavLink href={`/mi-choferya/agenda?token=${token}`} icon="📋" label="Mi agenda" />
          <NavLink href={`/mi-choferya/reportes?token=${token}`} icon="📄" label="Reportes" />
        </nav>

        {/* Próximas reservas */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-3">Próximas reservas</h2>
          {proximas_reservas.length === 0 ? (
            <p className="text-white/40 text-sm">No tienes reservas próximas. Comparte tu QR para empezar.</p>
          ) : (
            <ul className="space-y-2">
              {proximas_reservas.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="font-medium">{r.pasajero_nombre}</div>
                      <div className="text-xs text-white/50">
                        {new Date(r.fecha_viaje).toLocaleDateString("es-PE", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}{" "}
                        · {r.hora_viaje}
                      </div>
                      {r.destino_direccion ? (
                        <div className="text-xs text-white/40 mt-1">→ {r.destino_direccion}</div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="text-orange-400 font-bold">S/. {r.precio_pen}</div>
                      <span
                        className={`text-[10px] uppercase mt-1 inline-block px-2 py-0.5 rounded-full ${
                          r.estado === "confirmada"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {r.estado}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-xs text-white/40 text-center">
          <p>Plan {chofer.plan} · Renta vence {chofer.subscription_until || "—"}</p>
          <p className="mt-2">
            <Link href="/choferya" className="text-orange-400 hover:underline">
              Ver mi página pública
            </Link>{" "}
            ·{" "}
            <a href="https://wa.me/51986168409" className="text-orange-400 hover:underline">
              Soporte
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
  warning,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-orange-500/40 bg-orange-500/5"
          : warning
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-xs text-white/50 uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${accent ? "text-orange-400" : ""}`}>{value}</p>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/40 px-4 py-5 text-center transition"
    >
      <div className="text-2xl">{icon}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
    </Link>
  );
}
