"use client";
import { useEffect, useState } from "react";

const KEY = "eco_admin_pass";

/**
 * Auth admin compartida entre subpaginas.
 * Dos vias, unificadas:
 *   - passcode tipeado -> sessionStorage, reusado por las demas subpaginas.
 *   - cookie ecodrive_admin (login del dashboard) -> `cookieAuthed`, detectada
 *     con un probe al boot. Asi entrar por el dashboard desbloquea todo sin
 *     retipear, y las rutas API aceptan la cookie automaticamente.
 * `booted` indica que ya se intento hidratar (para auto-login).
 */
export function useAdminPass() {
  const [passcode, setPasscode] = useState("");
  const [booted, setBooted] = useState(false);
  const [cookieAuthed, setCookieAuthed] = useState(false);

  useEffect(() => {
    let stored = "";
    try {
      stored = sessionStorage.getItem(KEY) || "";
    } catch {}
    if (stored) setPasscode(stored);
    setBooted(true);

    // Si no hay passcode local, ver si ya hay sesion por cookie (dashboard).
    if (!stored) {
      fetch("/api/ecodrive/admin/config?key=tarifas", { credentials: "same-origin" })
        .then((r) => {
          if (r.ok) setCookieAuthed(true);
        })
        .catch(() => {});
    }
  }, []);

  const remember = (p: string) => {
    if (!p) return;
    try {
      sessionStorage.setItem(KEY, p);
    } catch {}
    setPasscode(p);
  };

  const forget = () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
    setPasscode("");
    setCookieAuthed(false);
  };

  return { passcode, setPasscode, remember, forget, booted, cookieAuthed };
}
