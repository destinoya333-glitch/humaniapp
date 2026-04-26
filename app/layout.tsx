import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://activosya.com"),
  title: {
    default: "ActivosYA — Compra negocios digitales que ya facturan",
    template: "%s · ActivosYA",
  },
  description:
    "Marketplace de activos digitales en LATAM. Plataformas SaaS llave-en-mano con flujo de caja verificado. Adquiere o renta — empieza a cobrar suscripciones desde el día 1.",
  applicationName: "ActivosYA",
  keywords: [
    "activos digitales",
    "negocios digitales en venta",
    "plataformas SaaS Perú",
    "white-label IA",
    "comprar negocio digital",
    "rentar plataforma SaaS",
  ],
  authors: [{ name: "ActivosYA" }],
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "https://activosya.com",
    siteName: "ActivosYA",
    title: "ActivosYA — Marketplace de activos digitales",
    description:
      "Compra o renta plataformas SaaS con flujo de caja verificado. Hecho en Perú.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ActivosYA — Marketplace de activos digitales",
    description:
      "Compra o renta plataformas SaaS con flujo de caja verificado.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geist.variable} scroll-smooth`}>
      <body className="bg-[#0A0A0A] text-white antialiased">{children}</body>
    </html>
  );
}
