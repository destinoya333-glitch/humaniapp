"use client";

/**
 * SofiaPwa — convierte la web de Miss Sofia en PWA instalable.
 * - Inyecta el <link rel="manifest"> de Sofia (sin tocar el manifest global).
 * - Registra el service worker sw-sofia.js (push de racha).
 * Montar en las páginas Sofia (landing, chat, progreso).
 */
import { useEffect } from "react";

export default function SofiaPwa() {
  useEffect(() => {
    // 1) Manifest (idempotente)
    const MANIFEST = "/manifest-sofia.json";
    if (!document.querySelector(`link[rel="manifest"][href="${MANIFEST}"]`)) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = MANIFEST;
      document.head.appendChild(link);
    }
    // theme-color para la barra del navegador
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = "#E08821";
      document.head.appendChild(meta);
    }
    // iOS: permitir "Agregar a inicio" en standalone
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const m = document.createElement("meta");
      m.name = "apple-mobile-web-app-capable";
      m.content = "yes";
      document.head.appendChild(m);
    }

    // 2) Service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-sofia.js", { scope: "/" })
        .catch((err) => console.warn("[SofiaPwa] SW register falló:", err));
    }
  }, []);

  return null;
}
