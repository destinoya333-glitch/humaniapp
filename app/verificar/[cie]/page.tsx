import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Redirect legacy /verificar/[cie] → /financiera/[cie]. Importante para QRs
 * de constancias ya impresas/enviadas que apuntan a /verificar/CIE-XXX.
 */
export default async function LegacyVerificarCieRedirect({
  params,
}: {
  params: Promise<{ cie: string }>;
}) {
  const { cie } = await params;
  redirect(`/financiera/${encodeURIComponent(cie)}`);
}
