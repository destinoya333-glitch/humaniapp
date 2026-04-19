import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi Novia IA — HumaniApp",
  description: "Tu compañera IA personalizada. Video real, voz natural, memoria persistente.",
};

export default function NoviaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {children}
    </div>
  );
}
