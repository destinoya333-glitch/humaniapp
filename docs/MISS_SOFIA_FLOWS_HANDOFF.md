# Miss Sofia Flows — Handoff de la ventana EcoDrive+ a la ventana Sofia

> **Para la ventana de Claude Code que va a construir los 5 Flows de Miss Sofia.**
> Léeme entero antes de tocar nada. Aquí está la plataforma de Flows ya
> funcionando + todos los gotchas que aprendí construyendo los flows de
> EcoDrive+ (5 flows en producción, validados con prueba real).
>
> Si tú eres "la otra ventana" creando Sofia: empieza leyendo
> `docs/MISS_SOFIA_CUNA_BRIEFING.md` (lo escribiste tú mismo). Luego
> regresa aquí para ver la plataforma técnica que ya existe.

---

## 1. La plataforma Flows ya está construida y validada

Está en `lib/wa-flows-platform/` con estos archivos:

| Archivo | Para qué sirve |
|---|---|
| `encryption.ts` | RSA-OAEP-256 + AES-128-GCM. `decryptRequest(body, privateKey)` y `encryptResponse(json, aesKey, iv)` |
| `registry.ts` | `FlowDefinition`, `FlowRequestPayload`, `FlowResponse`, `FlowContext`. `registerFlow()`, `getFlow(tenant, flow_key)`, `pingResponse()` |
| `media-decrypt.ts` | Decrypt fotos del PhotoPicker (AES-256-CBC + HMAC-SHA256 truncado 10 bytes + verifica plaintext_hash). Función `decryptFlowMedia(media)` retorna `Buffer` |
| `claude-vision.ts` | Wrapper Claude Vision para OCR. `extractFromImage(buffer, mime, prompt)` retorna JSON. Trae prompts predefinidos para DNI/licencia/SOAT/carro/selfie peruanos |

**Endpoint webhook universal**: `app/api/whatsapp-flows/webhook/route.ts`
- URL pública: `https://activosya.com/api/whatsapp-flows/webhook` (también disponible en `ecodriveplus.com` y otros dominios)
- Decripta request, parsea `flow_token` formato `{tenant}:{flow_key}:{ctx}`, busca handler en registry, encripta respuesta
- TODOS los flows del marketplace usan este mismo endpoint
- Para Sofia, el patrón será: `flow_token = "miss-sofia:pacto-cuna:{user_id}"`, `"miss-sofia:plan-estudio:{user_id}"`, etc.

**Para registrar un Flow nuevo de Sofia**:
1. Crear archivo `lib/wa-flows-tenants/miss-sofia/flows/<flow-key>.ts` con `export default` un objeto que cumpla `FlowDefinition`
2. Importar y `registerFlow(...)` en `lib/wa-flows-tenants/index.ts`
3. Crear el JSON spec en `Documents/.../flow_<key>_spec.json` o donde quieras
4. Subir a Meta + publicar via Graph API (script Python — ver ejemplos en EcoDrive+)
5. Crear template Meta con `flow_action: "DATA_EXCHANGE"` (NO "NAVIGATE", ver gotcha #1)

---

## 2. Gotchas críticos de Meta WhatsApp Flows JSON v7 (validados con sangre)

### #1. `flow_action: "NAVIGATE"` vs `"DATA_EXCHANGE"`
- **NAVIGATE**: Meta abre la screen directo con `flow_action_data` como data del screen. NO llama webhook. Sirve solo si la data ya viene completa en el template.
- **DATA_EXCHANGE**: Meta llama webhook con `INIT` action, espera respuesta encriptada con la screen + data. Sirve cuando necesitas backend (lookup BD, OCR, etc).
- Si pones DATA_EXCHANGE, **no puedes pasar `flow_action_data` ni `flow_action_payload`** en el template. Toda la data viene del webhook.
- **Routing multi-tenant**: codifica el flow_key en `flow_token` formato `{tenant}:{flow_key}:{contexto}`. El webhook lo parsea.

### #2. Meta NO interpola `${data.X}` mixto con texto fijo
- ❌ `"text": "Hola ${data.nombre}"` → renderiza literal `${data.nombre}`
- ❌ `"text": "DNI ${data.dni} - ${data.edad}"` → falla validación o renderiza literal
- ✅ `"text": "${data.linea_saludo}"` → Meta interpola el binding completo
- **Solución**: pre-armar todos los strings en el handler y enviarlos como fields atómicos (`linea_X`, `linea_Y`).

### #3. PhotoPicker — solo 1 por screen
- Meta permite máximo **1** `PhotoPicker` o `DocumentPicker` por screen.
- Si necesitas N fotos, divide en N screens secuenciales con navigate o data_exchange entre ellas.
- Ejemplo: flow inscripción chofer EcoDrive+ tiene 5 screens (DNI, licencia, selfie, carro, SOAT).

### #4. TextInput propiedades válidas en v7
- ✅ `name`, `label`, `helper-text`, `required`, `input-type`, `min-chars`, `max-chars`
- ❌ `init-value`, `init-values` (a nivel TextInput) — NO existen
- ✅ Para prefill: poner `init-values` **a nivel del Form padre**, como objeto que mapea `name → valor`:
```json
{
  "type": "Form",
  "init-values": { "nombre": "${data.nombre_inicial}", "dni": "${data.dni_inicial}" },
  "children": [
    {"type": "TextInput", "name": "nombre", ...},
    {"type": "TextInput", "name": "dni", ...}
  ]
}
```

### #5. `input-type: "number"` rompe el navigate payload
- Si el input es number, el value llega como `number` al siguiente screen, pero las screens declaran `data` con `type: "string"`. Falla validación con `Schema not matching`.
- **Fix**: usar siempre `input-type: "text"` y validar en el handler.

### #6. Templates con language duplicado
- Meta no permite 2 templates con el mismo `name` y `language`. Si lo intentas: error 2388024.
- Si necesitas modificar uno aprobado: nombre nuevo (ej: `eco_chofer_invite_v2`).

### #7. Template flow no permite parameters dinámicos en el botón
- El botón FLOW del template solo acepta `flow_token` parametrizable, nada más.
- Para pasar contexto al flow, codifícalo en el `flow_token` (max ~150 chars).
- Si necesitas más data: el handler lo busca en BD con el contexto del token.

### #8. Listado de flows de WABA paginado
- `GET /{waba}/flows` retorna max 25 por página. Usa `?limit=100` o paginación si tienes muchos.

### #9. Publish "invalid state"
- Si un flow ya está PUBLISHED, intentar publicarlo de nuevo da `4016006: invalid state`. No es error, ya está publicado.
- Solo se publica desde DRAFT.

### #10. Verify token: cuidado con `\n` al final
- `echo "TOKEN" | vercel env add` agrega un `\n`. Usar `printf "TOKEN" | vercel env add` o el panel UI.
- Si tu webhook devuelve "Forbidden" cuando el token "parece correcto", chequea length con un debug endpoint.

---

## 3. Patrones de handler que ya tengo probados

### Handler con OCR (5 fotos + IA Claude Vision)
Ver `lib/wa-flows-tenants/ecodrive/flows/inscripcion-chofer.ts` — patrón completo:
1. INIT → screen `FOTO_DNI`
2. Cada step `save_X` (DNI/licencia/selfie/carro/SOAT) → upload a bucket Supabase + actualizar tabla `eco_chofer_signup_drafts` con el path → navegar a la siguiente
3. Step `process_all` → leer todos los paths del draft, descargar de bucket, correr Claude Vision en paralelo (Promise.all), pre-armar datos para screen RESUMEN
4. Step `submit` → validar IA aprobó todo (DNI valido + licencia + carro con placa + SOAT con placa coincidente + selfie es persona) → si todo OK auto-aprobar y mandar template `eco_chofer_aprobado`; si no, dejar `pending` y mensaje libre

### Handler con lookup BD por flow_token
Ver `lib/wa-flows-tenants/ecodrive/flows/tracking-viaje.ts`:
- `flow_token = "ecodrive:tracking-viaje:{session_uuid}"`
- Handler parsea `tokenParts[2]` como session_id
- Lookup en `eco_tracking_sessions`, fetch Google Static Maps, devuelve screen con mapa base64

### Handler multi-step con persistencia entre screens
Ver `lib/wa-flows-tenants/ecodrive/flows/inscripcion-chofer.ts` (mismo) — usa tabla `*_signup_drafts` con `wa_id` como PK para acumular state entre screens.

---

## 4. Los 5 Flows de Miss Sofia (ya definidos en briefing)

Lee primero `docs/MISS_SOFIA_CUNA_BRIEFING.md` (tú lo escribiste) que tiene la spec exacta:

| # | Flow | Propósito | Endpoint REST que la "otra ventana" hizo |
|---|---|---|---|
| 1 | **Pacto Cuna** ("Quién eres") | nombre + ciudad + motivación + minutos/día + checkbox compromiso 30 días Fase Cuna | `POST /api/sofia-flows/pacto` |
| 2 | **Plan de estudio** | hora preferida audio matutino + modo (estricto/suave) + días semana | `POST /api/sofia-flows/study-plan` |
| 3 | **Pago Cuna/Cuna VIP** | comparativa S/39 vs S/89 + selección + Yape (998 102 258) + código operación | `POST /api/sofia-flows/payment` |
| 4 | **Progreso semanal** | read-only: fase actual badge, tiempo de boca, palabras dictionary, hitos viscerales, capítulo novela | `GET /api/sofia-flows/progress?user_id=` |
| 5 | **Test pronunciación** | 3 screens: target phrase → grabar audio → score + feedback | `POST /api/sofia-flows/pronunciation` |

**WABA de Sofia**: `1623262362222343` (revisa en briefing) — DIFERENTE de EcoDrive+ (`1312587653282767`).

**Tono**: profesora ejecutiva. NO "mi amor", NO emojis románticos. Lee briefing sección 2.

---

## 5. Cómo invocar los endpoints REST desde tu webhook handler

```ts
// En lib/wa-flows-tenants/miss-sofia/flows/pacto-cuna.ts (ejemplo)
async function callSofia(flowKey: string, body: unknown) {
  const r = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://activosya.com'}/api/sofia-flows/${flowKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  return await r.json();
}
```

Los endpoints `/api/sofia-flows/*` ya validan shape y retornan JSON consistente.

---

## 6. Stack y env vars que necesitas

Ya están todas en Vercel production:
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `WA_FLOWS_PRIVATE_KEY` (compartido — Meta firma con la pública correspondiente, ya registrada en ambos WABAs)
- `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` (default `claude-sonnet-4-6`)
- `GOOGLE_MAPS_API_KEY` (no aplica a Sofia)

**Para Sofia necesitas además** (probablemente ya configurados):
- `TWILIO_SOFIA_ACCOUNT_SID`, `TWILIO_SOFIA_AUTH_TOKEN`, `TWILIO_SOFIA_FROM` (sender +51977100718)
- `META_SOFIA_PHONE_ID` (si Sofia tiene su propio phone)
- `META_SOFIA_ACCESS_TOKEN`

Si Sofia va a usar el WABA de Sofia con Meta Cloud, tienes que registrar la public key correspondiente en ese phone (ver script `19_create_flow_inscripcion_chofer.py` patrón de Sofia equivalente).

---

## 7. Convención de naming

Sigue el patrón de EcoDrive+:
- Carpeta: `lib/wa-flows-tenants/miss-sofia/flows/`
- Archivo per flow: `pacto-cuna.ts`, `plan-estudio.ts`, `pago.ts`, `progreso.ts`, `pronunciacion.ts`
- Spec JSON: en `Documents/MISS_SOFIA/specs/flow_<key>_spec.json` o donde te resulte cómodo
- Templates Meta: `sofia_pacto_invite`, `sofia_plan_estudio`, `sofia_pago`, etc. (prefijo `sofia_`)
- Flow names en Meta: `Sofia_Pacto_Cuna_v1`, `Sofia_Plan_Estudio_v1`, etc.

---

## 8. Web principal — agregar Sofia

La home `app/page.tsx` o landing `activosya.com/` ya tiene el catálogo de productos. Agrega Sofia con:
- CTA "Aprende inglés con Sofia, S/39/mes" → link a `https://sofia.activosya.com/` (subdomain ya configurado en `proxy.ts`, redirige a `/miss-sofia`)
- Subdomain `sofia.activosya.com` → ruta interna `/miss-sofia` (ya en proxy.ts)

Tu ventana ya tiene la página landing en `app/miss-sofia/` (probablemente). Si falta integrar el botón "Inscríbete" que dispare el flow Pacto Cuna, ese es el último paso.

---

## 9. Retomar trabajo de la ventana EcoDrive+ — estado actual

EcoDrive+ tiene **14 sprints completos** en producción. Resumen ejecutivo:

| Componente | Estado |
|---|---|
| Inscripción chofer (5 fotos + IA + auto-aprobación) | ✅ funciona end-to-end |
| Inscripción pasajero (DNI + selfie + IA) | ✅ funciona |
| Picker web tipo inDrive (`ecodriveplus.com/eco-pedir/[token]`) Leaflet + Google Places autocomplete + tarifa Distance Matrix | ✅ funciona |
| Bot conversacional WhatsApp (`hola` → menú interactivo) — webhook universal `/api/whatsapp/eco` | ✅ vivo |
| Tracking pasajero `/track/[viajeId]` con polling 5seg + Leaflet | ✅ migrado a nuevo schema |
| Tracker chofer `/track-chofer/[token]` PWA con GPS + alarma sonora "¡Nuevo pedido EcoDrive!" | ✅ migrado |
| Schema legacy migrado: 79 choferes + 204 pasajeros importados a `eco_*` con `legacy_imported=true` | ✅ |
| Auto-marcar `en_turno=true` cuando chofer acepta viaje + mandarle link tracker GPS | ✅ |
| Templates Meta: `eco_chofer_invite`, `eco_pasajero_invite`, `eco_pedir_viaje_url`, `eco_chofer_nuevo_viaje`, `eco_tracking_invite_v2`, `eco_chofer_aprobado/rechazado` | ✅ todos APPROVED |

**Webhook subscription Meta**: el WABA EcoDrive+ (`1312587653282767`) usa la app `EcoDriveBot` (`1619223319302965`) con `override_callback_uri: https://activosya.com/api/whatsapp/eco`.

**No tocar a menos que sea coordinado**:
- Tablas `eco_choferes`, `eco_pasajeros`, `eco_viajes`, `eco_tracking_sessions`, `eco_pedir_viaje_tokens`, `eco_chofer_signup_drafts`, `eco_pasajero_signup_drafts`, `eco_viaje_drafts`, `eco_viaje_tracking_pings`
- Buckets `eco-choferes-docs`, `eco-pasajeros-docs`
- Endpoints `/api/ecodrive/*`, `/api/track/[viajeId]`, `/api/whatsapp/eco`
- Páginas `/track/[viajeId]`, `/track-chofer/[token]`, `/admin/ecodrive/*`, `/ecodriveplus/*`, `/se-chofer-eco`, `/se-pasajero-eco`

Si necesitas modificar estos archivos, primero coordina con la ventana EcoDrive+.

---

## 10. TL;DR

1. Lee `docs/MISS_SOFIA_CUNA_BRIEFING.md` (tu propia spec)
2. La plataforma Flows está lista en `lib/wa-flows-platform/` — solo crea handlers en `lib/wa-flows-tenants/miss-sofia/flows/`
3. Registra cada handler en `lib/wa-flows-tenants/index.ts` con `registerFlow(...)`
4. Sigue las 10 lecciones de Meta Flows JSON v7 (sección 2) — no improvises o vas a perder horas
5. Templates con `flow_action: "DATA_EXCHANGE"`, NO "NAVIGATE"
6. Codifica routing en `flow_token = "miss-sofia:<flow_key>:<contexto>"`
7. Pre-arma strings en handler (Meta no interpola texto fijo + variable inline)
8. Form `init-values` a nivel Form (no TextInput)
9. PhotoPicker solo 1 por screen → si necesitas N fotos, N screens
10. Tono: ejecutiva profesora, no bestie

¡Suerte! Si rompes algo, los commits del 2026-05-04 madrugada tienen todos los flows EcoDrive+ funcionando como referencia.

— La ventana EcoDrive+
