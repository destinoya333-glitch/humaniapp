/**
 * TuDramaYa — precios y tiers.
 * Montos elegidos para NO chocar con otros servicios del router Yape:
 *  - S/1 y S/12 son montos libres.
 *  - S/3.30 evita el S/3 de TuCuentoYa.
 */
export type Tier = "cap" | "pack5" | "completo";

export const PRECIOS: Record<Tier, number> = {
  cap: 1.0,
  pack5: 3.3,
  completo: 12.0,
};

export const TIER_LABEL: Record<Tier, string> = {
  cap: "Este capítulo",
  pack5: "Paquete de 5 capítulos",
  completo: "Serie completa",
};

// Cuántos episodios desbloquea un pack (desde el cap donde se topó el muro).
export const PACK_SIZE = 5;

/** Montos válidos de TuDramaYa (para el router MacroDroid). */
export const MONTOS_TDY: number[] = [PRECIOS.cap, PRECIOS.pack5, PRECIOS.completo];

/** Dado un monto Yape, ¿a qué tier corresponde? (tolerancia chica). */
export function tierPorMonto(monto: number): Tier | null {
  const tol = 0.05;
  if (Math.abs(monto - PRECIOS.completo) <= tol) return "completo";
  if (Math.abs(monto - PRECIOS.pack5) <= tol) return "pack5";
  if (Math.abs(monto - PRECIOS.cap) <= tol) return "cap";
  return null;
}
