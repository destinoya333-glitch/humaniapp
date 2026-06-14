/**
 * TuDramaYa — ver un episodio: reproductor si tiene acceso, muro de pago si no.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEpisodioById, getSerieById, signedVideoUrl } from "@/lib/tudramaya/db";
import { puedeVer } from "@/lib/tudramaya/accesos";
import Player from "../../_components/Player";
import Paywall from "../../_components/Paywall";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Pago habilitado: SOLO Yape. Cuenta TuDramaYa.
const YAPE_NUMERO = (process.env.TDY_YAPE_NUMERO ?? "998 102 258").trim();
const YAPE_NOMBRE = (process.env.TDY_YAPE_NOMBRE ?? "Percy Roj**").trim();

export default async function Page({ params }: { params: Promise<{ episodioId: string }> }) {
  const { episodioId } = await params;
  const ep = await getEpisodioById(episodioId);
  if (!ep) notFound();

  const serie = await getSerieById(ep.serie_id);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const acceso = await puedeVer({
    userId: user?.id ?? null,
    serieId: ep.serie_id,
    numero: ep.numero,
    gratis: ep.gratis,
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 pt-6 pb-12">
      <Link href={serie ? `/tudramaya/${serie.slug}` : "/tudramaya"} className="text-neutral-500 text-sm">
        ← {serie?.titulo ?? "Volver"}
      </Link>

      <h1 className="text-lg font-bold mt-3 mb-4">
        Cap {ep.numero}
        {ep.titulo ? ` · ${ep.titulo}` : ""}
      </h1>

      {acceso ? (
        <Player src={await signedVideoUrl(ep.video_url)} episodioId={ep.id} userId={user?.id ?? null} />
      ) : (
        <Paywall
          serieId={ep.serie_id}
          episodioNumero={ep.numero}
          userId={user?.id ?? null}
          yapeNumero={YAPE_NUMERO}
          yapeNombre={YAPE_NOMBRE}
        />
      )}
    </main>
  );
}
