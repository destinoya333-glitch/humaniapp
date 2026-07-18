// =====================================================================
// Ventana de Publicidad — Multi-marca
//
// Descubre TODAS las páginas de Facebook (+ su Instagram vinculado) que el
// token de marketing puede administrar, y las trata como marcas separadas.
// Así, cuando se asigne una página nueva al System User en Meta, aparece
// automáticamente sin tocar código.
//
// Mapea el nombre de la página → un slug de marca estable para guardar en
// marketing_posts.marca.
// =====================================================================
import {
  getMetaConfig,
  fetchFacebookPosts,
  fetchInstagramMedia,
  type MetaConfig,
  type NormalizedPost,
} from "./meta";

const GRAPH = "https://graph.facebook.com/v22.0";

export type Brand = {
  marca: string; // slug estable
  nombre: string; // nombre de la página en Facebook
  pageId: string;
  igId?: string;
  pageToken?: string;
};

// Mapea nombres conocidos de páginas → slug de marca. Lo demás se slugifica.
function slugMarca(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes("ecodrive")) return "ecodrive";
  if (n.includes("sofia") || n.includes("sofía")) return "sofia";
  if (n.includes("destino")) return "destinoya";
  if (n.includes("cuento")) return "cuentoya";
  if (n.includes("activos")) return "activosya";
  if (n.includes("mozo")) return "tumozoya";
  return n.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "marca";
}

async function graph<T = any>(path: string, token: string): Promise<T | null> {
  try {
    const sep = path.includes("?") ? "&" : "?";
    const r = await fetch(`${GRAPH}/${path}${sep}access_token=${token}`, { cache: "no-store" });
    const j = await r.json();
    if (j?.error) {
      console.warn(`[marketing/brands] ${path}: ${j.error.message}`);
      return null;
    }
    return j as T;
  } catch (e) {
    console.error(`[marketing/brands] fetch ${path}:`, (e as Error).message);
    return null;
  }
}

/** Lista todas las marcas (páginas) que el token puede leer. */
export async function descubrirMarcas(): Promise<Brand[]> {
  const base = getMetaConfig();
  if (!base) return [];
  const accts = await graph<{ data: any[] }>(
    "me/accounts?fields=id,name,access_token,instagram_business_account",
    base.token,
  );
  if (!accts?.data) return [];
  return accts.data.map((p) => ({
    marca: slugMarca(p.name || ""),
    nombre: p.name || "(sin nombre)",
    pageId: p.id,
    igId: p.instagram_business_account?.id,
    pageToken: p.access_token,
  }));
}

/**
 * Jala posts de TODAS las marcas (FB + IG), etiquetando cada post con su marca.
 * Devuelve [{post, marca}] para que el cron los guarde con la marca correcta.
 */
export async function fetchTodasLasMarcas(): Promise<{ post: NormalizedPost; marca: string }[]> {
  const base = getMetaConfig();
  if (!base) return [];
  const marcas = await descubrirMarcas();
  const out: { post: NormalizedPost; marca: string }[] = [];

  for (const b of marcas) {
    const cfg: MetaConfig = {
      token: base.token,
      pageId: b.pageId,
      igId: b.igId,
      pageToken: b.pageToken,
    };
    const [fb, ig] = await Promise.all([
      fetchFacebookPosts(cfg).catch(() => []),
      b.igId ? fetchInstagramMedia(cfg).catch(() => []) : Promise.resolve([]),
    ]);
    for (const post of [...fb, ...ig]) out.push({ post, marca: b.marca });
  }
  return out;
}
