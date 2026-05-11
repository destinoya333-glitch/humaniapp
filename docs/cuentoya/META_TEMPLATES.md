# Templates Meta WhatsApp — TuCuentoYa

Estos son los 5 templates a crear en **Meta Business Manager → WhatsApp Manager → Plantillas de mensajes**, vinculados a la WABA HumaniAppManager (la misma que usa Sofia/Destino/EcoDrive).

Tiempo de aprobación: 24-48 horas.

---

## 1. `cuento_bienvenida` (UTILITY)

**Categoría:** UTILITY
**Idioma:** Spanish (es)
**Header:** (ninguno)
**Body:**
```
¡Hola! 🦊 Soy Coqui, tu narrador de cuentos personalizados.

Te creo un cuento donde *{{1}}* es el HÉROE de la historia, en menos de 60 segundos.

Para empezar, dime: ¿cómo se llama tu peque?
```
**Variables:**
- `{{1}}` = nombre del padre/madre (ej: "Percy")

**Footer:**
```
TuCuentoYa · ActivosYA
```

**Buttons:** (Quick Reply)
- "🌙 Cuento 2 min — S/2"
- "🦊 Cuento 3 min — S/3"
- "🐉 Cuento 5 min — S/5"

---

## 2. `cuento_listo` (UTILITY)

**Categoría:** UTILITY
**Idioma:** Spanish (es)
**Header:** Text → `🎉 ¡Tu cuento está listo!`
**Body:**
```
*{{1}}* ya tiene su cuento mágico 🦊

Título: *{{2}}*
Duración: {{3}} minutos

Te envío el audio MP3 en el siguiente mensaje. ¡Que lo disfrute!
```
**Variables:**
- `{{1}}` = nombre del niño (ej: "Mateo")
- `{{2}}` = título del cuento (ej: "Mateo y el Lobo del Bosque")
- `{{3}}` = duración (ej: "3")

**Footer:**
```
¿Otro cuento? Escribe MENÚ
```

---

## 3. `cuento_recarga_confirmada` (UTILITY)

**Categoría:** UTILITY
**Idioma:** Spanish (es)
**Header:** Text → `✅ Recarga acreditada`
**Body:**
```
Tu recarga de *S/{{1}}* fue acreditada con éxito 🎁

Saldo nuevo: *S/{{2}}*
Cuentos bonus: *{{3}}*

Ya puedes pedir tu próximo cuento sin yapear de nuevo.
```
**Variables:**
- `{{1}}` = monto pagado (ej: "30")
- `{{2}}` = saldo total (ej: "30")
- `{{3}}` = cuentos bonus (ej: "2")

---

## 4. `cuento_vip_activado` (UTILITY)

**Categoría:** UTILITY
**Idioma:** Spanish (es)
**Header:** Text → `🌟 ¡VIP activado!`
**Body:**
```
¡Bienvenido al *VIP {{1}}* de TuCuentoYa! ✨

Tienes *{{2}} cuentos al mes* (cualquier duración).
Tu VIP vence el *{{3}}*.

¡Pídeme el primer cuento ahora mismo!
```
**Variables:**
- `{{1}}` = plan (ej: "Estrella" o "Mágico")
- `{{2}}` = cap de cuentos (ej: "20" o "50")
- `{{3}}` = fecha de vencimiento (ej: "11 junio 2026")

---

## 5. `cuento_promo_lanzamiento` (MARKETING)

**Categoría:** MARKETING
**Idioma:** Spanish (es)
**Header:** Image → (subir imagen 1080x1080 de Coqui con texto "Primer cuento GRATIS")
**Body:**
```
🎁 *Regalo de bienvenida*

Tu primer cuento de 2 minutos es totalmente *GRATIS*, sin tarjeta.

Solo dime:
1️⃣ Nombre de tu peque
2️⃣ Quién es el villano (lobo, dragón, bruja...)
3️⃣ Quién lo salva (papá, mamá, abuela...)

En 60 segundos te envío el audio narrado en voz peruana 🦊
```
**Footer:**
```
Promo válida por 7 días desde tu suscripción
```
**Buttons:** (Quick Reply)
- "🎁 Quiero mi cuento gratis"
- "💰 Ver precios"

---

## Cómo crear en Meta Business Manager

1. Entra a https://business.facebook.com/wa/manage/message-templates/
2. Selecciona la WABA: **HumaniAppManager** (ID en memoria)
3. Click "Crear plantilla"
4. Por cada template:
   - Categoría → UTILITY o MARKETING (según lista arriba)
   - Idioma → Español (es)
   - Pega el body exactamente como aparece (con variables `{{1}}`, `{{2}}`...)
   - Agrega header / footer / buttons si los pide
   - Click "Enviar para aprobación"
5. Espera 24-48h. Recibirás email cuando estén aprobados.

**Tip:** los templates UTILITY se aprueban más rápido. El MARKETING (promo) puede tardar más por revisión humana de Meta.

---

## Después de aprobación

En tu .env de Vercel (proyecto humaniapp):

```bash
META_CUENTO_TEMPLATE_BIENVENIDA=cuento_bienvenida
META_CUENTO_TEMPLATE_LISTO=cuento_listo
META_CUENTO_TEMPLATE_RECARGA=cuento_recarga_confirmada
META_CUENTO_TEMPLATE_VIP=cuento_vip_activado
META_CUENTO_TEMPLATE_PROMO=cuento_promo_lanzamiento
```

El código `lib/cuentoinfantil/meta-cloud-sender.ts` ya tiene `sendTemplate()` listo para usar.
