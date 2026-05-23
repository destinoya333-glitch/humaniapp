import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/ecodrive/verifier-auth";
import { getGarajeClient } from "@/lib/ecodrive/garaje";

export const dynamic = "force-dynamic";

/**
 * Búsqueda de conductor por DNI para entidades financieras autorizadas.
 * Mismo comportamiento que /api/ecodrive/verifier/lookup — renombrado
 * a /financiera/ por consistencia con el portal /financiera.
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

  // DNI demo: 12345678 = Juan Pérez Ramírez del certificado modelo. Permite a
  // las cajas probar el flujo completo (login → DNI → certificado) sin
  // depender de que haya un conductor real en BD con ese DNI.
  if (dni === "12345678") {
    try {
      await getGarajeClient().from("verifier_lookups").insert({
        verifier_user: session.user,
        entidad: session.entidad,
        dni_query: dni,
        found: true,
      });
    } catch {
      /* tabla puede no existir aun */
    }
    return NextResponse.json({
      ok: true,
      found: true,
      driver: {
        affiliated: true,
        status: "active",
        total_trips: 3485,
        rating: 4.87,
        affiliated_since: "2025-05-01",
      },
      message: "Conductor demo afiliado (Juan Pérez Ramírez).",
    });
  }

  const sb = getGarajeClient();
  const { data: driver } = await sb
    .from("v2_drivers")
    .select("id, dni, status, total_trips, rating, created_at")
    .eq("dni", dni)
    .maybeSingle();

  try {
    await sb.from("verifier_lookups").insert({
      verifier_user: session.user,
      entidad: session.entidad,
      dni_query: dni,
      found: !!driver,
    });
  } catch {
    // tabla puede no existir aun
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
    message: "Conductor afiliado confirmado.",
  });
}
