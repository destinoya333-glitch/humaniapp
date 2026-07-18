import type { Metadata } from "next";
import Link from "next/link";
import HorariosEditor from "./HorariosEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Horarios · TuChoferYa",
};

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token)
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <p>Token requerido.</p>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href={`/mi-choferya?token=${token}`} className="text-sm text-white/50 hover:text-orange-400">
          ← Panel
        </Link>
        <h1 className="text-3xl font-bold mt-4">Tus horarios disponibles</h1>
        <p className="text-white/60 mt-1">
          Define ventanas de disponibilidad por día. Solo aceptamos reservas dentro de tus horarios.
        </p>
        <HorariosEditor token={token} />
      </div>
    </main>
  );
}
