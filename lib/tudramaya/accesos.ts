/**
 * TuDramaYa — lógica de accesos (qué episodios puede ver cada usuario).
 *
 * Regla: puede ver el cap N si el cap es gratis, o si tiene una fila en
 * tdy_accesos con alcance='serie' (todo) o con N entre desde/hasta.
 */
import { supabase } from "./db";
import { PACK_SIZE, type Tier } from "./precios";

export type Acceso = {
  alcance: "cap" | "pack" | "serie";
  episodio_desde: number | null;
  episodio_hasta: number | null;
};

/** Trae todos los accesos del usuario para una serie. */
export async function getAccesos(userId: string, serieId: string): Promise<Acceso[]> {
  const { data } = await supabase
    .from("tdy_accesos")
    .select("alcance, episodio_desde, episodio_hasta")
    .eq("user_id", userId)
    .eq("serie_id", serieId);
  return (data as Acceso[]) ?? [];
}

/** ¿Un set de accesos cubre el episodio `numero`? */
export function accesosCubren(accesos: Acceso[], numero: number): boolean {
  for (const a of accesos) {
    if (a.alcance === "serie") return true;
    if (
      a.episodio_desde != null &&
      a.episodio_hasta != null &&
      numero >= a.episodio_desde &&
      numero <= a.episodio_hasta
    ) {
      return true;
    }
  }
  return false;
}

/** ¿El usuario puede ver este episodio? (considera gratis + accesos). */
export async function puedeVer(opts: {
  userId: string | null;
  serieId: string;
  numero: number;
  gratis: boolean;
}): Promise<boolean> {
  if (opts.gratis) return true;
  if (!opts.userId) return false;
  const accesos = await getAccesos(opts.userId, opts.serieId);
  return accesosCubren(accesos, opts.numero);
}

/** Otorga el acceso correspondiente al tier comprado. */
export async function otorgarAcceso(opts: {
  userId: string;
  serieId: string;
  tier: Tier;
  episodio?: number | null;
  origen: string;
  pagoId?: string | null;
}): Promise<void> {
  let alcance: "cap" | "pack" | "serie" = "cap";
  let desde: number | null = null;
  let hasta: number | null = null;

  if (opts.tier === "completo") {
    alcance = "serie";
  } else if (opts.tier === "pack5") {
    alcance = "pack";
    desde = opts.episodio ?? 1;
    hasta = desde + PACK_SIZE - 1;
  } else {
    alcance = "cap";
    desde = opts.episodio ?? 1;
    hasta = desde;
  }

  await supabase.from("tdy_accesos").insert({
    user_id: opts.userId,
    serie_id: opts.serieId,
    alcance,
    episodio_desde: desde,
    episodio_hasta: hasta,
    origen: opts.origen,
    pago_id: opts.pagoId ?? null,
  });
}
