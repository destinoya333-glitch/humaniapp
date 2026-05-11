/**
 * GET /api/operadores/reporte-mensual?token=X&mes=YYYY-MM
 *
 * Devuelve CSV con todos los pagos del operador en un mes específico.
 * Si no se pasa `mes`, devuelve el mes en curso.
 *
 * Auth: token único del operador en query string (mismo que /operador/setup
 * y /operador/dashboard).
 *
 * Uso: el operador exporta esto para su contador / SUNAT cada mes.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/activosya/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rangoMes(mes: string): { desde: string; hasta: string } {
  // mes formato YYYY-MM. Devuelve [primero del mes, primero del mes siguiente)
  const [y, m] = mes.split("-").map(Number);
  if (!y || !m) {
    const now = new Date();
    return rangoMes(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const desde = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const hasta = new Date(Date.UTC(y, m, 1)).toISOString();
  return { desde, hasta };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const mesParam = url.searchParams.get("mes") || "";

  if (!token || token.length < 24) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const { data: tenant } = await supabaseAdmin
    .from("ay_tenants")
    .select("id, name, dni, ruc, plan, monthly_fee_pen, referral_code")
    .eq("macrodroid_token", token)
    .eq("type", "operador")
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ error: "Token no reconocido" }, { status: 401 });
  }

  const now = new Date();
  const mes = mesParam || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const { desde, hasta } = rangoMes(mes);

  // Pagos del operador en el rango
  const { data: pagos, error } = await supabaseAdmin
    .from("ay_operador_pagos")
    .select("fecha_pago, tipo, monto_pen, yape_operacion, yape_nombre_origen, yape_numero_origen, alumno_phone, asset_slug, validado, metadata")
    .eq("tenant_id", tenant.id)
    .gte("fecha_pago", desde)
    .lt("fecha_pago", hasta)
    .order("fecha_pago", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Construir CSV
  const headers = [
    "fecha",
    "tipo",
    "monto_pen",
    "yape_operacion",
    "yape_remitente_nombre",
    "yape_remitente_celular",
    "alumno_celular",
    "activo",
    "validado",
    "observaciones",
  ];
  const lines: string[] = [];

  // Cabecera del reporte
  lines.push(`# Reporte mensual ActivosYA — ${mes}`);
  lines.push(`# Operador: ${tenant.name}`);
  if (tenant.dni) lines.push(`# DNI: ${tenant.dni}`);
  if (tenant.ruc) lines.push(`# RUC: ${tenant.ruc}`);
  lines.push(`# Referral: ${tenant.referral_code ?? "—"}`);
  lines.push(`# Plan: ${tenant.plan ?? "—"} (S/. ${tenant.monthly_fee_pen ?? "—"}/mes)`);
  lines.push(`# Total registros: ${(pagos || []).length}`);
  lines.push("");

  lines.push(headers.join(","));

  let totalIngresos = 0;
  let totalRentas = 0;

  for (const p of pagos || []) {
    const obs = p.metadata && typeof p.metadata === "object" && "reason" in p.metadata
      ? String((p.metadata as { reason?: unknown }).reason ?? "")
      : "";
    lines.push(
      [
        csvEscape(p.fecha_pago),
        csvEscape(p.tipo),
        csvEscape(p.monto_pen),
        csvEscape(p.yape_operacion),
        csvEscape(p.yape_nombre_origen),
        csvEscape(p.yape_numero_origen),
        csvEscape(p.alumno_phone),
        csvEscape(p.asset_slug),
        csvEscape(p.validado ? "si" : "no"),
        csvEscape(obs),
      ].join(","),
    );
    if (p.tipo === "pago_alumno" && p.validado) totalIngresos += Number(p.monto_pen);
    if (p.tipo === "renta_a_percy") totalRentas += Number(p.monto_pen);
  }

  // Resumen
  lines.push("");
  lines.push(`# RESUMEN`);
  lines.push(`# Total ingresos validados (pagos de alumnos): S/. ${totalIngresos.toFixed(2)}`);
  lines.push(`# Total renta pagada a Percy: S/. ${totalRentas.toFixed(2)}`);
  lines.push(`# Ganancia bruta del mes: S/. ${(totalIngresos - totalRentas).toFixed(2)}`);

  const csv = lines.join("\n");
  const filename = `activosya-reporte-${tenant.referral_code ?? tenant.id.slice(0, 8)}-${mes}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
