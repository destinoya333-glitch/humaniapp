import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type ChoferData = {
  id: string;
  nombre: string;
  choferya_slug: string;
  choferya_bio: string | null;
  choferya_zonas: string[] | null;
  choferya_plan: string;
  selfie_foto_url: string | null;
  carro_foto_url: string | null;
  vehiculo_marca: string | null;
  vehiculo_modelo: string | null;
  vehiculo_anio: string | null;
  vehiculo_color: string | null;
  placa: string | null;
  yape_celular: string | null;
  soat_vencimiento: string | null;
  created_at: string;
  ai_extraction: { _auto_approved?: boolean } | null;
};

type Precio = {
  id: string;
  etiqueta: string;
  origen: string | null;
  destino: string | null;
  precio_pen: number;
  duracion_estimada_min: number | null;
};

type Calificacion = {
  estrellas: number;
  comentario: string | null;
  created_at: string;
};

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function loadChofer(slug: string) {
  const sb = db();
  const { data: chofer } = await sb
    .from("eco_choferes")
    .select(
      "id, nombre, choferya_slug, choferya_bio, choferya_zonas, choferya_plan, selfie_foto_url, carro_foto_url, vehiculo_marca, vehiculo_modelo, vehiculo_anio, vehiculo_color, placa, yape_celular, soat_vencimiento, created_at, ai_extraction"
    )
    .eq("choferya_slug", slug)
    .eq("choferya_active", true)
    .eq("status", "approved")
    .maybeSingle();

  if (!chofer) return null;

  const [{ data: precios }, { data: califs }] = await Promise.all([
    sb
      .from("choferya_precios")
      .select("id, etiqueta, origen, destino, precio_pen, duracion_estimada_min")
      .eq("chofer_id", chofer.id)
      .eq("activo", true)
      .order("orden", { ascending: true }),
    sb
      .from("choferya_calificaciones")
      .select("estrellas, comentario, created_at")
      .eq("chofer_id", chofer.id)
      .eq("oculto", false)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Stats agregadas
  const totalCalifs = califs?.length || 0;
  const avg = totalCalifs > 0 ? (califs!.reduce((a, c) => a + c.estrellas, 0) / totalCalifs).toFixed(1) : "—";

  return {
    chofer: chofer as ChoferData,
    precios: (precios || []) as Precio[],
    califs: (califs || []) as Calificacion[],
    totalCalifs,
    avg,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadChofer(slug);
  if (!result) return { title: "Chofer no encontrado · TuChoferYa" };
  const c = result.chofer;
  return {
    title: `${c.nombre} · Chofer verificado · TuChoferYa`,
    description: c.choferya_bio || `Reserva con ${c.nombre} en TuChoferYa. ${c.vehiculo_marca} ${c.vehiculo_modelo}.`,
    alternates: { canonical: `https://chofer.activosya.com/c/${slug}` },
  };
}

function maskPlaca(p: string | null): string {
  if (!p) return "—";
  if (p.length <= 3) return p;
  return p.slice(0, 3) + "·".repeat(p.length - 3);
}

export default async function ChoferProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadChofer(slug);
  if (!result) notFound();

  const { chofer, precios, califs, totalCalifs, avg } = result;
  const verificado = chofer.ai_extraction?._auto_approved === true;
  const antigDias = Math.floor(
    (Date.now() - new Date(chofer.created_at).getTime()) / (24 * 60 * 60 * 1000)
  );

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/choferya/buscar" className="text-sm text-white/50 hover:text-orange-400">
          ← Otros choferes
        </Link>

        {/* Header */}
        <header className="mt-6 flex flex-col sm:flex-row gap-6 items-start">
          {chofer.selfie_foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={chofer.selfie_foto_url}
              alt={chofer.nombre}
              className="w-28 h-28 rounded-full object-cover border-4 border-orange-500/40"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-orange-500/20 flex items-center justify-center text-4xl">
              🚖
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold">{chofer.nombre}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {verificado ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                  ✓ Verificado IA
                </span>
              ) : null}
              <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300">
                ★ {avg} <span className="text-white/50">({totalCalifs})</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/70">
                {antigDias < 30
                  ? `${antigDias}d en TuChoferYa`
                  : `${Math.floor(antigDias / 30)} meses en TuChoferYa`}
              </span>
            </div>
            <p className="mt-4 text-white/70 leading-relaxed">
              {chofer.choferya_bio || "Chofer independiente disponible en TuChoferYa."}
            </p>
          </div>
        </header>

        {/* CTA reservar */}
        <div className="mt-8">
          <Link
            href={`/choferya/c/${slug}/reservar`}
            className="inline-block px-8 py-4 rounded-full bg-orange-500 hover:bg-orange-400 text-black font-semibold transition"
          >
            Reservar con {chofer.nombre.split(" ")[0]}
          </Link>
        </div>

        {/* Vehículo */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-3">Vehículo</h2>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-white/40">Marca · Modelo</span>
                <div className="font-medium">
                  {chofer.vehiculo_marca || "—"} {chofer.vehiculo_modelo || ""}
                </div>
              </div>
              <div>
                <span className="text-white/40">Año · Color</span>
                <div className="font-medium">
                  {chofer.vehiculo_anio || "—"} · {chofer.vehiculo_color || "—"}
                </div>
              </div>
              <div>
                <span className="text-white/40">Placa</span>
                <div className="font-medium font-mono">{maskPlaca(chofer.placa)}</div>
              </div>
              {chofer.soat_vencimiento ? (
                <div>
                  <span className="text-white/40">SOAT vence</span>
                  <div className="font-medium">
                    {new Date(chofer.soat_vencimiento).toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            {chofer.carro_foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={chofer.carro_foto_url}
                alt="Vehículo"
                className="rounded-xl object-cover w-full h-40 sm:h-full"
              />
            ) : null}
          </div>
        </section>

        {/* Tarifas planas */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-3">Tarifas planas</h2>
          {precios.length === 0 ? (
            <p className="text-white/50 text-sm">
              Este chofer todavía no publicó tarifas. Reserva y él te cotiza.
            </p>
          ) : (
            <ul className="space-y-2">
              {precios.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between items-center rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                >
                  <div>
                    <div className="font-medium">{p.etiqueta}</div>
                    {p.origen && p.destino ? (
                      <div className="text-xs text-white/50">
                        {p.origen} → {p.destino}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-400">S/. {p.precio_pen}</div>
                    {p.duracion_estimada_min ? (
                      <div className="text-xs text-white/50">~{p.duracion_estimada_min} min</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Zonas */}
        {chofer.choferya_zonas && chofer.choferya_zonas.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-3">Zonas que cubro</h2>
            <div className="flex flex-wrap gap-2">
              {chofer.choferya_zonas.map((z) => (
                <span key={z} className="px-3 py-1 rounded-full bg-white/10 text-sm">
                  {z}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {/* Calificaciones recientes */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-3">Calificaciones recientes</h2>
          {califs.length === 0 ? (
            <p className="text-white/50 text-sm">Aún sin calificaciones. ¡Sé el primero!</p>
          ) : (
            <ul className="space-y-3">
              {califs.map((c, i) => (
                <li key={i} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="flex justify-between items-center">
                    <span className="text-orange-400">
                      {"★".repeat(c.estrellas)}
                      <span className="text-white/20">{"★".repeat(5 - c.estrellas)}</span>
                    </span>
                    <span className="text-xs text-white/40">
                      {new Date(c.created_at).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                  {c.comentario ? (
                    <p className="text-sm text-white/70 mt-2">{c.comentario}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Footer info legal */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-xs text-white/40 space-y-1">
          <p>
            {chofer.nombre} es chofer independiente. El viaje es responsabilidad directa entre
            pasajero y chofer.
          </p>
          <p>
            TuChoferYa es plataforma de comunicación y agenda. No procesa pagos del viaje. ¿Algún
            problema?{" "}
            <a href="https://wa.me/51986168409" className="text-orange-400 hover:underline">
              Reportar
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
