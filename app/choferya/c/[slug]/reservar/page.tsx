import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReservaForm from "./ReservaForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reservar viaje · TuChoferYa",
};

type Precio = {
  id: string;
  etiqueta: string;
  precio_pen: number;
  duracion_estimada_min: number | null;
};

async function loadChoferLite(slug: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: chofer } = await sb
    .from("eco_choferes")
    .select("id, nombre, choferya_slug, choferya_zonas")
    .eq("choferya_slug", slug)
    .eq("choferya_active", true)
    .eq("status", "approved")
    .maybeSingle();

  if (!chofer) return null;

  const { data: precios } = await sb
    .from("choferya_precios")
    .select("id, etiqueta, precio_pen, duracion_estimada_min")
    .eq("chofer_id", chofer.id)
    .eq("activo", true)
    .order("orden", { ascending: true });

  return { chofer, precios: (precios || []) as Precio[] };
}

export default async function ReservarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadChoferLite(slug);
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href={`/choferya/c/${slug}`} className="text-sm text-white/50 hover:text-orange-400">
          ← Volver al perfil de {data.chofer.nombre}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mt-4">
          Reservar con {data.chofer.nombre.split(" ")[0]}
        </h1>
        <p className="text-white/60 mt-2">
          Completa los datos. {data.chofer.nombre.split(" ")[0]} recibe tu reserva y la confirma desde su WhatsApp.
        </p>

        <ReservaForm slug={slug} choferNombre={data.chofer.nombre} precios={data.precios} />
      </div>
    </main>
  );
}
