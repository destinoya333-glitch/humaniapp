/**
 * TuDramaYa — lista de episodios de una serie (tarjetas con miniatura del video).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSeriePorSlug, getEpisodios } from "@/lib/tudramaya/db";
import { getAccesos, accesosCubren } from "@/lib/tudramaya/accesos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page({ params }: { params: Promise<{ serie: string }> }) {
  const { serie: slug } = await params;
  const serie = await getSeriePorSlug(slug);
  if (!serie) notFound();

  const episodios = await getEpisodios(serie.id);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const accesos = user ? await getAccesos(user.id, serie.id) : [];

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <header className="px-5 pt-8 pb-4">
        <Link href="/tudramaya" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tudramaya-logo.png" alt="TuDramaYa" className="h-8 w-auto" />
        </Link>
        <h1 className="text-2xl font-extrabold mt-3">{serie.titulo}</h1>
        {serie.sinopsis && <p className="text-neutral-400 text-sm mt-1">{serie.sinopsis}</p>}
        <p className="text-neutral-500 text-xs mt-2">
          {serie.total_caps} capítulos · {serie.caps_gratis} gratis
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4 pb-12">
        {episodios.map((ep) => {
          const desbloqueado = ep.gratis || (user ? accesosCubren(accesos, ep.numero) : false);
          return (
            <Link
              key={ep.id}
              href={`/tudramaya/ver/${ep.id}`}
              className="relative block rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800"
            >
              <div className="relative aspect-[9/16] bg-neutral-800">
                {ep.miniatura_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ep.miniatura_url}
                    alt={ep.titulo ?? `Capítulo ${ep.numero}`}
                    className={`w-full h-full object-cover ${!desbloqueado ? "opacity-60" : ""}`}
                  />
                )}

                {/* degradado inferior para legibilidad del título */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20" />

                {/* número */}
                <span className="absolute top-2 left-2 text-[11px] font-bold bg-black/60 rounded-md px-2 py-0.5">
                  Cap {ep.numero}
                </span>

                {/* estado */}
                {ep.gratis ? (
                  <span className="absolute top-2 right-2 text-[10px] font-extrabold bg-emerald-500 text-black rounded-md px-2 py-0.5">
                    GRATIS
                  </span>
                ) : !desbloqueado ? (
                  <span className="absolute top-2 right-2 text-sm bg-black/60 rounded-md px-1.5 py-0.5">🔒</span>
                ) : (
                  <span className="absolute top-2 right-2 text-[10px] font-bold bg-white/90 text-black rounded-md px-2 py-0.5">
                    ▶ VER
                  </span>
                )}

                {/* candado central si está bloqueado */}
                {!desbloqueado && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl drop-shadow-lg">🔒</span>
                  </div>
                )}

                {/* título */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-xs font-semibold leading-tight line-clamp-2">
                    {ep.titulo ?? `Capítulo ${ep.numero}`}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
