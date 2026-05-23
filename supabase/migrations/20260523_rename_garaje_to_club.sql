-- Rebranding "EcoDrive+ Garaje" → "EcoDrive+ Club" (2026-05-23)
--
-- Renombra tablas, funciones, triggers, índices y políticas RLS del schema
-- garaje_* → club_*. El esquema lógico se mantiene intacto, solo cambian
-- los nombres. Es seguro ejecutar varias veces (idempotente vía IF EXISTS).
--
-- Aplicar via Supabase Management API o supabase CLI:
--   supabase db push --linked
-- O via psql conectado al pooler.
--
-- Una vez aplicado, el código (commit bXXXXXX) ya apunta a los nombres nuevos.

BEGIN;

-- ===== TABLAS =====

ALTER TABLE IF EXISTS public.garaje_programa     RENAME TO club_programa;
ALTER TABLE IF EXISTS public.garaje_ediciones    RENAME TO club_ediciones;
ALTER TABLE IF EXISTS public.garaje_miembros     RENAME TO club_miembros;
ALTER TABLE IF EXISTS public.garaje_pass         RENAME TO club_pass;
ALTER TABLE IF EXISTS public.garaje_tickets      RENAME TO club_tickets;
ALTER TABLE IF EXISTS public.garaje_reservas     RENAME TO club_reservas;
ALTER TABLE IF EXISTS public.garaje_pagos        RENAME TO club_pagos;
ALTER TABLE IF EXISTS public.garaje_payouts      RENAME TO club_payouts;
ALTER TABLE IF EXISTS public.garaje_audit_log    RENAME TO club_audit_log;

-- ===== FUNCIONES (rpc) =====
-- Las firmas se mantienen idénticas; solo cambia el nombre.

ALTER FUNCTION IF EXISTS public.garaje_edicion_actual()              RENAME TO club_edicion_actual;
ALTER FUNCTION IF EXISTS public.garaje_ultimos_vendidos()            RENAME TO club_ultimos_vendidos;
ALTER FUNCTION IF EXISTS public.garaje_historial_ediciones()         RENAME TO club_historial_ediciones;
ALTER FUNCTION IF EXISTS public.garaje_cleanup_reservas_vencidas()   RENAME TO club_cleanup_reservas_vencidas;
ALTER FUNCTION IF EXISTS public.garaje_cerrar_edicion_si_completa()  RENAME TO club_cerrar_edicion_si_completa;
ALTER FUNCTION IF EXISTS public.garaje_aplicar_bonus_lealtad()       RENAME TO club_aplicar_bonus_lealtad;

-- ===== SEQUENCES =====
-- Postgres renombra automáticamente sequences SERIAL/BIGSERIAL al renombrar
-- la tabla owner. Si hay sequences manuales, agregar aquí.

-- ===== ÍNDICES =====
-- Postgres NO renombra índices auto. Renombramos los más usados a mano.
-- Si los nombres originales eran auto-generados (tabla_columna_idx),
-- el rename de tabla los deja con prefijo viejo. No rompe nada pero confunde.

DO $$
DECLARE
  idx record;
BEGIN
  FOR idx IN
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND indexname LIKE 'garaje_%'
  LOOP
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I', idx.indexname, replace(idx.indexname, 'garaje_', 'club_'));
  END LOOP;
END$$;

-- ===== TRIGGERS =====
-- Postgres mantiene triggers asociados a la tabla renombrada, pero los
-- nombres con prefijo viejo siguen ahí.

DO $$
DECLARE
  trg record;
BEGIN
  FOR trg IN
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public' AND trigger_name LIKE 'garaje_%'
  LOOP
    EXECUTE format('ALTER TRIGGER %I ON public.%I RENAME TO %I',
      trg.trigger_name, trg.event_object_table, replace(trg.trigger_name, 'garaje_', 'club_'));
  END LOOP;
END$$;

-- ===== RLS POLICIES =====
-- Renombrar políticas (igual: no es funcional, solo limpieza visual).

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE 'garaje_%'
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I RENAME TO %I',
      pol.policyname, pol.tablename, replace(pol.policyname, 'garaje_', 'club_'));
  END LOOP;
END$$;

COMMIT;

-- NOTA: el storage bucket "garaje-fotos" se renombra manualmente desde el
-- panel de Supabase (no hay ALTER BUCKET en SQL). Después de renombrarlo,
-- las URLs storage en la BD (club_ediciones.premio_fotos_urls, etc.) deben
-- actualizarse con un UPDATE simple:
--   UPDATE public.club_ediciones
--   SET premio_fotos_urls = (
--     SELECT array_agg(replace(url, '/garaje-fotos/', '/club-fotos/'))
--     FROM unnest(premio_fotos_urls) AS url
--   );
