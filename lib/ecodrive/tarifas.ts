// Tarifas EcoDrive+ — fuente unica de verdad.
// Editables desde /admin/ecodrive/tarifas (tabla eco_admin_config key='tarifas').
// El bot y cualquier motor de precios deben leer de aqui via getTarifas().
import { supabase } from "./db";

export type ServicioTipo = {
  label: string;
  multiplicador: number;
};

export type Tarifas = {
  banderazo: number;
  por_km: number;
  por_min: number;
  minimo: number;
  tipos: Record<string, ServicioTipo>;
  hora_pico: { enabled: boolean; multiplicador: number; horas: string[] };
  comision_pct: number;
  service_fee: number;
};

export const TARIFAS_DEFAULT: Tarifas = {
  banderazo: 4.5,
  por_km: 1.2,
  por_min: 0.15,
  minimo: 5.0,
  tipos: {
    estandar: { label: "EcoEstandar", multiplicador: 1.0 },
    vip: { label: "EcoVIP", multiplicador: 1.4 },
    xl: { label: "EcoXL", multiplicador: 1.5 },
    auto_nuevo: { label: "EcoAutoNuevo", multiplicador: 1.2 },
  },
  hora_pico: {
    enabled: false,
    multiplicador: 1.25,
    horas: ["07:00-09:30", "17:30-20:00"],
  },
  comision_pct: 6.3,
  service_fee: 0.5,
};

// Cache en memoria (60s) para no pegarle a la BD en cada mensaje del bot.
let _cache: { value: Tarifas; at: number } | null = null;
const CACHE_MS = 60 * 1000;

export async function getTarifas(force = false): Promise<Tarifas> {
  if (!force && _cache && Date.now() - _cache.at < CACHE_MS) return _cache.value;
  try {
    const { data, error } = await supabase
      .from("eco_admin_config")
      .select("value")
      .eq("key", "tarifas")
      .maybeSingle();
    if (error || !data?.value) {
      _cache = { value: TARIFAS_DEFAULT, at: Date.now() };
      return TARIFAS_DEFAULT;
    }
    // merge defensivo: si faltan campos en la fila, completar con defaults
    const merged: Tarifas = { ...TARIFAS_DEFAULT, ...(data.value as Partial<Tarifas>) };
    _cache = { value: merged, at: Date.now() };
    return merged;
  } catch {
    return _cache?.value ?? TARIFAS_DEFAULT;
  }
}

// "HH:MM" -> minutos del dia
function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

// hora actual en Lima (UTC-5, sin DST) en minutos del dia
function nowLimaMinutes(now: Date): number {
  const limaMs = now.getTime() - 5 * 60 * 60 * 1000;
  const d = new Date(limaMs);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function isHoraPico(tarifas: Tarifas, now: Date = new Date()): boolean {
  if (!tarifas.hora_pico?.enabled) return false;
  const cur = nowLimaMinutes(now);
  for (const rango of tarifas.hora_pico.horas || []) {
    const [a, b] = rango.split("-");
    if (!a || !b) continue;
    const ini = hhmmToMin(a.trim());
    const fin = hhmmToMin(b.trim());
    if (cur >= ini && cur <= fin) return true;
  }
  return false;
}

/**
 * Calcula la tarifa de un viaje aplicando banderazo + km + min,
 * multiplicador por tipo de servicio, hora pico, y minimo. Redondea a 0.5.
 */
export function computeFare(
  km: number,
  min: number,
  tarifas: Tarifas,
  tipo: string = "estandar",
  now: Date = new Date()
): number {
  let monto = tarifas.banderazo + km * tarifas.por_km + min * tarifas.por_min;
  const mult = tarifas.tipos?.[tipo]?.multiplicador ?? 1;
  monto *= mult;
  if (isHoraPico(tarifas, now)) monto *= tarifas.hora_pico.multiplicador;
  monto = Math.max(tarifas.minimo, monto);
  return Math.round(monto * 2) / 2;
}
