/**
 * TuDramaYa — economía de monedas (billetera, check-in, desbloqueo).
 */
import { supabase } from "./db";
import { otorgarAcceso } from "./accesos";

export const BONO_INICIAL = 80; // monedas de bienvenida (1ra vez)
export const COSTO_CAP = 30; // monedas para desbloquear 1 capítulo
export const CHECKIN_DIAS = [10, 15, 20, 25, 30, 40, 60]; // recompensa por día de racha (1..7)

// Packs de recarga (se compran con Yape) — soles : monedas
export const PACKS = {
  pack1: { soles: 1.0, monedas: 60 },
  pack3: { soles: 3.3, monedas: 220 },
  pack12: { soles: 12.0, monedas: 900 },
} as const;
export type PackId = keyof typeof PACKS;

export type Perfil = {
  user_id: string;
  monedas: number;
  puntos: number;
  vip_hasta: string | null;
  bono_inicial: boolean;
};

/** Trae (o crea) el perfil del usuario, otorgando el bono de bienvenida la 1ra vez. */
export async function getPerfil(userId: string, celular?: string | null): Promise<Perfil> {
  const { data } = await supabase.from("tdy_usuarios").select("*").eq("user_id", userId).maybeSingle();
  if (!data) {
    await supabase.from("tdy_usuarios").insert({ user_id: userId, celular: celular ?? null, monedas: BONO_INICIAL, bono_inicial: true });
    await supabase.from("tdy_movimientos").insert({ user_id: userId, tipo: "bono", monedas: BONO_INICIAL, motivo: "Bono de bienvenida" });
    return { user_id: userId, monedas: BONO_INICIAL, puntos: 0, vip_hasta: null, bono_inicial: true };
  }
  if (!data.bono_inicial) {
    const nuevo = (data.monedas ?? 0) + BONO_INICIAL;
    await supabase.from("tdy_usuarios").update({ monedas: nuevo, bono_inicial: true, ...(celular ? { celular } : {}) }).eq("user_id", userId);
    await supabase.from("tdy_movimientos").insert({ user_id: userId, tipo: "bono", monedas: BONO_INICIAL, motivo: "Bono de bienvenida" });
    return { ...(data as Perfil), monedas: nuevo, bono_inicial: true };
  }
  if (celular && !data.celular) await supabase.from("tdy_usuarios").update({ celular }).eq("user_id", userId);
  return data as Perfil;
}

async function addMonedas(userId: string, cantidad: number, tipo: string, motivo: string, ref?: string) {
  const { data } = await supabase.from("tdy_usuarios").select("monedas").eq("user_id", userId).maybeSingle();
  const saldo = (data?.monedas ?? 0) + cantidad;
  await supabase.from("tdy_usuarios").update({ monedas: saldo }).eq("user_id", userId);
  await supabase.from("tdy_movimientos").insert({ user_id: userId, tipo, monedas: cantidad, motivo, ref: ref ?? null });
  return saldo;
}

/** Acredita monedas por una recarga pagada (Yape). */
export async function acreditarPack(userId: string, pack: PackId, ref?: string): Promise<number> {
  return addMonedas(userId, PACKS[pack].monedas, "recarga", `Recarga ${PACKS[pack].monedas} monedas`, ref);
}

/** Check-in diario: suma monedas según la racha. Idempotente por día. */
export async function checkin(userId: string): Promise<{
  ya_hizo: boolean;
  dia_racha: number;
  ganadas: number;
  saldo: number;
}> {
  await getPerfil(userId); // asegura que exista
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: existe } = await supabase.from("tdy_checkin").select("dia_racha").eq("user_id", userId).eq("fecha", hoy).maybeSingle();
  if (existe) {
    const { data: u } = await supabase.from("tdy_usuarios").select("monedas").eq("user_id", userId).maybeSingle();
    return { ya_hizo: true, dia_racha: existe.dia_racha, ganadas: 0, saldo: u?.monedas ?? 0 };
  }
  // calcular racha: si hubo check-in ayer, racha+1; si no, reinicia
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const { data: prev } = await supabase.from("tdy_checkin").select("dia_racha").eq("user_id", userId).eq("fecha", ayer).maybeSingle();
  const dia = prev ? (prev.dia_racha % 7) + 1 : 1;
  const ganadas = CHECKIN_DIAS[dia - 1];
  await supabase.from("tdy_checkin").insert({ user_id: userId, fecha: hoy, dia_racha: dia, monedas: ganadas });
  const saldo = await addMonedas(userId, ganadas, "checkin", `Check-in día ${dia}`);
  return { ya_hizo: false, dia_racha: dia, ganadas, saldo };
}

/** Desbloquea un capítulo gastando monedas. */
export async function desbloquearConMonedas(opts: {
  userId: string;
  serieId: string;
  episodio: number;
}): Promise<{ ok: boolean; saldo?: number; error?: string }> {
  const { data: u } = await supabase.from("tdy_usuarios").select("monedas").eq("user_id", opts.userId).maybeSingle();
  const saldo = u?.monedas ?? 0;
  if (saldo < COSTO_CAP) return { ok: false, error: "Monedas insuficientes" };
  const nuevo = await addMonedas(opts.userId, -COSTO_CAP, "desbloqueo", `Desbloqueo cap ${opts.episodio}`, String(opts.episodio));
  await otorgarAcceso({
    userId: opts.userId,
    serieId: opts.serieId,
    tier: "cap",
    episodio: opts.episodio,
    origen: "monedas",
  });
  return { ok: true, saldo: nuevo };
}
