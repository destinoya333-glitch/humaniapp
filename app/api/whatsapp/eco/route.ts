/**
 * Webhook WhatsApp Cloud API para EcoDrive+ - bot conversacional con state machine.
 *
 * Verify token: ECODRIVE_META_VERIFY_TOKEN
 * Lee/escribe nuevo schema: eco_pasajeros, eco_choferes, eco_pedir_viaje_tokens
 *
 * Lógica:
 *  - "hola" o primera vez -> menu interactivo "Soy pasajero / Soy chofer"
 *  - Boton "soy_pasajero" -> manda template inscripcion pasajero
 *  - Boton "soy_chofer"   -> manda template inscripcion chofer
 *  - Boton "pedir_viaje"  -> genera token + manda template URL picker (si pasajero approved)
 *  - Boton "estoy_en_linea" -> activa en_turno + manda link tracker GPS (si chofer approved)
 *  - "viaje" / "necesito taxi" -> idem pedir_viaje
 *  - "en linea" / "online" -> idem estoy_en_linea
 *  - Cualquier otra cosa -> respuesta default con menu
 */
import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { issueChoferTrackerToken } from "@/lib/ecodrive/tracker-token";
import { findNearestChofer } from "@/lib/ecodrive/matching";
void findNearestChofer; // reservado para futura mejora del bot conversacional

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

async function transcribeAudio(mediaId: string): Promise<string | null> {
  const metaToken = process.env.ECODRIVE_META_ACCESS_TOKEN;
  const groqKey = process.env.GROQ_API_KEY;
  if (!metaToken || !groqKey) return null;
  try {
    // 1. Pedir URL del media a Meta
    const metaInfo = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${metaToken}` },
    });
    if (!metaInfo.ok) return null;
    const info = (await metaInfo.json()) as { url?: string; mime_type?: string };
    if (!info.url) return null;

    // 2. Descargar el audio (con mismo bearer)
    const audioResp = await fetch(info.url, {
      headers: { Authorization: `Bearer ${metaToken}` },
    });
    if (!audioResp.ok) return null;
    const buf = Buffer.from(await audioResp.arrayBuffer());

    // 3. Transcribir con Groq Whisper
    const fd = new FormData();
    const blob = new Blob([new Uint8Array(buf)], { type: info.mime_type || "audio/ogg" });
    fd.append("file", blob, "voice.ogg");
    fd.append("model", process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo");
    fd.append("language", "es");
    fd.append("response_format", "json");

    const trans = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}` },
      body: fd,
    });
    if (!trans.ok) return null;
    const j = (await trans.json()) as { text?: string };
    return (j.text || "").trim() || null;
  } catch (e) {
    console.error("[eco-bot transcribe err]", e);
    return null;
  }
}

async function send(payload: Record<string, unknown>): Promise<void> {
  const { phoneId, token } = meta();
  if (!phoneId || !token) return;
  try {
    const r = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("[eco-bot send fail]", r.status, t.slice(0, 300));
    }
  } catch (e) {
    console.error("[eco-bot send err]", e);
  }
}

async function sendText(to: string, body: string): Promise<void> {
  await send({ messaging_product: "whatsapp", to, type: "text", text: { body } });
}

async function sendMenuPrincipal(to: string, nombre: string | null): Promise<void> {
  const saludo = nombre ? `Hola ${nombre.split(" ")[0]}` : "Hola";
  await send({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: `${saludo}, bienvenido a EcoDrive+ 🚖\n\n¿Qué necesitas?` },
      action: {
        buttons: [
          { type: "reply", reply: { id: "soy_pasajero", title: "Pedir un viaje" } },
          { type: "reply", reply: { id: "soy_chofer", title: "Quiero ser chofer" } },
          { type: "reply", reply: { id: "ayuda", title: "Ayuda" } },
        ],
      },
    },
  });
}

type RoleRow = { id: string; nombre: string; status: string } | null;

async function lookupPasajero(waId: string): Promise<{ approved: RoleRow; pending: RoleRow }> {
  const sb = db();
  const { data } = await sb
    .from("eco_pasajeros")
    .select("id, nombre, status")
    .eq("wa_id", waId)
    .order("created_at", { ascending: false });
  const list = (data || []) as Array<{ id: string; nombre: string; status: string }>;
  return {
    approved: list.find((r) => r.status === "approved") || null,
    pending: list.find((r) => r.status === "pending") || null,
  };
}

async function lookupChofer(waId: string): Promise<{ approved: RoleRow; pending: RoleRow }> {
  const sb = db();
  const { data } = await sb
    .from("eco_choferes")
    .select("id, nombre, status")
    .eq("wa_id", waId)
    .order("created_at", { ascending: false });
  const list = (data || []) as Array<{ id: string; nombre: string; status: string }>;
  return {
    approved: list.find((r) => r.status === "approved") || null,
    pending: list.find((r) => r.status === "pending") || null,
  };
}

async function mandarInvitePasajero(waId: string): Promise<void> {
  await send({
    messaging_product: "whatsapp",
    to: waId,
    type: "template",
    template: {
      name: "eco_pasajero_invite",
      language: { code: "es" },
      components: [
        {
          type: "button",
          sub_type: "flow",
          index: "0",
          parameters: [
            {
              type: "action",
              action: { flow_token: `ecodrive:inscripcion-pasajero:${waId}` },
            },
          ],
        },
      ],
    },
  });
}

async function mandarInviteChofer(waId: string): Promise<void> {
  await send({
    messaging_product: "whatsapp",
    to: waId,
    type: "template",
    template: {
      name: "eco_chofer_invite",
      language: { code: "es" },
      components: [
        {
          type: "button",
          sub_type: "flow",
          index: "0",
          parameters: [
            {
              type: "action",
              action: { flow_token: `ecodrive:inscripcion-chofer:${waId}` },
            },
          ],
        },
      ],
    },
  });
}

async function mandarPickerViaje(waId: string, pasajeroId: string): Promise<void> {
  const sb = db();
  const { data: tokenRow } = await sb
    .from("eco_pedir_viaje_tokens")
    .insert({ wa_id: waId, pasajero_id: pasajeroId })
    .select("token")
    .single();
  const token = (tokenRow as { token: string } | null)?.token;
  if (!token) {
    await sendText(waId, "No pude generar tu link. Intenta de nuevo en un momento.");
    return;
  }
  await send({
    messaging_product: "whatsapp",
    to: waId,
    type: "template",
    template: {
      name: "eco_pedir_viaje_url",
      language: { code: "es" },
      components: [
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: token }],
        },
      ],
    },
  });
}

async function activarEnLinea(waId: string, choferId: string): Promise<void> {
  const sb = db();
  await sb
    .from("eco_choferes")
    .update({ en_turno: true, updated_at: new Date().toISOString() })
    .eq("id", choferId);

  const trackerToken = issueChoferTrackerToken(choferId);
  const url = `https://ecodriveplus.com/track-chofer/${trackerToken}`;
  await sendText(
    waId,
    `🟢 Estás EN LÍNEA.\n\n` +
      `Abre tu GPS para recibir viajes:\n${url}\n\n` +
      `Cuando llegue un viaje cerca, sonará una alarma. Para salir, escribe *fuera de linea*.`
  );
}

async function ponerFueraDeLinea(waId: string, choferId: string): Promise<void> {
  const sb = db();
  await sb
    .from("eco_choferes")
    .update({ en_turno: false, updated_at: new Date().toISOString() })
    .eq("id", choferId);
  await sendText(waId, "🔴 Estás fuera de línea. No recibirás más viajes hasta que vuelvas a entrar.");
}

// =============== Handler de un mensaje individual ===============
async function handleMessage(m: {
  from: string;
  type: string;
  text?: { body?: string };
  audio?: { id?: string; mime_type?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
}): Promise<void> {
  const from = m.from;
  if (!from) return;

  // Lookup roles (approved + pending)
  const [pas, chof] = await Promise.all([lookupPasajero(from), lookupChofer(from)]);
  const pasajero = pas.approved;
  const chofer = chof.approved;

  // Imagen sin contexto (típicamente foto que mandan después del flow o por error)
  if (m.type === "image") {
    if (pasajero || chofer) {
      await sendText(
        from,
        "Recibi tu foto, gracias.\n\nSi querias hacer algo, escribe *menu* para ver opciones, o *viaje* para pedir un taxi."
      );
    } else if (pas.pending || chof.pending) {
      await sendText(
        from,
        "Recibi tu foto. Tu inscripcion esta en revision manual, te avisamos por aqui en menos de 24h."
      );
    } else {
      await sendText(
        from,
        "Recibi tu foto pero todavia no estas inscrito. Escribe *menu* para empezar."
      );
    }
    return;
  }

  // Ubicación sin contexto
  if (m.type === "location") {
    if (pasajero) {
      await sendText(
        from,
        "Recibi tu ubicacion. Para pedir un viaje toca el boton *Pedir un viaje* del menu o escribe *viaje*."
      );
    } else {
      await sendText(from, "Recibi tu ubicacion. Escribe *menu* para ver tus opciones.");
    }
    return;
  }

  // Audio: transcribimos con Groq Whisper y procesamos como texto
  if (m.type === "audio" && m.audio?.id) {
    const transcript = await transcribeAudio(m.audio.id);
    if (!transcript) {
      await sendText(
        from,
        "No pude entender tu audio. Intenta de nuevo o escribe lo que necesitas."
      );
      return;
    }
    const t = transcript.toLowerCase();
    // Ampliamos detección de intent del audio con sinónimos peruanos
    const wantsViaje = /(viaje|taxi|carro|movilidad|movilizar|recoger|llevar|llevame|ll[eé]vame|trasladar|trasladame|tras[lá]dame|necesito|requiero|servicio|ride|uber|indrive|cabify|ir a|voy a|q?uiero ir|llev[eé]me|ll[ée]vame|necesit[oó])/i;
    if (wantsViaje.test(t)) {
      // Avisamos lo que entendimos + procesamos como "viaje"
      await sendText(from, `🎙️ Entendí: "${transcript.slice(0, 200)}"\n\nProcesando tu solicitud de viaje...`);
      await handleMessage({ from, type: "text", text: { body: "viaje" } });
      return;
    }
    if (/(chofer|conductor|manejar|inscribir|registrar)/i.test(t)) {
      await sendText(from, `🎙️ Entendí: "${transcript.slice(0, 200)}"`);
      await handleMessage({ from, type: "text", text: { body: "quiero ser chofer" } });
      return;
    }
    if (/(en linea|estoy disponible|disponible|listo|prendo|conectar|prender)/i.test(t)) {
      await sendText(from, `🎙️ Entendí: "${transcript.slice(0, 200)}"`);
      await handleMessage({ from, type: "text", text: { body: "en linea" } });
      return;
    }
    // No detectamos intent claro: mostrar transcripción + sugerir
    await sendText(
      from,
      `🎙️ Te oí decir:\n"${transcript.slice(0, 200)}"\n\n` +
        `No estoy seguro qué necesitas. Si quieres pedir un taxi escribe *viaje* o toca el botón abajo.`
    );
    await sendMenuPrincipal(from, pasajero?.nombre || chofer?.nombre || null);
    return;
  }

  // Texto
  if (m.type === "text") {
    const text = (m.text?.body || "").toLowerCase().trim();

    if (
      /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hi|hey|menu|inicio)/.test(text)
    ) {
      await sendMenuPrincipal(from, pasajero?.nombre || chofer?.nombre || null);
      return;
    }

    if (/(viaje|taxi|necesito|carro|llevame|trasladame|pedir)/.test(text)) {
      if (pasajero) {
        await mandarPickerViaje(from, pasajero.id);
      } else if (pas.pending) {
        await sendText(
          from,
          `${pas.pending.nombre.split(" ")[0]}, tu inscripcion esta en revision manual. Te avisamos por aqui en menos de 24h apenas estes activo.`
        );
      } else {
        await sendText(
          from,
          "Para pedir un viaje primero necesitas inscribirte como pasajero (toma 30 segundos)."
        );
        await mandarInvitePasajero(from);
      }
      return;
    }

    if (/(quiero ser chofer|inscribirme.*chofer|registrar.*chofer|ser chofer)/.test(text)) {
      if (chofer) {
        await sendText(from, `Ya eres chofer aprobado en EcoDrive+, ${chofer.nombre.split(" ")[0]}.`);
      } else if (chof.pending) {
        await sendText(
          from,
          `${chof.pending.nombre.split(" ")[0]}, tu inscripcion como chofer esta en revision manual. Te avisamos por aqui en menos de 24h.`
        );
      } else {
        await mandarInviteChofer(from);
      }
      return;
    }

    if (/(en linea|online|estoy disponible|prendo|conectar)/.test(text)) {
      if (chofer) {
        await activarEnLinea(from, chofer.id);
      } else {
        await sendText(from, "Solo los choferes aprobados pueden ponerse en línea.");
      }
      return;
    }

    if (/(fuera de linea|offline|apagar|desconectar)/.test(text)) {
      if (chofer) {
        await ponerFueraDeLinea(from, chofer.id);
      } else {
        await sendText(from, "No estás registrado como chofer.");
      }
      return;
    }

    if (/(mi estado|status|estatus|mi cuenta)/.test(text)) {
      const lines: string[] = ["📋 *Tu estado en EcoDrive+*"];
      if (pasajero) lines.push(`✅ Pasajero aprobado: ${pasajero.nombre}`);
      else if (pas.pending) lines.push(`⏳ Pasajero pendiente revision: ${pas.pending.nombre}`);
      else lines.push("❌ No estas inscrito como pasajero");
      if (chofer) lines.push(`✅ Chofer aprobado: ${chofer.nombre}`);
      else if (chof.pending) lines.push(`⏳ Chofer pendiente revision: ${chof.pending.nombre}`);
      else lines.push("❌ No estas inscrito como chofer");
      await sendText(from, lines.join("\n"));
      return;
    }

    // Default
    await sendMenuPrincipal(from, pasajero?.nombre || chofer?.nombre || null);
    return;
  }

  // Interactive (botones)
  if (m.type === "interactive" && m.interactive?.button_reply) {
    const id = m.interactive.button_reply.id;

    if (id === "soy_pasajero") {
      if (pasajero) {
        await mandarPickerViaje(from, pasajero.id);
      } else if (pas.pending) {
        await sendText(
          from,
          `${pas.pending.nombre.split(" ")[0]}, tu inscripcion como pasajero esta en revision manual. Te avisamos por aqui apenas estes activo.`
        );
      } else {
        await mandarInvitePasajero(from);
      }
      return;
    }

    if (id === "soy_chofer") {
      if (chofer) {
        await sendText(
          from,
          `Ya eres chofer aprobado, ${chofer.nombre.split(" ")[0]}. Escribe *en linea* para empezar a recibir viajes.`
        );
      } else if (chof.pending) {
        await sendText(
          from,
          `${chof.pending.nombre.split(" ")[0]}, tu inscripcion como chofer esta en revision manual. Te avisamos por aqui apenas estes activo.`
        );
      } else {
        await mandarInviteChofer(from);
      }
      return;
    }

    if (id === "ayuda") {
      await sendText(
        from,
        "🚖 *EcoDrive+ ayuda*\n\n" +
          "Comandos:\n" +
          "• *viaje* — pedir un taxi\n" +
          "• *en linea* — chofer disponible\n" +
          "• *fuera de linea* — chofer ocupado/descansa\n" +
          "• *mi estado* — ver si estas aprobado\n" +
          "• *menu* — ver opciones"
      );
      return;
    }
  }
}

// =============== Webhook handlers ===============
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.ECODRIVE_META_VERIFY_TOKEN;
  if (mode === "subscribe" && token && expected && token === expected) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // ack rápido a Meta + procesar en background
  after(async () => {
    try {
      const p = payload as {
        entry?: Array<{
          changes?: Array<{
            value?: {
              messages?: Array<{
                from: string;
                type: string;
                text?: { body?: string };
                audio?: { id?: string; mime_type?: string };
                interactive?: {
                  button_reply?: { id?: string; title?: string };
                  list_reply?: { id?: string; title?: string };
                };
              }>;
            };
          }>;
        }>;
      };
      const messages: Array<{
        from: string;
        type: string;
        text?: { body?: string };
        audio?: { id?: string; mime_type?: string };
        interactive?: {
          button_reply?: { id?: string; title?: string };
          list_reply?: { id?: string; title?: string };
        };
      }> = [];
      for (const entry of p?.entry || []) {
        for (const change of entry.changes || []) {
          for (const msg of change.value?.messages || []) {
            messages.push(msg);
          }
        }
      }
      await Promise.all(
        messages.map(async (m) => {
          try {
            await handleMessage(m);
          } catch (e) {
            console.error("[eco-bot handle err]", e);
          }
        })
      );
    } catch (err) {
      console.error("[eco-bot webhook err]", err);
    }
  });

  return NextResponse.json({ ok: true });
}
