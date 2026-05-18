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
