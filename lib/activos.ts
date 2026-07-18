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
    slug: "app-taxi",
    status: "Activo",
    icon: "🚕",
    name: "App de Taxi a medida",
    tagline: "Plataforma de movilidad tipo Uber / InDrive · con agentes IA · a medida",
    shortDescription:
      "Tu propia plataforma de taxi lista para operar: 3 aplicaciones (Pasajero, Conductor y Web Administrador) con agentes de IA integrados. Desarrollada a la medida de tu marca y tu ciudad. Entrega en 1 semana para pruebas.",
    overview:
      "Una solución completa de movilidad construida a medida: app de Pasajero para pedir y pagar viajes, app de Conductor para recibir y gestionar carreras, y un Web Administrador para controlar tarifas, conductores, viajes y finanzas en tiempo real. Todo potenciado con agentes de IA que optimizan el emparejamiento, atienden soporte, detectan fraude y automatizan operaciones. Tú eres dueño del código, la marca y los datos.",
    problem:
      "Montar una plataforma de movilidad desde cero cuesta meses de desarrollo y decenas de miles de soles. Las apps tipo Uber/Didi/InDrive cobran 25-30% de comisión y el operador local no tiene control de su marca, sus tarifas ni sus datos. Las soluciones 'white-label' del mercado son rígidas, caras y sin IA.",
    solution:
      "Una plataforma a medida entregada en 1 semana para pruebas: 3 apps (Pasajero, Conductor, Web Admin) con tu marca, tus tarifas y tus reglas. Agentes de IA integrados para matching inteligente, soporte automático 24/7, detección de fraude y reportes. Cero comisión a terceros — el negocio y los datos son tuyos.",
    metrics: [
      { label: "Aplicaciones incluidas", value: "3 (Pasajero/Conductor/Web Admin)" },
      { label: "Inteligencia artificial", value: "Agentes IA integrados" },
      { label: "Entrega para pruebas", value: "1 semana" },
      { label: "Personalización", value: "100% a medida" },
      { label: "Propiedad", value: "Código + marca + datos del cliente" },
      { label: "Comisión a terceros", value: "0%" },
    ],
    businessModel:
      "Desarrollo a medida con precio cerrado de S/ 12,000 por el paquete de 3 aplicaciones (Pasajero, Conductor y Web Administrador) con agentes de IA. Incluye entrega en 1 semana para pruebas. Soporte, mantenimiento y nuevas funcionalidades cotizables aparte. Ideal para emprendedores y empresas que quieren operar su propia plataforma de movilidad sin pagar comisiones a terceros.",
    stack: ["React Native / Expo (apps móviles)", "Next.js (Web Administrador)", "Claude (agentes IA)", "Supabase", "Maps API (geolocalización)", "Pagos (Yape / billetera / tarjeta)"],
    competitors: [
      { name: "Uber / Didi / Cabify", weakness: "Comisión 25-30%, el operador no controla marca, tarifas ni datos" },
      { name: "InDrive", weakness: "No es tuya, sin personalización, soporte limitado en ciudades intermedias" },
      { name: "White-labels genéricos", weakness: "Rígidos, caros, sin agentes IA, sin entrega rápida" },
      { name: "Desarrollo desde cero", weakness: "Meses de trabajo y decenas de miles de soles" },
    ],
    pnlProjection: [
      { month: "Entrega", revenue: "S/ 12,000", cost: "—", profit: "3 apps + IA" },
      { month: "Semana 1", revenue: "Pruebas", cost: "—", profit: "Versión funcional" },
      { month: "Operación", revenue: "Tarifa propia", cost: "Sin comisión a terceros", profit: "100% tuyo" },
      { month: "Escala", revenue: "Por ciudad", cost: "Cotizable", profit: "Multi-ciudad" },
    ],
    includes: [
      "App de Pasajero (pedir, seguir y pagar viajes)",
      "App de Conductor (recibir y gestionar carreras)",
      "Web Administrador (tarifas, conductores, viajes, finanzas)",
      "Agentes de IA: matching, soporte 24/7, antifraude, reportes",
      "Personalización completa de marca, colores y ciudad",
      "Entrega en 1 semana para pruebas",
      "Código fuente de las 3 aplicaciones",
      "Capacitación de uso + soporte de puesta en marcha",
    ],
    rent: "Consultar plan mensual",
    buy: "S/ 12,000 (3 apps + IA)",
    b2cHref: "#contacto",
    b2cLabel: "Solicitar demo",
  },
  {
    slug: "tumozoya",
    status: "Próximamente",
    icon: "🍽️",
    name: "TuMozoYa",
    tagline: "Carta viva con IA · Sazón anfitrión · Salón + Delivery + Reserva",
    shortDescription:
      "La carta que habla, escucha y antoja. El comensal escanea un QR, pide por voz a Sazón (IA), ve el plato en su mesa y paga con un gesto. Cocina y mozo en vivo, delivery con EcoDrive+ y boleta por WhatsApp. Multi-tenant.",
    overview:
      "TuMozoYa convierte la carta de un restaurante en una experiencia tipo Reels con un anfitrión IA llamado Sazón que conversa, recomienda y arma el pedido. Tres modos en un solo producto: salón en mesa (QR físico), delivery (QR en redes, logística EcoDrive+) y reserva con pre-pedido (mapa de mesas + cocina al tiempo). La cocina recibe las comandas en una pantalla en vivo (KDS) y el mozo cobra y emite boleta. Vende a la mente, no a la gente (neuromarketing Klaric).",
    problem:
      "Las cartas QR de hoy son listas de texto frías que no venden. Los restaurantes pierden ticket por falta de upsell, dependen de apps de delivery que cobran 25-30%, y la toma de pedidos en salón es lenta y con errores. Nadie une carta, pedido, cocina, delivery y facturación en una sola experiencia memorable.",
    solution:
      "Un anfitrión IA (Sazón) que entiende lenguaje natural por voz o texto y sube el ticket con upsell inteligente; un feed inmersivo de platos con AR; comandas en tiempo real a cocina y mozo; delivery con flota propia EcoDrive+ (tarifa taxi +10%, sin comisión de marketplace); reserva que arranca la cocina calculando hacia atrás para que el cliente coma a los minutos de llegar; y boleta/factura lista para SUNAT por WhatsApp.",
    metrics: [
      { label: "Suscripción B2B", value: "S/ 1,900/mes" },
      { label: "Modos en 1 producto", value: "3 (salón/delivery/reserva)" },
      { label: "Comisión por pedido", value: "0%" },
      { label: "Uplift de ticket (upsell IA)", value: "+20-40%" },
      { label: "Margen bruto", value: "76%" },
      { label: "Estado plataforma", value: "En desarrollo" },
    ],
    businessModel:
      "Suscripción mensual al restaurante (sin comisión por pedido) + margen del delivery propio (EcoDrive+). Modelo de franquicia: un operador gestiona N locales sobre la misma infra multi-tenant. Up-selling: facturación electrónica SUNAT, voz premium del anfitrión, y módulo de reservas con adelanto.",
    stack: ["Next.js (App Router)", "React 19", "Claude Sonnet 4.6", "Vercel AI SDK", "Supabase Realtime", "ElevenLabs / Web Speech", "EcoDrive+ API (delivery)", "Framer Motion"],
    competitors: [
      { name: "Cartas QR (Menu.com, etc.)", weakness: "Lista de texto estática, sin IA, sin upsell, no venden" },
      { name: "Rappi / PedidosYa", weakness: "Comisión 25-30%, el local pierde marca y al cliente" },
      { name: "POS tradicionales (Toast, etc.)", weakness: "Caros, foco en caja, sin experiencia para el comensal ni IA" },
      { name: "WhatsApp manual", weakness: "Lento, errores, sin carta visual, sin cocina en vivo" },
    ],
    pnlProjection: [
      { month: "M1", revenue: "S/ 1,900", cost: "S/ 550", profit: "S/ 1,350" },
      { month: "M3", revenue: "S/ 5,700", cost: "S/ 1,300", profit: "S/ 4,400" },
      { month: "M6", revenue: "S/ 11,400", cost: "S/ 2,300", profit: "S/ 9,100" },
      { month: "M12", revenue: "S/ 22,800", cost: "S/ 4,400", profit: "S/ 18,400" },
    ],
    includes: [
      "Código fuente completo + repositorio Git",
      "Anfitrión IA Sazón (voz + texto) con personalidad por local",
      "Feed inmersivo de platos + visor AR + pago invisible",
      "Cocina (KDS) y panel de mozo en tiempo real (Supabase Realtime)",
      "3 modos: salón, delivery EcoDrive+, reserva con cocina al tiempo",
      "Boleta/factura por WhatsApp (listo para SUNAT vía PSE)",
      "Multi-tenant listo para franquicia",
      "Onboarding técnico 7-14 días + Slack privado 90 días",
    ],
    rent: "Desde S/ 1,900/mes",
    buy: "Compra a consultar",
    b2cHref: "https://tumozoya.activosya.com",
    b2cLabel: "Ver demo B2C",
    subdomain: "tumozoya.activosya.com",
  },
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
      { label: "Pricing Regular", value: "S/ 30/mes" },
      { label: "Pricing Premium", value: "S/ 89/mes" },
      { label: "Garantía", value: "6 meses Klaric" },
      { label: "Duración total", value: "12 meses" },
      { label: "Margen bruto", value: "72%" },
      { label: "Estado plataforma", value: "LIVE" },
    ],
    businessModel:
      "Suscripción mensual o anual. Plan Regular S/30/mes (S/299/año, voz Nova ilimitada). Plan Premium S/89/mes (S/799/año, voz ElevenLabs Sofia 45 min/mes). Free tier: 3 días ilimitado + 6 min/día x 30 días. Yape persona-a-persona, validación MacroDroid Android. Escalable sin contratar profesores humanos.",
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
  {
    slug: "tucuentoya",
    status: "Próximamente",
    icon: "🐕",
    name: "TuCuentoYa",
    tagline: "Cuentos infantiles personalizados · Audio IA · WhatsApp",
    shortDescription:
      "Tu hijo es el héroe del cuento. Cliente pide por WhatsApp (texto o audio), el bot Rex 🐕 crea el cuento personalizado y entrega audio MP3 en menos de 60 segundos. Voces peruanas neurales (Camila + Alex). 2, 3 o 5 minutos.",
    overview:
      "TuCuentoYa es una plataforma de cuentos infantiles 100% personalizados. El papá/mamá/abuelo escribe o manda audio diciendo el nombre de su peque, escenario, y duración. El sistema genera un cuento donde el niño es el protagonista, con su familia real como acompañantes, narrado en voz peruana neural. Entrega en MP3 por WhatsApp. Modelo wallet recargable + VIP mensual.",
    problem:
      "Los padres modernos no tienen tiempo de inventar cuentos cada noche. Los cuentos comerciales son genéricos y no involucran al niño. YouTube/podcasts infantiles no son personales ni educativos. Cuentacuentos humanos cuestan S/200+ por sesión.",
    solution:
      "IA + voz neural peruana genera cuentos únicos en 60 segundos. Cada cuento es protagonizado por TU peque, con TU familia, en el escenario que TÚ quieras. Wallet recargable elimina la fricción del Yape por cuento. VIP mensual para familias frecuentes.",
    metrics: [
      { label: "Cuento 2 min", value: "S/ 2" },
      { label: "Cuento 3 min", value: "S/ 3 (más popular)" },
      { label: "Cuento 5 min", value: "S/ 5" },
      { label: "VIP Estrella", value: "S/ 18/mes (20 cuentos)" },
      { label: "VIP Mágico", value: "S/ 30/mes (50 cuentos)" },
      { label: "Margen bruto", value: "68-92%" },
      { label: "Costo por cuento", value: "S/ 0.23 - 0.40" },
      { label: "Tiempo entrega", value: "< 60 segundos" },
      { label: "Estado plataforma", value: "EN BUILD" },
    ],
    businessModel:
      "Wallet recargable como pago principal (Yape) — 4 packs (S/15/30/50/100) con bonus de cuentos extra para reducir fricción. VIP mensual recurrente: Estrella S/18 (20 cuentos) y Mágico S/30 (50 cuentos + música ambient). VIP anual con 2 meses gratis (S/180 / S/300). Add-ons: PDF ilustrado (S/4.90), capítulo continuación (S/4.90), hermanito segundo niño (+S/9/mes en VIP). Promo lanzamiento: primer cuento 2 min gratis + S/5 bonus en primera recarga.",
    stack: [
      "Next.js 16",
      "Claude Sonnet 4.6",
      "Azure Neural TTS (es-PE Camila + Alex)",
      "Groq Whisper STT",
      "Supabase",
      "WhatsApp Meta Cloud API",
      "Yape (Claude Vision verify)",
      "Vercel Fluid",
    ],
    competitors: [
      { name: "Storybooks IA genéricos", weakness: "No personalizan con nombre/familia real, no en español peruano, sin entrega WhatsApp" },
      { name: "Cuentacuentos humanos", weakness: "S/200+ por sesión, horarios fijos, no escalable" },
      { name: "Apps tipo Loora/Speakable", weakness: "Foco en idiomas, no en cuentos personalizados, suscripción cara" },
      { name: "YouTube cuentos", weakness: "Genéricos, no involucran al niño, ads, sin personalización" },
    ],
    pnlProjection: [
      { month: "M1", revenue: "S/ 1,500", cost: "S/ 430", profit: "S/ 1,070" },
      { month: "M3", revenue: "S/ 5,200", cost: "S/ 950", profit: "S/ 4,250" },
      { month: "M6", revenue: "S/ 13,200", cost: "S/ 2,200", profit: "S/ 11,000" },
      { month: "M12", revenue: "S/ 34,200", cost: "S/ 5,300", profit: "S/ 28,900" },
    ],
    includes: [
      "Código fuente completo + repositorio Git",
      "Pipeline Claude + Azure Neural TTS multivoz (SSML)",
      "Wallet recargable + VIP mensual + add-ons",
      "Verificación Yape automática (Claude Vision)",
      "Safety filter contenido infantil (2-10 años)",
      "Multi-tenant listo para franquicia",
      "Schema Supabase con métricas de costo por cuento",
      "Landing cuento.activosya.com",
      "Templates Meta WhatsApp aprobados",
      "Onboarding técnico 7-14 días + Slack 90 días",
    ],
    rent: "Desde S/ 1,200/mes",
    buy: "Compra a consultar",
    b2cHref: "https://cuento.activosya.com",
    b2cLabel: "Probar gratis",
    subdomain: "cuento.activosya.com",
  },
];

export function getActivo(slug: string): Activo | undefined {
  return ACTIVOS.find((a) => a.slug === slug);
}

export function getAllSlugs(): string[] {
  return ACTIVOS.map((a) => a.slug);
}
