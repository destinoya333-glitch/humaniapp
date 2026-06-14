/**
 * TuDramaYa — lista de episodios de una serie (con candados según acceso).
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
        <Link href="/tudramaya" className="text-neutral-500 text-sm">
          ← TuDramaYa
        </Link>
        <h1 className="text-2xl font-extrabold mt-2">{serie.titulo}</h1>
        {serie.sinopsis && <p className="text-neutral-400 text-sm mt-1">{serie.sinopsis}</p>}
      </header>

      <ul className="px-4 pb-12 space-y-2">
        {episodios.map((ep) => {
          const desbloqueado = ep.gratis || (user ? accesosCubren(accesos, ep.numero) : false);
          return (
            <li key={ep.id}>
              <Link
                href={`/tudramaya/ver/${ep.id}`}
                className="flex items-center justify-between rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3"
              >
                <span className="flex items-center gap-3">
                  <span className="text-neutral-500 text-sm w-7">#{ep.numero}</span>
                  <span className="text-sm">{ep.titulo ?? `Capítulo ${ep.numero}`}</span>
                </span>
                <span className="text-sm">
                  {ep.gratis ? (
                    <span className="text-emerald-400 text-xs font-semibold">GRATIS</span>
                  ) : desbloqueado ? (
                    <span className="text-neutral-300">▶</span>
                  ) : (
                    <span className="text-neutral-500">🔒</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
