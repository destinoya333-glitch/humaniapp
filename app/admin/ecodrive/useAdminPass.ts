"use client";
import { useEffect, useState } from "react";

const KEY = "eco_admin_pass";

/**
 * Passcode admin compartido entre subpaginas via sessionStorage.
 * Se tipea una vez por sesion de navegador; las demas paginas lo reusan.
 * `booted` indica que ya se intento hidratar desde sessionStorage (para auto-login).
 */
export function useAdminPass() {
  const [passcode, setPasscode] = useState("");
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(KEY) || "";
      if (s) setPasscode(s);
    } catch {}
    setBooted(true);
  }, []);

  const remember = (p: string) => {
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
  };

  return { passcode, setPasscode, remember, forget, booted };
}
