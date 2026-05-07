export type Status = "Activo" | "Beta" | "Próximamente";

export type Activo = {
  slug: string;
  status: Status;
  icon: string;
  name: string;
  tagline: string;
  shortDescription: string;
  overview: string;
  problem: string;
  solution: string;
  metrics: { label: string; value: string }[];
  businessModel: string;
  stack: string[];
  competitors: { name: string; weakness: string }[];
  pnlProjection: { month: string; revenue: string; cost: string; profit: string }[];
  includes: string[];
  rent: string;
  buy: string;
  b2cHref: string;
  b2cLabel: string;
  subdomain?: string;
};

export const ACTIVOS: Activo[] = [
  {
    slug: "miss-sofia",
    status: "Activo",
    icon: "◎",
    name: "Miss Sofia",
    tagline: "Inglés con IA · Método Cuna · WhatsApp + Web",
    shortDescription:
      "Aprende inglés como aprendiste español: viviéndolo, no estudiándolo. 6 fases neurolingüísticas en 12 meses. Voz Sofia ElevenLabs + Nova OpenAI. Garantía 6 meses.",
    overview:
      "Miss Sofia enseña inglés con el Método Cuna: 6 fases neurolingüísticas que respetan cómo aprenden los niños la lengua materna. La estudiante recibe audio matutino diario, conversa por WhatsApp y app web, construye su propia novela personal y mide hitos viscerales (no rachas vacías). Profesora ejecutiva, sin paternalismo.",
    problem:
      "Las academias presenciales cuestan S/300-500/mes y son inflexibles. Las apps tipo Duolingo gamifican memorización que no sirve para hablar. Los hispanohablantes terminan sabiendo traducir frases sueltas pero sin atreverse a conversar.",
    solution:
      "Método Cuna: Fase 0 escucha sin presión, Fase 1 una palabra real, Fase 2 telegráfico, Fase 3 tu voz, Fase 4 tu mundo, Fase 5 nativo. Sofia te acompaña 24/7 con audios diarios, novela personal generada cada semana, misiones reales-life y métricas viscerales (palabras tuyas, días que pensaste en inglés, días que soñaste en inglés).",
    metrics: [
      { label: "Pricing Regular", value: "S/ 39/mes" },
      { label: "Pricing Premium", value: "S/ 89/mes" },
      { label: "Garantía", value: "6 meses Klaric" },
      { label: "Duración total", value: "12 meses" },
      { label: "Margen bruto", value: "72%" },
      { label: "Estado plataforma", value: "LIVE" },
    ],
    businessModel:
      "Suscripción mensual o anual. Plan Regular S/39/mes (S/349/año, voz Nova ilimitada). Plan Premium S/89/mes (S/799/año, voz ElevenLabs Sofia 45 min/mes). Free tier: 3 días ilimitado + 6 min/día x 30 días. Yape persona-a-persona, validación MacroDroid Android. Escalable sin contratar profesores humanos.",
    stack: ["Next.js 16", "Claude Sonnet 4.6", "ElevenLabs Sofia", "OpenAI Nova TTS", "Groq Whisper STT", "Supabase", "WhatsApp Flows v7", "Twilio (mensajeria)"],
    competitors: [
      { name: "Duolingo Super", weakness: "Memorización gamificada, métrica de rachas vacías, no enseña a hablar" },
      { name: "Cambly / Preply", weakness: "Profesores humanos caros (S/30-80/clase), horarios fijos" },
      { name: "Academias presenciales", weakness: "S/300-500/mes, horarios fijos, no escala" },
      { name: "BeConfident", weakness: "Solo inglés, mercado USA, sin Yape, sin método progresivo" },
    ],
    pnlProjection: [
      { month: "M1", revenue: "S/ 1,500", cost: "S/ 600", profit: "S/ 900" },
      { month: "M3", revenue: "S/ 4,200", cost: "S/ 1,100", profit: "S/ 3,100" },
      { month: "M6", revenue: "S/ 8,500", cost: "S/ 1,900", profit: "S/ 6,600" },
      { month: "M12", revenue: "S/ 16,500", cost: "S/ 3,400", profit: "S/ 13,100" },
    ],
    includes: [
      "Código fuente completo + repositorio Git",
      "6 fases neurolingüísticas Método Cuna (12 meses)",
      "5 WhatsApp Flows (Pacto Cuna, Plan, Pago, Progreso, Pronunciacion)",
      "Audio matutino diario + novela personal + diccionario emocional",
      "Sistema de métricas viscerales (no rachas vacías)",
      "Dashboard del operador con MRR, retención, churn",
      "Garantía Klaric 6 meses operador → estudiante",
      "Onboarding técnico 7-14 días + Slack privado 90 días",
    ],
    rent: "Desde S/ 1,800/mes",
    buy: "Compra a consultar",
    b2cHref: "https://sofia.activosya.com",
    b2cLabel: "Ver app B2C",
    subdomain: "sofia.activosya.com",
  },
  {
    slug: "tudestinoya",
    status: "Activo",
    icon: "✦",
    name: "TuDestinoYa",
    tagline: "Tarot y orientación IA · WhatsApp",
    shortDescription:
      "Plataforma de consultas IA por WhatsApp: astrología, palma, orientación profesional, exprés. Pagos Yape + planes VIP recurrentes.",
    overview:
      "TuDestinoYa atiende consultas espirituales y de orientación 24/7 vía WhatsApp. El cliente elige tipo de consulta, paga con Yape y recibe respuesta personalizada en minutos. Plan VIP a S/18/mes desbloquea consultas ilimitadas.",
    problem:
      "El mercado de tarot, astrología y orientación en LATAM mueve millones, pero está lleno de fricción: citas, llamadas, pagos manuales, atención solo en horario, varguenza social de consultar.",
    solution:
      "Un bot que atiende 24/7, cobra automático con Yape, recuerda tu signo y consultas previas, y entrega respuestas con calidad profesional gracias a Claude. Sin filas ni vergüenza.",
    metrics: [
      { label: "MRR potencial", value: "S/ 8,500" },
      { label: "Retención 30d", value: "62%" },
      { label: "Margen bruto", value: "68%" },
      { label: "Ticket VIP", value: "S/ 18/mes" },
      { label: "Conversión free→VIP", value: "14%" },
      { label: "LTV/CAC", value: "5.6x" },
    ],
    businessModel:
      "Híbrido transaccional + recurrente. Consulta puntual S/3-9 (entrada). Plan VIP mensual S/18 (recurrencia). Plan VIP anual S/63 (commitment). Cada operador puede agregar nuevos servicios sobre el motor base.",
    stack: ["Twilio Business API", "Claude Vision", "Supabase", "Yape (verificación)", "n8n (orquestación)"],
    competitors: [
      { name: "Tarotistas individuales", weakness: "Horario limitado, escalan con tiempo, no recurrente" },
      { name: "Apps tipo Co-Star", weakness: "No conversan, no cobran en LATAM, no tienen Yape" },
      { name: "Líneas de consulta telefónicas", weakness: "Costo alto por minuto, fricción de llamada" },
    ],
    pnlProjection: [
      { month: "M1", revenue: "S/ 2,500", cost: "S/ 800", profit: "S/ 1,700" },
      { month: "M3", revenue: "S/ 5,800", cost: "S/ 1,400", profit: "S/ 4,400" },
      { month: "M6", revenue: "S/ 9,200", cost: "S/ 2,200", profit: "S/ 7,000" },
      { month: "M12", revenue: "S/ 14,500", cost: "S/ 3,200", profit: "S/ 11,300" },
    ],
    includes: [
      "Workflow n8n completo + agente Claude entrenado",
      "Sistema de verificación Yape automático",
      "Plan VIP con cobro recurrente integrado",
      "Análisis de palma con Claude Vision",
      "Dashboard de suscriptores VIP y métricas",
      "Onboarding 7-14 días + Slack privado 90 días",
    ],
    rent: "Desde S/ 2,500/mes",
    buy: "Compra a consultar",
    b2cHref: "https://destino.activosya.com",
    b2cLabel: "Ver landing B2C",
    subdomain: "destino.activosya.com",
  },
  {
    slug: "tunoviaia",
    status: "Beta",
    icon: "♡",
    name: "TuNoviaIA",
    tagline: "Compañía IA femenina · App + WhatsApp",
    shortDescription:
      "Compañera IA con foto, voz emocional ElevenLabs y memoria persistente. Cobro por minuto o suscripción mensual. Avatar y personalidad personalizables.",
    overview:
      "TuNoviaIA ofrece compañía emocional bajo demanda. La usuaria elige avatar, voz y personalidad. El sistema mantiene memoria persistente de cada conversación y simula intimidad emocional con voz natural.",
    problem:
      "La soledad masculina en LATAM es epidemia silenciosa. Apps de citas son frustrantes y costosas. La gente busca compañía sin riesgos, sin juicios, disponible siempre.",
    solution:
      "Una compañera IA con voz emocional, recuerda tu día, te llama por tu nombre, sabe lo que te importa. Cobro flexible: por minuto o plan mensual. Avatar visual personalizable.",
    metrics: [
      { label: "Plan mensual", value: "S/ 480" },
      { label: "Sesión 1 min", value: "S/ 3.90" },
      { label: "Margen bruto", value: "65%" },
      { label: "Estado", value: "Beta" },
      { label: "Ticket promedio", value: "S/ 9/sesión" },
      { label: "Recurrencia 30d", value: "55%" },
    ],
    businessModel:
      "Doble carril: pay-per-use (S/3.90-9 por sesión, alta margen) + suscripción mensual (Pack S/120 / Plan S/480, alta predictibilidad). El plan mensual representa 60-70% del MRR estable.",
    stack: ["ElevenLabs Multilingual v2", "Claude Sonnet 4.6", "HeyGen (avatar)", "Supabase", "Stripe"],
    competitors: [
      { name: "Replika", weakness: "Solo inglés, sin Yape, sin voz emocional natural en LATAM" },
      { name: "Character.ai", weakness: "Sin voz, sin avatar, sin cobro recurrente automático" },
      { name: "OnlyFans", weakness: "Modelo distinto (real), legal complejo, alta fricción" },
    ],
    pnlProjection: [
      { month: "M1", revenue: "S/ 1,500", cost: "S/ 600", profit: "S/ 900" },
      { month: "M3", revenue: "S/ 4,800", cost: "S/ 1,500", profit: "S/ 3,300" },
      { month: "M6", revenue: "S/ 9,500", cost: "S/ 2,800", profit: "S/ 6,700" },
      { month: "M12", revenue: "S/ 17,000", cost: "S/ 4,500", profit: "S/ 12,500" },
    ],
    includes: [
      "Motor de conversación con personalidad customizable",
      "Sistema de voz ElevenLabs + memoria persistente",
      "Avatar HeyGen sincronizado con voz",
      "Cobro por minuto + planes mensuales",
      "Dashboard sesiones, MRR, churn, top usuarios",
      "Onboarding 7-14 días + Slack privado 90 días",
    ],
    rent: "Desde S/ 3,000/mes",
    buy: "Compra a consultar",
    b2cHref: "https://novia.activosya.com",
    b2cLabel: "Ver app B2C",
    subdomain: "novia.activosya.com",
  },
  {
    slug: "tupedidoya",
    status: "Beta",
    icon: "◑",
    name: "TuPedidoYa",
    tagline: "Pedidos para restaurantes · WhatsApp",
    shortDescription:
      "Bot de pedidos para pollerías, pizzerías y restaurantes. Menú interactivo, integración Telegram cocina, reportes diarios. Multi-tenant.",
    overview:
      "TuPedidoYa convierte WhatsApp en el canal principal de ventas para restaurantes. El cliente ve menú, pide, paga con Yape, y la cocina recibe ticket en Telegram en segundos. Sin app que descargar, sin fricción.",
    problem:
      "Los restaurantes pequeños en LATAM dependen de llamadas o WhatsApp manual. Pierden pedidos por saturación, errores de toma, falta de seguimiento. Las apps de delivery cobran 25-30% de comisión.",
    solution:
      "Un bot 24/7 que atiende pedidos con menú interactivo, cobra automático con Yape, avisa a la cocina por Telegram con ticket impreso, y entrega métricas diarias. Tu marca, tu número, sin comisión por pedido.",
    metrics: [
      { label: "Setup piloto", value: "3 días" },
      { label: "Pedidos M1", value: "142" },
      { label: "% del total ventas", value: "23%" },
      { label: "Margen bruto", value: "75%" },
      { label: "Ticket B2B", value: "S/ 1,800/mes" },
      { label: "Estado", value: "Beta probado" },
    ],
    businessModel:
      "Suscripción B2B mensual al restaurante. Sin comisión por pedido. Fee fijo predecible. Cada operador puede gestionar 10-20 restaurantes con 1 cuenta Twilio multi-subaccount.",
    stack: ["Twilio Business API", "Claude (intent + recomendación)", "Supabase (multi-tenant)", "Telegram Bot (cocina)"],
    competitors: [
      { name: "Rappi/Didi/Uber Eats", weakness: "Comisión 25-30% por pedido, restaurant pierde control de marca" },
      { name: "WhatsApp manual", weakness: "Saturación, errores, sin reportes, no escala" },
      { name: "Apps propietarias (PedidosYa)", weakness: "Cliente debe descargar app, alta fricción" },
    ],
    pnlProjection: [
      { month: "M1", revenue: "S/ 1,800", cost: "S/ 500", profit: "S/ 1,300" },
      { month: "M3", revenue: "S/ 5,400", cost: "S/ 1,200", profit: "S/ 4,200" },
      { month: "M6", revenue: "S/ 10,800", cost: "S/ 2,200", profit: "S/ 8,600" },
      { month: "M12", revenue: "S/ 21,600", cost: "S/ 4,200", profit: "S/ 17,400" },
    ],
    includes: [
      "Agente Claude entrenado en flujo de pedidos",
      "Sistema multi-tenant (1 motor → N restaurantes)",
      "Integración Telegram cocina con ticket formateado",
      "Verificación Yape automática + reportes diarios",
      "Dashboard del operador (B2B) y del restaurante",
      "Onboarding 7-14 días + Slack privado 90 días",
    ],
    rent: "Desde S/ 1,800/mes",
    buy: "Compra a consultar",
    b2cHref: "https://pedido.activosya.com",
    b2cLabel: "Ver landing B2C",
    subdomain: "pedido.activosya.com",
  },
  {
    slug: "ecodriveplus",
    status: "Beta",
    icon: "◈",
    name: "EcoDrive+",
    tagline: "Intermediación rideshare por WhatsApp · sin app",
    shortDescription:
      "Plataforma de viajes tipo Indrive operada 100% por WhatsApp. Cliente nombra su precio, conductores aceptan. Sin descargar app, sin comisión escandalosa.",
    overview:
      "EcoDrive+ es una plataforma de intermediación rideshare local (estilo Indrive) que opera completamente por WhatsApp. El pasajero solicita viaje con origen, destino y precio sugerido. El sistema notifica a conductores cercanos por WhatsApp. El conductor que acepta se conecta con el pasajero. Cero descargas de app, cero comisiones del 25-30% de Uber/Didi.",
    problem:
      "Apps tipo Uber/Didi/Cabify cobran 25-30% de comisión al conductor. El pasajero paga más, el conductor gana menos. Las apps requieren descarga, registro, GPS activo, batería. En ciudades intermedias (Trujillo, Arequipa, Chiclayo) el modelo no escala porque la masa crítica es menor.",
    solution:
      "Modelo Indrive sobre WhatsApp: sin app que descargar, sin comisión por viaje (modelo de membresía mensual al conductor). El pasajero negocia precio. El conductor acepta o contraoferta. La plataforma cobra fee fijo al conductor por mes — operador cobra recurrente sin depender del volumen.",
    metrics: [
      { label: "Base actual", value: "88 conductores" },
      { label: "Clientes activos", value: "231" },
      { label: "Ciudad piloto", value: "Trujillo" },
      { label: "Margen bruto", value: "78%" },
      { label: "Estado", value: "Relanzamiento" },
      { label: "Modelo", value: "Membresía conductor" },
    ],
    businessModel:
      "Suscripción mensual al conductor (S/30-60/mes según ciudad), cero comisión por viaje. Modelo predecible y atractivo vs Uber/Didi. Para el operador del activo, el ticket promedio por conductor activo es S/40/mes. Con 100 conductores activos, MRR estable de S/4,000.",
    stack: ["Twilio Business API", "Claude (matching)", "Supabase (geolocation)", "Maps API", "n8n"],
    competitors: [
      { name: "Uber / Didi / Cabify", weakness: "Comisión 25-30%, requieren app, no escalan en ciudades intermedias" },
      { name: "Indrive", weakness: "Solo en algunas ciudades LATAM, requiere app, soporte limitado" },
      { name: "Taxis informales", weakness: "Sin trazabilidad, sin recordatorios, sin reportes para el operador" },
    ],
    pnlProjection: [
      { month: "M1", revenue: "S/ 1,500", cost: "S/ 400", profit: "S/ 1,100" },
      { month: "M3", revenue: "S/ 4,200", cost: "S/ 900", profit: "S/ 3,300" },
      { month: "M6", revenue: "S/ 8,500", cost: "S/ 1,800", profit: "S/ 6,700" },
      { month: "M12", revenue: "S/ 16,800", cost: "S/ 3,400", profit: "S/ 13,400" },
    ],
    includes: [
      "Bot WhatsApp con matching pasajero ↔ conductor cercano",
      "Sistema de membresía recurrente para conductores",
      "Dashboard del operador (viajes, conductores, MRR)",
      "Modo demo precargado (Trujillo: 88 conductores + 231 clientes)",
      "Documentación 109 ítems del relanzamiento",
      "Onboarding 7-14 días + Slack privado 90 días",
    ],
    rent: "Desde S/ 2,200/mes",
    buy: "Compra a consultar",
    b2cHref: "https://ecodrive.activosya.com",
    b2cLabel: "Ver landing B2C",
    subdomain: "ecodrive.activosya.com",
  },
  {
    slug: "tureservaya",
    status: "Beta",
    icon: "◐",
    name: "TuReservaYa",
    tagline: "Reservas para consultorios · WhatsApp + Web",
    shortDescription:
      "Sistema de citas multi-doctor con confirmación automática, recordatorios anti-no-show y dashboard. Para clínicas y consultorios.",
    overview:
      "TuReservaYa permite a pacientes agendar citas médicas por WhatsApp 24/7. Sistema multi-doctor con calendarios independientes, recordatorios automáticos 24h y 1h antes, y dashboard con métricas para el consultorio.",
    problem:
      "Los consultorios pierden 15-20% de citas por inasistencias. La secretaria se satura con llamadas. Los pacientes no pueden agendar fuera de horario. La gestión de calendarios multi-doctor es un caos en papel o Excel.",
    solution:
      "Un bot que consulta disponibilidad en tiempo real, agenda al paciente, envía recordatorios automáticos (reduce no-shows 4×) y mantiene el calendario sincronizado para todos los doctores del consultorio.",
    metrics: [
      { label: "No-shows antes", value: "18%" },
      { label: "No-shows después", value: "4%" },
      { label: "ROI primer trimestre", value: "✓" },
      { label: "Margen bruto", value: "72%" },
      { label: "Ticket B2B", value: "S/ 2,000/mes" },
      { label: "Estado", value: "Piloto activo" },
    ],
    businessModel:
      "Suscripción mensual al consultorio (incluye N doctores). Margen alto por bajo costo operativo. Cada operador puede vender a 10-20 consultorios con la misma infra. Up-selling: pago de seña por Stripe (10% adicional).",
    stack: ["Next.js 16", "Twilio Business API", "Supabase (multi-doctor)", "n8n (orquestación citas)"],
    competitors: [
      { name: "Calendly", weakness: "No es multi-doctor por consultorio, no integra WhatsApp LATAM" },
      { name: "Doctoralia", weakness: "Marketplace que cobra al doctor, no es white-label propio" },
      { name: "Excel + secretaria", weakness: "Errores manuales, sin recordatorios, alta inasistencia" },
    ],
    pnlProjection: [
      { month: "M1", revenue: "S/ 2,000", cost: "S/ 500", profit: "S/ 1,500" },
      { month: "M3", revenue: "S/ 6,000", cost: "S/ 1,300", profit: "S/ 4,700" },
      { month: "M6", revenue: "S/ 12,000", cost: "S/ 2,400", profit: "S/ 9,600" },
      { month: "M12", revenue: "S/ 24,000", cost: "S/ 4,500", profit: "S/ 19,500" },
    ],
    includes: [
      "Schema Supabase multi-doctor + 3 doctores seed",
      "Workflow n8n completo (agenda + recordatorios)",
      "Bot WhatsApp con calendario en tiempo real",
      "Dashboard del consultorio + reportes por doctor",
      "Sistema de seña con Stripe (opcional)",
      "Onboarding 7-14 días + Slack privado 90 días",
    ],
    rent: "Desde S/ 2,000/mes",
    buy: "Compra a consultar",
    b2cHref: "https://reserva.activosya.com",
    b2cLabel: "Ver landing B2C",
    subdomain: "reserva.activosya.com",
  },
];

export function getActivo(slug: string): Activo | undefined {
  return ACTIVOS.find((a) => a.slug === slug);
}

export function getAllSlugs(): string[] {
  return ACTIVOS.map((a) => a.slug);
}
