/**
 * GET /api/choferya/reporte-mensual?token=<panel_token>&mes=YYYY-MM&format=csv|json
 *
 * Devuelve reservas completadas del chofer en un mes específico, con totales
 * y sugerencia de IGV para SUNAT. Si no se pasa `mes`, devuelve el mes en curso.
 *
 * Auth: token panel chofer (HMAC firmado).
 * Default format = csv (descargable directamente desde el panel).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyChoferPanelToken } from "@/lib/activosya/choferya-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rangoMes(mes: string): { desde: string; hasta: string; label: string } {
  const [y, m] = mes.split("-").map(Number);
  if (!y || !m) {
    const now = new Date();
    return rangoMes(
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
    );
  }
  const desde = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const hasta = new Date(Date.UTC(y, m, 1)).toISOString();
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return { desde, hasta, label };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const mesParam = url.searchParams.get("mes") || "";
  const format = (url.searchParams.get("format") || "csv").toLowerCase();

  const v = verifyChoferPanelToken(token);
  if (!v.ok) {
    return NextResponse.json({ error: `token: ${v.reason}` }, { status: 401 });
  }

  const sb = db();
  const { data: chofer } = await sb
    .from("eco_choferes")
    .select("id, nombre, dni, choferya_slug, choferya_plan, yape_celular")
    .eq("id", v.choferId)
    .maybeSingle();

  if (!chofer)
    return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });

  const now = new Date();
  const mes =
    mesParam ||
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const { desde, hasta, label } = rangoMes(mes);

  // Reservas completadas + canceladas del mes
  const { data: reservas, error } = await sb
    .from("choferya_reservas")
    .select(
      "id, completed_at, fecha_viaje, hora_viaje, pasajero_nombre, pasajero_wa_id, origen_direccion, destino_direccion, precio_pen, estado, source"
    )
    .eq("chofer_id", chofer.id)
    .gte("completed_at", desde)
    .lt("completed_at", hasta)
    .eq("estado", "completada")
    .order("completed_at", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const filas = reservas || [];
  const totalBruto = filas.reduce((acc, r) => acc + Number(r.precio_pen || 0), 0);
  // SUNAT régimen especial trabajadores independientes: 8% retención
  // (referencial; el chofer debe confirmar con su contador).
  const ivaEstimado = +(totalBruto * 0.18).toFixed(2);
  const rentaIndividual4taCat = +(totalBruto * 0.08).toFixed(2);

  if (format === "json") {
    return NextResponse.json({
      ok: true,
      chofer: {
        nombre: chofer.nombre,
        dni: chofer.dni,
        slug: chofer.choferya_slug,
        plan: chofer.choferya_plan,
      },
      mes,
      label,
      total_viajes: filas.length,
      total_bruto_pen: totalBruto,
      igv_18_referencial: ivaEstimado,
      renta_4ta_cat_8_referencial: rentaIndividual4taCat,
      reservas: filas,
    });
  }

  // CSV
  const headers = [
    "fecha_viaje",
    "hora_viaje",
    "pasajero_nombre",
    "pasajero_wa",
    "origen",
    "destino",
    "precio_pen",
    "completed_at",
    "source",
  ];

  const rows = filas.map((r) => [
    r.fecha_viaje,
    r.hora_viaje,
    r.pasajero_nombre,
    r.pasajero_wa_id,
    r.origen_direccion || "",
    r.destino_direccion || "",
    r.precio_pen,
    r.completed_at,
    r.source,
  ]);

  // Footer con totales
  rows.push(["", "", "", "", "", "TOTAL BRUTO (S/.)", String(totalBruto.toFixed(2)), "", ""]);
  rows.push([
    "",
    "",
    "",
    "",
    "",
    "RENTA 4ta CAT 8% referencial",
    String(rentaIndividual4taCat.toFixed(2)),
    "",
    "",
  ]);
  rows.push([
    "",
    "",
    "",
    "",
    "",
    "IGV 18% referencial",
    String(ivaEstimado.toFixed(2)),
    "",
    "",
  ]);

  // Cabecera informativa (no SUNAT-formal pero útil para el chofer)
  const headerInfo = [
    `# Reporte mensual TuChoferYa`,
    `# Chofer: ${chofer.nombre} (DNI ${chofer.dni || "—"})`,
    `# Periodo: ${label} (${mes})`,
    `# Viajes completados: ${filas.length}`,
    `# Total bruto: S/. ${totalBruto.toFixed(2)}`,
    `# Renta 4ta cat 8% referencial: S/. ${rentaIndividual4taCat.toFixed(2)}`,
    `# IGV 18% referencial: S/. ${ivaEstimado.toFixed(2)}`,
    `# Generado: ${new Date().toISOString()}`,
    `# Aviso: importes referenciales. Confirma con tu contador antes de declarar.`,
  ].join("\n");

  const csvBody = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ].join("\n");

  const csv = `${headerInfo}\n\n${csvBody}\n`;

  const filename = `tuchoferya-${chofer.choferya_slug || chofer.id.slice(0, 8)}-${mes}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
