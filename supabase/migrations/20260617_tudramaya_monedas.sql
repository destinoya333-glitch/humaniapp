-- ═══════════════════════════════════════
-- TuDramaYa — Economía de monedas + recompensas (estilo ShortMax/StardustTV)
-- ═══════════════════════════════════════

-- Monedas y VIP en el perfil del usuario
alter table tdy_usuarios add column if not exists monedas      integer default 0;
alter table tdy_usuarios add column if not exists puntos       integer default 0;
alter table tdy_usuarios add column if not exists vip_hasta    timestamptz;
alter table tdy_usuarios add column if not exists bono_inicial boolean default false;  -- ya recibió las 80 de bienvenida

-- Ledger de movimientos de monedas
create table if not exists tdy_movimientos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  tipo        text not null,                 -- recarga | checkin | desbloqueo | bono | admin
  monedas     integer not null,              -- + entra, - sale
  motivo      text,
  ref         text,                          -- pago_id / episodio / etc.
  created_at  timestamptz default now()
);
create index if not exists idx_tdy_mov_user on tdy_movimientos(user_id, created_at desc);

-- Check-in diario (racha de 7 días)
create table if not exists tdy_checkin (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  fecha       date not null,
  dia_racha   integer default 1,             -- 1..7
  monedas     integer not null,
  created_at  timestamptz default now(),
  unique (user_id, fecha)
);
create index if not exists idx_tdy_checkin_user on tdy_checkin(user_id, fecha desc);

-- RLS
alter table tdy_movimientos enable row level security;
alter table tdy_checkin     enable row level security;
create policy "tdy_mov_own"     on tdy_movimientos for select using (auth.uid() = user_id);
create policy "tdy_checkin_own" on tdy_checkin     for select using (auth.uid() = user_id);

-- Realtime para refrescar el saldo al instante (igual que los accesos)
alter publication supabase_realtime add table tdy_usuarios;
