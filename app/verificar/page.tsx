import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Redirect legacy /verificar → /financiera. El portal de entidades
 * financieras se renombró el 2026-05-23. Esta ruta queda como redirect para
 * compatibilidad con cartas convenio que ya tenían la URL antigua.
 */
export default function LegacyVerificarRedirect() {
  redirect("/financiera");
}
