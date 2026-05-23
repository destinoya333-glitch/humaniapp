import type { Metadata } from "next";
import { getSession } from "@/lib/ecodrive/verifier-auth";
import { VerifierLogin } from "./VerifierLogin";
import { VerifierDashboard } from "./VerifierDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal Verificador — ECO DRIVE PLUS S.A.C.",
  description:
    "Portal exclusivo de entidades financieras aliadas. Verificación de conductores afiliados y constancias de ingresos.",
  robots: { index: false, follow: false },
};

export default async function VerificarPage({ searchParams }: { searchParams: Promise<{ caja?: string }> }) {
  const session = await getSession();
  if (!session) {
    const { caja } = await searchParams;
    return <VerifierLogin defaultUser={caja ?? ""} />;
  }
  return <VerifierDashboard user={session.user} entidad={session.entidad} />;
}
