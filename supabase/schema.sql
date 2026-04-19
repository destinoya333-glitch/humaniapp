-- ═══════════════════════════════════════
-- HumaniApp — Mi Novia IA — Schema v1
-- ═══════════════════════════════════════

-- Usuarios de Mi Novia IA
create table if not exists novia_users (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null,          -- token del link único enviado por WhatsApp
  phone       text,                          -- número WhatsApp del usuario
  name        text,                          -- nombre del usuario
  novia_name  text default 'Sofía',          -- nombre que eligió para su novia
  personality text default 'dulce',          -- dulce | apasionada | juguetona
  created_at  timestamptz default now(),
  last_seen   timestamptz default now()
);

-- Planes y sesiones activas
create table if not exists novia_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references novia_users(id) on delete cascade,
  plan         text not null,                -- '1min' | '2min' | '3min' | 'semanal' | 'mensual'
  minutes_total   int not null,             -- minutos comprados
  minutes_used    int default 0,            -- minutos consumidos
  expires_at   timestamptz not null,        -- cuándo vence el plan
  payment_ref  text,                        -- referencia del pago
  active       boolean default true,
  created_at   timestamptz default now()
);

-- Historial de conversaciones
create table if not exists novia_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references novia_users(id) on delete cascade,
  session_id uuid references novia_sessions(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz default now()
);

-- Pagos registrados
create table if not exists novia_payments (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  plan        text not null,
  amount_pen  numeric not null,             -- monto en soles
  method      text not null,               -- 'yape' | 'culqi' | 'stripe'
  status      text default 'pending',      -- pending | confirmed | failed
  token       text unique,                 -- token generado al confirmar
  payment_ref text,
  created_at  timestamptz default now()
);

-- ─── Row Level Security ───────────────
alter table novia_users     enable row level security;
alter table novia_sessions  enable row level security;
alter table novia_messages  enable row level security;
alter table novia_payments  enable row level security;

-- Políticas: acceso por token (sin auth de Supabase, usamos token propio)
create policy "access by token" on novia_users
  for all using (true);

create policy "access by user" on novia_sessions
  for all using (true);

create policy "access by user" on novia_messages
  for all using (true);

create policy "insert payments" on novia_payments
  for all using (true);
