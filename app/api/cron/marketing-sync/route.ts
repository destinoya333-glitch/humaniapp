/**
 * GET /api/cron/marketing-sync
 * Cron diario: jala insights de TODAS las marcas (páginas de Facebook + sus
 * Instagram) que el token de marketing puede administrar, más los videos de
 * TikTok, calcula score de efectividad y los guarda en Supabase
 * (marketing_posts + marketing_metricas), cada post con su marca.
 *
 * Requiere ECODRIVE_MARKETING_TOKEN con scopes de insights. Si no está,
 * responde {ok:true, synced:0} sin romper.
 *
 * Auth: header Authorization: Bearer ${CRON_SECRET}.
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchTodasLasMarcas } from "@/lib/marketing/brands";
import { fetchTikTokVideos } from "@/lib/marketing/tiktok";
import { guardarPostConMetrica } from "@/lib/marketing/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Meta: todas las marcas (cada post con su marca)
  const conMarca = await fetchTodasLasMarcas();
  // TikTok: por ahora una sola cuenta (EcoDrive+)
  const tiktokPosts = await fetchTikTokVideos();

  const porMarca: Record<string, number> = {};
  let synced = 0;

  for (const { post, marca } of conMarca) {
    if (await guardarPostConMetrica(post, marca)) {
      synced++;
      porMarca[marca] = (porMarca[marca] || 0) + 1;
    }
  }
  for (const p of tiktokPosts) {
    if (await guardarPostConMetrica(p, "ecodrive")) {
      synced++;
      porMarca["ecodrive(tiktok)"] = (porMarca["ecodrive(tiktok)"] || 0) + 1;
    }
  }

  return NextResponse.json({
    ok: true,
    synced,
    detectados: conMarca.length + tiktokPosts.length,
    porMarca,
    tiktok: tiktokPosts.length,
  });
}
