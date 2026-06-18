import Link from "next/link";
import { getSeries, getEpisodios } from "@/lib/tudramaya/db";
import BottomNav from "../_components/BottomNav";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  const series = await getSeries();
  const serie = series[0];
  const eps = serie ? await getEpisodios(serie.id) : [];
  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-24">
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-2xl font-extrabold">Para ti ▶️</h1>
        <p className="text-neutral-400 text-sm">Capítulos recomendados para ti.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 px-4">
        {eps.map((ep) => (
          <Link key={ep.id} href={`/tudramaya/ver/${ep.id}`} className="relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
            <div className="relative aspect-[9/16] bg-neutral-800">
              {ep.miniatura_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ep.miniatura_url} alt={ep.titulo ?? ""} className="w-full h-full object-cover" />
              )}
              <span className="absolute top-2 left-2 text-[11px] font-bold bg-black/60 rounded-md px-2 py-0.5">Cap {ep.numero}</span>
              {ep.gratis ? (
                <span className="absolute top-2 right-2 text-[10px] font-extrabold bg-emerald-500 text-black rounded-md px-2 py-0.5">GRATIS</span>
              ) : (
                <span className="absolute top-2 right-2 text-sm bg-black/60 rounded-md px-1.5 py-0.5">🔒</span>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 to-transparent p-2.5">
                <p className="text-xs font-semibold leading-tight line-clamp-2">{ep.titulo ?? `Capítulo ${ep.numero}`}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <BottomNav />
    </main>
  );
}
