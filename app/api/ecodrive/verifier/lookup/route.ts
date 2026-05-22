import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/ecodrive/verifier-auth";
import { getGarajeClient } from "@/lib/ecodrive/garaje";

export const dynamic = "force-dynamic";

/**
 * Búsqueda de conductor por DNI para entidades financieras autorizadas.
 *
 * Política: si NO existe convenio firmado entre EcoDrive+ y la entidad
 * verificadora, devolvemos solo confirmación de que el conductor está
 * afiliado (sin datos sensibles ni URL del PDF). Una vez firmado el
 * convenio, se puede habilitar el flag enable_pdf por entidad para que
 * descarguen la constancia real.
 *
 * Por ahora todas las cuentas tienen enable_pdf=false (modo demo).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dniRaw = String((body as { dni?: string }).dni ?? "");
  const dni = dniRaw.replace(/\D/g, "");
  if (dni.length < 7 || dni.length > 12) {
    return NextResponse.json({ error: "DNI inválido (7-12 dígitos)" }, { status: 400 });
  }

  const sb = getGarajeClient();
  const { data: driver } = await sb
    .from("v2_drivers")
    .select("id, dni, status, total_trips, rating, created_at")
    .eq("dni", dni)
    .maybeSingle();

  // Log de auditoría: registramos cada consulta (entidad + dni)
  try {
    await sb.from("verifier_lookups").insert({
      verifier_user: session.user,
      entidad: session.entidad,
      dni_query: dni,
      found: !!driver,
    });
  } catch {
    // tabla puede no existir aun; ignorar para no romper UX
  }

  if (!driver) {
    return NextResponse.json({
      ok: true,
      found: false,
      message:
        "El DNI consultado NO está registrado como conductor activo en ECO DRIVE PLUS S.A.C. Verifique el dato o consulte directamente con el solicitante.",
    });
  }

  return NextResponse.json({
    ok: true,
    found: true,
    driver: {
      affiliated: true,
      status: driver.status,
      total_trips: driver.total_trips ?? 0,
      rating: driver.rating ?? 0,
      affiliated_since: driver.created_at,
    },
    // PDF real requiere convenio firmado.
    pdf_url: null,
    message:
      "Conductor afiliado confirmado. Para acceder a la Constancia de Ingresos oficial (firmada, sellada, con QR de verificación), se requiere convenio interinstitucional firmado entre su entidad y ECO DRIVE PLUS S.A.C. Solicítelo a projas@ecodriveplus.com.",
  });
}
