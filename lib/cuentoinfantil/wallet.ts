/**
 * TuCuentoYa — Wallet recargable.
 *
 * Cliente recarga S/15/30/50/100 y obtiene cuentos bonus extra.
 * Al pedir cuento, débito = precio venta (S/2, S/3, S/5) del balance,
 * o consume 1 cuento bonus si tiene.
 *
 * Precedencia al consumir un cuento:
 *  1. VIP activo (consume del cap mensual)
 *  2. Bonus cuentos restantes (cualquier duración cuenta como 1)
 *  3. Wallet balance (descuenta el precio S/)
 *  4. Si nada alcanza → solicitar Yape directo
 */
import { supabase, actualizarCliente, type ClienteCuento } from "./db";

export type PackRecarga = "chica" | "media" | "grande" | "magica";

export const PACK_PRECIOS: Record<PackRecarga, { precio: number; bonus: number; equivalente_cuentos_3min: number }> = {
  chica: { precio: 15, bonus: 1, equivalente_cuentos_3min: 6 },
  media: { precio: 30, bonus: 2, equivalente_cuentos_3min: 12 },
  grande: { precio: 50, bonus: 5, equivalente_cuentos_3min: 21 },
  magica: { precio: 100, bonus: 12, equivalente_cuentos_3min: 45 },
};

export const PRECIO_CUENTO: Record<2 | 3 | 5, number> = {
  2: 2,
  3: 3,
  5: 5,
};

/**
 * Acredita una recarga: suma monto al wallet + bonus de cuentos.
 * Llamar tras verificar el Yape del cliente.
 */
export async function acreditarRecarga(opts: {
  celular: string;
  pack: PackRecarga;
  yape_ref?: string;
  captura_url?: string;
}): Promise<{ ok: boolean; nuevo_balance: number; bonus_acreditado: number }> {
  const cfg = PACK_PRECIOS[opts.pack];
  if (!cfg) throw new Error(`Pack desconocido: ${opts.pack}`);

  // Insertar registro de recarga
  await supabase.from("tci_recargas").insert({
    celular: opts.celular,
    pack: opts.pack,
    monto_pagado: cfg.precio,
    bonus_cuentos: cfg.bonus,
    cuentos_equivalente: cfg.equivalente_cuentos_3min,
    yape_ref: opts.yape_ref ?? null,
    captura_url: opts.captura_url ?? null,
    validado: true,
  });

  // Sumar al cliente
  const { data: cliente } = await supabase
    .from("tci_clientes")
    .select("wallet_balance, cuentos_bonus_restantes")
    .eq("celular", opts.celular)
    .maybeSingle();

  const nuevoBalance = Number(cliente?.wallet_balance ?? 0) + cfg.precio;
  const nuevoBonus = Number(cliente?.cuentos_bonus_restantes ?? 0) + cfg.bonus;

  await actualizarCliente(opts.celular, {
    wallet_balance: nuevoBalance,
    cuentos_bonus_restantes: nuevoBonus,
  });

  // Registrar movimiento de saldo
  await supabase.from("tci_saldo_movimientos").insert({
    celular: opts.celular,
    tipo: "credito",
    monto: cfg.precio,
    motivo: "recarga_wallet",
  });

  return {
    ok: true,
    nuevo_balance: nuevoBalance,
    bonus_acreditado: cfg.bonus,
  };
}

/**
 * Intenta cobrar un cuento al cliente. Retorna la fuente de pago usada.
 * - "bonus" → descuenta 1 del cuentos_bonus_restantes
 * - "wallet" → descuenta precio del wallet_balance
 * - "insuficiente" → cliente debe pagar Yape directo
 *
 * NO incluye lógica VIP (eso se chequea antes).
 */
export async function intentarCobrar(opts: {
  celular: string;
  duracion: 2 | 3 | 5;
}): Promise<
  | { ok: true; fuente: "bonus"; nuevo_bonus: number }
  | { ok: true; fuente: "wallet"; nuevo_balance: number }
  | { ok: false; motivo: "insuficiente"; balance: number; precio: number }
> {
  const precio = PRECIO_CUENTO[opts.duracion];

  const { data: cliente } = await supabase
    .from("tci_clientes")
    .select("wallet_balance, cuentos_bonus_restantes")
    .eq("celular", opts.celular)
    .maybeSingle();

  const bonus = Number(cliente?.cuentos_bonus_restantes ?? 0);
  const balance = Number(cliente?.wallet_balance ?? 0);

  // Precedencia 1: bonus
  if (bonus > 0) {
    const nuevoBonus = bonus - 1;
    await actualizarCliente(opts.celular, { cuentos_bonus_restantes: nuevoBonus });
    await supabase.from("tci_saldo_movimientos").insert({
      celular: opts.celular,
      tipo: "debito",
      monto: 0,
      motivo: "uso_cuento_bonus",
    });
    return { ok: true, fuente: "bonus", nuevo_bonus: nuevoBonus };
  }

  // Precedencia 2: wallet
  if (balance >= precio) {
    const nuevoBalance = balance - precio;
    await actualizarCliente(opts.celular, { wallet_balance: nuevoBalance });
    await supabase.from("tci_saldo_movimientos").insert({
      celular: opts.celular,
      tipo: "debito",
      monto: precio,
      motivo: "uso_cuento_wallet",
    });
    return { ok: true, fuente: "wallet", nuevo_balance: nuevoBalance };
  }

  return { ok: false, motivo: "insuficiente", balance, precio };
}

/**
 * Acredita bonus de promo (ej: S/5 primera recarga).
 */
export async function acreditarBonusPromo(opts: {
  celular: string;
  monto: number;
  motivo: string;
}): Promise<void> {
  const { data: cliente } = await supabase
    .from("tci_clientes")
    .select("wallet_balance")
    .eq("celular", opts.celular)
    .maybeSingle();

  const nuevoBalance = Number(cliente?.wallet_balance ?? 0) + opts.monto;
  await actualizarCliente(opts.celular, { wallet_balance: nuevoBalance });
  await supabase.from("tci_saldo_movimientos").insert({
    celular: opts.celular,
    tipo: "credito",
    monto: opts.monto,
    motivo: opts.motivo,
  });
}

/**
 * Aplica la promo de lanzamiento: primer cuento gratis (2 min).
 * Marca al cliente para que solo se otorgue 1 vez.
 */
export async function reclamarPromoPrimerCuentoGratis(
  celular: string,
): Promise<{ otorgado: boolean }> {
  const { data: existente } = await supabase
    .from("tci_promos")
    .select("id, usado")
    .eq("celular", celular)
    .eq("tipo", "primer_cuento_gratis")
    .maybeSingle();

  if (existente?.usado) return { otorgado: false };

  if (!existente) {
    await supabase.from("tci_promos").insert({
      celular,
      tipo: "primer_cuento_gratis",
      cuento_gratis: true,
      usado: true,
      fecha_uso: new Date().toISOString(),
    });
  } else {
    await supabase
      .from("tci_promos")
      .update({ usado: true, fecha_uso: new Date().toISOString() })
      .eq("id", existente.id);
  }
  return { otorgado: true };
}

/**
 * Resumen del wallet para mostrarle al cliente.
 */
export async function resumenWallet(
  celular: string,
): Promise<{ balance: number; bonus: number; cuentos_3min_aprox: number }> {
  const { data: cliente } = await supabase
    .from("tci_clientes")
    .select("wallet_balance, cuentos_bonus_restantes")
    .eq("celular", celular)
    .maybeSingle();

  const balance = Number(cliente?.wallet_balance ?? 0);
  const bonus = Number(cliente?.cuentos_bonus_restantes ?? 0);
  const cuentos_3min_aprox = bonus + Math.floor(balance / PRECIO_CUENTO[3]);
  return { balance, bonus, cuentos_3min_aprox };
}

// Re-export para conveniencia
export type { ClienteCuento };
