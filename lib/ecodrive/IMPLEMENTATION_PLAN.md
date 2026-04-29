# EcoDrive+ — Plan de Implementación del Bot

Estado a la fecha: MVP conversacional listo (esta sesión).
Falta: matching, viajes, wallet, RENIEC, plantillas, multi-rol UX.

---

## Fase 0 — Base (HECHO)
- [x] Schema Supabase (`supabase/ecodrive-schema.sql`) — 10 tablas
- [x] `lib/ecodrive/types.ts` — tipos compartidos
- [x] `lib/ecodrive/db.ts` — queries básicas (users, conversations, wallet)
- [x] `lib/ecodrive/wa-send.ts` — Meta Cloud API client
- [x] `lib/ecodrive/agent.ts` — Claude Sonnet 4.6 conversacional
- [x] `app/api/whatsapp/eco/route.ts` — webhook GET/POST funcional
- [x] Landing en `/ecodriveplus` con CTAs reales

## Fase 1 — Pre-lanzamiento (esta semana)
**Objetivo:** un usuario manda WA y Eco le responde conversando, identifica si es pasajero o chofer, y lo pone en lista de espera del producto real.

### A configurar (humano):
1. Aplicar `supabase/ecodrive-schema.sql` en Supabase Dashboard → SQL Editor.
2. Variables de entorno en Vercel:
   - `ECODRIVE_META_VERIFY_TOKEN` (elegir aleatorio, ej. `eco_verify_a8f3k9x2`)
   - `ECODRIVE_META_ACCESS_TOKEN` (de Meta Business → System User → Access Token, scopes whatsapp_business_messaging + whatsapp_business_management)
   - `ECODRIVE_META_PHONE_ID` = `1044803088721236`
3. Meta Business → WhatsApp Manager → Configuración → Webhooks:
   - URL: `https://ecodriveplus.com/api/whatsapp/eco`
   - Verify token: el de paso 2
   - Suscribirse a `messages`
4. Probar enviando un WhatsApp al `+51 994810242`.

### A construir (código):
- [ ] Tabla `ecodrive_waitlist` con campo `interested_role` (passenger/driver), `phone`, `notes`.
- [ ] Tool `apuntar_lista_espera` para que el agent registre interesados.
- [ ] Plantilla aprobada en Meta para mensaje proactivo "EcoDrive+ está listo para ti, regresa al chat para empezar".

## Fase 2 — Onboarding chofer (semana 2)
- [ ] Tool `iniciar_registro_chofer` (pide DNI, RUC opcional, vehículo, placa, fotos)
- [ ] Tool `validar_dni_reniec` (consulta convenio RENIEC pendiente firma)
- [ ] Tool `aprobar_chofer` (admin via panel web)
- [ ] Plantillas WA: "Tu DNI fue verificado", "Documentos rechazados, te explicamos por qué"
- [ ] Importar legacy: 88 conductores → `ecodrive_drivers` con `legacy_imported=true`, status=`pending` hasta re-verificación.

## Fase 3 — Onboarding pasajero (semana 2)
- [ ] Tool `registrar_pasajero` (nombre, contacto emergencia opcional, modo preferido)
- [ ] Tool `aplicar_bono_inicial` (S/ 5 al wallet en primer viaje)
- [ ] Importar legacy: 231 clientes → `ecodrive_passengers` con `legacy_imported=true`, bono S/5 reservado.

## Fase 4 — Solicitud + matching (semana 3-4)
**Flujo pasajero:**
1. Usuario manda "Quiero un viaje"
2. Eco: "Comparte tu ubicación 📎"
3. Usuario comparte ubicación (Meta location msg)
4. Eco: "¿A dónde vamos?" → detectar destino (texto o location)
5. Eco: "¿Modo? Regular / Mujer / Familia / Mascotas / Abuelo"
6. Eco crea `ecodrive_trip_request` y notifica a choferes cercanos
7. Eco a pasajero: "Buscando 3 choferes... 90 segundos"
8. Recibe ofertas → muestra al pasajero opciones
9. Pasajero acepta → confirma viaje

**Flujo chofer:**
1. Chofer marca "Estoy en línea" → `online=true`, comparte ubicación
2. Cuando hay request cercano, recibe push: "Viaje S/8 a 4km, ¿ofertas? Responde con tu precio"
3. Chofer manda S/7 → crea offer
4. Si pasajero acepta, recibe "VIAJE ASIGNADO. Pasajero: Juan, T.: Plaza Mayor → Av. España"

**Tools necesarias:**
- [ ] `recibir_ubicacion_pasajero`
- [ ] `set_destino`
- [ ] `crear_solicitud_viaje`
- [ ] `notificar_choferes_cercanos` (radio dinámico, max 5)
- [ ] `crear_oferta`
- [ ] `aceptar_oferta`
- [ ] `chofer_set_online`
- [ ] `chofer_set_ubicacion`

**Geo:** PostGIS en Supabase para queries de proximidad. Habilitar extension.

## Fase 5 — Viaje en curso (semana 4-5)
- [ ] Tool `iniciar_viaje` (chofer marca "ya recogí al pasajero")
- [ ] Tool `cancelar_viaje` (con razón)
- [ ] Tool `terminar_viaje` (cobra del wallet, debita comisión, da cashback 2%)
- [ ] Plantilla "Tu chofer llegó: [nombre] [vehículo] [placa]"
- [ ] Plantilla "Viaje en curso, llegada estimada [eta]"
- [ ] Plantilla "Viaje completado. Total S/X. ¡Califica!"

## Fase 6 — Wallet + Yape (semana 5)
- [ ] Tool `recargar_wallet_yape` (registra pago pendiente, espera comprobante imagen)
- [ ] Tool `procesar_comprobante_yape` (Claude vision → match con monto/operación)
- [ ] Tool `retirar_yape_chofer` (chofer pide retirar saldo, admin aprueba)
- [ ] Cron diario: liquidación, retiros pendientes, alertas.

## Fase 7 — Calificaciones + safety (semana 6)
- [ ] Tool `calificar_chofer` (post-viaje)
- [ ] Tool `calificar_pasajero` (post-viaje)
- [ ] Tool `reportar_incidente` (genera ticket, notifica admin)
- [ ] SOS: comando "SOS" o "EMERGENCIA" → notifica contacto emergencia + admin

## Fase 8 — Modos especiales (semana 6-7)
- [ ] `mujer`: filtra solo choferas (campo `gender` en drivers)
- [ ] `familia`: filtra `vehicle_type=auto AND seats>=7`
- [ ] `mascotas`: filtra drivers con flag `accepts_pets=true`
- [ ] `abuelo`: chofer llama al pasajero antes de llegar (instrucción en notif)
- [ ] `empresa`: aplica descuento 5%, exige RUC, genera factura mensual

## Fase 9 — Marketing legacy + lanzamiento (semana 7-8)
- [ ] Mensaje masivo a 88 conductores legacy (plantilla aprobada)
- [ ] Mensaje masivo a 231 clientes legacy con bono S/5
- [ ] Cron diario: métricas, dashboard admin
- [ ] Plan prensa Trujillo

---

## Decisiones pendientes (Percy)

1. **Modelo Geo:** ¿PostGIS en Supabase o servicio aparte (Mapbox Matrix API para distancias)?
2. **Comisión:** confirmado 6.3% — pero ¿se debita pre-viaje (escrow) o post-viaje?
3. **Cancelaciones:** ¿costo si pasajero cancela después de aceptar oferta? Sugerencia: S/1 por cancelación pasajero, sin costo chofer si justifica.
4. **Tarifa zonas peligrosas:** memoria menciona +10% — ¿cuáles zonas en Trujillo? Lista o algoritmo (scraping noticias)?
5. **Onboarding chofer fotos:** ¿una sola sesión o asíncrona (sube DNI hoy, vehículo mañana)?
6. **Plan prensa pre-lanzamiento:** sí/no esta semana mientras MVP está en conversacional.

---

## Stack técnico actual (referencia)
- Frontend / API: Next.js 16 (App Router) + React 19 + Tailwind 4
- Backend: Vercel Fluid Compute (no edge)
- DB: Supabase Postgres + RLS
- LLM: Claude Sonnet 4.6 (conversacional) + Opus 4.7 (decisiones complejas)
- WhatsApp: Meta Cloud API directa, Phone ID `1044803088721236`, número `+51 994810242`
- Storage: Cloudflare R2 (planeado para fotos DNI/comprobantes)

## Archivos clave
- `proxy.ts` — routing de dominios (ecodriveplus.com → /ecodriveplus)
- `app/ecodriveplus/page.tsx` — landing B2C
- `app/api/whatsapp/eco/route.ts` — webhook
- `lib/ecodrive/agent.ts` — Claude conversacional
- `lib/ecodrive/wa-send.ts` — envío Meta Cloud
- `lib/ecodrive/db.ts` — Supabase queries
- `supabase/ecodrive-schema.sql` — schema MVP
