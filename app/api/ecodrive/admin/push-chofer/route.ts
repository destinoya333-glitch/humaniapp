/**
 * POST -> envia mensaje WhatsApp a 1 chofer (free-form, requiere ventana 24h)
 *         o a todos los choferes en turno (opcionalmente filtrados por zona).
 *
 * Body:
 *  { wa_id: "51994810242", mensaje: "Ven a Mall Plaza ya" }     // 1 chofer
 *  { broadcast: true, zona?: "Centro", mensaje: "..." }          // todos en turno
 *
 * Auth: header x-admin-passcode
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

async function sendWaText(
  wa_id: string,
  body: string
): Promise<{ ok: boolean; detail?: unknown }> {
  const phoneId = process.env.ECODRIVE_META_PHONE_ID;
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN;
  if (!phoneId || !token) return { ok: false, detail: "missing_meta_env" };
  try {
    const resp = await fetch(
      `https://graph.facebook.com/v22.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: wa_id,
          type: "text",
          text: { body },
        }),
      }
    );
    const json = await resp.json();
    return resp.ok ? { ok: true, detail: json } : { ok: false, detail: json };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    wa_id?: string;
    broadcast?: boolean;
    zona?: string;
    mensaje: string;
  };
  const text = (body.mensaje || "").trim();
  if (!text) return NextResponse.json({ error: "mensaje_required" }, { status: 400 });
  if (text.length > 1024) return NextResponse.json({ error: "mensaje_too_long" }, { status: 400 });

  const sb = db();

  if (body.broadcast) {
    let q = sb.from("chofer_estado").select("telefono, zona").eq("en_turno", true);
    if (body.zona) q = q.ilike("zona", `%${body.zona}%`);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const targets = (data || []) as Array<{ telefono: string; zona: string | null }>;
    if (targets.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, total: 0, results: [] });
    }
    const results = await Promise.all(
      targets.map(async (t) => {
        const r = await sendWaText(t.telefono, text);
        return { telefono: t.telefono, zona: t.zona, ok: r.ok };
      })
    );
    const sent = results.filter((r) => r.ok).length;
    return NextResponse.json({ ok: true, sent, total: targets.length, results });
  }

  if (!body.wa_id) return NextResponse.json({ error: "wa_id_or_broadcast_required" }, { status: 400 });
  const wa = String(body.wa_id).replace(/\D/g, "");
  const r = await sendWaText(wa, text);
  if (!r.ok) return NextResponse.json({ error: "send_failed", detail: r.detail }, { status: 502 });
  return NextResponse.json({ ok: true, detail: r.detail });
}
