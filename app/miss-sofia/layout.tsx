import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Miss Sofia — Aprende inglés con IA | HumaniApp",
  description:
    "Tu profesora de inglés IA personal por WhatsApp. Método NAS: de A1 a C2 en 15 meses. Lección diaria, voz real, certificado internacional. Prueba gratis 7 días.",
};

export default function MissSofiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {children}
    </div>
  );
}
