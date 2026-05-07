"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ValidateResponse = {
  ok: boolean;
  pasajero_nombre?: string | null;
  expires_at_ms?: number;
  error?: string;
};

type SolicitarResponse = {
  ok: boolean;
  viaje_id?: string;
  estado?: string;
  error?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

const TRUJILLO_CENTER = { lat: -8.115, lng: -79.029 };

async function loadLeaflet(): Promise<unknown> {
  if (typeof window === "undefined") return null;
  if (window.L) return window.L;
  await new Promise<void>((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet="1"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      css.setAttribute("data-leaflet", "1");
      document.head.appendChild(css);
    }
    if (window.L) return resolve();
    const existing = document.querySelector(
      'script[src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"]'
    );
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
  return window.L;
}

function pinIcon(L: { divIcon: (opts: Record<string, unknown>) => unknown }, color: string, label: string) {
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);color:white;font-weight:700;font-size:16px;">${label}</span>
      </div>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
}

export default function PickerClient({ token }: { token: string }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeLineRef = useRef<any>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "invalid" | "expired" | "used">(
    "loading"
  );
  const [pasajeroNombre, setPasajeroNombre] = useState<string | null>(null);
  const [origenLatLng, setOrigenLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [destinoLatLng, setDestinoLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [origenAddr, setOrigenAddr] = useState<string>("");
  const [destinoAddr, setDestinoAddr] = useState<string>("");
  const [pricing, setPricing] = useState<{ km: number; min: number; tarifa: number } | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "ok" | "error">("idle");
  const [submitMsg, setSubmitMsg] = useState<string>("");
  const [activeMode, setActiveMode] = useState<"origen" | "destino">("origen");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ description: string; place_id: string }>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Validar token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/ecodrive/pedir-viaje/${token}`, { cache: "no-store" });
        const j = (await r.json()) as ValidateResponse;
        if (cancelled) return;
        if (!r.ok || !j.ok) {
          if (j.error === "expired") setStatus("expired");
          else if (j.error === "used") setStatus("used");
          else setStatus("invalid");
          return;
        }
        setPasajeroNombre(j.pasajero_nombre || null);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // 2. Inicializar mapa cuando ready
  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (await loadLeaflet()) as any;
      if (cancelled || !mapRef.current || leafletMapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [TRUJILLO_CENTER.lat, TRUJILLO_CENTER.lng],
        zoom: 14,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      leafletMapRef.current = map;

      // Geolocate user
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], 16);
            setOrigen(L, { lat: latitude, lng: longitude });
          },
          () => {
            // Sin GPS, dejamos Trujillo center
            setOrigen(L, TRUJILLO_CENTER);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      } else {
        setOrigen(L, TRUJILLO_CENTER);
      }

      // Tap en mapa pone destino (o origen segun activeMode)
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const ll = { lat: e.latlng.lat, lng: e.latlng.lng };
        if (activeModeRef.current === "origen") setOrigen(L, ll);
        else setDestino(L, ll);
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Mantener ref del modo activo
  const activeModeRef = useRef<"origen" | "destino">("origen");
  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  // 3. Reverse geocode helper
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        const r = await fetch(
          `/api/ecodrive/geocode/reverse?lat=${lat}&lng=${lng}`,
          { cache: "no-store" }
        );
        if (!r.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const j = (await r.json()) as { address?: string };
        return j.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      } catch {
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
    },
    []
  );

  // 4. Setear marker origen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setOrigen = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (L: any, ll: { lat: number; lng: number }) => {
      const map = leafletMapRef.current;
      if (!map) return;
      if (!originMarkerRef.current) {
        originMarkerRef.current = L.marker([ll.lat, ll.lng], {
          icon: pinIcon(L, "#10b981", "A"),
          draggable: true,
        }).addTo(map);
        originMarkerRef.current.on("dragend", async () => {
          const p = originMarkerRef.current.getLatLng();
          const next = { lat: p.lat, lng: p.lng };
          setOrigenLatLng(next);
          setOrigenAddr(await reverseGeocode(next.lat, next.lng));
        });
      } else {
        originMarkerRef.current.setLatLng([ll.lat, ll.lng]);
      }
      setOrigenLatLng(ll);
      setActiveMode("destino"); // siguiente tap = destino
      reverseGeocode(ll.lat, ll.lng).then(setOrigenAddr);
    },
    [reverseGeocode]
  );

  // 5. Setear marker destino
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setDestino = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (L: any, ll: { lat: number; lng: number }) => {
      const map = leafletMapRef.current;
      if (!map) return;
      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker([ll.lat, ll.lng], {
          icon: pinIcon(L, "#ef4444", "B"),
          draggable: true,
        }).addTo(map);
        destMarkerRef.current.on("dragend", async () => {
          const p = destMarkerRef.current.getLatLng();
          const next = { lat: p.lat, lng: p.lng };
          setDestinoLatLng(next);
          setDestinoAddr(await reverseGeocode(next.lat, next.lng));
        });
      } else {
        destMarkerRef.current.setLatLng([ll.lat, ll.lng]);
      }
      setDestinoLatLng(ll);
      reverseGeocode(ll.lat, ll.lng).then(setDestinoAddr);

      // Fit bounds to both pins
      if (originMarkerRef.current) {
        const o = originMarkerRef.current.getLatLng();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.L as any).latLngBounds([o, ll]) &&
          map.fitBounds(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window.L as any).latLngBounds([o, [ll.lat, ll.lng]]),
            { padding: [80, 80] }
          );
      }
    },
    [reverseGeocode]
  );

  // 6. Calcular tarifa cuando ambos pines están
  useEffect(() => {
    if (!origenLatLng || !destinoLatLng) {
      setPricing(null);
      return;
    }
    let cancelled = false;
    setPricingLoading(true);
    (async () => {
      try {
        const r = await fetch(
          `/api/ecodrive/geocode/pricing?` +
            new URLSearchParams({
              olat: String(origenLatLng.lat),
              olng: String(origenLatLng.lng),
              dlat: String(destinoLatLng.lat),
              dlng: String(destinoLatLng.lng),
            }).toString(),
          { cache: "no-store" }
        );
        if (!r.ok) return;
        const j = (await r.json()) as { km: number; min: number; tarifa: number };
        if (!cancelled) setPricing(j);

        // Polyline real Google Directions (siguiendo calles, tipo inDrive/Uber)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L = (window as any).L;
        if (L && leafletMapRef.current) {
          try {
            const dirRes = await fetch(
              `/api/ecodrive/geocode/directions?olat=${origenLatLng.lat}&olng=${origenLatLng.lng}&dlat=${destinoLatLng.lat}&dlng=${destinoLatLng.lng}`,
              { cache: "no-store" }
            );
            const dirJson = (await dirRes.json()) as { points?: [number, number][] | null };
            if (routeLineRef.current) {
              routeLineRef.current.remove();
              routeLineRef.current = null;
            }
            if (dirJson.points && dirJson.points.length >= 2) {
              routeLineRef.current = L.polyline(dirJson.points, {
                color: "#E1811B",
                weight: 6,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }).addTo(leafletMapRef.current);
            } else {
              // Fallback: línea recta punteada si Directions falla
              routeLineRef.current = L.polyline(
                [
                  [origenLatLng.lat, origenLatLng.lng],
                  [destinoLatLng.lat, destinoLatLng.lng],
                ],
                { color: "#E1811B", weight: 4, opacity: 0.6, dashArray: "8 8" }
              ).addTo(leafletMapRef.current);
            }
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [origenLatLng, destinoLatLng]);

  // 7a. Search autocomplete (debounced) — abre panel siempre que hay texto
  const onSearchChange = useCallback(
    (val: string) => {
      setSearchQuery(val);
      // Asegurar que el panel esté abierto cuando hay typing (algunos webviews no disparan onFocus al re-tipear)
      if (val.trim().length >= 1) {
        setSearchOpen(true);
      }
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (val.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      const center = origenLatLng || TRUJILLO_CENTER;
      searchTimerRef.current = setTimeout(async () => {
        try {
          const r = await fetch(
            `/api/ecodrive/geocode/autocomplete?q=${encodeURIComponent(val)}&lat=${center.lat}&lng=${center.lng}`,
            { cache: "no-store" }
          );
          const j = (await r.json()) as {
            predictions?: Array<{ description: string; place_id: string }>;
          };
          setSuggestions(j.predictions || []);
          setSearchOpen(true); // re-asegurar tras llegar resultados
        } catch {
          setSuggestions([]);
        }
      }, 250);
    },
    [origenLatLng]
  );

  const pickSuggestion = useCallback(
    async (place_id: string, description: string) => {
      setSearchOpen(false);
      setSearchQuery("");
      setSuggestions([]);
      try {
        const r = await fetch(`/api/ecodrive/geocode/place-detail?place_id=${place_id}`, {
          cache: "no-store",
        });
        if (!r.ok) return;
        const j = (await r.json()) as { lat: number; lng: number; address?: string };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L = (window as any).L;
        if (!L || !leafletMapRef.current) return;
        const ll = { lat: j.lat, lng: j.lng };
        leafletMapRef.current.setView([ll.lat, ll.lng], 16);
        if (activeModeRef.current === "origen") {
          setOrigen(L, ll);
          setOrigenAddr(j.address || description);
        } else {
          setDestino(L, ll);
          setDestinoAddr(j.address || description);
        }
      } catch {}
    },
    [setOrigen, setDestino]
  );

  // 7b. Solicitar viaje
  const solicitar = async () => {
    if (!origenLatLng || !destinoLatLng || !pricing) return;
    setSubmitState("submitting");
    try {
      const r = await fetch(`/api/ecodrive/pedir-viaje/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origen_lat: origenLatLng.lat,
          origen_lng: origenLatLng.lng,
          origen_direccion: origenAddr,
          destino_lat: destinoLatLng.lat,
          destino_lng: destinoLatLng.lng,
          destino_direccion: destinoAddr,
          distancia_km: pricing.km,
          duracion_min: pricing.min,
          tarifa_estimada: pricing.tarifa,
        }),
      });
      const j = (await r.json()) as SolicitarResponse;
      if (!r.ok || !j.ok) {
        setSubmitState("error");
        setSubmitMsg(j.error || "No se pudo solicitar. Intenta otra vez.");
        return;
      }
      setSubmitState("ok");
      setSubmitMsg("¡Listo! Buscando chofer. Vuelve a tu WhatsApp para recibir el chofer.");
    } catch {
      setSubmitState("error");
      setSubmitMsg("Sin conexión. Intenta otra vez.");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#E1811B] mb-2">EcoDrive+</div>
          <div className="text-zinc-600">Cargando...</div>
        </div>
      </div>
    );
  }
  if (status !== "ready") {
    const msgs: Record<string, string> = {
      invalid: "Link no válido. Pide un nuevo link por WhatsApp.",
      expired: "Link expirado. Pide un nuevo link por WhatsApp.",
      used: "Este link ya fue usado. Pide uno nuevo si quieres pedir otro viaje.",
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-4">
        <div className="bg-white rounded-xl shadow p-6 max-w-sm w-full text-center">
          <div className="text-2xl font-bold text-[#E1811B] mb-2">EcoDrive+</div>
          <div className="text-zinc-700 mb-4">{msgs[status]}</div>
        </div>
      </div>
    );
  }

  if (submitState === "ok") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-4">
        <div className="bg-white rounded-xl shadow p-6 max-w-sm w-full text-center">
          <div className="text-5xl mb-3">🚖</div>
          <div className="text-2xl font-bold text-[#E1811B] mb-2">¡Buscando chofer!</div>
          <div className="text-zinc-700">{submitMsg}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-100">
      <header className="bg-[#E1811B] text-white px-4 py-3 shadow">
        <div className="font-bold text-lg">EcoDrive+ {pasajeroNombre ? `· ${pasajeroNombre.split(" ")[0]}` : ""}</div>
        <div className="text-xs opacity-90">
          {origenLatLng && destinoLatLng
            ? "Confirma tu viaje"
            : !origenLatLng
            ? "1. Confirma de dónde sales (toca el mapa o arrastra el pin verde)"
            : "2. Toca dónde vas (pin rojo)"}
        </div>
      </header>

      <div className="flex-1 relative">
        <div ref={mapRef} className="absolute inset-0" />

        {/* Search box */}
        <div className="absolute top-3 left-3 right-3 z-[1000]">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center px-3 py-2 gap-2">
              <span className="text-xl">🔍</span>
              <input
                type="search"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 250)}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={
                  activeMode === "origen"
                    ? "Buscar dirección de ORIGEN"
                    : "Buscar dirección de DESTINO"
                }
                className="flex-1 outline-none text-base text-zinc-900 bg-transparent placeholder:text-zinc-400"
                style={{ minHeight: 28, fontSize: 16 }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSuggestions([]);
                  }}
                  className="text-zinc-400 hover:text-zinc-700 px-2 text-xl leading-none"
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </div>
            {searchOpen && suggestions.length > 0 && (
              <div className="border-t max-h-72 overflow-y-auto bg-white">
                {suggestions.map((s) => (
                  <button
                    key={s.place_id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(s.place_id, s.description)}
                    className="w-full text-left px-4 py-3 text-sm text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100 border-b last:border-b-0 flex items-start gap-2"
                  >
                    <span className="text-base flex-shrink-0">📍</span>
                    <span className="flex-1">{s.description || "Sin descripción"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toggle mode + Limpiar — abajo del mapa (siempre visible) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[900] flex flex-col items-center gap-2">
          <div className="bg-white rounded-full shadow flex">
            <button
              onClick={() => setActiveMode("origen")}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                activeMode === "origen" ? "bg-emerald-500 text-white" : "text-zinc-700"
              }`}
            >
              A · Origen
            </button>
            <button
              onClick={() => setActiveMode("destino")}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                activeMode === "destino" ? "bg-red-500 text-white" : "text-zinc-700"
              }`}
            >
              B · Destino
            </button>
          </div>
          {(origenLatLng || destinoLatLng) && (
            <button
              onClick={() => {
                if (originMarkerRef.current) {
                  originMarkerRef.current.remove();
                  originMarkerRef.current = null;
                }
                if (destMarkerRef.current) {
                  destMarkerRef.current.remove();
                  destMarkerRef.current = null;
                }
                if (routeLineRef.current) {
                  routeLineRef.current.remove();
                  routeLineRef.current = null;
                }
                setOrigenLatLng(null);
                setDestinoLatLng(null);
                setOrigenAddr("");
                setDestinoAddr("");
                setPricing(null);
                setActiveMode("origen");
              }}
              className="bg-white text-zinc-700 px-4 py-1.5 rounded-full shadow text-xs font-semibold flex items-center gap-1"
            >
              🔄 Limpiar pines
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border-t shadow-lg p-4 space-y-3 max-h-[40vh] overflow-y-auto">
        <div className="text-sm space-y-1">
          <div className="flex items-start gap-2">
            <span className="inline-block w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-center text-sm leading-6">A</span>
            <div className="flex-1 text-zinc-800 break-words">
              {origenAddr || (origenLatLng ? "Cargando dirección..." : "Sin origen")}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="inline-block w-6 h-6 rounded-full bg-red-500 text-white font-bold text-center text-sm leading-6">B</span>
            <div className="flex-1 text-zinc-800 break-words">
              {destinoAddr || (destinoLatLng ? "Cargando dirección..." : "Sin destino")}
            </div>
          </div>
        </div>

        {pricing && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-600">{pricing.km} km · {pricing.min} min</div>
              <div className="text-2xl font-bold text-[#E1811B]">S/ {pricing.tarifa.toFixed(2)}</div>
            </div>
            <div className="text-xs text-zinc-500 max-w-[120px] text-right">
              Tarifa final puede variar
            </div>
          </div>
        )}
        {pricingLoading && !pricing && <div className="text-xs text-zinc-500">Calculando tarifa...</div>}

        <button
          onClick={solicitar}
          disabled={!pricing || submitState === "submitting"}
          className="w-full bg-[#E1811B] disabled:opacity-50 text-white font-bold py-4 rounded-lg text-lg"
        >
          {submitState === "submitting" ? "Solicitando..." : "Solicitar viaje"}
        </button>

        {submitState === "error" && (
          <div className="bg-red-50 text-red-800 text-sm p-3 rounded">{submitMsg}</div>
        )}
      </div>
    </div>
  );
}
