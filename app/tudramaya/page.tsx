/**
 * TuDramaYa — catálogo de series (un servicio más de ActivosYA).
 */
import Link from "next/link";
import { getSeries } from "@/lib/tudramaya/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  const series = await getSeries();

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <header className="px-5 pt-8 pb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tudramaya-logo.png" alt="TuDramaYa" className="h-10 w-auto" />
        <p className="text-neutral-400 text-sm mt-2">Micro-dramas que enganchan. 3 caps gratis.</p>
      </header>

      {series.length === 0 ? (
        <p className="px-5 text-neutral-500">Pronto, nuevos dramas…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-10">
          {series.map((s) => (
            <Link
              key={s.id}
              href={`/tudramaya/${s.slug}`}
              className="block rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800"
            >
              <div className="aspect-[9/16] bg-neutral-800">
                {s.portada_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.portada_url} alt={s.titulo} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <h2 className="text-sm font-bold leading-tight">{s.titulo}</h2>
                <p className="text-xs text-neutral-500 mt-1">{s.total_caps} caps</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
