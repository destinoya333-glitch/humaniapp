import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import LenisProvider from "./_design/LenisProvider";
import CursorCustom from "./_design/CursorCustom";
import "./_design/editorial.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ecodriveplus.com"),
  applicationName: "EcoDrive+",
  authors: [{ name: "EcoDrive+" }],
  alternates: { canonical: "https://ecodriveplus.com" },
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "https://ecodriveplus.com",
    siteName: "EcoDrive+",
    title: "EcoDrive+ — La app de Trujillo con agente IA",
    description:
      "App de taxi con agente IA Eco, Membresía Club S/.30 por sorteo y comisión 6.3% para choferes — la más baja del Perú. Trujillo. También por WhatsApp.",
  },
  twitter: {
    card: "summary_large_image",
    title: "EcoDrive+ — La app de Trujillo con agente IA",
    description:
      "App de taxi con agente IA Eco, Membresía Club S/.30 por sorteo y comisión 6.3% para choferes. Trujillo, Perú.",
  },
  icons: {
    icon: "/ecodriveplus/icon.png",
    apple: "/ecodriveplus/apple-icon.png",
  },
};

export default function EcoDrivePlusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${fraunces.variable} ${jetbrainsMono.variable} eco-editorial`}>
      <LenisProvider />
      <CursorCustom />
      {children}
    </div>
  );
}
