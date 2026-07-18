import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { verifyChoferPanelToken } from "@/lib/activosya/choferya-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agenda · TuChoferYa",
};

type Reserva = {
  id: string;
  pasajero_nombre: string;
  pasajero_wa_id: string;
  fecha_viaje: string;
  hora_viaje: string;
  origen_direccion: string | null;
  destino_direccion: string | null;
  precio_pen: number;
  estado: string;
  notas: string | null;
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; filtro?: string }>;
}) {
  const { token, filtro } = await searchParams;
  if (!token)
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <p>Token requerido.</p>
      </main>
    );

  const v = verifyChoferPanelToken(token);
  if (!v.ok)
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <p className="text-red-400">Token inválido: {v.reason}</p>
      </main>
    );

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let q = sb
    .from("choferya_reservas")
    .select(
      "id, pasajero_nombre, pasajero_wa_id, fecha_viaje, hora_viaje, origen_direccion, destino_direccion, precio_pen, estado, notas"
    )
    .eq("chofer_id", v.choferId)
    .order("fecha_viaje", { ascending: false })
    .order("hora_viaje", { ascending: false })
    .limit(50);

  if (filtro === "proximas") {
    q = q.in("estado", ["pendiente", "confirmada"]).gte("fecha_viaje", new Date().toISOString().slice(0, 10));
  } else if (filtro === "completadas") {
    q = q.eq("estado", "completada");
  }

  const { data } = await q;
  const reservas: Reserva[] = (data || []) as Reserva[];

  const tabs = [
    { key: "todas", label: "Todas" },
    { key: "proximas", label: "Próximas" },
    { key: "completadas", label: "Completadas" },
  ];

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href={`/mi-choferya?token=${token}`} className="text-sm text-white/50 hover:text-orange-400">
          ← Panel
        </Link>
        <h1 className="text-3xl font-bold mt-4">Mi agenda</h1>

        <nav className="mt-4 flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <a
              key={t.key}
              href={`/mi-choferya/agenda?token=${token}${t.key !== "todas" ? `&filtro=${t.key}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-sm ${
                (filtro || "todas") === t.key
                  ? "bg-orange-500 text-black"
                  : "bg-white/5 border border-white/10 text-white/70"
              }`}
            >
              {t.label}
            </a>
          ))}
        </nav>

        {reservas.length === 0 ? (
          <p className="mt-8 text-white/50">No hay reservas en este filtro.</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {reservas.map((r) => (
              <li key={r.id} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{r.pasajero_nombre}</div>
                    <div className="text-xs text-white/50 mt-0.5">
                      {new Date(r.fecha_viaje).toLocaleDateString("es-PE", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {r.hora_viaje}
                    </div>
                    {r.origen_direccion || r.destino_direccion ? (
                      <div className="text-xs text-white/40 mt-1">
                        {r.origen_direccion || "?"} → {r.destino_direccion || "?"}
                      </div>
                    ) : null}
                    {r.notas ? (
                      <div className="text-xs text-white/40 mt-1 italic">"{r.notas}"</div>
                    ) : null}
                    <a
                      href={`https://wa.me/${r.pasajero_wa_id.replace(/\D/g, "")}`}
                      className="text-xs text-orange-400 hover:underline mt-2 inline-block"
                    >
                      Escribir WhatsApp →
                    </a>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-orange-400 font-bold">S/. {r.precio_pen}</div>
                    <span
                      className={`text-[10px] uppercase mt-1 inline-block px-2 py-0.5 rounded-full ${estadoColor(r.estado)}`}
                    >
                      {r.estado}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function estadoColor(estado: string): string {
  switch (estado) {
    case "completada":
      return "bg-emerald-500/20 text-emerald-300";
    case "confirmada":
      return "bg-blue-500/20 text-blue-300";
    case "pendiente":
      return "bg-amber-500/20 text-amber-300";
    case "cancelada":
    case "rechazada":
    case "no_show":
      return "bg-red-500/20 text-red-300";
    default:
      return "bg-white/10 text-white/60";
  }
}
