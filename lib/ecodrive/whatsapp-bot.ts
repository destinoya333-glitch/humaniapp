/**
 * Bot conversacional EcoDrive+ para "pedir viaje" tipo inDrive.
 * State machine basado en eco_viaje_drafts.
 * Usa location_request_message + interactive buttons nativos de WhatsApp Cloud.
 */
import { createClient } from "@supabase/supabase-js";

const GRAPH = "https://graph.facebook.com/v22.0";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function meta() {
  return {
    phoneId: process.env.ECODRIVE_META_PHONE_ID!,
    token: process.env.ECODRIVE_META_ACCESS_TOKEN!,
  };
}

async function send(payload: Record<string, unknown>): Promise<void> {
  const { phoneId, token } = meta();
  try {
    const r = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("[wa send fail]", r.status, t.slice(0, 300));
    }
  } catch (e) {
    console.error("[wa send err]", e);
  }
}

async function sendText(to: string, body: string): Promise<void> {
  await send({ messaging_product: "whatsapp", to, type: "text", text: { body } });
}

async function sendLocationRequest(to: string, body: string): Promise<void> {
  await send({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "location_request_message",
      body: { text: body },
      action: { name: "send_location" },
    },
  });
}

async function sendConfirmButtons(
  to: string,
  origenDir: string,
  destinoDir: string,
  km: number,
  min: number,
  tarifa: number
): Promise<void> {
  await send({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          `Tu viaje:\n\n` +
          `Sales de: ${origenDir}\n` +
          `Vas a: ${destinoDir}\n` +
          `Distancia: ${km} km · ${min} min\n\n` +
          `Tarifa: S/ ${tarifa.toFixed(2)}\n\n` +
          `¿Solicitamos chofer?`,
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "viaje_solicitar", title: "Si, solicitar" } },
          { type: "reply", reply: { id: "viaje_cancelar", title: "Cancelar" } },
        ],
      },
    },
  });
}

// Haversine (km)
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 10) / 10;
}

function computeFare(km: number): number {
  return Math.max(4, Math.round((4 + km * 1.2) * 2) / 2);
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return `${lat},${lng}`;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${lat},${lng}&language=es&region=pe&key=${key}`;
    const r = await fetch(url, { cache: "no-store" });
    const j = (await r.json()) as { results?: Array<{ formatted_address?: string }> };
    return j.results?.[0]?.formatted_address?.split(",").slice(0, 2).join(",") || `${lat},${lng}`;
  } catch {
    return `${lat},${lng}`;
  }
}

async function googleDistanceDriving(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number
): Promise<{ km: number; min: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${oLat},${oLng}&destinations=${dLat},${dLng}` +
      `&mode=driving&language=es&region=pe&key=${key}`;
    const r = await fetch(url, { cache: "no-store" });
    const j = (await r.json()) as {
      rows?: Array<{ elements?: Array<{ status?: string; distance?: { value?: number }; duration?: { value?: number } }> }>;
    };
    const el = j.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") return null;
    return {
      km: Math.round(((el.distance?.value || 0) / 1000) * 10) / 10,
      min: Math.max(1, Math.round((el.duration?.value || 0) / 60)),
    };
  } catch {
    return null;
  }
}

async function getDraft(waId: string) {
  const sb = db();
  const { data } = await sb
    .from("eco_viaje_drafts")
    .select("*")
    .eq("wa_id", waId)
    .maybeSingle();
  if (!data) return null;
  if (new Date((data as { expires_at: string }).expires_at).getTime() < Date.now()) {
    await sb.from("eco_viaje_drafts").delete().eq("wa_id", waId);
    return null;
  }
  return data as {
    wa_id: string;
    step: string;
    origen_lat: number | null;
    origen_lng: number | null;
    origen_direccion: string | null;
    destino_lat: number | null;
    destino_lng: number | null;
    destino_direccion: string | null;
    distancia_km: number | null;
    duracion_min: number | null;
    tarifa_estimada: number | null;
  };
}

async function setDraft(waId: string, patch: Record<string, unknown>): Promise<void> {
  const sb = db();
  await sb.from("eco_viaje_drafts").upsert(
    {
      wa_id: waId,
      ...patch,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    },
    { onConflict: "wa_id" }
  );
}

async function deleteDraft(waId: string): Promise<void> {
  await db().from("eco_viaje_drafts").delete().eq("wa_id", waId);
}

async function buscarYNotificarChofer(
  viajeId: string,
  origenDir: string,
  destinoDir: string,
  km: number,
  tarifa: number,
  pasajeroNombre: string
): Promise<{ ok: boolean }> {
  const sb = db();
  const { data: choferes } = await sb
    .from("eco_choferes")
    .select("id,wa_id,nombre")
    .eq("status", "approved")
    .limit(20);

  if (!choferes || choferes.length === 0) {
    await sb.from("eco_viajes").update({ estado: "rechazado_global" }).eq("id", viajeId);
    return { ok: false };
  }

  const elegido = choferes[Math.floor(Math.random() * choferes.length)] as {
    id: string;
    wa_id: string;
  };

  const { phoneId, token } = meta();
  await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: elegido.wa_id,
      type: "template",
      template: {
        name: "eco_chofer_nuevo_viaje",
        language: { code: "es" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: pasajeroNombre.split(" ")[0] || "pasajero" },
              { type: "text", text: origenDir.slice(0, 60) },
              { type: "text", text: destinoDir.slice(0, 60) },
              { type: "text", text: `${km}` },
              { type: "text", text: `${tarifa}` },
            ],
          },
          {
            type: "button",
            sub_type: "flow",
            index: "0",
            parameters: [
              {
                type: "action",
                action: { flow_token: `ecodrive:aceptar-viaje:${viajeId}` },
              },
            ],
          },
        ],
      },
    }),
  });

  await sb
    .from("eco_viajes")
    .update({ estado: "buscando", intentos_choferes: [elegido.id] })
    .eq("id", viajeId);

  return { ok: true };
}

// ========== Handler principal ==========
export async function handleIncoming(message: {
  from: string;
  type: string;
  text?: { body?: string };
  location?: { latitude?: number; longitude?: number; address?: string; name?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
  };
}): Promise<void> {
  const from = message.from;
  if (!from) return;
  const draft = await getDraft(from);

  // Texto
  if (message.type === "text") {
    const text = (message.text?.body || "").toLowerCase().trim();

    if (/(viaje|taxi|necesito|carro|llevame|manejame|ride|trasladame)/.test(text)) {
      await deleteDraft(from); // resetear cualquier draft previo
      await setDraft(from, { step: "esperando_origen" });
      await sendLocationRequest(from, "🚖 Pidamos tu viaje.\n\nPrimero comparte tu *ubicacion actual* (de donde sales).");
      return;
    }

    if (text === "cancelar" || text === "cancel") {
      if (draft) {
        await deleteDraft(from);
        await sendText(from, "Listo, cancelado. Cuando quieras pedir taxi, escribe *viaje*.");
      }
      return;
    }

    // Fallback: mensaje libre sin contexto
    if (!draft || draft.step === "idle") {
      await sendText(
        from,
        "Hola. Para pedir un viaje, escribe *viaje* y te guio paso a paso."
      );
      return;
    }

    // Esperando origen pero mando texto en vez de location
    if (draft.step === "esperando_origen") {
      await sendLocationRequest(
        from,
        "Necesito tu *ubicacion* (no texto). Toca el boton de abajo para compartirla."
      );
      return;
    }
    if (draft.step === "esperando_destino") {
      await sendLocationRequest(
        from,
        "Necesito el *destino* como ubicacion. Toca el boton de abajo y elige el lugar."
      );
      return;
    }
    return;
  }

  // Ubicacion compartida
  if (message.type === "location" && message.location) {
    const lat = message.location.latitude!;
    const lng = message.location.longitude!;
    const dir =
      message.location.address ||
      message.location.name ||
      (await reverseGeocode(lat, lng));

    if (!draft || draft.step === "idle") {
      await sendText(
        from,
        "Recibi tu ubicacion. Si quieres pedir un viaje desde aqui, escribe *viaje*."
      );
      return;
    }

    if (draft.step === "esperando_origen") {
      await setDraft(from, {
        step: "esperando_destino",
        origen_lat: lat,
        origen_lng: lng,
        origen_direccion: dir,
      });
      await sendLocationRequest(
        from,
        `Origen guardado: ${dir}\n\nAhora comparte el *destino*.`
      );
      return;
    }

    if (draft.step === "esperando_destino" && draft.origen_lat && draft.origen_lng) {
      // Calcular distancia + tarifa
      const dm = await googleDistanceDriving(draft.origen_lat, draft.origen_lng, lat, lng);
      const km = dm?.km ?? distanceKm(draft.origen_lat, draft.origen_lng, lat, lng);
      const min = dm?.min ?? Math.max(5, Math.round(km * 3));
      const tarifa = computeFare(km);

      await setDraft(from, {
        step: "confirmando",
        destino_lat: lat,
        destino_lng: lng,
        destino_direccion: dir,
        distancia_km: km,
        duracion_min: min,
        tarifa_estimada: tarifa,
      });
      await sendConfirmButtons(from, draft.origen_direccion || "?", dir, km, min, tarifa);
      return;
    }
    return;
  }

  // Botones interactivos
  if (message.type === "interactive" && message.interactive?.button_reply) {
    const id = message.interactive.button_reply.id;
    if (!draft) return;

    if (id === "viaje_cancelar") {
      await deleteDraft(from);
      await sendText(from, "Listo, viaje cancelado.");
      return;
    }

    if (
      id === "viaje_solicitar" &&
      draft.step === "confirmando" &&
      draft.origen_lat &&
      draft.destino_lat
    ) {
      // Lookup pasajero
      const sb = db();
      const { data: pas } = await sb
        .from("eco_pasajeros")
        .select("id,nombre,status")
        .eq("wa_id", from)
        .maybeSingle();
      const p = pas as { id: string; nombre: string; status: string } | null;

      if (!p || p.status !== "approved") {
        await sendText(
          from,
          "Para pedir viajes necesitas inscribirte primero.\n\nVisita activosya.com/se-pasajero-eco o pidenos el formulario por aqui."
        );
        await deleteDraft(from);
        return;
      }

      // Crear viaje
      const { data: viaje } = await sb
        .from("eco_viajes")
        .insert({
          pasajero_wa_id: from,
          pasajero_id: p.id,
          origen_direccion: draft.origen_direccion,
          origen_lat: draft.origen_lat,
          origen_lng: draft.origen_lng,
          destino_direccion: draft.destino_direccion,
          destino_lat: draft.destino_lat,
          destino_lng: draft.destino_lng,
          distancia_km: draft.distancia_km,
          duracion_min: draft.duracion_min,
          tarifa_estimada: draft.tarifa_estimada,
          estado: "solicitado",
        })
        .select("id")
        .single();

      const viajeId = (viaje as { id: string } | null)?.id || "";
      await deleteDraft(from);

      const result = await buscarYNotificarChofer(
        viajeId,
        draft.origen_direccion || "?",
        draft.destino_direccion || "?",
        draft.distancia_km || 0,
        draft.tarifa_estimada || 0,
        p.nombre
      );

      if (result.ok) {
        await sendText(
          from,
          "🚖 Buscando chofer cercano...\n\nTe avisamos por aqui apenas alguien acepte. Suele tomar menos de 2 minutos."
        );
      } else {
        await sendText(
          from,
          "No hay choferes disponibles ahora. Intenta de nuevo en unos minutos."
        );
      }
      return;
    }
  }
}
