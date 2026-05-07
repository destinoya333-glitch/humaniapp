-- ═══════════════════════════════════════
-- DestinoYA — Schema v3 (saldo + pagos parciales)
-- ═══════════════════════════════════════

-- Saldo a favor por cliente (cuando paga de más)
create table if not exists destinoya_saldo (
  id          uuid primary key default gen_random_uuid(),
  celular     text unique not null,
  monto       numeric not null default 0,
  updated_at  timestamptz default now()
);

-- Tracking de pagos parciales (si yapea de menos)
alter table destinoya_pagos
  add column if not exists monto_pagado numeric default 0;

-- Historial de movimientos de saldo
create table if not exists destinoya_saldo_movimientos (
  id          uuid primary key default gen_random_uuid(),
  celular     text not null,
  tipo        text not null,  -- 'credito' (entra) | 'debito' (sale)
  monto       numeric not null,
  motivo      text,            -- 'pago_excedente' | 'uso_servicio' | 'ajuste'
  pago_id     uuid,
  created_at  timestamptz default now()
);

-- Índices
create index if not exists idx_destsaldo_celular on destinoya_saldo(celular);
create index if not exists idx_destsaldomov_celular on destinoya_saldo_movimientos(celular);

-- RLS
alter table destinoya_saldo              enable row level security;
alter table destinoya_saldo_movimientos  enable row level security;

create policy "access all" on destinoya_saldo              for all using (true);
create policy "access all" on destinoya_saldo_movimientos  for all using (true);
