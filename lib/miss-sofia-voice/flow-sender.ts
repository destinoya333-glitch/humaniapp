/**
 * Miss Sofia — Flow sender via Meta Cloud Graph API directo.
 *
 * Twilio Content Templates NO soporta referenciar Meta Flows (exige pages
 * inline). Workaround: el bot Twilio recibe mensajes y RESPONDE con un
 * interactive flow message via Meta Cloud direct. Funciona dentro de la
 * 24-hour window (cuando el usuario ya inicio conversacion con el sender).
 *
 * Para mensajes "frios" (fuera 24h) habria que migrar Sofia a Meta Cloud
 * direct + crear templates Meta. Por ahora optamos por soporte 24h-window
 * que cubre el 90% de los casos (responder a usuarios que escriben).
 */

const FLOW_IDS: Record<string, string> = {
  "pacto-cuna": "2099053120678509",
  "plan-estudio": "1971385283750735",
  pago: "2751789811842993",
  progreso: "872314639215619",
  pronunciacion: "1327539839226571",
};

const FLOW_COPY: Record<string, { header: string; body: string; cta: string; footer: string }> = {
  "pacto-cuna": {
    header: "Pacto Cuna",
    body: "Para conocernos y armar tu Pacto Cuna necesito 60 segundos. Abre el formulario y empezamos.",
    cta: "Sellar Pacto",
    footer: "Miss Sofia · Metodo Cuna",
  },
  "plan-estudio": {
    header: "Tu rutina diaria",
    body: "Configura tu rutina: hora del audio matutino, modo de practica y dias de la semana.",
    cta: "Configurar plan",
    footer: "Miss Sofia · Metodo Cuna",
  },
  pago: {
    header: "Activar plan",
    body: "Activa tu plan Regular o Premium. Yape persona-a-persona, sin tarjetas.",
    cta: "Ver planes",
    footer: "Miss Sofia · Metodo Cuna",
  },
  progreso: {
    header: "Tu progreso",
    body: "Aqui esta tu progreso de esta semana: fase, tiempo de boca, palabras tuyas y novela.",
    cta: "Ver mi progreso",
    footer: "Miss Sofia · Metodo Cuna",
  },
  pronunciacion: {
    header: "Test pronunciacion",
    body: "Test rapido de pronunciacion. Te muestro una frase, la grabas en audio y te puntuo 0-100.",
    cta: "Empezar test",
    footer: "Miss Sofia · Metodo Cuna",
  },
};

export type FlowKey = keyof typeof FLOW_IDS;

export function isMetaFlowConfigured(): boolean {
  return Boolean(
    (process.env.META_SOFIA_ACCESS_TOKEN ?? "").trim() &&
      (process.env.META_SOFIA_PHONE_ID ?? "").trim()
  );
}

/**
 * Envia un Flow Sofia al numero `phone` (E.164) via Meta Cloud Graph API.
 * Solo funciona dentro de la 24h-window con el sender Sofia.
 *
 * `userIdOrPhone` se codifica en el flow_token y permite al webhook universal
 * identificar al usuario al recibir submits del flow.
 */
export async function sendSofiaFlow(opts: {
  phone: string;                  // destinatario, E.164 incluyendo "+"
  flowKey: FlowKey | string;
  userIdOrPhone: string;          // contexto para flow_token
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const flowId = FLOW_IDS[opts.flowKey];
  if (!flowId) {
    return { ok: false, error: `flow_key desconocido: ${opts.flowKey}` };
  }
  const copy = FLOW_COPY[opts.flowKey];
  if (!copy) {
    return { ok: false, error: `copy faltante para ${opts.flowKey}` };
  }
  if (!isMetaFlowConfigured()) {
    return {
      ok: false,
      error: "META_SOFIA_ACCESS_TOKEN o META_SOFIA_PHONE_ID no configurados",
    };
  }

  const phoneId = (process.env.META_SOFIA_PHONE_ID ?? "").trim();
  const token = (process.env.META_SOFIA_ACCESS_TOKEN ?? "").trim();
  const to = opts.phone.startsWith("+") ? opts.phone : `+${opts.phone}`;

  const body = {
    messaging_product: "whatsapp",
    to,
    recipient_type: "individual",
    type: "interactive",
    interactive: {
      type: "flow",
      header: { type: "text", text: copy.header },
      body: { text: copy.body },
      footer: { text: copy.footer },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_token: `miss-sofia:${opts.flowKey}:${opts.userIdOrPhone}`,
          flow_id: flowId,
          flow_cta: copy.cta,
          flow_action: "data_exchange",
        },
      },
    },
  };

  try {
    const r = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await r.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };
    if (!r.ok) {
      return { ok: false, error: json.error?.message ?? `HTTP ${r.status}` };
    }
    return { ok: true, messageId: json.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
