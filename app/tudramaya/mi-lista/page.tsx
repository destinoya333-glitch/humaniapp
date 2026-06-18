import Link from "next/link";
import { getSeries } from "@/lib/tudramaya/db";
import BottomNav from "../_components/BottomNav";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  const series = await getSeries();
  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-24">
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-2xl font-extrabold">Mi Lista 🔖</h1>
        <p className="text-neutral-400 text-sm">Tus dramas guardados y tu historial.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 px-4">
        {series.map((s) => (
          <Link key={s.id} href={`/tudramaya/${s.slug}`} className="rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800">
            <div className="aspect-[9/16] bg-neutral-800">
              {s.portada_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.portada_url} alt={s.titulo} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="p-2.5">
              <p className="text-sm font-bold leading-tight">{s.titulo}</p>
              <p className="text-[11px] text-neutral-500 mt-1">{s.total_caps} caps</p>
            </div>
          </Link>
        ))}
      </div>
      <BottomNav />
    </main>
  );
}
