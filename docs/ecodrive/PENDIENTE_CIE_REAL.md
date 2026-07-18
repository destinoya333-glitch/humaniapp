# PENDIENTE — Generación de CIE real por conductor

**Registrado**: 2026-05-30
**Bloqueante cuando**: la primera caja firme convenio o el primer chofer pida constancia real.
**Memoria asociada**: `pendiente_cie_real_por_conductor` (auto-memory Claude).
**Registro BD**: tabla `ecodrive_pendientes`, key `cie_real_por_conductor` (ver migration `20260530_ecodrive_pendientes.sql`).

---

## Estado actual (limitación)

`https://ecodriveplus.com/financiera` hoy solo entrega la **constancia muestra** de cada caja. Cuando una caja loguea e ingresa DNI:

| Escenario | Comportamiento actual |
|---|---|
| DNI `12345678` (demo) | Render SAMPLE Juan Pérez Ramírez + CIE muestra de la caja logueada |
| DNI real afiliado en `v2_drivers` | Lookup encuentra conductor, pero dashboard navega al MISMO CIE muestra (datos de Juan Pérez) |
| DNI no afiliado | Card "no encontrado" |

Las cartas convenio v3 enviadas a Caja Trujillo/Arequipa/Huancayo no comprometen plazo, pero apenas firme una caja esto se vuelve obligatorio.

---

## Qué falta implementar (6 piezas)

### 1. Tabla `v2_driver_certificate_requests`

```sql
CREATE TABLE IF NOT EXISTS v2_driver_certificate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cie text UNIQUE NOT NULL,
  driver_id uuid REFERENCES v2_drivers(id),
  caja_slug text NOT NULL,                  -- 'caja-trujillo' | 'caja-arequipa' | 'caja-huancayo'
  dni text NOT NULL,
  fecha_emision date DEFAULT current_date,
  periodo_desde date NOT NULL,
  periodo_hasta date NOT NULL,
  viajes int NOT NULL,
  bruto numeric(12,2) NOT NULL,
  comision numeric(12,2) NOT NULL,
  neto numeric(12,2) NOT NULL,
  status text DEFAULT 'emitida',            -- 'emitida' | 'revocada'
  caja_consultas int DEFAULT 0,
  ultima_consulta timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON v2_driver_certificate_requests (driver_id);
CREATE INDEX ON v2_driver_certificate_requests (caja_slug, status);
CREATE INDEX ON v2_driver_certificate_requests (dni);
```

### 2. Formato CIE único

`CIE-{TRU|AQP|HCO}-{YYYY}-{NNNNN}` — correlativo por caja por año. Sequence o `max(numero)+1` per caja.

### 3. Render `app/financiera/[cie]/page.tsx`

Agregar branch DESPUÉS de SAMPLE_DATASETS:

```ts
// pseudocódigo
if (SAMPLE_DATASETS[cie]) return <SampleConstancia .../>;
const real = await sb.from("v2_driver_certificate_requests")
  .select("*, v2_drivers(*)").eq("cie", cie).eq("status","emitida").maybeSingle();
if (real.data) return <RealConstancia data={real.data} />;
return <NotFound />;
```

Watermark "MUESTRA · NO VALIDO" solo se renderiza en `SampleConstancia`, no en `RealConstancia`.

### 4. `/api/ecodrive/financiera/lookup` retorna CIE asociado

Tras encontrar conductor por DNI:
- Buscar `v2_driver_certificate_requests` por `driver_id + caja_slug` (caja_slug viene de la sesión) + `status='emitida'`, order by `created_at desc limit 1`.
- Si existe → retornar `{found:true, cie:"CIE-...", driver:{...}}`. Dashboard navega al iframe con ese CIE real.
- Si NO existe → decidir entre:
  - (A) `{found:true, no_cie:true, driver:{...}}` + mensaje "conductor afiliado pero sin constancia emitida para esta caja — contactar EcoDrive+".
  - (B) Auto-generar al vuelo: agregación últimos 6 meses de viajes del conductor + insert + retornar CIE recién creado.

### 5. Trigger de emisión

Dos opciones (decidir con Percy):

- **Bot WhatsApp EcoDrive+** — comando del chofer: "constancia caja trujillo" → bot calcula 6 meses, crea row, devuelve CIE al chofer.
- **Admin manual** — endpoint `/api/ecodrive/admin/cie/issue` + UI en `/admin/ecodrive` para que Percy gatille emisión cuando lo pida un chofer por WhatsApp directo.

### 6. Migration en repo

Archivo a crear cuando se ejecute: `humaniapp/supabase/migrations/YYYYMMDD_v2_driver_certificate_requests.sql`.

---

## Why estratégico

EcoDrive+ = único en Perú que da prueba de ingresos formal a choferes informales. Sin CIE real el convenio queda en papel. Con CIE real → desbloquea créditos vehiculares/capital de trabajo/personales para choferes vía caja aliada. **Killer feature** del relanzamiento regional (ref estrategia Trujillo→Chimbote→Piura→Lima).

---

## Archivos clave a tocar

```
humaniapp/app/financiera/[cie]/page.tsx                              ← branch CIE real
humaniapp/app/api/ecodrive/financiera/lookup/route.ts                ← retornar CIE asociado
humaniapp/app/financiera/VerifierDashboard.tsx                       ← navegar a CIE real
humaniapp/supabase/migrations/YYYYMMDD_v2_driver_certificate_requests.sql  ← DDL nueva tabla
humaniapp/app/admin/ecodrive/cie/page.tsx                            ← UI admin (si opción B)
ecodrive-monorepo/apps/bot-whatsapp/src/...                          ← comando chofer (si opción A)
```

---

## Checklist al activar

- [ ] Definir trigger (bot vs admin manual) con Percy
- [ ] Aplicar migration `v2_driver_certificate_requests` en dashboard Supabase incógnito
- [ ] Implementar branch real en `[cie]/page.tsx`
- [ ] Implementar resolución CIE en `lookup/route.ts`
- [ ] Probar E2E: chofer pide constancia → CIE emitido → caja loguea → busca DNI → ve constancia real → descarga PDF
- [ ] Cerrar este pendiente: update row en `ecodrive_pendientes` con `closed_at` + commit que removió este archivo
