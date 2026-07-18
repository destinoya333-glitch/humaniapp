/**
 * Generador de gráficos para ActivosYA via QuickChart.io (gratis, server-side).
 *
 * Devuelve URL pública del PNG listo para enviar por WhatsApp.
 */
import { createClient } from "@supabase/supabase-js";

const QUICKCHART_BASE = "https://quickchart.io/chart";
const SERVICIOS = ["destinoya", "sofia", "cuento", "ecodrive", "choferya", "activosya"] as const;

const COLORES: Record<string, string> = {
  destinoya: "#8B5CF6", // morado
  sofia: "#3B82F6",     // azul
  cuento: "#F59E0B",    // ámbar
  ecodrive: "#10B981",  // verde
  choferya: "#EF4444",  // rojo
  activosya: "#E08821", // naranja
};

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function quickChartUrl(config: object, width = 800, height = 500): string {
  const json = encodeURIComponent(JSON.stringify(config));
  return `${QUICKCHART_BASE}?w=${width}&h=${height}&bkg=white&c=${json}`;
}

/**
 * Gráfica de barras: ingresos por servicio en los últimos N días.
 */
export async function graficoIngresosUltimos(dias = 7): Promise<{ url: string; total: number; titulo: string }> {
  const supabase = db();
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("ay_kpi_snapshots")
    .select("servicio, ingresos_dia")
    .gte("fecha", desde);

  const ingresos: Record<string, number> = {};
  for (const s of SERVICIOS) ingresos[s] = 0;
  for (const r of data ?? []) {
    if (ingresos[r.servicio] !== undefined) {
      ingresos[r.servicio] += Number(r.ingresos_dia || 0);
    }
  }

  const labels = SERVICIOS.filter((s) => ingresos[s] > 0).map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  const valores = SERVICIOS.filter((s) => ingresos[s] > 0).map((s) => ingresos[s]);
  const colores = SERVICIOS.filter((s) => ingresos[s] > 0).map((s) => COLORES[s]);
  const total = valores.reduce((s, v) => s + v, 0);

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: `Ingresos últimos ${dias} días (S/.)`,
        data: valores,
        backgroundColor: colores,
        borderRadius: 8,
      }],
    },
    options: {
      plugins: {
        title: { display: true, text: `💰 Ingresos por servicio (${dias} días)`, font: { size: 18 } },
        legend: { display: false },
        datalabels: {
          color: "#000",
          font: { weight: "bold" },
          formatter: (v: number) => `S/${v.toFixed(0)}`,
        },
      },
      scales: { y: { beginAtZero: true, ticks: { callback: (v: number) => `S/${v}` } } },
    },
  };

  return {
    url: quickChartUrl(config),
    total,
    titulo: `Ingresos últimos ${dias} días`,
  };
}

/**
 * Tendencia de ingresos diarios (line chart) - últimos N días.
 */
export async function graficoTendenciaDiaria(dias = 14): Promise<{ url: string; total: number; titulo: string }> {
  const supabase = db();
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("ay_kpi_snapshots")
    .select("fecha, servicio, ingresos_dia")
    .gte("fecha", desde)
    .order("fecha");

  // Pivotear: fechas como x, servicios como series
  const fechas: string[] = [];
  const porServicio: Record<string, number[]> = {};
  for (const s of SERVICIOS) porServicio[s] = [];

  const fechasUnique = Array.from(new Set((data ?? []).map((r) => r.fecha))).sort();
  for (const f of fechasUnique) {
    fechas.push(f.slice(5)); // MM-DD
    for (const s of SERVICIOS) {
      const r = (data ?? []).find((x) => x.fecha === f && x.servicio === s);
      porServicio[s].push(Number(r?.ingresos_dia || 0));
    }
  }

  const datasets = SERVICIOS
    .filter((s) => porServicio[s].some((v) => v > 0))
    .map((s) => ({
      label: s,
      data: porServicio[s],
      borderColor: COLORES[s],
      backgroundColor: COLORES[s] + "33",
      tension: 0.3,
      fill: false,
    }));

  const total = Object.values(porServicio).flat().reduce((s, v) => s + v, 0);

  const config = {
    type: "line",
    data: { labels: fechas, datasets },
    options: {
      plugins: {
        title: { display: true, text: `📈 Tendencia diaria - últimos ${dias} días`, font: { size: 18 } },
        legend: { position: "bottom" },
      },
      scales: { y: { beginAtZero: true, ticks: { callback: (v: number) => `S/${v}` } } },
    },
  };

  return {
    url: quickChartUrl(config, 900, 500),
    total,
    titulo: `Tendencia ${dias} días`,
  };
}

/**
 * Distribución de eventos por tipo (doughnut chart).
 */
export async function graficoDistribucionEventos(dias = 7): Promise<{ url: string; total: number; titulo: string }> {
  const supabase = db();
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("ay_eventos")
    .select("tipo")
    .gte("created_at", desde);

  const conteo: Record<string, number> = {};
  for (const e of data ?? []) {
    conteo[e.tipo] = (conteo[e.tipo] || 0) + 1;
  }

  const labels = Object.keys(conteo);
  const valores = Object.values(conteo);
  const total = valores.reduce((s, v) => s + v, 0);
  const colores = ["#8B5CF6", "#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#E08821", "#EC4899", "#06B6D4", "#84CC16", "#A855F7"];

  const config = {
    type: "doughnut",
    data: {
      labels: labels.map((l) => l.replace(/_/g, " ")),
      datasets: [{ data: valores, backgroundColor: colores.slice(0, labels.length) }],
    },
    options: {
      plugins: {
        title: { display: true, text: `🥧 Eventos últimos ${dias} días (total ${total})`, font: { size: 18 } },
        legend: { position: "right" },
      },
    },
  };

  return {
    url: quickChartUrl(config, 700, 500),
    total,
    titulo: `Distribución eventos ${dias} días`,
  };
}

/**
 * Despachador de comando /grafico [tipo]
 */
export async function despacharGrafico(arg?: string): Promise<{ url: string; caption: string } | string> {
  const t = (arg || "ingresos").toLowerCase();
  try {
    if (t.startsWith("tendenci") || t === "linea" || t === "linea14") {
      const r = await graficoTendenciaDiaria(14);
      return { url: r.url, caption: `📈 *${r.titulo}*\nTotal: S/${r.total.toFixed(2)}` };
    }
    if (t.startsWith("event") || t === "distribuci" || t === "torta" || t === "pie") {
      const r = await graficoDistribucionEventos(7);
      return { url: r.url, caption: `🥧 *${r.titulo}*\nTotal eventos: ${r.total}` };
    }
    // default = ingresos
    const dias = t.includes("mes") ? 30 : t.includes("semana") ? 7 : 7;
    const r = await graficoIngresosUltimos(dias);
    return { url: r.url, caption: `💰 *${r.titulo}*\nTotal: S/${r.total.toFixed(2)}` };
  } catch (e) {
    return `❌ Error generando gráfico: ${(e as Error).message}`;
  }
}
