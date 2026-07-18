import type { Metadata } from "next";
import Link from "next/link";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi panel · TuChoferYa",
};

export default async function MiChoferyaHome({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Necesitas tu link de acceso</h1>
          <p className="text-white/60">
            Tu panel está protegido por un token único. Lo recibiste por WhatsApp cuando se activó
            tu cuenta TuChoferYa.
          </p>
          <p className="text-sm text-white/40">
            ¿Lo perdiste? Escribe al{" "}
            <a className="text-orange-400 hover:underline" href="https://wa.me/51986168409">
              soporte
            </a>{" "}
            para que te lo regeneren.
          </p>
          <Link href="/se-choferya" className="inline-block text-orange-400 hover:underline">
            ¿Aún no estás registrado? Inscríbete →
          </Link>
        </div>
      </main>
    );
  }

  return <DashboardClient token={token} />;
}
