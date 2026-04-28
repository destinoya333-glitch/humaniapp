import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculadora ROI — Estima tu utilidad",
  description:
    "Estima ingresos, utilidad mensual, breakeven y proyección a 12-24 meses adquiriendo un activo digital de ActivosYA. Modelo de renta o compra única.",
  alternates: { canonical: "https://activosya.com/calculadora-roi" },
};

export default function CalculadoraROILayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
