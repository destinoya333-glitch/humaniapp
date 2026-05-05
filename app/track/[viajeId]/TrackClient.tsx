"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Vehiculo = {
  modelo?: string | null;
  color?: string | null;
  placas?: string | null;
  placa?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

type TrackingHistoryPoint = {
  lat: number;
  lng: number;
  source: string | null;
  heading_deg: number | null;
  speed_kmh: number | null;
  t: string;
};

type ApiResponse = {
  viaje: {
    id: number | string;
    estado: string | null;
    origen_lat: number | null;
    origen_lng: number | null;
    destino_lat: number | null;
    destino_lng: number | null;
    origen_texto: string | null;
    destino_texto: string | null;
    modo: string | null;
    precio_estimado: number | null;
    distancia_km: number | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: any;
    tracking_token?: string | null;
  };
  chofer: {
    nombre: string | null;
    foto: string | null;
    calificacion: number | null;
    telefono: string | null;
    vehiculo: Vehiculo | null;
  } | null;
  chofer_pos: {
    lat: number | null;
    lng: number | null;
    ultimo_ping: string | null;
  } | null;
  tracking_history?: TrackingHistoryPoint[];
  error?: string;
};

const ESTADOS: Record<string, { icon: string; label: string; color: string }> = {
  buscando: { icon: "🔍", label: "Buscando chofer", color: "text-amber-400" },
  con_ofertas: { icon: "💬", label: "Recibiendo ofertas", color: "text-amber-400" },
  asignado: { icon: "🚦", label: "Chofer asignado", color: "text-emerald-400" },
  en_curso: { icon: "🚗", label: "En camino", color: "text-emerald-400" },
  completado: { icon: "✅", label: "Viaje completado", color: "text-emerald-400" },
  cancelado: { icon: "❌", label: "Cancelado", color: "text-red-400" },
};

// Mapa color (texto en español) → CSS color hex
function resolveCarColor(c?: string | null): string {
  if (!c) return "#f59e0b";
  const v = c.toLowerCase().trim();
  const map: Record<string, string> = {
    rojo: "#ef4444",
    red: "#ef4444",
    azul: "#2563eb",
    blue: "#2563eb",
    blanco: "#f5f5f5",
    white: "#f5f5f5",
    gris: "#9ca3af",
    plomo: "#9ca3af",
    plata: "#cbd5e1",
    plateado: "#cbd5e1",
    silver: "#cbd5e1",
    gray: "#9ca3af",
    grey: "#9ca3af",
    negro: "#1f2937",
    black: "#1f2937",
    verde: "#10b981",
    green: "#10b981",
    amarillo: "#facc15",
    yellow: "#facc15",
    naranja: "#fb923c",
    orange: "#fb923c",
    morado: "#a855f7",
    violeta: "#a855f7",
    purple: "#a855f7",
    cafe: "#92400e",
    "café": "#92400e",
    marron: "#92400e",
    "marrón": "#92400e",
    brown: "#92400e",
    dorado: "#eab308",
    gold: "#eab308",
    beige: "#e7d3a3",
  };
  if (map[v]) return map[v];
  // si parece hex valido
  if (/^#?[0-9a-f]{6}$/i.test(v)) return v.startsWith("#") ? v : `#${v}`;
  return "#f59e0b";
}

// Haversine en km
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Bearing en grados (0=N, 90=E)
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

function carSvg(color: string, heading: number): string {
  // Auto visto desde arriba, simple. headingDeg → rota el SVG.
  const stroke = "#0b0b0b";
  const accent = "#111827";
  return `
<div style="transform: rotate(${heading}deg); transform-origin: 50% 50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
  <svg viewBox="0 0 64 64" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
    <!-- cuerpo -->
    <rect x="16" y="6" width="32" height="52" rx="8" ry="10" fill="${color}" stroke="${stroke}" stroke-width="2"/>
    <!-- parabrisas frontal -->
    <path d="M19 14 L45 14 L41 24 L23 24 Z" fill="${accent}" opacity="0.85"/>
    <!-- parabrisas trasero -->
    <path d="M23 44 L41 44 L45 54 L19 54 Z" fill="${accent}" opacity="0.85"/>
    <!-- techo -->
    <rect x="22" y="26" width="20" height="16" rx="2" fill="${color}" stroke="${stroke}" stroke-width="1" opacity="0.85"/>
    <!-- ruedas -->
    <rect x="13" y="18" width="4" height="8" rx="1.5" fill="${stroke}"/>
    <rect x="47" y="18" width="4" height="8" rx="1.5" fill="${stroke}"/>
    <rect x="13" y="40" width="4" height="8" rx="1.5" fill="${stroke}"/>
    <rect x="47" y="40" width="4" height="8" rx="1.5" fill="${stroke}"/>
    <!-- faro frontal -->
    <circle cx="24" cy="9" r="1.5" fill="#fef3c7"/>
    <circle cx="40" cy="9" r="1.5" fill="#fef3c7"/>
  </svg>
</div>`;
}

function pinSvg(color: string, label: string): string {
  return `
<div style="transform: translate(-50%, -100%); display:flex; flex-direction:column; align-items:center;">
  <svg viewBox="0 0 32 40" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 1 C7 1 1 8 1 16 C1 26 16 39 16 39 C16 39 31 26 31 16 C31 8 25 1 16 1 Z" fill="${color}" stroke="#0b0b0b" stroke-width="1.5"/>
    <circle cx="16" cy="15" r="5" fill="#fff"/>
  </svg>
  <span style="font-size:9px; color:#fff; background:${color}; padding:1px 4px; border-radius:3px; margin-top:-6px; white-space:nowrap;">${label}</span>
</div>`;
}

async function loadLeaflet(): Promise<unknown> {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.L) return w.L;
  await new Promise<void>((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet="1"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      css.setAttribute("data-leaflet", "1");
      document.head.appendChild(css);
    }
    if (w.L) return resolve();
    const existing = document.querySelector(
      'script[src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"]'
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("leaflet load")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("leaflet load"));
    document.head.appendChild(script);
  });
  return w.L;
}

export default function TrackClient({ viajeId }: { viajeId: string }) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const carMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const origenMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destinoMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historyLineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const remainingLineRef = useRef<any>(null);
  const fitDoneRef = useRef(false);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Array<{ lat: number; lng: number; t: number }>>([]);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [sosState, setSosState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Fetch periódico
  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`/api/track/${encodeURIComponent(viajeId)}`, {
        cache: "no-store",
      });
      if (r.status === 404) {
        setError("not_found");
        setLoading(false);
        return;
      }
      if (!r.ok) {
        throw new Error(`API ${r.status}`);
      }
      const json = (await r.json()) as ApiResponse;
      setData(json);
      setError(null);
      setLoading(false);
      // Histórico viene del API (persistido en viaje_tracking_pings)
      if (Array.isArray(json.tracking_history) && json.tracking_history.length > 0) {
        const mapped = json.tracking_history.map((p) => ({
          lat: Number(p.lat),
          lng: Number(p.lng),
          t: p.t ? new Date(p.t).getTime() : Date.now(),
        }));
        setHistory(mapped);
      } else if (json.chofer_pos?.lat && json.chofer_pos?.lng) {
        // Fallback: construir history en memoria si el API aún no tiene pings
        setHistory((prev) => {
          const last = prev[prev.length - 1];
          const lat = json.chofer_pos!.lat as number;
          const lng = json.chofer_pos!.lng as number;
          if (last && Math.abs(last.lat - lat) < 1e-6 && Math.abs(last.lng - lng) < 1e-6) {
            return prev;
          }
          const next = [...prev, { lat, lng, t: Date.now() }];
          return next.slice(-60);
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setLoading(false);
    }
  }, [viajeId]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Init mapa
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L: any = await loadLeaflet();
        if (!alive || !L || !mapDivRef.current || mapRef.current) return;
        const map = L.map(mapDivRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([-8.115, -79.029], 13);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;
      } catch {
        /* noop */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Render markers / lines cuando llega data
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const L = w.L;
    if (!L || !mapRef.current || !data) return;
    const map = mapRef.current;

    const v = data.viaje;
    const carColor = resolveCarColor(
      data.chofer?.vehiculo?.color || data.viaje?.metadata?.vehiculo?.color || null
    );

    // Origen marker (verde)
    if (v.origen_lat && v.origen_lng) {
      if (!origenMarkerRef.current) {
        origenMarkerRef.current = L.marker([v.origen_lat, v.origen_lng], {
          icon: L.divIcon({
            html: pinSvg("#10b981", "Origen"),
            className: "",
            iconSize: [28, 36],
            iconAnchor: [14, 36],
          }),
        }).addTo(map);
      } else {
        origenMarkerRef.current.setLatLng([v.origen_lat, v.origen_lng]);
      }
    }

    // Destino marker (rojo)
    if (v.destino_lat && v.destino_lng) {
      if (!destinoMarkerRef.current) {
        destinoMarkerRef.current = L.marker([v.destino_lat, v.destino_lng], {
          icon: L.divIcon({
            html: pinSvg("#ef4444", "Destino"),
            className: "",
            iconSize: [28, 36],
            iconAnchor: [14, 36],
          }),
        }).addTo(map);
      } else {
        destinoMarkerRef.current.setLatLng([v.destino_lat, v.destino_lng]);
      }
    }

    // Auto + heading
    const cp = data.chofer_pos;
    if (cp?.lat != null && cp?.lng != null) {
      let heading = 0;
      if (history.length >= 2) {
        const a = history[history.length - 2];
        const b = history[history.length - 1];
        heading = bearing(a.lat, a.lng, b.lat, b.lng);
      } else if (v.destino_lat && v.destino_lng) {
        heading = bearing(cp.lat, cp.lng, v.destino_lat, v.destino_lng);
      }
      const html = carSvg(carColor, heading);
      if (!carMarkerRef.current) {
        carMarkerRef.current = L.marker([cp.lat, cp.lng], {
          icon: L.divIcon({
            html,
            className: "",
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
          zIndexOffset: 1000,
        }).addTo(map);
      } else {
        carMarkerRef.current.setLatLng([cp.lat, cp.lng]);
        carMarkerRef.current.setIcon(
          L.divIcon({
            html,
            className: "",
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          })
        );
      }
    }

    // Polyline ruta histórica (azul)
    if (history.length >= 2) {
      const latlngs = history.map((h) => [h.lat, h.lng]);
      if (!historyLineRef.current) {
        historyLineRef.current = L.polyline(latlngs, {
          color: "#3b82f6",
          weight: 4,
          opacity: 0.85,
        }).addTo(map);
      } else {
        historyLineRef.current.setLatLngs(latlngs);
      }
    }

    // Línea punteada gris desde chofer → destino (ruta restante)
    if (cp?.lat != null && cp?.lng != null && v.destino_lat && v.destino_lng) {
      const latlngs = [
        [cp.lat, cp.lng],
        [v.destino_lat, v.destino_lng],
      ];
      if (!remainingLineRef.current) {
        remainingLineRef.current = L.polyline(latlngs, {
          color: "#9ca3af",
          weight: 2,
          opacity: 0.7,
          dashArray: "6, 8",
        }).addTo(map);
      } else {
        remainingLineRef.current.setLatLngs(latlngs);
      }
    }

    // Fit bounds primera vez
    if (!fitDoneRef.current) {
      const pts: Array<[number, number]> = [];
      if (v.origen_lat && v.origen_lng) pts.push([v.origen_lat, v.origen_lng]);
      if (v.destino_lat && v.destino_lng) pts.push([v.destino_lat, v.destino_lng]);
      if (cp?.lat != null && cp?.lng != null) pts.push([cp.lat, cp.lng]);
      if (pts.length >= 2) {
        try {
          map.fitBounds(pts, { padding: [40, 40] });
          fitDoneRef.current = true;
        } catch {
          /* noop */
        }
      } else if (pts.length === 1) {
        map.setView(pts[0], 15);
        fitDoneRef.current = true;
      }
    }
  }, [data, history]);

  // Métricas derivadas
  const metrics = useMemo(() => {
    if (!data) return null;
    const cp = data.chofer_pos;
    const v = data.viaje;
    let distRemainingKm: number | null = null;
    if (cp?.lat != null && cp?.lng != null && v.destino_lat && v.destino_lng) {
      distRemainingKm = distanceKm(cp.lat, cp.lng, v.destino_lat, v.destino_lng);
    }
    let speedKmh: number | null = null;
    if (history.length >= 2) {
      const a = history[history.length - 2];
      const b = history[history.length - 1];
      const dKm = distanceKm(a.lat, a.lng, b.lat, b.lng);
      const dtH = (b.t - a.t) / 1000 / 3600;
      if (dtH > 0) speedKmh = dKm / dtH;
    }
    let etaMin: number | null = null;
    if (distRemainingKm != null) {
      const v_eff = speedKmh && speedKmh > 5 ? speedKmh : 30;
      etaMin = (distRemainingKm / v_eff) * 60;
    }
    return { distRemainingKm, speedKmh, etaMin };
  }, [data, history]);

  // SOS — pasajero en peligro
  const handleSos = useCallback(async () => {
    if (sosState === "sending") return;
    if (typeof window === "undefined") return;
    const confirmed = window.confirm(
      "Estas en peligro? Vamos a alertar a Percy admin con tu ubicacion."
    );
    if (!confirmed) return;
    setSosState("sending");

    // Intenta capturar geolocalizacion del pasajero
    const tryGeo = (): Promise<{ lat: number | null; lng: number | null }> =>
      new Promise((resolve) => {
        if (!("geolocation" in navigator)) {
          return resolve({ lat: null, lng: null });
        }
        const timer = setTimeout(() => resolve({ lat: null, lng: null }), 4000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => {
            clearTimeout(timer);
            resolve({ lat: null, lng: null });
          },
          { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
        );
      });

    const { lat, lng } = await tryGeo();
    try {
      const r = await fetch(
        `/api/track/${encodeURIComponent(viajeId)}/sos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat,
            lng,
            message: "SOS desde tracking web",
          }),
        }
      );
      if (!r.ok) throw new Error(`SOS ${r.status}`);
      setSosState("sent");
      setTimeout(() => setSosState("idle"), 6000);
    } catch {
      setSosState("error");
      setTimeout(() => setSosState("idle"), 5000);
    }
  }, [sosState, viajeId]);

  // Share / copy
  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = "Sigue mi viaje EcoDrive+ en vivo";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (nav?.share) {
        await nav.share({ title: "EcoDrive+ Tracking", text, url });
        return;
      }
    } catch {
      /* fallback */
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copiado");
      setTimeout(() => setShareMsg(null), 2000);
    } catch {
      setShareMsg("No se pudo compartir");
      setTimeout(() => setShareMsg(null), 2000);
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────
  if (error === "not_found") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2">Viaje no encontrado</h1>
          <p className="text-zinc-400 mb-6">
            El link de tracking no es válido o el viaje fue eliminado.
          </p>
          <Link
            href="/ecodriveplus"
            className="inline-block bg-amber-500 text-black font-semibold px-5 py-2 rounded-lg hover:bg-amber-400 transition"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  const estado = data?.viaje?.estado || "buscando";
  const estadoInfo = ESTADOS[estado] || {
    icon: "•",
    label: estado,
    color: "text-zinc-300",
  };
  const isCompletado = estado === "completado";
  const isCancelado = estado === "cancelado";

  const chofer = data?.chofer;
  const veh = chofer?.vehiculo || data?.viaje?.metadata?.vehiculo || null;
  const placa = veh?.placas || veh?.placa || null;

  const distFmt = (km: number | null) =>
    km == null
      ? "—"
      : km < 1
      ? `${Math.round(km * 1000)} m`
      : `${km.toFixed(km < 10 ? 2 : 1)} km`;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between sticky top-0 z-[1000]">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚗</span>
          <span className="font-bold text-amber-400 text-lg">EcoDrive+</span>
          <span className="text-zinc-500 text-xs ml-2 hidden sm:inline">
            Tracking en vivo
          </span>
        </div>
        <div className={`text-sm font-medium ${estadoInfo.color}`}>
          {estadoInfo.icon} {estadoInfo.label}
        </div>
      </header>

      {/* Layout principal */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:h-[calc(100vh-56px)]">
        {/* Mapa */}
        <div className="relative">
          <div
            ref={mapDivRef}
            className="w-full bg-zinc-900"
            style={{ height: "60vh", minHeight: 320 }}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 pointer-events-none">
              <div className="text-zinc-300 text-sm animate-pulse">Cargando viaje…</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 overflow-y-auto p-4 space-y-4">
          {/* Banner completado */}
          {isCompletado && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl mb-1">✅</div>
              <div className="font-bold text-emerald-300">Viaje completado</div>
              <Link
                href="/ecodriveplus"
                className="inline-block mt-3 bg-amber-500 text-black font-semibold px-4 py-2 rounded-lg hover:bg-amber-400 transition text-sm"
              >
                Volver al inicio
              </Link>
            </div>
          )}
          {isCancelado && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl mb-1">❌</div>
              <div className="font-bold text-red-300">Viaje cancelado</div>
              <Link
                href="/ecodriveplus"
                className="inline-block mt-3 bg-amber-500 text-black font-semibold px-4 py-2 rounded-lg hover:bg-amber-400 transition text-sm"
              >
                Volver al inicio
              </Link>
            </div>
          )}

          {/* Chofer card */}
          {chofer ? (
            <div className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
                  {chofer.foto ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={chofer.foto}
                      alt={chofer.nombre || "Chofer"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "👤"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {chofer.nombre || "Chofer EcoDrive+"}
                  </div>
                  <div className="text-xs text-amber-400">
                    ⭐{" "}
                    {chofer.calificacion != null
                      ? Number(chofer.calificacion).toFixed(1)
                      : "Nuevo"}
                  </div>
                </div>
              </div>
              {veh && (
                <div className="mt-3 border-t border-zinc-800 pt-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Vehículo</span>
                    <span className="font-medium">{veh.modelo || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Color</span>
                    <span className="font-medium capitalize flex items-center gap-1.5">
                      <span
                        className="inline-block w-3 h-3 rounded-full border border-zinc-700"
                        style={{
                          background: resolveCarColor(veh.color),
                        }}
                      />
                      {veh.color || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Placa</span>
                    <span className="font-mono font-medium">{placa || "—"}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-4 text-center text-sm text-zinc-400">
              {estado === "buscando" || estado === "con_ofertas" ? (
                <>
                  <div className="text-2xl mb-1">🔍</div>
                  Buscando un chofer cerca…
                </>
              ) : (
                "Información del chofer pendiente"
              )}
            </div>
          )}

          {/* Métricas */}
          {!isCompletado && !isCancelado && (
            <div className="grid grid-cols-3 gap-2">
              <Metric
                label="ETA"
                value={
                  metrics?.etaMin != null
                    ? `${Math.max(1, Math.round(metrics.etaMin))} min`
                    : "—"
                }
              />
              <Metric
                label="Distancia"
                value={distFmt(metrics?.distRemainingKm ?? null)}
              />
              <Metric
                label="Velocidad"
                value={
                  metrics?.speedKmh != null
                    ? `${Math.round(metrics.speedKmh)} km/h`
                    : "—"
                }
              />
            </div>
          )}

          {/* Origen / Destino */}
          <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-3 text-xs space-y-2">
            <div className="flex gap-2">
              <span className="text-emerald-400 mt-0.5">●</span>
              <div className="flex-1">
                <div className="text-zinc-500 text-[10px] uppercase tracking-wide">
                  Origen
                </div>
                <div>{data?.viaje?.origen_texto || "—"}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-red-400 mt-0.5">●</span>
              <div className="flex-1">
                <div className="text-zinc-500 text-[10px] uppercase tracking-wide">
                  Destino
                </div>
                <div>{data?.viaje?.destino_texto || "—"}</div>
              </div>
            </div>
            {data?.viaje?.precio_estimado != null && (
              <div className="flex justify-between border-t border-zinc-800 pt-2 mt-2">
                <span className="text-zinc-400">Tarifa</span>
                <span className="font-semibold text-amber-400">
                  S/ {Number(data.viaje.precio_estimado).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="grid grid-cols-2 gap-2">
            {chofer?.telefono && !isCompletado && !isCancelado ? (
              <a
                href={`tel:+${String(chofer.telefono).replace(/[^0-9]/g, "")}`}
                className="bg-emerald-500 text-black font-semibold py-3 rounded-lg text-center hover:bg-emerald-400 transition text-sm"
              >
                📞 Llamar
              </a>
            ) : (
              <button
                disabled
                className="bg-zinc-800 text-zinc-500 font-semibold py-3 rounded-lg text-sm cursor-not-allowed"
              >
                📞 Llamar
              </button>
            )}
            <button
              onClick={handleShare}
              className="bg-amber-500 text-black font-semibold py-3 rounded-lg hover:bg-amber-400 transition text-sm"
            >
              📤 Compartir
            </button>
          </div>
          {shareMsg && (
            <div className="text-center text-xs text-emerald-400">{shareMsg}</div>
          )}

          <div className="text-[10px] text-zinc-600 text-center pt-2">
            Actualizando cada 5s
          </div>
        </aside>
      </div>

      {/* SOS FAB — fijo abajo derecha */}
      {!isCompletado && !isCancelado && (
        <button
          type="button"
          onClick={handleSos}
          disabled={sosState === "sending"}
          aria-label="SOS - emergencia"
          className={`fixed bottom-5 right-5 z-[2000] rounded-full shadow-lg shadow-red-900/40 font-bold text-white text-sm px-5 py-4 transition active:scale-95 ${
            sosState === "sent"
              ? "bg-emerald-600"
              : sosState === "error"
              ? "bg-amber-600"
              : "bg-red-600 hover:bg-red-500"
          }`}
          style={{ minWidth: 92 }}
        >
          {sosState === "sending"
            ? "Enviando…"
            : sosState === "sent"
            ? "✅ Enviado"
            : sosState === "error"
            ? "⚠️ Error"
            : "🚨 SOS"}
        </button>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800/40 border border-zinc-800 rounded-lg p-2 text-center">
      <div className="text-[10px] uppercase text-zinc-500 tracking-wide">{label}</div>
      <div className="font-semibold text-amber-400 text-sm">{value}</div>
    </div>
  );
}
