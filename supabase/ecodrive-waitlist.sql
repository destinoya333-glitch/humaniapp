-- ═══════════════════════════════════════
-- EcoDrive+ — Tabla waitlist
-- Para captura de leads pre-lanzamiento del bot completo
-- ═══════════════════════════════════════

create table if not exists ecodrive_waitlist (
  id              uuid primary key default gen_random_uuid(),
  celular         text not null,
  nombre          text,
  interes         text not null,                  -- passenger | driver | both
  notas           text,
  source          text default 'whatsapp_bot',    -- whatsapp_bot | landing | manual
  contacted       boolean default false,
  contacted_at    timestamptz,
  created_at      timestamptz default now()
);

create index if not exists ecodrive_waitlist_celular_idx on ecodrive_waitlist(celular);
create index if not exists ecodrive_waitlist_interes_idx on ecodrive_waitlist(interes);
create index if not exists ecodrive_waitlist_pending_idx on ecodrive_waitlist(contacted) where contacted = false;

alter table ecodrive_waitlist enable row level security;
create policy "access all" on ecodrive_waitlist for all using (true);
