/**
 * EcoDrive+ Flow Inscripcion Pasajero — DNI + selfie + IA + auto-aprobacion.
 * Patron analogo al chofer pero simplificado.
 */
import type { FlowDefinition } from "../../../wa-flows-platform/registry";
import { createClient } from "@supabase/supabase-js";
import { decryptFlowMedia, type FlowMediaRef } from "../../../wa-flows-platform/media-decrypt";
import { extractFromImage, VISION_PROMPTS } from "../../../wa-flows-platform/claude-vision";

type Step = "save_dni" | "process_all" | "submit";

type Payload = {
  step?: Step;
  foto?: FlowMediaRef[];
  nombre?: string;
  dni?: string;
  edad?: string;
};

type DraftRow = {
  wa_id: string;
  dni_path: string | null;
  selfie_path: string | null;
  ai_extraction: Record<string, Record<string, unknown> | null> | null;
};

const BUCKET = "eco-pasajeros-docs";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function uploadPhoto(waId: string, kind: string, ref: FlowMediaRef): Promise<string | null> {
  try {
    const buf = await decryptFlowMedia(ref);
    const path = `${waId}/${Date.now()}_${kind}.jpg`;
    const { error } = await db().storage.from(BUCKET).upload(path, buf, {
      contentType: "image/jpeg",
      upsert: true,
    });
    return error ? null : path;
  } catch {
    return null;
  }
}

async function downloadFromBucket(path: string): Promise<Buffer | null> {
  try {
    const { data, error } = await db().storage.from(BUCKET).download(path);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  } catch {
    return null;
  }
}

const flow: FlowDefinition = {
  tenant: "ecodrive",
  flow_key: "inscripcion-pasajero",
  meta: {
    name: "EcoDrive_Inscripcion_Pasajero_v1",
    description: "Inscripcion pasajero por DNI + selfie + IA",
  },
  async handle(req) {
    if (req.action === "ping") return { version: "3.0", data: { status: "active" } };
    if (req.action === "INIT") return { version: "3.0", screen: "FOTO_DNI", data: {} };
    if (req.action !== "data_exchange") return { version: "3.0", data: { status: "unknown_action" } };

    const data = (req.data || {}) as Payload;
    const step = data.step;
    const tokenParts = (req.flow_token || "").split(":");
    const waId = tokenParts[2] || "unknown";
    const sb = db();

    // ===== Step save_dni =====
    if (step === "save_dni" && data.foto?.[0]) {
      const path = await uploadPhoto(waId, "dni", data.foto[0]);
      if (path) {
        await sb
          .from("eco_pasajero_signup_drafts")
          .upsert(
            { wa_id: waId, dni_path: path, updated_at: new Date().toISOString() },
            { onConflict: "wa_id" }
          );
      }
      return { version: "3.0", screen: "FOTO_SELFIE", data: {} };
    }

    // ===== Step process_all (subió selfie + corre IA sobre las 2 fotos) =====
    if (step === "process_all") {
      if (data.foto?.[0]) {
        const path = await uploadPhoto(waId, "selfie", data.foto[0]);
        if (path) {
          await sb
            .from("eco_pasajero_signup_drafts")
            .upsert(
              { wa_id: waId, selfie_path: path, updated_at: new Date().toISOString() },
              { onConflict: "wa_id" }
            );
        }
      }

      const { data: draft } = await sb
        .from("eco_pasajero_signup_drafts")
        .select("*")
        .eq("wa_id", waId)
        .maybeSingle();

      const draftRow = draft as DraftRow | null;
      const extractions: Record<string, Record<string, unknown> | null> = {};

      await Promise.all(
        (["dni", "selfie"] as const).map(async (kind) => {
          const path = kind === "dni" ? draftRow?.dni_path : draftRow?.selfie_path;
          if (!path) {
            extractions[kind] = null;
            return;
          }
          const buf = await downloadFromBucket(path);
          if (!buf) {
            extractions[kind] = { error: "download_failed" };
            return;
          }
          try {
            extractions[kind] = await extractFromImage(buf, "image/jpeg", VISION_PROMPTS[kind]);
          } catch (e) {
            extractions[kind] = { error: (e as Error).message };
          }
        })
      );

      await sb
        .from("eco_pasajero_signup_drafts")
        .update({ ai_extraction: extractions, updated_at: new Date().toISOString() })
        .eq("wa_id", waId);

      const dniE = extractions.dni || {};
      const selE = extractions.selfie || {};

      const linea =
        dniE.es_dni && selE.es_persona
          ? "Listo, leí tu DNI. Confirma o edita."
          : `Detecté: ${[dniE.es_dni && "DNI", selE.es_persona && "selfie"].filter(Boolean).join(", ") || "ningun documento claro"}. Completa lo que falte.`;

      return {
        version: "3.0",
        screen: "RESUMEN",
        data: {
          nombre_inicial: (dniE.nombre_completo as string) || "",
          dni_inicial: (dniE.dni as string) || "",
          edad_inicial: dniE.edad != null ? String(dniE.edad) : "",
          linea_estado: linea,
        },
      };
    }

    // ===== Step submit =====
    if (step === "submit") {
      if (!data.dni || !data.nombre) {
        return {
          version: "3.0",
          screen: "RESUMEN",
          data: { linea_estado: "Faltan nombre o DNI. Completalos antes de enviar." },
        };
      }

      const { data: draft } = await sb
        .from("eco_pasajero_signup_drafts")
        .select("*")
        .eq("wa_id", waId)
        .maybeSingle();

      const draftRow = draft as DraftRow | null;
      const ai = draftRow?.ai_extraction || {};

      const checks = {
        tieneDniValido: ai.dni?.es_dni === true && !!ai.dni?.dni,
        tieneSelfie: ai.selfie?.es_persona === true,
        edadValida: parseInt(data.edad || "0", 10) >= 18,
      };
      const aiAprobaTodo = Object.values(checks).every(Boolean);
      const finalStatus = aiAprobaTodo ? "approved" : "pending";

      // SELECT-then-INSERT/UPDATE manual (no usamos onConflict porque DNI tiene unique parcial)
      const dniClean = (data.dni || "").trim();
      const row = {
        wa_id: waId,
        nombre: (data.nombre || "").trim() || "Pasajero",
        dni: dniClean,
        edad: data.edad ? parseInt(data.edad, 10) : null,
        dni_foto_url: draftRow?.dni_path || null,
        selfie_foto_url: draftRow?.selfie_path || null,
        ai_extraction: { ...ai, _checks: checks, _auto_approved: aiAprobaTodo },
        status: finalStatus,
        approved_at: aiAprobaTodo ? new Date().toISOString() : null,
        approved_by: aiAprobaTodo ? "ai" : null,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await sb
        .from("eco_pasajeros")
        .select("id")
        .or(`dni.eq.${dniClean},wa_id.eq.${waId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const upsertErr = existing
        ? (await sb.from("eco_pasajeros").update(row).eq("id", (existing as { id: string }).id)).error
        : (await sb.from("eco_pasajeros").insert(row)).error;

      if (upsertErr) {
        // Log en wa_flow_health
        try {
          await sb.from("wa_flow_health").insert({
            endpoint_url: "inscripcion-pasajero/submit",
            status_code: 500,
            duration_ms: 0,
            error: `upsert pasajero failed: ${upsertErr.message} | wa=${waId} dni=${data.dni}`,
          });
        } catch {}
        return {
          version: "3.0",
          screen: "RESUMEN",
          data: {
            linea_estado: `No pude guardar tu inscripcion: ${upsertErr.message}. Revisa los datos y vuelve a enviar.`,
          },
        };
      }

      await sb.from("eco_pasajero_signup_drafts").delete().eq("wa_id", waId);

      // Mensaje al pasajero
      const firstName = data.nombre.split(" ")[0];
      const phoneId = process.env.ECODRIVE_META_PHONE_ID;
      const token = process.env.ECODRIVE_META_ACCESS_TOKEN;
      if (phoneId && token) {
        try {
          await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: waId,
              type: "text",
              text: {
                body: aiAprobaTodo
                  ? `Bienvenido ${firstName}. Ya estas activo como pasajero EcoDrive+.\n\nCuando quieras pedir un viaje, escribenos por aqui. Te llegara un boton para indicar origen y destino.`
                  : `Recibimos tu inscripcion ${firstName}. Necesitamos revisar manualmente tu DNI o selfie y te avisamos por aqui en menos de 24h.`,
              },
            }),
          });
        } catch {}
      }

      return {
        version: "3.0",
        screen: "SUCCESS",
        data: {
          extension_message_response: {
            params: {
              flow_token: req.flow_token,
              status: aiAprobaTodo ? "approved" : "submitted",
              nombre: data.nombre,
            },
          },
        },
      };
    }

    return { version: "3.0", screen: "FOTO_DNI", data: {} };
  },
};

export default flow;
