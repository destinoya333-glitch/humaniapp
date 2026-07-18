-- 20260530 — tabla generica de pendientes EcoDrive+ + insertar el primer pendiente registrado
-- Aplicar en dashboard Supabase EN INCOGNITO (ver memoria feedback_supabase_ddl_dashboard_incognito).

create table if not exists ecodrive_pendientes (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,                          -- slug estable para referenciar
  titulo text not null,                              -- titulo corto
  descripcion text not null,                         -- detalle / criterio de cierre
  prioridad text not null default 'media',           -- 'alta' | 'media' | 'baja'
  bloqueante_cuando text,                            -- evento que activa el pendiente
  archivos_clave text[],                             -- paths a tocar cuando se ejecute
  memoria_slug text,                                 -- referencia al archivo de auto-memory Claude
  doc_path text,                                     -- ruta al markdown en el repo
  status text not null default 'abierto',            -- 'abierto' | 'en_curso' | 'cerrado'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists idx_ecodrive_pendientes_status on ecodrive_pendientes (status);
create index if not exists idx_ecodrive_pendientes_prioridad on ecodrive_pendientes (prioridad);

-- Trigger para updated_at
create or replace function ecodrive_pendientes_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'cerrado' and old.status <> 'cerrado' then
    new.closed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_ecodrive_pendientes_touch on ecodrive_pendientes;
create trigger trg_ecodrive_pendientes_touch
before update on ecodrive_pendientes
for each row execute function ecodrive_pendientes_touch();

-- RLS: solo service role (no public)
alter table ecodrive_pendientes enable row level security;

drop policy if exists "service_role_full_access" on ecodrive_pendientes;
create policy "service_role_full_access" on ecodrive_pendientes
  for all to service_role using (true) with check (true);

-- ====================================================================
-- Primer pendiente registrado: generacion de CIE real por conductor
-- ====================================================================

insert into ecodrive_pendientes (
  key, titulo, descripcion, prioridad, bloqueante_cuando, archivos_clave, memoria_slug, doc_path
) values (
  'cie_real_por_conductor',
  'Generación de CIE real por conductor en /financiera',
  'Hoy el portal /financiera solo entrega constancias muestra. Falta: (1) tabla v2_driver_certificate_requests, (2) formato CIE-{CAJA}-{YYYY}-{NNNNN} correlativo, (3) render real en app/financiera/[cie]/page.tsx con branch además del SAMPLE_DATASETS, (4) lookup/route.ts retornando CIE asociado por caja, (5) trigger de emisión (bot WhatsApp o admin manual), (6) watermark MUESTRA quitado en CIEs reales. Killer feature del relanzamiento — desbloquea créditos vehiculares/capital de trabajo/personales para choferes via caja aliada.',
  'alta',
  'Primera caja firme convenio o primer chofer pida constancia real',
  array[
    'humaniapp/app/financiera/[cie]/page.tsx',
    'humaniapp/app/api/ecodrive/financiera/lookup/route.ts',
    'humaniapp/app/financiera/VerifierDashboard.tsx',
    'humaniapp/supabase/migrations/YYYYMMDD_v2_driver_certificate_requests.sql',
    'humaniapp/app/admin/ecodrive/cie/page.tsx',
    'ecodrive-monorepo/apps/bot-whatsapp/src/'
  ],
  'pendiente_cie_real_por_conductor',
  'humaniapp/docs/ecodrive/PENDIENTE_CIE_REAL.md'
)
on conflict (key) do update set
  titulo = excluded.titulo,
  descripcion = excluded.descripcion,
  prioridad = excluded.prioridad,
  bloqueante_cuando = excluded.bloqueante_cuando,
  archivos_clave = excluded.archivos_clave,
  memoria_slug = excluded.memoria_slug,
  doc_path = excluded.doc_path;
