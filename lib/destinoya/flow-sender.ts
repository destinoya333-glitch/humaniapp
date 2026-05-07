/**
 * TuDestinoYa — Flow sender via Meta Cloud Graph API directo.
 */

const FLOW_IDS: Record<string, string> = {
  menu: process.env.DESTINOYA_FLOW_ID_MENU || "1382092367061910",
  pago: process.env.DESTINOYA_FLOW_ID_PAGO || "1679201533119658",
  vip: process.env.DESTINOYA_FLOW_ID_VIP || "1962445121034310",
  submenu: process.env.DESTINOYA_FLOW_ID_SUBMENU || "",
};

const FLOW_COPY: Record<string, { header: string; body: string; cta: string; footer: string }> = {
  menu: {
    header: "TuDestinoYa",
    body: "¿Qué necesitas hoy? Toca abajo y elige el servicio que más te ayude.",
    cta: "Abrir menú",
    footer: "Sofía · TuDestinoYa",
  },
  pago: {
    header: "Pago Yape",
    body: "Selecciona el plan que ya yapeaste y pega el código de operación.",
    cta: "Confirmar pago",
    footer: "Sofía · TuDestinoYa",
  },
  vip: {
    header: "DestinoYA VIP",
    body: "Servicios ilimitados. Mensual S/18 o Anual S/63 (ahorras S/153).",
    cta: "Activar VIP",
    footer: "Sofía · TuDestinoYa",
  },
  submenu: {
    header: "Tu consulta",
    body: "Elige sub-servicio + plan + pega operación Yape.",
    cta: "Continuar",
    footer: "Sofía · TuDestinoYa",
  },
};

export type DestinoFlowKey = "menu" | "pago" | "vip" | "submenu";

export function isDestinoFlowConfigured(): boolean {
  return Boolean(
    (process.env.META_DESTINOYA_ACCESS_TOKEN ?? "").trim() &&
      (process.env.META_DESTINOYA_PHONE_ID ?? "").trim()
  );
}

export async function sendDestinoFlow(opts: {
  phone: string;
  flowKey: DestinoFlowKey;
  userIdOrPhone?: string;
  /** Para submenu: categoria embebida en flow_token */
  categoria?: string;
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const flowId = FLOW_IDS[opts.flowKey];
  const copy = FLOW_COPY[opts.flowKey];
  if (!flowId) return { ok: false, error: `flow_key desconocido: ${opts.flowKey}` };
  if (!copy) return { ok: false, error: `copy faltante para ${opts.flowKey}` };
  if (!isDestinoFlowConfigured()) {
    return { ok: false, error: "META_DESTINOYA_* no configuradas" };
  }

  const phoneId = (process.env.META_DESTINOYA_PHONE_ID ?? "").trim();
  const token = (process.env.META_DESTINOYA_ACCESS_TOKEN ?? "").trim();
  const to = opts.phone.startsWith("+") ? opts.phone : `+${opts.phone}`;
  const ctxId = opts.userIdOrPhone || opts.phone;

  const flowToken =
    opts.flowKey === "submenu" && opts.categoria
      ? `destinoya:submenu:${opts.categoria}:${ctxId}`
      : `destinoya:${opts.flowKey}:${ctxId}`;

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
          flow_token: flowToken,
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
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await r.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };
    if (!r.ok) return { ok: false, error: json.error?.message ?? `HTTP ${r.status}` };
    return { ok: true, messageId: json.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
