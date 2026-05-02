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

type PendingOffer = {
  has_offer: boolean;
  kind?: "asignado" | "oferta_pendiente";
  viaje_id?: number;
  offer_id?: number;
  origen?: string;
  destino?: string;
  precio?: number;
  distancia_km?: number;
  estado?: string;
  estado_viaje?: string;
  created_at?: string;
};

const POST_INTERVAL_MS = 8000;
const MIN_DISTANCE_M = 15;
const POLL_OFFER_MS = 5000;

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Beeps tipo campana antes y despues de la voz
function playBellChime(audioCtx: AudioContext, baseDelay = 0) {
  const beep = (freq: number, dur: number, delay: number) => {
    const startAt = audioCtx.currentTime + baseDelay + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.0, startAt);
    gain.gain.linearRampToValueAtTime(0.5, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.05);
  };
  // Campana doble ascendente (estilo notificacion premium)
  beep(1320, 0.25, 0);
  beep(1760, 0.5, 0.18);
}

// Voz "Nuevo pedido EcoDrive Plus" usando SpeechSynthesis del navegador
function speakBrandedAlert() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel(); // por si hay algo encolado
    const utter = new SpeechSynthesisUtterance(
      "¡Nuevo pedido EcoDrive! Acepta en WhatsApp."
    );
    utter.lang = "es-PE";
    utter.rate = 1.05;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    // Intentar elegir voz en español si existe
    const voices = window.speechSynthesis.getVoices();
    const esVoice =
      voices.find((v) => v.lang === "es-PE") ||
      voices.find((v) => v.lang.startsWith("es-")) ||
      voices.find((v) => v.lang.startsWith("es"));
    if (esVoice) utter.voice = esVoice;
    window.speechSynthesis.speak(utter);
  } catch {
    /* ignore */
  }
}

// Secuencia completa: campana → voz → campana
function playAlarmTones(audioCtx: AudioContext) {
  playBellChime(audioCtx, 0); // campana inicial (0.7s)
  setTimeout(() => speakBrandedAlert(), 750); // voz despues de la campana
  setTimeout(() => playBellChime(audioCtx, 0), 2800); // campana final tras la voz
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
  const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);
  const [silenced, setSilenced] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastPostAtRef = useRef<number>(0);
  const lastPostedRef = useRef<{ lat: number; lng: number } | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastOfferKeyRef = useRef<string | null>(null);
  const offerPollerRef = useRef<number | null>(null);
  const silencedRef = useRef(false);

  // Mantener silencedRef sincronizado
  useEffect(() => {
    silencedRef.current = silenced;
  }, [silenced]);

  // Inicializar AudioContext + desbloquear SpeechSynthesis en primera interacción del usuario
  const ensureAudioCtx = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    } catch {
      /* ignore */
    }
    // Desbloquear SpeechSynthesis: iOS/Safari lo requieren tras primer touch
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const dummy = new SpeechSynthesisUtterance("");
        dummy.volume = 0;
        window.speechSynthesis.speak(dummy);
      } catch {
        /* ignore */
      }
    }
    return audioCtxRef.current;
  }, []);

  // Disparar alarma: campana + voz "Nuevo pedido EcoDrive Plus" + campana + vibración + flash
  const fireAlarm = useCallback(() => {
    if (silencedRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx) {
      try {
        if (ctx.state === "suspended") ctx.resume();
        playAlarmTones(ctx);
      } catch {
        /* ignore */
      }
    } else {
      // Fallback: solo voz si no hay AudioContext
      speakBrandedAlert();
    }
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 600]);
      } catch {
        /* ignore */
      }
    }
    setFlashOn(true);
    setTimeout(() => setFlashOn(false), 3700); // flash dura toda la alarma (~3.7s)
  }, []);

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

  // Poll de pedidos pendientes
  const pollPendingOffer = useCallback(async () => {
    try {
      const r = await fetch(`/api/ecodrive/tracker/pending-offer?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const data: PendingOffer = await r.json();
      if (!data.has_offer) {
        setPendingOffer(null);
        lastOfferKeyRef.current = null;
        return;
      }
      // Key única para detectar oferta nueva
      const key = `${data.kind}:${data.viaje_id}:${data.offer_id || 0}`;
      if (lastOfferKeyRef.current !== key) {
        lastOfferKeyRef.current = key;
        setPendingOffer(data);
        fireAlarm();
      } else {
        setPendingOffer(data);
      }
    } catch {
      /* ignore */
    }
  }, [token, fireAlarm]);

  const startTracking = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setStatus("error_geo");
      setStats((s) => ({ ...s, lastError: "navigator.geolocation no disponible" }));
      return;
    }
    setStatus("tracking");
    ensureAudioCtx();
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

    // Empezar polling de pedidos pendientes
    pollPendingOffer(); // disparar inmediato
    if (offerPollerRef.current) window.clearInterval(offerPollerRef.current);
    offerPollerRef.current = window.setInterval(pollPendingOffer, POLL_OFFER_MS);
  }, [onPosition, onError, ensureAudioCtx, pollPendingOffer]);

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
    if (offerPollerRef.current) {
      window.clearInterval(offerPollerRef.current);
      offerPollerRef.current = null;
    }
    setStatus("paused");
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
      if (offerPollerRef.current) window.clearInterval(offerPollerRef.current);
    };
  }, []);

  const expiresMin = tokenInfo
    ? Math.max(0, Math.round((tokenInfo.expires_at_ms - Date.now()) / 60000))
    : 0;
  const lastSentAgo = stats.lastSentAt
    ? Math.round((Date.now() - stats.lastSentAt) / 1000)
    : null;

  // Test alarm para que el chofer pruebe el sonido
  const testAlarm = useCallback(() => {
    ensureAudioCtx();
    fireAlarm();
  }, [ensureAudioCtx, fireAlarm]);

  return (
    <main
      className={`min-h-screen text-zinc-100 p-5 flex flex-col transition-colors duration-200 ${
        flashOn ? "bg-emerald-500" : "bg-zinc-950"
      }`}
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🚗 EcoDrive+ Rastreador</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Mantén esta página abierta mientras estés en turno. Aviso sonoro cuando entre un pedido.
        </p>
      </header>

      {/* Banner de pedido entrante */}
      {pendingOffer && pendingOffer.has_offer && (
        <section className="rounded-xl border-2 border-emerald-400 bg-emerald-500/10 p-4 mb-4 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-300 font-bold text-lg">
              {pendingOffer.kind === "asignado" ? "🎯 Pedido asignado" : "🔔 Pedido pendiente"}
            </span>
            <span className="text-xs text-zinc-300">#{pendingOffer.viaje_id}</span>
          </div>
          <div className="text-sm space-y-1 text-zinc-100">
            <div>
              📍 <span className="text-zinc-300">Recoges:</span>{" "}
              <span className="font-semibold">{pendingOffer.origen?.split(",")[0] || "—"}</span>
            </div>
            <div>
              🎯 <span className="text-zinc-300">Vas a:</span>{" "}
              <span className="font-semibold">{pendingOffer.destino?.split(",")[0] || "—"}</span>
            </div>
            <div className="flex gap-4 mt-2">
              <span className="text-emerald-300 font-bold text-xl">
                S/.{Number(pendingOffer.precio || 0).toFixed(2)}
              </span>
              {pendingOffer.distancia_km && (
                <span className="text-zinc-400">📏 {pendingOffer.distancia_km} km</span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 mt-3">
            Responde al bot por WhatsApp para aceptar/rechazar.
          </p>
        </section>
      )}

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
              Tu navegador te pedirá permiso para acceder al GPS y reproducir sonido. Acepta para
              recibir alertas de pedidos.
            </p>
          </div>
        ) : status === "tracking" ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-sm text-emerald-300">Transmitiendo en vivo</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={testAlarm}
                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 text-xs"
              >
                🔊 Probar alarma
              </button>
              <button
                onClick={() => setSilenced((v) => !v)}
                className={`rounded-lg py-2 text-xs ${
                  silenced
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                }`}
              >
                {silenced ? "🔇 Silenciado" : "🔔 Sonido activo"}
              </button>
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
