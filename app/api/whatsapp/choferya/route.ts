/**
 * Webhook WhatsApp Cloud API para TuChoferYa — bot conversacional Sprint TC-7.
 *
 * Verify token: META_CHOFERYA_VERIFY_TOKEN
 * Phone ID:     META_CHOFERYA_PHONE_ID (cuando esté el chip)
 * Access token: META_CHOFERYA_ACCESS_TOKEN (System User token compartido)
 *
 * Personas:
 *  - Chofer TuChoferYa activo → agenda, panel, precios, horarios, qr
 *  - Chofer registrado en BD pero NO TuChoferYa → ofrecer suscripcion
 *  - Pasajero con reservas activas → ver sus reservas
 *  - Persona random → menu: buscar chofer / inscribirme como chofer
 *
 * Comandos texto:
 *  - hola/menu/inicio → menu principal
 *  - STOP/EMPEZAR → opt-out / opt-in de marketing (helper compartido)
 *  - chofer/buscar/taxi → link al directorio
 *  - agenda/mis reservas → reservas
 *  - precios/tarifas → editor precios
 *  - horarios → editor horarios
 *  - mi link/mi pagina/mi enlace → URL publica del chofer
 *  - panel/dashboard → link al panel del chofer
 *  - qr → tarjeta QR descargable
 *  - inscribirme/quiero ser chofer → link a /se-choferya
 *  - ayuda/help → lista de comandos
 */
import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { issueChoferPanelToken } from "@/lib/activosya/choferya-token";
import {
  isStopCommand,
  isStartCommand,
  markOptOut,
  clearOptOut,
  OPT_OUT_REPLY,
  OPT_IN_REPLY,
} from "@/lib/marketing/opt-out";

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
    phoneId: process.env.META_CHOFERYA_PHONE_ID || process.env.ECODRIVE_META_PHONE_ID!,
    token: process.env.META_CHOFERYA_ACCESS_TOKEN || process.env.ECODRIVE_META_ACCESS_TOKEN!,
  };
}

async function transcribeAudio(mediaId: string): Promise<string | null> {
  const { token } = meta();
  const groqKey = process.env.GROQ_API_KEY;
  if (!token || !groqKey) return null;
  try {
    const metaInfo = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaInfo.ok) return null;
    const info = (await metaInfo.json()) as { url?: string; mime_type?: string };
    if (!info.url) return null;
    const audioResp = await fetch(info.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!audioResp.ok) return null;
    const buf = Buffer.from(await audioResp.arrayBuffer());
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
    console.error("[choferya-bot transcribe err]", e);
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
      console.error("[choferya-bot send fail]", r.status, t.slice(0, 300));
    }
  } catch (e) {
    console.error("[choferya-bot send err]", e);
  }
}

async function sendText(to: string, body: string): Promise<void> {
  await send({ messaging_product: "whatsapp", to, type: "text", text: { body } });
}

// ─── Lookups ───────────────────────────────────────────────────────────────

type ChoferRow = {
  id: string;
  nombre: string;
  status: string;
  choferya_active: boolean | null;
  choferya_slug: string | null;
  choferya_plan: string | null;
  choferya_subscription_until: string | null;
  yape_celular: string | null;
};

type PasajeroRow = { id: string; nombre: string; status: string };

async function lookupChofer(waId: string): Promise<ChoferRow | null> {
  const sb = db();
  const { data } = await sb
    .from("eco_choferes")
    .select(
      "id, nombre, status, choferya_active, choferya_slug, choferya_plan, choferya_subscription_until, yape_celular"
    )
    .eq("wa_id", waId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ChoferRow) || null;
}

async function lookupPasajero(waId: string): Promise<PasajeroRow | null> {
  const sb = db();
  const { data } = await sb
    .from("eco_pasajeros")
    .select("id, nombre, status")
    .eq("wa_id", waId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as PasajeroRow) || null;
}

async function lookupReservasPasajero(waId: string) {
  const sb = db();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from("choferya_reservas")
    .select(
      "id, fecha_viaje, hora_viaje, estado, precio_pen, origen_direccion, destino_direccion, chofer_id"
    )
    .eq("pasajero_wa_id", waId)
    .in("estado", ["pendiente", "confirmada", "en_curso"])
    .gte("fecha_viaje", today)
    .order("fecha_viaje")
    .order("hora_viaje")
    .limit(5);
  return data || [];
}

async function lookupProximasReservasChofer(choferId: string) {
  const sb = db();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from("choferya_reservas")
    .select(
      "id, pasajero_nombre, pasajero_wa_id, fecha_viaje, hora_viaje, estado, precio_pen, origen_direccion, destino_direccion"
    )
    .eq("chofer_id", choferId)
    .in("estado", ["pendiente", "confirmada", "en_curso"])
    .gte("fecha_viaje", today)
    .order("fecha_viaje")
    .order("hora_viaje")
    .limit(5);
  return data || [];
}

// ─── Menus ─────────────────────────────────────────────────────────────────

async function sendMenuPrincipal(to: string, nombre: string | null): Promise<void> {
  const saludo = nombre ? `Hola ${nombre.split(" ")[0]}` : "Hola";
  await send({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `${saludo}, bienvenido a TuChoferYa 🚖\n\n¿Qué necesitas?`,
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "chy_buscar", title: "Buscar chofer" } },
          { type: "reply", reply: { id: "chy_inscribirme", title: "Soy chofer" } },
          { type: "reply", reply: { id: "chy_ayuda", title: "Ayuda" } },
        ],
      },
    },
  });
}

async function sendMenuChoferActivo(to: string, nombre: string, slug: string): Promise<void> {
  await send({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          `Hola ${nombre.split(" ")[0]} 🚖\n\n` +
          `Tu página: chofer.activosya.com/c/${slug}\n\n` +
          `¿Qué deseas hacer?`,
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "chy_agenda", title: "Mi agenda" } },
          { type: "reply", reply: { id: "chy_panel", title: "Mi panel" } },
          { type: "reply", reply: { id: "chy_ayuda_chofer", title: "Ayuda" } },
        ],
      },
    },
  });
}

// ─── Acciones especificas ──────────────────────────────────────────────────

function panelUrl(choferId: string): string {
  const token = issueChoferPanelToken(choferId);
  return `https://mi.choferya.activosya.com/?token=${token}`;
}

function precioiUrl(choferId: string): string {
  const token = issueChoferPanelToken(choferId);
  return `https://mi.choferya.activosya.com/precios?token=${token}`;
}

function horariosUrl(choferId: string): string {
  const token = issueChoferPanelToken(choferId);
  return `https://mi.choferya.activosya.com/horarios?token=${token}`;
}

function agendaUrl(choferId: string): string {
  const token = issueChoferPanelToken(choferId);
  return `https://mi.choferya.activosya.com/agenda?token=${token}`;
}

async function enviarAgendaChofer(waId: string, chofer: ChoferRow): Promise<void> {
  const reservas = await lookupProximasReservasChofer(chofer.id);
  const lines: string[] = [`📋 *Próximas reservas, ${chofer.nombre.split(" ")[0]}*\n`];

  if (reservas.length === 0) {
    lines.push("No tienes reservas próximas.\n");
    lines.push("Comparte tu página `chofer.activosya.com/c/" + chofer.choferya_slug + "` o tu QR para empezar a recibir.");
  } else {
    for (const r of reservas) {
      const fecha = new Date(r.fecha_viaje).toLocaleDateString("es-PE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
      const estadoIcon = r.estado === "confirmada" ? "✅" : r.estado === "en_curso" ? "🚖" : "⏳";
      lines.push(`${estadoIcon} *${r.pasajero_nombre}*`);
      lines.push(`   ${fecha} · ${r.hora_viaje} · S/. ${r.precio_pen}`);
      if (r.destino_direccion) lines.push(`   → ${r.destino_direccion}`);
      lines.push(`   ${r.estado}`);
      lines.push("");
    }
    lines.push(`Detalle completo: ${agendaUrl(chofer.id)}`);
  }

  await sendText(waId, lines.join("\n"));
}

async function enviarMiLinkChofer(waId: string, chofer: ChoferRow): Promise<void> {
  if (!chofer.choferya_slug) {
    await sendText(waId, "Aún no tienes página configurada. Escribe *panel* para configurarla.");
    return;
  }
  await sendText(
    waId,
    `🔗 *Tu página pública:*\n\n` +
      `https://chofer.activosya.com/c/${chofer.choferya_slug}\n\n` +
      `Compártela con tus pasajeros frecuentes. Cuando reserven desde ahí te llega aviso aquí.`
  );
}

async function enviarReservasPasajero(waId: string): Promise<void> {
  const reservas = await lookupReservasPasajero(waId);
  if (reservas.length === 0) {
    await sendText(
      waId,
      "No tienes reservas próximas.\n\nPara reservar con un chofer:\n1) Busca en chofer.activosya.com\n2) Escanea el QR de tu chofer de confianza\n\nO escribe *menu*."
    );
    return;
  }

  const sb = db();
  const choferIds = [...new Set(reservas.map((r) => r.chofer_id))];
  const { data: choferes } = await sb
    .from("eco_choferes")
    .select("id, nombre, choferya_slug, wa_id, yape_celular")
    .in("id", choferIds);
  const cMap = new Map((choferes || []).map((c) => [c.id, c]));

  const lines: string[] = ["📋 *Tus reservas TuChoferYa*\n"];
  for (const r of reservas) {
    const c = cMap.get(r.chofer_id);
    const fecha = new Date(r.fecha_viaje).toLocaleDateString("es-PE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
    const estadoIcon = r.estado === "confirmada" ? "✅" : r.estado === "en_curso" ? "🚖" : "⏳";
    lines.push(`${estadoIcon} *${c?.nombre || "Chofer"}*`);
    lines.push(`   ${fecha} · ${r.hora_viaje} · S/. ${r.precio_pen}`);
    if (r.destino_direccion) lines.push(`   → ${r.destino_direccion}`);
    lines.push(`   ${r.estado}`);
    if (r.estado === "confirmada" && c?.wa_id) {
      lines.push(`   📞 wa.me/${c.wa_id.replace(/\D/g, "")}`);
    }
    lines.push("");
  }
  await sendText(waId, lines.join("\n"));
}

async function ayudaPasajero(waId: string): Promise<void> {
  await sendText(
    waId,
    "🚖 *TuChoferYa — ayuda*\n\n" +
      "Comandos:\n" +
      "• *chofer* — buscar chofer en tu zona\n" +
      "• *mis reservas* — ver tus reservas próximas\n" +
      "• *inscribirme* — soy chofer y quiero unirme\n" +
      "• *menu* — ver opciones\n\n" +
      "También: escanea el QR de un chofer que conozcas o ve a chofer.activosya.com"
  );
}

async function ayudaChofer(waId: string, chofer: ChoferRow): Promise<void> {
  await sendText(
    waId,
    `🚖 *TuChoferYa — ayuda chofer ${chofer.nombre.split(" ")[0]}*\n\n` +
      "Comandos:\n" +
      "• *agenda* — próximas reservas\n" +
      "• *panel* — abrir tu panel\n" +
      "• *precios* — editar tarifas planas\n" +
      "• *horarios* — editar disponibilidad\n" +
      "• *mi link* — tu página pública\n" +
      "• *menu* — ver opciones"
  );
}

// ─── Handle message principal ──────────────────────────────────────────────

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

  const [chofer, pasajero] = await Promise.all([lookupChofer(from), lookupPasajero(from)]);
  const isChoferActivo =
    chofer &&
    chofer.status === "approved" &&
    chofer.choferya_active === true &&
    chofer.choferya_subscription_until &&
    new Date(chofer.choferya_subscription_until) >= new Date();

  // ── Imagen / location sin contexto
  if (m.type === "image") {
    await sendText(
      from,
      "Recibí tu foto. Si querías hacer algo escribe *menu* para ver opciones."
    );
    return;
  }

  if (m.type === "location") {
    await sendText(
      from,
      "Recibí tu ubicación. En TuChoferYa la dirección de origen y destino las pones al reservar en chofer.activosya.com. Escribe *menu* para ver opciones."
    );
    return;
  }

  // ── Audio: transcribir y reprocesar
  if (m.type === "audio" && m.audio?.id) {
    const transcript = await transcribeAudio(m.audio.id);
    if (!transcript) {
      await sendText(from, "No pude entender tu audio. Intenta de nuevo o escribe lo que necesitas.");
      return;
    }
    const t = transcript.toLowerCase();
    if (/(chofer|conductor|taxi|reservar|necesito)/.test(t) && !isChoferActivo) {
      await sendText(from, `🎙️ Entendí: "${transcript.slice(0, 200)}"`);
      await handleMessage({ from, type: "text", text: { body: "buscar chofer" } });
      return;
    }
    if (/(agenda|reservas|mi viaje)/.test(t)) {
      await sendText(from, `🎙️ Entendí: "${transcript.slice(0, 200)}"`);
      const cmd = isChoferActivo ? "agenda" : "mis reservas";
      await handleMessage({ from, type: "text", text: { body: cmd } });
      return;
    }
    if (/(inscribir|quiero ser chofer|registrarme)/.test(t)) {
      await sendText(from, `🎙️ Entendí: "${transcript.slice(0, 200)}"`);
      await handleMessage({ from, type: "text", text: { body: "inscribirme" } });
      return;
    }
    await sendText(
      from,
      `🎙️ Te oí decir:\n"${transcript.slice(0, 200)}"\n\nNo estoy seguro qué necesitas. Escribe *menu* para opciones.`
    );
    if (isChoferActivo && chofer) {
      await sendMenuChoferActivo(from, chofer.nombre, chofer.choferya_slug!);
    } else {
      await sendMenuPrincipal(from, chofer?.nombre || pasajero?.nombre || null);
    }
    return;
  }

  // ── Texto
  if (m.type === "text") {
    const text = (m.text?.body || "").toLowerCase().trim();

    // Marketing opt-out / opt-in (prioridad sobre cualquier otro intent).
    if (isStopCommand(text)) {
      await markOptOut(from, "choferya");
      await sendText(from, OPT_OUT_REPLY);
      return;
    }
    if (isStartCommand(text)) {
      await clearOptOut(from);
      await sendText(from, OPT_IN_REPLY);
      return;
    }

    // Saludo / menu
    if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hi|hey|menu|inicio)/.test(text)) {
      if (isChoferActivo && chofer) {
        await sendMenuChoferActivo(from, chofer.nombre, chofer.choferya_slug!);
      } else {
        await sendMenuPrincipal(from, chofer?.nombre || pasajero?.nombre || null);
      }
      return;
    }

    // Agenda / mis reservas (chofer)
    if (/(agenda|mis reservas chofer|proximas|próximas)/.test(text) && isChoferActivo && chofer) {
      await enviarAgendaChofer(from, chofer);
      return;
    }

    // Mis reservas (pasajero)
    if (/(mis reservas|mi reserva|mi viaje|mis viajes)/.test(text)) {
      await enviarReservasPasajero(from);
      return;
    }

    // Panel chofer
    if (/(panel|dashboard|administrar)/.test(text)) {
      if (isChoferActivo && chofer) {
        await sendText(
          from,
          `🔗 *Tu panel:*\n\n${panelUrl(chofer.id)}\n\nEl link expira en 365 días. Guárdalo en tus accesos directos.`
        );
      } else if (chofer && chofer.status === "approved") {
        await sendText(
          from,
          `${chofer.nombre.split(" ")[0]}, todavía no estás suscrito a TuChoferYa. Escribe *inscribirme* para activar tu plan.`
        );
      } else {
        await sendText(from, "Solo los choferes con suscripción TuChoferYa activa tienen panel. Escribe *inscribirme*.");
      }
      return;
    }

    // Precios
    if (/(precios|tarifas|tarifa)/.test(text)) {
      if (isChoferActivo && chofer) {
        await sendText(
          from,
          `💰 *Editar tus tarifas planas:*\n\n${precioiUrl(chofer.id)}\n\nDefine rutas comunes como "Centro → Aeropuerto S/.18" para que tus pasajeros vean precio al reservar.`
        );
      } else {
        await sendText(from, "Solo los choferes activos editan tarifas. Escribe *menu*.");
      }
      return;
    }

    // Horarios
    if (/(horarios|horario|disponibilidad)/.test(text)) {
      if (isChoferActivo && chofer) {
        await sendText(
          from,
          `🕒 *Editar tus horarios disponibles:*\n\n${horariosUrl(chofer.id)}\n\nDefine ventanas por día. Solo aceptamos reservas dentro de tus horarios.`
        );
      } else {
        await sendText(from, "Solo los choferes activos configuran horarios. Escribe *menu*.");
      }
      return;
    }

    // Mi link / pagina publica
    if (/(mi link|mi enlace|mi pagina|mi página|mi perfil|mi qr|qr)/.test(text)) {
      if (isChoferActivo && chofer) {
        await enviarMiLinkChofer(from, chofer);
      } else {
        await sendText(from, "Solo choferes activos tienen página pública. Escribe *inscribirme*.");
      }
      return;
    }

    // Buscar chofer (pasajero)
    if (/(chofer|buscar|taxi|reservar|necesito)/.test(text) && !isChoferActivo) {
      await sendText(
        from,
        "🔍 *Encuentra tu chofer de confianza:*\n\n" +
          "https://chofer.activosya.com/buscar\n\n" +
          "Filtra por zona, ve calificaciones y reserva en 1 minuto. Pagas directo al chofer por Yape."
      );
      return;
    }

    // Inscripcion chofer
    if (/(inscribirme|quiero ser chofer|registrarme|suscribirme|me inscribo|empezar)/.test(text)) {
      if (isChoferActivo && chofer) {
        await sendText(
          from,
          `Ya eres chofer activo TuChoferYa, ${chofer.nombre.split(" ")[0]}. Plan: ${chofer.choferya_plan?.toUpperCase()}. Escribe *panel* para administrar.`
        );
      } else if (chofer && chofer.status === "approved" && !chofer.choferya_active) {
        await sendText(
          from,
          `${chofer.nombre.split(" ")[0]}, ya estás aprobado como chofer en nuestro sistema. Solo falta activar tu plan TuChoferYa:\n\n` +
            `🔗 https://activosya.com/se-choferya\n\n` +
            `Yapea S/.39 (Básico) / 79 (Pro) / 149 (Élite) a 998 102 258 y te activamos.`
        );
      } else if (chofer && chofer.status === "pending") {
        await sendText(
          from,
          `${chofer.nombre.split(" ")[0]}, tu inscripción como chofer está en revisión IA. Te avisamos en menos de 24h.`
        );
      } else {
        await sendText(
          from,
          "🚖 *Únete a TuChoferYa*\n\n" +
            "Tu propia agencia de taxi por S/.39/mes. Sin comisión por viaje.\n\n" +
            "🔗 https://activosya.com/se-choferya\n\n" +
            "Te pedimos DNI + licencia + SOAT + foto del auto. La IA verifica en 5 minutos."
        );
      }
      return;
    }

    // Ayuda
    if (/(ayuda|help|que puedo hacer|como funciona)/.test(text)) {
      if (isChoferActivo && chofer) {
        await ayudaChofer(from, chofer);
      } else {
        await ayudaPasajero(from);
      }
      return;
    }

    // Mi estado
    if (/(mi estado|status|mi cuenta|mi plan)/.test(text)) {
      const lines: string[] = ["📋 *Tu estado en TuChoferYa*"];
      if (isChoferActivo && chofer) {
        lines.push(`✅ Chofer activo · plan ${chofer.choferya_plan?.toUpperCase()}`);
        lines.push(`🔗 chofer.activosya.com/c/${chofer.choferya_slug}`);
        if (chofer.choferya_subscription_until) {
          const vence = new Date(chofer.choferya_subscription_until).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "long",
          });
          lines.push(`📅 Renta vence: ${vence}`);
        }
      } else if (chofer && chofer.status === "approved") {
        lines.push(`⚠️ Aprobado como chofer pero sin plan TuChoferYa activo`);
      } else if (chofer && chofer.status === "pending") {
        lines.push(`⏳ Inscripción de chofer en revisión`);
      }
      if (pasajero) {
        const reservas = await lookupReservasPasajero(from);
        lines.push(`✅ Pasajero · ${reservas.length} reserva${reservas.length === 1 ? "" : "s"} próximas`);
      }
      if (lines.length === 1) lines.push("Sin registros. Escribe *menu* para empezar.");
      await sendText(from, lines.join("\n"));
      return;
    }

    // Default
    if (isChoferActivo && chofer) {
      await sendMenuChoferActivo(from, chofer.nombre, chofer.choferya_slug!);
    } else {
      await sendMenuPrincipal(from, chofer?.nombre || pasajero?.nombre || null);
    }
    return;
  }

  // ── Interactive (button replies)
  if (m.type === "interactive" && m.interactive?.button_reply) {
    const id = m.interactive.button_reply.id;

    if (id === "chy_buscar") {
      await sendText(
        from,
        "🔍 *Encuentra tu chofer de confianza:*\n\n" +
          "https://chofer.activosya.com/buscar\n\n" +
          "Filtra por zona, ve calificaciones y reserva en 1 minuto."
      );
      return;
    }

    if (id === "chy_inscribirme") {
      await handleMessage({ from, type: "text", text: { body: "inscribirme" } });
      return;
    }

    if (id === "chy_ayuda") {
      await ayudaPasajero(from);
      return;
    }

    if (id === "chy_agenda" && isChoferActivo && chofer) {
      await enviarAgendaChofer(from, chofer);
      return;
    }

    if (id === "chy_panel" && isChoferActivo && chofer) {
      await sendText(from, `🔗 ${panelUrl(chofer.id)}`);
      return;
    }

    if (id === "chy_ayuda_chofer" && isChoferActivo && chofer) {
      await ayudaChofer(from, chofer);
      return;
    }
  }

  // ── Interactive (list replies — para futuro)
  if (m.type === "interactive" && m.interactive?.list_reply) {
    // Reservado: list_reply para "tus 5 reservas próximas con acción Cancelar"
    return;
  }
}

// ─── HTTP handlers ─────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = process.env.META_CHOFERYA_VERIFY_TOKEN;
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
    return NextResponse.json({ ok: true, note: "no_body" });
  }

  try {
    const entry = (payload as { entry?: unknown[] })?.entry?.[0] as
      | { id?: string; changes?: Array<{ value?: { messages?: unknown[]; statuses?: unknown[] } }> }
      | undefined;
    const change = entry?.changes?.[0]?.value;
    const msgs = (change?.messages ?? []) as Array<{
      from: string;
      type: string;
      text?: { body?: string };
      audio?: { id?: string; mime_type?: string };
      interactive?: {
        button_reply?: { id?: string; title?: string };
        list_reply?: { id?: string; title?: string };
      };
    }>;

    for (const m of msgs) {
      after(handleMessage(m));
    }
  } catch (e) {
    console.error("[choferya bot] handler err", e);
  }

  return NextResponse.json({ ok: true });
}
