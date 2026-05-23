# Portal Financiera — Documentación técnica

URL: **https://ecodriveplus.com/financiera**

Portal exclusivo para entidades financieras (Cajas Municipales) que necesitan verificar afiliación de conductores ECO DRIVE PLUS S.A.C. y descargar constancias de ingresos para evaluación crediticia.

---

## Flujo de uso

1. **Login** — Caja ingresa usuario + contraseña asignados.
2. **Búsqueda DNI** — Caja ingresa DNI del solicitante de crédito.
3. **Certificado embebido** — Sistema muestra constancia en iframe dentro de la plataforma.
4. **Descarga PDF** — Botón "Descargar PDF" abre print dialog. Caja elige "Save as PDF" → archivo descargado.

---

## Credenciales activas

Configuradas en env var `VERIFIER_ACCOUNTS` en Vercel (NO commitear al repo).

| Caja | Usuario | CIE muestra |
|---|---|---|
| Caja Municipal de Ahorro y Crédito de Trujillo S.A. | `caja-trujillo` | CIE-TRU-2026-00187 |
| Caja Municipal de Ahorro y Crédito de Arequipa S.A. | `caja-arequipa` | CIE-AQP-2026-00188 |
| Caja Municipal de Ahorro y Crédito de Huancayo S.A. | `caja-huancayo` | CIE-HCO-2026-00189 |

Las contraseñas están en `docs/ecodrive/legal/carta_convenio_caja_*_v3.html` (líneas 96-97).

**DNI demo para testing**: `12345678` (Juan Pérez Ramírez) — bypass BD, siempre retorna afiliado.

---

## Arquitectura

### Rutas Next.js (`humaniapp/app/financiera/`)

| Archivo | Propósito |
|---|---|
| `page.tsx` | Gate — si sesión existe → Dashboard, si no → Login. |
| `VerifierLogin.tsx` | Form usuario/contraseña. Sin autofill (data-1p-ignore, autoComplete=off). |
| `VerifierDashboard.tsx` | 3 vistas: `search` (DNI prompt), `certificate` (iframe + descarga), `notfound` (error card). |
| `[cie]/page.tsx` | Render dinámico de la constancia HTML por CIE. |

### Endpoints API (`humaniapp/app/api/ecodrive/financiera/`)

| Endpoint | Método | Función |
|---|---|---|
| `/login` | POST | Autentica usuario+pass, crea cookie HMAC. |
| `/login` | DELETE | Destruye sesión (logout). |
| `/lookup` | POST | Busca DNI en `v2_drivers`. DNI 12345678 = bypass demo. Audita en `verifier_lookups`. |

### Auth (`lib/ecodrive/verifier-auth.ts`)

- Cookie name: `ecodrive_verifier_session_v2`
- Validez server-side: 8 horas (`COOKIE_MAX_AGE`)
- Cookie session-only: el navegador la elimina al cerrarse (sin `maxAge` en `cookies.set()`)
- HMAC SHA256 con `VERIFIER_COOKIE_SECRET` (Vercel env)
- Cuentas: parsed de `VERIFIER_ACCOUNTS` env JSON

### Redirects legacy

- `/verificar` → 308 → `/financiera`
- `/verificar/[cie]` → 308 → `/financiera/[cie]`
- `bot-whatsapp /api/certificate/sample` → 302 → `https://ecodriveplus.com/financiera/CIE-TRU-2026-00187` (Railway)

---

## Render constancia (`[cie]/page.tsx`)

### Reglas críticas que NO deben removerse

```css
/* Forzar Chrome/Edge a IMPRIMIR colores de fondo (sin esto, PDF queda sin
   tabla naranja, banner cream, header bar). */
.constancia-paper, .constancia-paper * {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}
```

```css
/* Página A4 con márgenes apretados */
@page { size: A4; margin: 0.8cm 1.2cm; }
```

### Compactación

Aplicada **siempre** (no solo en print) para evitar "salto" visual entre pantalla y print preview. Pantalla = print = PDF.

Clases targeting: `.c-header`, `.c-title`, `.c-subtitle`, `.c-cie-row`, `.c-section`, `.c-field`, `.c-resumen`, `.c-resumen-value`, `.c-resumen-label`, `.c-promedios`, `.c-table`, `.c-disclaimer`, `.c-bottom`, `.c-firma`, `.c-footer`, `.c-banner`.

### Diferencia pantalla vs print

Solo el **wrapper** difiere:
- Pantalla: gris bg + paper centrado + max-width 820 + box-shadow (look "document on a desk")
- Print: sin bg, sin shadow, max-width none (paper fills A4)

Esta diferencia es solo visual del marco — el CONTENIDO es idéntico.

### Datos demo

Datos hardcoded en `SAMPLE_MESES` + `SAMPLE_TOTALS`:
- Juan Pérez Ramírez (DNI 12345678, Licencia Q12345678, Placa ABC-123)
- 6 meses: Dic 2025 a May 2026
- 3,485 viajes / S/ 33,109 bruto / S/ 2,085 comisión 6.3% / S/ 31,024 neto
- Promedios: S/ 5,171 mensual neto / S/ 172 diario

### Brand assets (Supabase storage public)

- Logo: `brand-assets/ecodrive/logo-final-naranja-trim.png`
- Firma: `brand-assets/ecodrive/firma-sello-percy.png` (incluye nombre + cargo + empresa dentro del PNG)

---

## Color marca

`#E1811B` (anaranjado) — usar en todos los acentos. **NUNCA** mezclar con `#B86A12` ni otros tonos.

Aplicado en: header border, título, resumen 4-col, tabla header, tabla footer TOTAL, banner verificación, watermark.

---

## Audit log

Tabla `verifier_lookups` en Supabase:

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `verifier_user` | text | Slug usuario caja (ej. "caja-trujillo") |
| `entidad` | text | Display name caja |
| `dni_query` | text | DNI consultado |
| `found` | boolean | Si retornó afiliado |
| `created_at` | timestamp | Auto |

Todo lookup (incluyendo DNI 12345678 demo) se registra.

---

## Deploy

- **humaniapp** → Vercel (auto on push a main; force con `vercel --prod --yes`)
- **bot-whatsapp** → Railway (auto on push monorepo; force con `railway up --service bot-whatsapp --detach`)
- Env vars en Vercel project `activosya`:
  - `VERIFIER_ACCOUNTS` (JSON array)
  - `VERIFIER_COOKIE_SECRET` (HMAC secret)

---

## Testing

```bash
# Login programático
curl -c /tmp/cookies.txt -X POST https://ecodriveplus.com/api/ecodrive/financiera/login \
  -H "Content-Type: application/json" \
  -d '{"user":"caja-trujillo","pass":"WjP7kyuJ13s"}'

# Lookup DNI demo
curl -b /tmp/cookies.txt -X POST https://ecodriveplus.com/api/ecodrive/financiera/lookup \
  -H "Content-Type: application/json" \
  -d '{"dni":"12345678"}'

# Generar PDF de constancia
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu \
  --print-to-pdf="constancia.pdf" --print-to-pdf-no-header \
  https://ecodriveplus.com/financiera/CIE-TRU-2026-00187

# Verificar páginas PDF (debe ser 1)
python -c "import re; d=open('constancia.pdf','rb').read(); print(re.search(rb'/Count\s+(\d+)',d).group(1))"
```

---

## Historial de cambios mayores (2026-05-23)

| Commit | Descripción |
|---|---|
| `7fc9be6` | Rename `/verificar` → `/financiera` |
| `4a0f8d9` | Dashboard usa render online (no PDF Railway) + fix detección caja por user slug |
| `755cd2b` | @page A4 + @media print (encaja 1 hoja) |
| `293c06a` | Match modelo Percy (QR stacked + banner imprimible) |
| `0cada27` | Layout compacto pantalla = print (sin salto visual) |
| `e949bad` | Eliminar auto-print |
| `69032ee` | Rediseñar dashboard (DNI prompt + iframe + botón descargar) |
| `2377cf5` | Endurecer sesión (cookie _v2 + 8h + session-only) |
| `146e104` | DNI demo 12345678 = Juan Pérez bypass |
| `37979c4` | print-color-adjust exact (preservar colores en PDF) |
