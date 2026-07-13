/**
 * TuDestinoYa — Flow sender via Meta Cloud Graph API directo.
 */

const FLOW_IDS: Record<string, string> = {
  menu: process.env.DESTINOYA_FLOW_ID_MENU || "1382092367061910",
  pago: process.env.DESTINOYA_FLOW_ID_PAGO || "1679201533119658",
  vip: process.env.DESTINOYA_FLOW_ID_VIP || "1962445121034310",
  submenu: process.env.DESTINOYA_FLOW_ID_SUBMENU || "",
  datos_compatibilidad: process.env.DESTINOYA_FLOW_ID_DATOS_COMPATIBILIDAD || "1153642436896196",
  datos_carta_astral: process.env.DESTINOYA_FLOW_ID_DATOS_CARTA_ASTRAL || "1344488027493846",
  datos_feng_shui: process.env.DESTINOYA_FLOW_ID_DATOS_FENG_SHUI || "1637870350596198",
  datos_numerologia: process.env.DESTINOYA_FLOW_ID_DATOS_NUMEROLOGIA || "4454730848182384",
  datos_profesional: process.env.DESTINOYA_FLOW_ID_DATOS_PROFESIONAL || "2180688639417341",
  datos_rapidas: process.env.DESTINOYA_FLOW_ID_DATOS_RAPIDAS || "1489822349405911",
};

// Sub-servicios por categoría. El orden importa: el Flow de WhatsApp devuelve
// el ÍNDICE de la opción elegida (sub_servicio: "1".."6"), no el nombre. Se
// exporta para que el webhook pueda traducir ese índice al nombre real.
export const SUBSERVICIOS_DESTINO: Record<string, { titulo: string; intro: string; subs: string[] }> = {
  esoterico: {
    titulo: "🔮 DestinoYA Esotérico",
    intro: "Elige sub-servicio y plan. Yapeas el monto exacto y validamos automático.",
    subs: ["Lectura de Mano", "Compatibilidad Amorosa", "Carta Astral", "Tu Futuro 30/60/90", "Feng Shui Express", "Numerología Personal"],
  },
  profesional: {
    titulo: "💼 Área Profesional",
    intro: "Elige especialidad y plan. Yapeas y validamos automático.",
    subs: ["Asesoría Legal Express", "Salud Express", "Veterinaria Express", "Plantas y Cultivos", "Asesor Financiero Personal", "Nutricionista Express"],
  },
  rapidas: {
    titulo: "⚡ Soluciones Rápidas",
    intro: "Elige solución y plan. Ágil y al grano.",
    subs: ["Elaborar o Mejorar mi CV", "Consejo para mi problema", "Decisión que me conviene tomar", "Analizar problema y dar solución", "Plan para bajar de peso", "Alimentación personalizada"],
  },
};

/**
 * Traduce el valor devuelto por el Flow de submenú al nombre real del servicio.
 * El Flow manda el índice de la opción ("1".."6"); esto lo convierte al nombre
 * (ej. "3" + esoterico -> "Carta Astral"). Si `raw` ya es un nombre (no numérico
 * o fuera de rango), se devuelve tal cual — así el fix es seguro ante cambios.
 */
export function resolverSubServicio(categoria: string, raw: string): string {
  const c = SUBSERVICIOS_DESTINO[categoria];
  if (!c) return raw;
  const trimmed = String(raw ?? "").trim();
  const idx = parseInt(trimmed, 10);
  if (!isNaN(idx) && String(idx) === trimmed && idx >= 1 && idx <= c.subs.length) {
    return c.subs[idx - 1];
  }
  return raw;
}

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
  datos_compatibilidad: {
    header: "Compatibilidad Amorosa",
    body: "Envíame los datos de las 2 personas para tu lectura.",
    cta: "Llenar formulario",
    footer: "Sofía · TuDestinoYa",
  },
  datos_carta_astral: {
    header: "Carta Astral",
    body: "Envíame tus datos de nacimiento para trazar tu mapa estelar.",
    cta: "Llenar formulario",
    footer: "Sofía · TuDestinoYa",
  },
  datos_feng_shui: {
    header: "Feng Shui Express",
    body: "Envíame tus datos para tu lectura de Feng Shui.",
    cta: "Llenar formulario",
    footer: "Sofía · TuDestinoYa",
  },
  datos_numerologia: {
    header: "Tus datos",
    body: "Envíame tu nombre completo y fecha de nacimiento.",
    cta: "Llenar formulario",
    footer: "Sofía · TuDestinoYa",
  },
  datos_profesional: {
    header: "Tu consulta",
    body: "Detálla tu consulta. Después podrás adjuntar documentos por chat si los tienes.",
    cta: "Llenar formulario",
    footer: "Sofía · TuDestinoYa",
  },
  datos_rapidas: {
    header: "Tu situación",
    body: "Cuéntame tu situación con detalle.",
    cta: "Llenar formulario",
    footer: "Sofía · TuDestinoYa",
  },
};

export type DestinoFlowKey =
  | "menu"
  | "pago"
  | "vip"
  | "submenu"
  | "datos_compatibilidad"
  | "datos_carta_astral"
  | "datos_feng_shui"
  | "datos_numerologia"
  | "datos_profesional"
  | "datos_rapidas";

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

  const FIRST_SCREEN: Record<string, string> = {
    menu: "MENU",
    pago: "COMPARATIVA",
    vip: "VIP_INFO",
    submenu: "SUBMENU",
    datos_compatibilidad: "DATOS",
    datos_carta_astral: "DATOS",
    datos_feng_shui: "DATOS",
    datos_numerologia: "DATOS",
    datos_profesional: "DATOS",
    datos_rapidas: "DATOS",
  };
  const firstScreen = FIRST_SCREEN[opts.flowKey] || "MENU";

  const SUBSERVICIOS = SUBSERVICIOS_DESTINO;

  let payloadData: Record<string, string> | undefined;
  if (opts.flowKey === "submenu") {
    const cat = (opts.categoria || "esoterico") as keyof typeof SUBSERVICIOS;
    const c = SUBSERVICIOS[cat] || SUBSERVICIOS.esoterico;
    payloadData = {
      linea_titulo: c.titulo,
      linea_intro: c.intro,
      linea_yape: "Yape: 998 102 258 (Percy Roj*)",
      sub_1: c.subs[0],
      sub_2: c.subs[1],
      sub_3: c.subs[2],
      sub_4: c.subs[3],
      sub_5: c.subs[4],
      sub_6: c.subs[5],
      plan_basico: "Básico · S/3 · 3 secciones",
      plan_intermedio: "Intermedio · S/6 · 4 secciones",
      plan_premium: "Premium · S/9 · 6 secciones",
      plan_pro: "PRO · S/9.90 · profundo",
      categoria: cat,
    };
  }

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
          flow_action: "navigate",
          flow_action_payload: payloadData
            ? { screen: firstScreen, data: payloadData }
            : { screen: firstScreen },
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
