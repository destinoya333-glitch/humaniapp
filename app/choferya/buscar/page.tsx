import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Choferes verificados · TuChoferYa",
  description: "Choferes verificados con DNI, licencia y SOAT validados. Filtrá por zona.",
};

type ChoferRow = {
  id: string;
  choferya_slug: string | null;
  nombre: string | null;
  choferya_bio: string | null;
  choferya_zonas: string[] | null;
  choferya_plan: string | null;
  selfie_foto_url: string | null;
  vehiculo_marca: string | null;
  vehiculo_modelo: string | null;
  vehiculo_anio: string | null;
  vehiculo_color: string | null;
  rating_promedio: number | null;
  total_calificaciones: number | null;
  viajes_completados: number | null;
};

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function loadDirectorio(zona?: string): Promise<ChoferRow[]> {
  const sb = db();
  let q = sb
    .from("choferya_directorio")
    .select("*")
    .order("rating_promedio", { ascending: false })
    .order("viajes_completados", { ascending: false })
    .limit(50);

  if (zona && zona.trim()) {
    q = q.contains("choferya_zonas", [zona.trim()]);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[choferya/buscar load err]", error.message);
    return [];
  }
  return (data || []) as ChoferRow[];
}

function Stars({ rating, total }: { rating: number; total: number }) {
  if (total === 0) return <span className="text-xs text-white/40">Sin calificaciones aún</span>;
  return (
    <span className="text-sm text-orange-400">
      ★ {rating.toFixed(1)} <span className="text-white/40">({total})</span>
    </span>
  );
}

export default async function BuscarChoferes({
  searchParams,
}: {
  searchParams: Promise<{ zona?: string }>;
}) {
  const { zona } = await searchParams;
  const choferes = await loadDirectorio(zona);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link href="/choferya" className="text-sm text-white/50 hover:text-orange-400">
          ← TuChoferYa
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mt-4 mb-2">
          Choferes verificados {zona ? <span className="text-orange-400">en {zona}</span> : null}
        </h1>
        <p className="text-white/60">
          {choferes.length} {choferes.length === 1 ? "chofer disponible" : "choferes disponibles"}.
        </p>

        <form className="mt-6 flex gap-2" action="/choferya/buscar" method="get">
          <input
            name="zona"
            defaultValue={zona || ""}
            placeholder="Trujillo, Huanchaco, Centro, etc."
            className="flex-1 rounded-full bg-white/5 border border-white/10 px-5 py-3 text-white placeholder:text-white/30 outline-none focus:border-orange-400"
          />
          <button
            type="submit"
            className="rounded-full bg-orange-500 hover:bg-orange-400 text-black font-medium px-6 py-3"
          >
            Buscar
          </button>
        </form>

        <ul className="mt-10 grid sm:grid-cols-2 gap-5">
          {choferes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/choferya/c/${c.choferya_slug}`}
                className="block rounded-2xl bg-white/5 border border-white/10 p-5 hover:border-orange-500/40 transition"
              >
                <div className="flex gap-4">
                  {c.selfie_foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.selfie_foto_url}
                      alt={c.nombre || "Chofer"}
                      className="w-20 h-20 rounded-full object-cover border-2 border-orange-500/30"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center text-2xl">
                      🚖
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{c.nombre || "Chofer"}</div>
                    <div className="text-xs text-white/50 truncate">
                      {c.vehiculo_marca} {c.vehiculo_modelo} {c.vehiculo_color}
                    </div>
                    <div className="mt-1">
                      <Stars rating={c.rating_promedio || 0} total={c.total_calificaciones || 0} />
                    </div>
                    {c.choferya_zonas && c.choferya_zonas.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.choferya_zonas.slice(0, 3).map((z) => (
                          <span
                            key={z}
                            className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full"
                          >
                            {z}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                {c.choferya_bio ? (
                  <p className="text-sm text-white/60 mt-3 line-clamp-2">{c.choferya_bio}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>

        {choferes.length === 0 ? (
          <div className="mt-12 text-center text-white/50">
            <p>No hay choferes verificados {zona ? `en ${zona}` : ""} todavía.</p>
            <p className="mt-2">
              <Link href="/se-choferya" className="text-orange-400 hover:underline">
                ¿Eres chofer? Únete a TuChoferYa →
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
