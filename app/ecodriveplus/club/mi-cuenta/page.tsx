import type { Metadata } from "next";
import { MiCuentaClient } from "./_components/MiCuentaClient";

export const metadata: Metadata = {
  title: "Mi cuenta — EcoDrive+ Club",
  description: "Consultá tus tickets, Pass y participación en sorteos EcoDrive+ Club.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function MiCuentaPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-3xl mx-auto">
        <a href="/ecodriveplus/club" className="text-[#E1811B] text-sm mb-4 inline-block">← Volver al Club</a>
        <h1 className="text-3xl font-bold mb-3">Mi cuenta · Club</h1>
        <p className="text-gray-400 mb-6 text-sm">Consultá tus tickets y Pass por WhatsApp.</p>
        <MiCuentaClient />
      </div>
    </main>
  );
}
