/**
 * ActivosYA — Comandos CEO disponibles solo para Percy.
 *
 * Comandos:
 *   reporte hoy | semana | mes | historico
 *   ventas [servicio]      → solo de un servicio
 *   alertas                → errores recientes
 *   clientes [hoy|semana]  → leads nuevos
 *   resumen                → vista panorámica
 */
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Servicio = "destinoya" | "sofia" | "cuento" | "ecodrive" | "choferya" | "activosya";

const TODOS_SERVICIOS: Servicio[] = ["destinoya", "sofia", "cuento", "ecodrive", "choferya"];

const EMOJI: Record<string, string> = {
  destinoya: "🔮",
  sofia: "🎓",
  cuento: "🦮",
  ecodrive: "🚗",
  choferya: "🧑‍✈️",
  activosya: "🏢",
};

function inicioPeriodo(periodo: "hoy" | "semana" | "mes" | "historico"): Date {
  const ahora = new Date();
  if (periodo === "historico") return new Date("2025-01-01");
  if (periodo === "hoy") {
    ahora.setHours(0, 0, 0, 0);
    return ahora;
  }
  if (periodo === "semana") {
    ahora.setDate(ahora.getDate() - 7);
    return ahora;
  }
  // mes
  ahora.setDate(1);
  ahora.setHours(0, 0, 0, 0);
  return ahora;
}

export async function reportePorPeriodo(periodo: "hoy" | "semana" | "mes" | "historico"): Promise<string> {
  const supabase = db();
  const desde = inicioPeriodo(periodo);

  const { data: eventos, error } = await supabase
    .from("ay_eventos")
    .select("tipo, servicio, monto")
    .gte("created_at", desde.toISOString());
  if (error || !eventos) {
    return `❌ Error consultando eventos: ${error?.message ?? "unknown"}`;
  }

  // Calcular por servicio
  const stats: Record<string, { ingresos: number; clientes: number; errores: number; eventos: number }> = {};
  for (const s of TODOS_SERVICIOS) stats[s] = { ingresos: 0, clientes: 0, errores: 0, eventos: 0 };

  for (const e of eventos) {
    const s = e.servicio as Servicio;
    if (!stats[s]) stats[s] = { ingresos: 0, clientes: 0, errores: 0, eventos: 0 };
    stats[s].eventos++;
    // Cualquier evento con monto > 0 cuenta como ingreso (cuento_generado, yape_confirmado,
    // plan_activado, plan_renovado, consulta_vip, etc.)
    if (Number(e.monto || 0) > 0 && (e.tipo === "yape_confirmado" || e.tipo === "plan_activado" || e.tipo === "plan_renovado" || e.tipo === "cuento_generado" || e.tipo === "consulta_vip")) {
      stats[s].ingresos += Number(e.monto || 0);
    }
    if (e.tipo === "cliente_nuevo" || e.tipo === "lead_b2b") stats[s].clientes++;
    if (e.tipo === "error_bot") stats[s].errores++;
  }

  const titulo: Record<string, string> = {
    hoy: "Hoy",
    semana: "Últimos 7 días",
    mes: "Mes en curso",
    historico: "Histórico (desde día 1)",
  };

  let total_ingresos = 0;
  let total_clientes = 0;
  let total_errores = 0;
  const lines = [`📊 *Reporte ${titulo[periodo]}*`, ""];

  for (const s of TODOS_SERVICIOS) {
    const st = stats[s];
    if (st.eventos === 0) continue;
    lines.push(
      `${EMOJI[s]} *${s}*\n` +
      `   💵 S/${st.ingresos.toFixed(2)} · 👤 ${st.clientes} · ${st.errores > 0 ? "🚨" : "✅"} ${st.errores} err`,
    );
    total_ingresos += st.ingresos;
    total_clientes += st.clientes;
    total_errores += st.errores;
  }
  lines.push("");
  lines.push(`📈 *Total:*`);
  lines.push(`💵 Ingresos: S/${total_ingresos.toFixed(2)}`);
  lines.push(`👥 Clientes nuevos: ${total_clientes}`);
  if (total_errores > 0) lines.push(`🚨 Errores: ${total_errores}`);
  lines.push("");
  lines.push(`_Generado: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}_`);

  return lines.join("\n");
}

export async function ventasPorServicio(servicio?: string): Promise<string> {
  const supabase = db();
  const inicio = inicioPeriodo("hoy");
  let query = supabase
    .from("ay_eventos")
    .select("servicio, monto, cliente_nombre, created_at, tipo")
    .in("tipo", ["yape_confirmado", "plan_activado", "plan_renovado", "cuento_generado", "consulta_vip"])
    .gte("created_at", inicio.toISOString())
    .order("created_at", { ascending: false })
    .limit(20);
  if (servicio) query = query.eq("servicio", servicio);

  const { data, error } = await query;
  if (error || !data) return `❌ Error: ${error?.message}`;
  if (data.length === 0) return `💰 Aún no hay ventas hoy${servicio ? ` en ${servicio}` : ""}.`;

  const total = data.reduce((s, e) => s + Number(e.monto || 0), 0);
  const lines = [`💰 *Ventas hoy${servicio ? ` — ${servicio}` : ""}*`, ""];
  for (const e of data.slice(0, 10)) {
    const hora = new Date(e.created_at).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Lima",
    });
    lines.push(`${hora} · ${EMOJI[e.servicio] || ""} S/${Number(e.monto || 0).toFixed(2)} · ${e.cliente_nombre || "Anónimo"}`);
  }
  if (data.length > 10) lines.push(`...y ${data.length - 10} más.`);
  lines.push("");
  lines.push(`📊 *Total: S/${total.toFixed(2)} · ${data.length} ventas*`);
  return lines.join("\n");
}

export async function alertasRecientes(): Promise<string> {
  const supabase = db();
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("ay_eventos")
    .select("servicio, mensaje_corto, detalle, created_at")
    .eq("tipo", "error_bot")
    .gte("created_at", hace24h.toISOString())
    .order("created_at", { ascending: false })
    .limit(15);
  if (error || !data) return `❌ Error: ${error?.message}`;
  if (data.length === 0) return `✅ *Sin errores en las últimas 24h.*`;

  const lines = [`🚨 *Alertas últimas 24h (${data.length})*`, ""];
  for (const e of data.slice(0, 10)) {
    const hora = new Date(e.created_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });
    const det = (e.detalle as Record<string, unknown>) ?? {};
    const errMsg = String(det.error || det.message || "").slice(0, 100);
    lines.push(`${hora} ${EMOJI[e.servicio] || ""} ${e.servicio}\n   ${errMsg}`);
  }
  return lines.join("\n");
}

export async function clientesNuevos(periodo: "hoy" | "semana" = "hoy"): Promise<string> {
  const supabase = db();
  const desde = inicioPeriodo(periodo);
  const { data, error } = await supabase
    .from("ay_eventos")
    .select("servicio, cliente_nombre, cliente_phone, created_at, detalle")
    .in("tipo", ["cliente_nuevo", "lead_b2b"])
    .gte("created_at", desde.toISOString())
    .order("created_at", { ascending: false });
  if (error || !data) return `❌ Error: ${error?.message}`;
  if (data.length === 0) return `Aún no hay clientes nuevos en este periodo.`;

  const lines = [`👤 *Clientes nuevos (${periodo === "hoy" ? "hoy" : "7 días"}) — ${data.length}*`, ""];
  for (const e of data.slice(0, 15)) {
    const hora = new Date(e.created_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });
    lines.push(`${hora} ${EMOJI[e.servicio] || ""} ${e.cliente_nombre || "Anónimo"} · ${e.cliente_phone || "?"}`);
  }
  return lines.join("\n");
}

export async function resumenPanoramica(): Promise<string> {
  const [hoy, semana, alertas] = await Promise.all([
    reportePorPeriodo("hoy"),
    reportePorPeriodo("semana"),
    alertasRecientes(),
  ]);
  return [
    "🏢 *RESUMEN ACTIVOSYA*",
    "",
    hoy,
    "",
    "═══════════════",
    "",
    semana,
    "",
    "═══════════════",
    "",
    alertas,
  ].join("\n");
}

/**
 * Despachador principal: recibe el texto del comando y devuelve respuesta.
 */
export async function ejecutarComandoCEO(texto: string): Promise<string | null> {
  const t = texto.trim().toLowerCase();
  if (!t.startsWith("/") && !/^(reporte|ventas|alertas|clientes|resumen)/i.test(t)) return null;
  const parts = t.replace(/^\//, "").split(/\s+/);
  const cmd = parts[0];

  try {
    if (cmd === "reporte") {
      const periodo = (parts[1] || "hoy") as "hoy" | "semana" | "mes" | "historico";
      if (!["hoy", "semana", "mes", "historico"].includes(periodo)) {
        return "Uso: /reporte hoy | semana | mes | historico";
      }
      return await reportePorPeriodo(periodo);
    }
    if (cmd === "ventas") {
      return await ventasPorServicio(parts[1]);
    }
    if (cmd === "alertas") {
      return await alertasRecientes();
    }
    if (cmd === "clientes") {
      const p = parts[1] === "semana" ? "semana" : "hoy";
      return await clientesNuevos(p as "hoy" | "semana");
    }
    if (cmd === "resumen") {
      return await resumenPanoramica();
    }
    return null;
  } catch (e) {
    return `❌ Error ejecutando comando: ${(e as Error).message}`;
  }
}
