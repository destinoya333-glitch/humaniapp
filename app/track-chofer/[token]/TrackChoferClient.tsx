"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Status =
  | "init"
  | "validating"
  | "ready"
  | "tracking"
  | "paused"
  | "error_token"
  | "error_geo"
  | "off_turno";

type Stats = {
  sent: number;
  failed: number;
  lastSentAt: number | null;
  lastLat: number | null;
  lastLng: number | null;
  lastAccuracy: number | null;
  lastError: string | null;
};

const POST_INTERVAL_MS = 8000; // cada 8s envia ping
const MIN_DISTANCE_M = 15; // o si se movio >15m

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function TrackChoferClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("init");
  const [stats, setStats] = useState<Stats>({
    sent: 0,
    failed: 0,
    lastSentAt: null,
    lastLat: null,
    lastLng: null,
    lastAccuracy: null,
    lastError: null,
  });
  const [tokenInfo, setTokenInfo] = useState<{ chofer_id: number; expires_at_ms: number } | null>(
    null
  );

  const watchIdRef = useRef<number | null>(null);
  const lastPostAtRef = useRef<number>(0);
  const lastPostedRef = useRef<{ lat: number; lng: number } | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  // 1) Validar token via GET
  useEffect(() => {
    let cancelled = false;
    setStatus("validating");
    (async () => {
      try {
        const r = await fetch(
          `/api/ecodrive/tracker/update?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok || !data.ok) {
          setStatus("error_token");
          setStats((s) => ({ ...s, lastError: data.error || `HTTP ${r.status}` }));
          return;
        }
        setTokenInfo({ chofer_id: data.chofer_id, expires_at_ms: data.expires_at_ms });
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setStatus("error_token");
        setStats((s) => ({ ...s, lastError: e instanceof Error ? e.message : String(e) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const postPing = useCallback(
    async (lat: number, lng: number, accuracy: number | null) => {
      try {
        const r = await fetch("/api/ecodrive/tracker/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, lat, lng, accuracy }),
        });
        const data = await r.json();
        if (!r.ok) {
          if (data.error === "chofer_off_turno") {
            setStatus("off_turno");
          }
          setStats((s) => ({
            ...s,
            failed: s.failed + 1,
            lastError: data.error || `HTTP ${r.status}`,
          }));
          return;
        }
        lastPostedRef.current = { lat, lng };
        lastPostAtRef.current = Date.now();
        setStats((s) => ({
          ...s,
          sent: s.sent + 1,
          lastSentAt: Date.now(),
          lastLat: lat,
          lastLng: lng,
          lastAccuracy: accuracy,
          lastError: null,
        }));
      } catch (e) {
        setStats((s) => ({
          ...s,
          failed: s.failed + 1,
          lastError: e instanceof Error ? e.message : String(e),
        }));
      }
    },
    [token]
  );

  const onPosition = useCallback(
    (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null;

      setStats((s) => ({ ...s, lastLat: lat, lastLng: lng, lastAccuracy: accuracy }));

      // Throttle: cada POST_INTERVAL_MS o si se movio mas de MIN_DISTANCE_M
      const now = Date.now();
      const moved =
        lastPostedRef.current &&
        distanceM(lastPostedRef.current, { lat, lng }) > MIN_DISTANCE_M;
      const elapsed = now - lastPostAtRef.current;
      const isFirst = !lastPostedRef.current;
      if (isFirst || moved || elapsed >= POST_INTERVAL_MS) {
        postPing(lat, lng, accuracy);
      }
    },
    [postPing]
  );

  const onError = useCallback((err: GeolocationPositionError) => {
    setStatus("error_geo");
    setStats((s) => ({ ...s, lastError: err.message || `geo_err_${err.code}` }));
  }, []);

  const startTracking = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setStatus("error_geo");
      setStats((s) => ({ ...s, lastError: "navigator.geolocation no disponible" }));
      return;
    }
    setStatus("tracking");

    // Wake Lock para que la pantalla no se duerma (no funciona en todos los browsers, OK if fails)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (nav.wakeLock?.request) {
        wakeLockRef.current = await nav.wakeLock.request("screen");
      }
    } catch {
      /* ignore */
    }

    const id = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 30000,
    });
    watchIdRef.current = id;
  }, [onPosition, onError]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        /* ignore */
      }
      wakeLockRef.current = null;
    }
    setStatus("paused");
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  const expiresMin = tokenInfo
    ? Math.max(0, Math.round((tokenInfo.expires_at_ms - Date.now()) / 60000))
    : 0;
  const lastSentAgo = stats.lastSentAt
    ? Math.round((Date.now() - stats.lastSentAt) / 1000)
    : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-5 flex flex-col">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🚗 EcoDrive+ Rastreador</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Mantén esta página abierta mientras estés en turno. El bot avisa al pasajero con tu
          ubicación en tiempo real.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 mb-4">
        {status === "init" || status === "validating" ? (
          <div className="text-zinc-400">Validando token...</div>
        ) : status === "error_token" ? (
          <div>
            <div className="text-red-400 font-semibold">⚠️ Token inválido o expirado</div>
            <div className="text-xs text-zinc-500 mt-2">{stats.lastError}</div>
            <p className="text-sm text-zinc-300 mt-3">
              Manda <span className="font-mono bg-zinc-800 px-1">si</span> al bot EcoDrive+ para
              recibir un nuevo link.
            </p>
          </div>
        ) : status === "error_geo" ? (
          <div>
            <div className="text-red-400 font-semibold">⚠️ Error de GPS</div>
            <div className="text-xs text-zinc-500 mt-2">{stats.lastError}</div>
            <p className="text-sm text-zinc-300 mt-3">
              Activa el GPS de tu celular y permite la ubicación a este sitio.
            </p>
          </div>
        ) : status === "off_turno" ? (
          <div>
            <div className="text-amber-400 font-semibold">⏸️ Turno apagado</div>
            <p className="text-sm text-zinc-300 mt-2">
              Tu cuenta está en pausa. Manda <span className="font-mono bg-zinc-800 px-1">si</span>{" "}
              al bot para volver a recibir pedidos.
            </p>
          </div>
        ) : status === "ready" ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-500" />
              <div className="text-sm text-zinc-300">Listo para iniciar</div>
            </div>
            <button
              onClick={startTracking}
              className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3"
            >
              ▶️ Empezar a transmitir mi ubicación
            </button>
            <p className="text-[11px] text-zinc-500 mt-3">
              Tu navegador te pedirá permiso para acceder al GPS. Acepta para que el pasajero te
              vea en el mapa.
            </p>
          </div>
        ) : status === "tracking" ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-sm text-emerald-300">Transmitiendo en vivo</div>
            </div>
            <button
              onClick={stopTracking}
              className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 text-sm"
            >
              ⏸️ Pausar rastreo
            </button>
          </div>
        ) : status === "paused" ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-500" />
              <div className="text-sm text-zinc-300">En pausa</div>
            </div>
            <button
              onClick={startTracking}
              className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3"
            >
              ▶️ Reanudar
            </button>
          </div>
        ) : null}
      </section>

      {(status === "tracking" || status === "paused") && (
        <section className="grid grid-cols-2 gap-3 mb-4">
          <Stat label="Pings enviados" value={String(stats.sent)} />
          <Stat label="Errores" value={String(stats.failed)} />
          <Stat
            label="Última posición"
            value={
              stats.lastLat != null && stats.lastLng != null
                ? `${stats.lastLat.toFixed(5)}, ${stats.lastLng.toFixed(5)}`
                : "—"
            }
            wide
          />
          <Stat
            label="Precisión GPS"
            value={stats.lastAccuracy != null ? `${stats.lastAccuracy.toFixed(0)} m` : "—"}
          />
          <Stat label="Último envío" value={lastSentAgo != null ? `hace ${lastSentAgo}s` : "—"} />
        </section>
      )}

      {tokenInfo && (
        <p className="text-[11px] text-zinc-600 mt-auto">
          Sesión activa por {expiresMin} min · Se renueva al volver a activar turno desde el bot.
        </p>
      )}
      {stats.lastError && status !== "error_token" && status !== "error_geo" && (
        <p className="text-[11px] text-red-400 mt-1">⚠️ Última: {stats.lastError}</p>
      )}
    </main>
  );
}

function Stat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div
      className={`rounded-lg bg-zinc-900/50 border border-zinc-800 px-3 py-2 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-sm font-semibold mt-0.5 text-zinc-100">{value}</div>
    </div>
  );
}
