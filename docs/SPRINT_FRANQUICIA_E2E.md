# Sprint Franquicia ActivosYA — Test E2E completo

**Última actualización:** 2026-05-10
**Estado del sprint:** F1-F9 completados, F10 (este doc + smoke tests).

---

## 0. Pre-requisitos antes de empezar a testear

| Requisito | Cómo verificar | Si falla |
|---|---|---|
| Code deployed en producción | `vercel ls` muestra Ready en Production con commit reciente | `vercel --prod` |
| `ACTIVOSYA_ADMIN_PASSCODE` en Vercel prod | `vercel env ls production \| grep ACTIVOSYA` | Ya configurado: `F91C0B7340A3` |
| `ECODRIVE_META_ACCESS_TOKEN` válido | curl Graph API con el token | Renovar System User token |
| `CRON_SECRET` en Vercel prod | `vercel env ls production \| grep CRON` | Vercel lo genera auto |
| Schema BD F1+F3 en Supabase | Ya verificado ✅ (queries del sanity check) | — |

---

## 1. Test 1 — Lead capture (form de interés inicial)

**Objetivo:** validar que un visitante puede dejar sus datos y recibe WhatsApp de bienvenida.

**Pasos:**
1. Abre incógnito → `https://activosya.com/se-operador?activo=tudestinoya`
2. Verifica:
   - Hero dice "Vende **TuDestinoYa** — consultas espirituales y profesionales..."
   - Selector activo arriba muestra TuDestinoYa seleccionado en amber
   - 3 cards de plan (Local 30 / Comunidad 100 / Líder 300) — mismos para ambos activos
3. Haz click en selector "◎ Miss Sofia" → verifica que el copy cambia a curso de inglés
4. Click "Quiero saber más →" o scroll a `#registro`
5. El form muestra banner "Te registras como operador Miss Sofia" (porque cambiaste)
6. Llena form:
   - Nombre: `Test Operador 1`
   - WhatsApp: tu propio número o uno de prueba
   - Email opcional
   - Ciudad: `Lima`
   - Plan: `Local — S/. 500/mes`
7. Click "Quiero ser operador →"
8. **Validar**:
   - Aparece pantalla `🎉 ¡Recibimos tu interés en Miss Sofia!`
   - Te llega WhatsApp del número EcoDrive+ (51994810242) con el mensaje de bienvenida
   - En `/admin/operadores` (con passcode), no aparece todavía (es solo lead, no operador)

**Endpoint testeado:** `POST /api/operadores/lead-captura`
**Tabla afectada:** `operadores_leads` (nuevo row)

---

## 2. Test 2 — Registro completo de operador (auto-onboarding sin pago)

**Objetivo:** validar que el endpoint de registro crea el operador en `pending_onboarding`.

```bash
# Reemplaza con datos reales de prueba
curl -X POST https://activosya.com/api/operadores/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez Test",
    "dni": "12345678",
    "whatsapp_personal": "999111111",
    "email": "test@test.com",
    "ciudad": "Cajamarca",
    "yape_numero": "999111111",
    "plan": "local",
    "activo": "tudestinoya"
  }'
```

**Respuesta esperada:**
```json
{
  "ok": true,
  "operador_id": "uuid-...",
  "referral_code": "JUAN-CAJ",
  "monto_renta_pen": 500,
  "yape_destino": "998102258",
  "whatsapp_enviado": true,
  "mensaje": "Cuenta creada. Yapea S/. 500..."
}
```

**Validar:**
- WhatsApp llega al `999111111` con instrucciones de pago
- WhatsApp llega a Percy `998102258` con notificación del nuevo operador
- En `ay_tenants` hay un row con `status='pending_onboarding'`, `referral_code='JUAN-CAJ'`, `macrodroid_token=<48 hex>`
- En `ay_tenant_assets` hay row con `tenant_id=<el uuid>`, `asset_slug='tudestinoya'`, `status='paused'`

---

## 3. Test 3 — Detección de pago de renta vía MacroDroid (auto-activación)

**Objetivo:** simular que el operador paga la 1ra renta y MacroDroid de Percy lo detecta.

**Pasos:**
1. Asegúrate que el Test 2 dejó un operador "Juan Pérez Test" con monthly_fee_pen=500 y created_at reciente (últimas 4h)
2. Simula notificación Yape:

```bash
curl -X POST https://activosya.com/api/destinoya/madrodroid \
  -H "Content-Type: text/plain" \
  -d "Yape! JUAN PEREZ te envió S/500 - Operación 12345678"
```

**Validar:**
- Respuesta JSON `{"ok": true, "action": "operador_activado", ...}`
- En `ay_tenants` el operador pasa a `status='active'`, `ultima_renta_pagada_at=now()`, `fecha_proxima_renta=hoy+30`
- En `ay_tenant_assets` el asset pasa a `status='active'`, `setup_completed_at=now()`
- En `ay_operador_pagos` aparece row tipo='renta_a_percy' por S/.500
- WhatsApp llega al operador con kit de bienvenida (link setup, link referido, etc.)
- WhatsApp llega a Percy con notificación de activación
- En `operadores_leads` el lead asociado se marca como `estado='converted'`

**Sofia macrodroid igual:** mismo test pero contra `/api/sofia/macrodroid` debe activar igual.

---

## 4. Test 4 — Página de setup del operador

**Objetivo:** el operador puede ver su kit completo con su token único.

**Pasos:**
1. Toma el `macrodroid_token` del operador del Test 3 (de `ay_tenants` en Supabase)
2. Abre: `https://activosya.com/operador/setup?token={macrodroid_token}`
3. **Validar:**
   - Hero dice "Bienvenido, Juan"
   - Status badge "Cuenta activa" (verde)
   - Resumen plan Local S/.500 con próximo cobro
   - Progreso: paso 1 (pago) ✓, paso 2 (MacroDroid) ⏳, paso 3 (chip) ⏳, paso 4 (vender) ⏳
   - Card MacroDroid muestra URL única `https://activosya.com/api/yape-detect/{token}` copiable
   - Card chip muestra botón "Enviar mi chip por WhatsApp →" pre-llenado
   - Card link de referido muestra `https://activosya.com/r/JUAN-CAJ` con botones share

---

## 5. Test 5 — Healthcheck del webhook Yape del operador

**Objetivo:** validar que el operador puede confirmar que su MacroDroid apunta bien.

```bash
# Reemplaza TOKEN con el macrodroid_token del operador
curl https://activosya.com/api/yape-detect/<TOKEN>
```

**Respuesta esperada:**
```json
{
  "ok": true,
  "operador": "Juan Pérez Test",
  "status": "active",
  "endpoint": "yape-detect",
  "method": "POST"
}
```

Si no encuentra el token: `{"ok": false, "error": "Token no reconocido"}` → 401

---

## 6. Test 6 — Pago de alumno al operador (vía MacroDroid del operador)

**Objetivo:** simular que un alumno paga al Yape del operador y MacroDroid del operador detecta.

**Pre-requisito:** debe haber un pago pendiente en `destinoya_pagos` con `tenant_id={operador_id}` y `estado='esperando_pago'`. Para crear uno manualmente:

```sql
-- Ejecutar en Supabase SQL editor:
INSERT INTO destinoya_pagos (celular, monto, servicio, estado, tenant_id)
VALUES ('+51987654321', 30, 'esoterico:Lectura de Mano', 'esperando_pago', '<TENANT_ID>');
```

Luego simula Yape entrante:
```bash
curl -X POST https://activosya.com/api/yape-detect/<TOKEN> \
  -H "Content-Type: text/plain" \
  -d "Yape! MARIA LOPEZ te envió S/30 - Operación 87654321"
```

**Validar:**
- Respuesta `{"ok": true, "action": "destino_pago_confirmado", ...}`
- Pago en `destinoya_pagos` pasa a estado='pago_confirmado', monto_pagado=30
- En `ay_operador_pagos` aparece row tipo='pago_alumno' por S/.30
- Alumno (`+51987654321`) recibe WhatsApp confirmando el pago
- Operador (whatsapp_personal) recibe notificación del cobro

---

## 7. Test 7 — Panel admin: vincular phone_id Meta

**Objetivo:** Percy vincula el chip del operador al asset.

**Pasos:**
1. Ir a: `https://activosya.com/admin/operadores`
2. Login con passcode `F91C0B7340A3`
3. Verifica:
   - Stats arriba (total / activos / esperando pago / sin chip)
   - El operador del Test 3 aparece como "Activo"
   - Su asset TuDestinoYa muestra "⏳ sin chip vinculado"
4. En el form inline del asset, ingresa:
   - `meta_phone_id`: `1080734831795014` (TuDestinoYa real, ver memoria phone_ids)
   - `meta_waba_id`: `2751228831929476` (opcional)
5. Click "Vincular y notificar →"
6. **Validar:**
   - Banner verde "✅ Phone vinculado correctamente a +51 980 423 754"
   - Asset ahora muestra "✓ +51 980 423 754"
   - Operador recibe WhatsApp "🎉 Tu WhatsApp Business está activo"

**Si phone_id es inválido:** Banner rojo `❌ El phone_id X no existe en Meta`. La BD no se actualiza.

---

## 8. Test 8 — Routing bot multi-tenant (FUNCIONAL)

**Objetivo:** validar que cuando un cliente escribe al WhatsApp del operador, el bot lo identifica.

**Pre-requisito:** Test 7 completado (operador con phone_id vinculado).

**Pasos:**
1. Desde un WhatsApp de prueba, envía mensaje al `+51 980 423 754` (TuDestinoYa)
2. **Validar (en logs del servidor):**
   - Webhook `/api/whatsapp/destinoya-meta` llega con `metadata.phone_number_id = "1080734831795014"`
   - `getOperadorByMetaPhoneId()` resuelve al operador correcto
   - El bot atiende y cuando menciona Yape, dice **el del operador (`999 111 111`)** en vez del default Percy
3. Verifica en `destinoya_conversaciones` que la nueva conversación tiene `tenant_id=<operador_id>`

---

## 9. Test 9 — Dashboard del operador

**Objetivo:** el operador ve sus stats correctas.

**Pasos:**
1. Abre: `https://activosya.com/operador/dashboard?token=<token>`
2. **Validar:**
   - 4 KPIs: alumnos activos / ingresos mes / total histórico / cupos libres
   - Tabla "Últimos cobros recibidos" muestra el pago de S/.30 del Test 6
   - Tabla "Tus alumnos" muestra el alumno del Test 6
   - Click "Descargar reporte CSV" descarga archivo con headers + pago

**CSV esperado:**
```
# Reporte mensual ActivosYA — 2026-05
# Operador: Juan Pérez Test
# DNI: 12345678
...
fecha,tipo,monto_pen,yape_operacion,yape_remitente_nombre,...
2026-05-10T...,pago_alumno,30,87654321,MARIA LOPEZ,...
```

---

## 10. Test 10 — Cron mensual de renta

**Objetivo:** validar que el cron diario funciona.

**Pre-requisito:** un operador con `fecha_proxima_renta` que matchee con T-3, T0 o T+8.

**Trigger manual:**
```bash
# Necesitas el CRON_SECRET (vercel env ls production | grep CRON)
curl https://activosya.com/api/cron/operadores-renta \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**Respuesta esperada:**
```json
{
  "ok": true,
  "fecha": "2026-05-10",
  "t_minus_3_enviados": 0,
  "t_zero_enviados": 0,
  "suspendidos": 0,
  "errores": []
}
```

Para forzar T-3: actualiza un operador's `fecha_proxima_renta` a hoy+3 y vuelve a ejecutar el cron. Debe enviarle WhatsApp.

---

## 11. Cleanup (después de tests)

Si creaste operadores de prueba, bórralos:

```sql
-- Cuidado: cascade borra ay_tenant_assets, ay_operador_alumnos, ay_operador_pagos
DELETE FROM ay_tenants WHERE name LIKE '%Test%' AND type='operador';

-- Borra pagos de prueba en destinoya_pagos:
DELETE FROM destinoya_pagos WHERE tenant_id IS NULL AND celular='+51987654321';

-- Borra leads de prueba:
DELETE FROM operadores_leads WHERE nombre LIKE '%Test%';
```

---

## ⚠️ Lo que SIGUE PENDIENTE para vender Sofia franquicia

**F3b: Sofia payment flow yape del operador.**
Archivo `app/api/sofia-flows/payment/route.ts` línea 42:
```ts
const YAPE_DESTINATION = { number: "998 102 258", name: "Percy R." };  // ← hardcoded
```
Cuando un alumno de un operador Sofia abre el Flow Pago, le aparece el Yape de Percy.
Hay que mirar `mse_whatsapp_leads.tenant_id` o `mse_users.tenant_id` y resolver dinámicamente.

**Hasta que F3b esté:** vender SOLO TuDestinoYa franquicia. Sofia franquicia rota.

---

## 🚀 Cómo poner en producción

```bash
cd ~/humaniapp
vercel --prod
```

Esto despliega todos los cambios F1-F9 a `https://activosya.com`.

**No requiere migraciones SQL extra** — todo el schema F1+F3 ya está aplicado en Supabase producción (verificado 2026-05-10).

**Riesgo:** mínimo. Los cambios son aditivos:
- Tablas nuevas y columnas nuevas con DEFAULT NULL
- Webhooks Sofia/Destino mantienen comportamiento legacy cuando `operador=null`
- MacroDroid existente sigue funcionando igual (lógica nueva de detección renta operador es ANTES del flujo legacy y solo se ejecuta si match)

**Rollback:** `vercel rollback` si algo falla.
