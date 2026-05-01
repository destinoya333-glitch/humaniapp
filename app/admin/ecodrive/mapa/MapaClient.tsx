"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

type Viaje = {
  id: number;
  origen_lat: number | null;
  origen_lng: number | null;
  destino_lat: number | null;
  destino_lng: number | null;
  estado: string | null;
  modo: string | null;
  precio_estimado: number | null;
  origen_texto: string | null;
  destino_texto: string | null;
  pasajero_telefono: string | null;
  created_at: string;
};
type Chofer = {
  chofer_id: number;
  telefono: string;
  lat: number | null;
  lng: number | null;
  zona: string | null;
  ultimo_ping: string | null;
  nombre?: string | null;
  vehiculo?: {
    marca?: string;
    modelo?: string;
    color?: string;
    placas?: string;
    ano?: string;
  } | null;
};

// Mapa color en español → CSS hex + si necesita borde oscuro (para colores claros)
const VEHICLE_COLORS: Record<string, { fill: string; stroke: string; glow: string }> = {
  blanco: { fill: "#f3f4f6", stroke: "#1f2937", glow: "#9ca3af" },
  negro: { fill: "#1f2937", stroke: "#f3f4f6", glow: "#6b7280" },
  rojo: { fill: "#dc2626", stroke: "#fff", glow: "#dc2626" },
  azul: { fill: "#2563eb", stroke: "#fff", glow: "#2563eb" },
  celeste: { fill: "#0ea5e9", stroke: "#fff", glow: "#0ea5e9" },
  plateado: { fill: "#9ca3af", stroke: "#fff", glow: "#9ca3af" },
  plata: { fill: "#9ca3af", stroke: "#fff", glow: "#9ca3af" },
  gris: { fill: "#6b7280", stroke: "#fff", glow: "#6b7280" },
  verde: { fill: "#16a34a", stroke: "#fff", glow: "#16a34a" },
  amarillo: { fill: "#eab308", stroke: "#1f2937", glow: "#eab308" },
  dorado: { fill: "#ca8a04", stroke: "#fff", glow: "#ca8a04" },
  naranja: { fill: "#ea580c", stroke: "#fff", glow: "#ea580c" },
  marron: { fill: "#92400e", stroke: "#fff", glow: "#92400e" },
  beige: { fill: "#d4a574", stroke: "#1f2937", glow: "#d4a574" },
  vino: { fill: "#7f1d1d", stroke: "#fff", glow: "#7f1d1d" },
  morado: { fill: "#7c3aed", stroke: "#fff", glow: "#7c3aed" },
  violeta: { fill: "#7c3aed", stroke: "#fff", glow: "#7c3aed" },
  rosado: { fill: "#ec4899", stroke: "#fff", glow: "#ec4899" },
  rosa: { fill: "#ec4899", stroke: "#fff", glow: "#ec4899" },
};

function colorFromVehiculo(v: Chofer["vehiculo"]): { fill: string; stroke: string; glow: string } {
  const raw = (v?.color || "").toLowerCase().trim();
  if (!raw) return { fill: "#f59e0b", stroke: "#fff", glow: "#f59e0b" }; // default ámbar
  // match exacto o parcial
  if (VEHICLE_COLORS[raw]) return VEHICLE_COLORS[raw];
  for (const k of Object.keys(VEHICLE_COLORS)) {
    if (raw.includes(k) || k.includes(raw)) return VEHICLE_COLORS[k];
  }
  return { fill: "#f59e0b", stroke: "#fff", glow: "#f59e0b" };
}

// SVG persona (pasajero) - figura simple
function personSvg(estado: string | null): string {
  // Color segun estado del viaje
  const isActive = estado && ["buscando", "con_ofertas", "asignado", "en_curso"].includes(estado);
  const fill = isActive ? "#10b981" : "#6b7280"; // verde si activo, gris si terminado
  const stroke = "#fff";
  return `
<div style="width:30px; height:30px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
  <svg viewBox="0 0 32 32" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="9" r="5" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    <path d="M6 28 Q6 16 16 16 Q26 16 26 28 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
  </svg>
</div>`;
}

// SVG auto visto desde arriba. headingDeg rota el cuerpo.
function carSvg(color: string, stroke: string, heading: number = 0): string {
  const accent = "#111827";
  return `
<div style="transform: rotate(${heading}deg); transform-origin: 50% 50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6));">
  <svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
    <rect x="16" y="6" width="32" height="52" rx="8" ry="10" fill="${color}" stroke="${stroke}" stroke-width="2"/>
    <path d="M19 14 L45 14 L41 24 L23 24 Z" fill="${accent}" opacity="0.85"/>
    <path d="M23 44 L41 44 L45 54 L19 54 Z" fill="${accent}" opacity="0.85"/>
    <rect x="22" y="26" width="20" height="16" rx="2" fill="${color}" stroke="${stroke}" stroke-width="1" opacity="0.85"/>
    <rect x="13" y="18" width="4" height="8" rx="1.5" fill="#0b0b0b"/>
    <rect x="47" y="18" width="4" height="8" rx="1.5" fill="#0b0b0b"/>
    <rect x="13" y="40" width="4" height="8" rx="1.5" fill="#0b0b0b"/>
    <rect x="47" y="40" width="4" height="8" rx="1.5" fill="#0b0b0b"/>
    <circle cx="24" cy="9" r="1.5" fill="#fef3c7"/>
    <circle cx="40" cy="9" r="1.5" fill="#fef3c7"/>
  </svg>
</div>`;
}
type Summary = { total: number; completados: number; cancelados: number; activos: number; choferes_online: number };

type Mode = "origen" | "destino" | "ambos";

export default function MapaClient() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<{ origen: any; destino: any; choferes: any; heat: any } | null>(null);
  const [mode, setMode] = useState<Mode>("ambos");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [topDeps, setTopDeps] = useState<Array<{ name: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaflet = async () => {
    if (typeof window === "undefined") return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L) return (window as any).L;
    await new Promise<void>((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("No se pudo cargar Leaflet"));
      document.head.appendChild(script);
    });
    await new Promise<void>((resolve, reject) => {
      const heat = document.createElement("script");
      heat.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
      heat.onload = () => resolve();
      heat.onerror = () => reject(new Error("No se pudo cargar leaflet.heat"));
      document.head.appendChild(heat);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).L;
  };

  // Departamentos Perú con coords aprox capital
  const DEPS: Array<{ name: string; lat: number; lng: number }> = [
    { name: "Lima", lat: -12.05, lng: -77.04 },
    { name: "La Libertad", lat: -8.11, lng: -79.03 },
    { name: "Arequipa", lat: -16.4, lng: -71.54 },
    { name: "Piura", lat: -5.19, lng: -80.63 },
    { name: "Lambayeque", lat: -6.77, lng: -79.84 },
    { name: "Cajamarca", lat: -7.16, lng: -78.5 },
    { name: "Cusco", lat: -13.52, lng: -71.97 },
    { name: "Junin", lat: -12.07, lng: -75.21 },
    { name: "Ancash", lat: -9.53, lng: -77.53 },
    { name: "Ayacucho", lat: -13.16, lng: -74.22 },
    { name: "Ica", lat: -14.06, lng: -75.73 },
    { name: "Loreto", lat: -3.75, lng: -73.25 },
    { name: "Puno", lat: -15.84, lng: -70.02 },
    { name: "San Martin", lat: -6.5, lng: -76.36 },
    { name: "Tacna", lat: -18.01, lng: -70.25 },
    { name: "Tumbes", lat: -3.57, lng: -80.45 },
    { name: "Ucayali", lat: -8.38, lng: -74.55 },
    { name: "Madre de Dios", lat: -12.59, lng: -69.18 },
    { name: "Moquegua", lat: -17.2, lng: -70.93 },
    { name: "Pasco", lat: -10.69, lng: -76.26 },
    { name: "Apurimac", lat: -13.63, lng: -72.88 },
    { name: "Huanuco", lat: -9.93, lng: -76.24 },
    { name: "Huancavelica", lat: -12.78, lng: -74.97 },
    { name: "Amazonas", lat: -6.23, lng: -77.87 },
    { name: "Callao", lat: -12.06, lng: -77.13 },
  ];

  const closestDep = (lat: number, lng: number) => {
    let best: { name: string; d: number } | null = null;
    for (const d of DEPS) {
      const dx = (d.lat - lat) ** 2 + (d.lng - lng) ** 2;
      if (!best || dx < best.d) best = { name: d.name, d: dx };
    }
    return best?.name || "?";
  };

  const render = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (L: any, viajes: Viaje[], choferes: Chofer[]) => {
      if (!mapInstance.current) return;
      const map = mapInstance.current;
      // limpiar capas previas
      if (layersRef.current) {
        map.removeLayer(layersRef.current.origen);
        map.removeLayer(layersRef.current.destino);
        map.removeLayer(layersRef.current.choferes);
        if (layersRef.current.heat) map.removeLayer(layersRef.current.heat);
      }
      const origenes = L.layerGroup();
      const destinos = L.layerGroup();
      const choferesL = L.layerGroup();
      const heatPoints: Array<[number, number, number]> = [];

      for (const v of viajes) {
        const showOrigen = mode === "origen" || mode === "ambos";
        const showDestino = mode === "destino" || mode === "ambos";
        if (showOrigen && v.origen_lat && v.origen_lng) {
          L.marker([v.origen_lat, v.origen_lng], {
            icon: L.divIcon({
              html: personSvg(v.estado),
              className: "",
              iconSize: [30, 30],
              iconAnchor: [15, 28],
            }),
          })
            .bindPopup(
              `<b>👤 Pasajero — Viaje #${v.id}</b><br/>📍 ${v.origen_texto?.split(",")[0] || "?"}<br/>🎯 ${v.destino_texto?.split(",")[0] || "?"}<br/>${v.modo || "?"} · S/.${v.precio_estimado?.toFixed(2) || "?"} · ${v.estado}`
            )
            .addTo(origenes);
          heatPoints.push([v.origen_lat, v.origen_lng, 0.5]);
        }
        if (showDestino && v.destino_lat && v.destino_lng) {
          L.circleMarker([v.destino_lat, v.destino_lng], {
            radius: 5,
            fillColor: "#ef4444",
            color: "#ef4444",
            weight: 1,
            fillOpacity: 0.7,
          })
            .bindPopup(
              `<b>Viaje #${v.id}</b><br/>📍 ${v.origen_texto?.split(",")[0] || "?"}<br/>🎯 ${v.destino_texto?.split(",")[0] || "?"}<br/>${v.modo || "?"} · S/.${v.precio_estimado?.toFixed(2) || "?"} · ${v.estado}`
            )
            .addTo(destinos);
          heatPoints.push([v.destino_lat, v.destino_lng, 0.5]);
        }
      }
      for (const c of choferes) {
        if (c.lat && c.lng) {
          const { fill, stroke } = colorFromVehiculo(c.vehiculo);
          const veh = c.vehiculo;
          const vehStr = veh
            ? `${veh.marca || ""} ${veh.modelo || ""}${veh.placas ? " — " + veh.placas : ""}`.trim()
            : "?";
          const colorTxt = veh?.color ? `<br/>Color: ${veh.color}` : "";
          const nombreTxt = c.nombre ? `<br/>Chofer: ${c.nombre}` : "";
          L.marker([c.lat, c.lng], {
            icon: L.divIcon({
              html: carSvg(fill, stroke, 0),
              className: "",
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            }),
          })
            .bindPopup(
              `<b>🚗 ${vehStr}</b>${nombreTxt}${colorTxt}<br/>Tel: ${c.telefono}<br/>Zona: ${c.zona || "?"}<br/>Último ping: ${c.ultimo_ping ? new Date(c.ultimo_ping).toLocaleTimeString("es-PE") : "?"}`
            )
            .addTo(choferesL);
        }
      }
      origenes.addTo(map);
      destinos.addTo(map);
      choferesL.addTo(map);
      // Heatmap
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const heat = (L as any).heatLayer
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (L as any).heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 15 })
        : null;
      if (heat) heat.addTo(map);
      layersRef.current = { origen: origenes, destino: destinos, choferes: choferesL, heat };
    },
    [mode]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const L = await loadLeaflet();
        if (!alive || !mapRef.current || !L) return;
        if (!mapInstance.current) {
          mapInstance.current = L.map(mapRef.current).setView([-8.11, -79.03], 11);
          L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap, © CARTO",
            subdomains: "abcd",
            maxZoom: 19,
          }).addTo(mapInstance.current);
        }
        const r = await fetch("/api/admin/ecodrive/mapa-data");
        if (!r.ok) throw new Error(`API ${r.status}`);
        const data: { viajes: Viaje[]; choferes: Chofer[]; summary: Summary } = await r.json();
        if (!alive) return;
        setSummary(data.summary);
        // Top deps
        const counts = new Map<string, number>();
        for (const v of data.viajes) {
          if (v.origen_lat && v.origen_lng) {
            const dep = closestDep(v.origen_lat, v.origen_lng);
            counts.set(dep, (counts.get(dep) || 0) + 1);
          }
        }
        const sorted = Array.from(counts.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        setTopDeps(sorted);
        render(L, data.viajes, data.choferes);
        setLoading(false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 p-4">
      <header className="flex flex-wrap gap-2 items-center mb-3">
        <Link
          href="/admin/ecodrive"
          className="text-amber-400 hover:text-amber-300 text-sm border border-zinc-800 rounded px-3 py-1"
        >
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold ml-2">🗺️ Mapa EcoDrive+ — Trujillo</h1>
        <div className="flex gap-1 ml-auto">
          {(["origen", "destino", "ambos"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-xs px-3 py-1 rounded border ${
                mode === m
                  ? "bg-amber-500 text-black border-amber-500"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-amber-500/50"
              }`}
            >
              {m === "origen" ? "Orígenes" : m === "destino" ? "Destinos" : "Ambos"}
            </button>
          ))}
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_300px] gap-3 h-[calc(100vh-100px)]">
        <div
          ref={mapRef}
          className="bg-zinc-900 rounded-xl border border-zinc-800 min-h-[400px]"
          style={{ minHeight: "60vh" }}
        />
        <aside className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 overflow-y-auto text-sm">
          {loading && <div className="text-zinc-500">Cargando…</div>}
          {error && <div className="text-red-400 text-xs">⚠️ {error}</div>}
          {summary && (
            <>
              <h3 className="text-[10px] uppercase text-zinc-500 mb-2 tracking-wider">
                📊 Resumen (últ 500 viajes)
              </h3>
              <Row label="Total viajes" value={summary.total} />
              <Row label="Completados" value={summary.completados} accent />
              <Row label="Cancelados" value={summary.cancelados} />
              <Row label="Activos" value={summary.activos} accent />
              <Row label="Choferes online" value={summary.choferes_online} accent />

              <h3 className="text-[10px] uppercase text-zinc-500 mt-5 mb-2 tracking-wider">
                🏙️ Top departamentos
              </h3>
              {topDeps.length === 0 ? (
                <div className="text-zinc-500 text-xs">Sin viajes con coords.</div>
              ) : (
                topDeps.map((d) => <Row key={d.name} label={d.name} value={d.count} />)
              )}

              <h3 className="text-[10px] uppercase text-zinc-500 mt-5 mb-2 tracking-wider">
                🌡️ Densidad
              </h3>
              <div className="h-3 rounded bg-gradient-to-r from-blue-700 via-yellow-300 to-red-600" />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>Bajo</span>
                <span>Medio</span>
                <span>Alto</span>
              </div>

              <div className="mt-5 text-[10px] text-zinc-600 leading-relaxed">
                🟢 Orígenes · 🔴 Destinos · 🟡 Choferes en turno
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function Row({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex justify-between py-1 border-b border-zinc-800/60 text-xs">
      <span className="text-zinc-400">{label}</span>
      <span className={accent ? "font-semibold text-amber-400" : "text-zinc-200"}>{value}</span>
    </div>
  );
}
