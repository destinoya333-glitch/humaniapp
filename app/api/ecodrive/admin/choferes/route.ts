/**
 * GET  -> lista choferes con filtro por status
 * PATCH -> aprueba/rechaza/suspende un chofer
 *
 * Auth: header x-admin-passcode = ECODRIVE_ADMIN_PASSCODE
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/ecodrive/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") || "pending";
  const { data, error } = await db()
    .from("eco_choferes")
    .select("id,wa_id,nombre,dni,edad,zona_principal,vehiculo_marca,vehiculo_modelo,vehiculo_anio,vehiculo_color,placa,status,rating,rejection_reason,created_at,approved_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

async function notifyChofer(
  action: "approve" | "reject",
  chofer: {
    wa_id: string;
    nombre: string;
    vehiculo_marca: string;
    vehiculo_modelo: string;
    placa: string;
  },
  reason?: string
): Promise<{ ok: boolean; detail?: unknown }> {
  const phoneId = process.env.ECODRIVE_META_PHONE_ID;
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN;
  if (!phoneId || !token) return { ok: false, detail: "missing_meta_env" };

  const firstName = (chofer.nombre || "amigo").split(" ")[0];

  const payload =
    action === "approve"
      ? {
          messaging_product: "whatsapp",
          to: chofer.wa_id,
          type: "template",
          template: {
            name: "eco_chofer_aprobado",
            language: { code: "es" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: firstName },
                  {
                    type: "text",
                    text: `${chofer.vehiculo_marca} ${chofer.vehiculo_modelo}`.trim() || "tu vehiculo",
                  },
                  { type: "text", text: chofer.placa || "—" },
                ],
              },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",
          to: chofer.wa_id,
          type: "template",
          template: {
            name: "eco_chofer_rechazado",
            language: { code: "es" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: firstName },
                  { type: "text", text: reason || "Documentación incompleta" },
                ],
              },
            ],
          },
        };

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v22.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const json = await resp.json();
    return resp.ok ? { ok: true, detail: json } : { ok: false, detail: json };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    id: string;
    action: "approve" | "reject" | "suspend" | "reactivate" | "set_rating" | "force_off_duty";
    reason?: string;
    rating?: number;
  };
  if (!body.id || !body.action) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.action === "approve" || body.action === "reactivate") {
    update.status = "approved";
    update.approved_at = new Date().toISOString();
    update.approved_by = "admin";
    update.rejection_reason = null;
  } else if (body.action === "reject") {
    update.status = "rejected";
    update.rejection_reason = body.reason || "Sin razon especificada";
  } else if (body.action === "suspend") {
    update.status = "suspended";
    update.rejection_reason = body.reason || "Sin razon";
  } else if (body.action === "set_rating") {
    const r = Number(body.rating);
    if (!isFinite(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: "rating_out_of_range" }, { status: 400 });
    }
    update.rating = Math.round(r * 100) / 100;
  } else if (body.action === "force_off_duty") {
    // se aplica a chofer_estado, no a eco_choferes
  }

  const sb = db();

  // force_off_duty: actualizar chofer_estado por wa_id (no por id de eco_choferes)
  if (body.action === "force_off_duty") {
    const { data: choferRow } = await sb
      .from("eco_choferes")
      .select("wa_id")
      .eq("id", body.id)
      .single();
    if (!choferRow?.wa_id) {
      return NextResponse.json({ error: "chofer_not_found" }, { status: 404 });
    }
    const { error: e2 } = await sb
      .from("chofer_estado")
      .update({ en_turno: false, ultimo_ping: new Date().toISOString() })
      .eq("telefono", choferRow.wa_id);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data: choferRow, error: updateErr } = await sb
    .from("eco_choferes")
    .update(update)
    .eq("id", body.id)
    .select("wa_id,nombre,vehiculo_marca,vehiculo_modelo,placa")
    .single();
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  let notified: { ok: boolean; detail?: unknown } | null = null;
  if (choferRow && (body.action === "approve" || body.action === "reject")) {
    notified = await notifyChofer(body.action, choferRow, body.reason);
  }

  return NextResponse.json({ ok: true, notified });
}
