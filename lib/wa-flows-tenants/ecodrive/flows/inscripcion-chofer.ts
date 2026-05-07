/**
 * EcoDrive+ Flow Inscripcion Chofer V5 — 100% por fotos + IA secuencial.
 *
 * Pantallas: FOTO_DNI -> FOTO_LICENCIA -> FOTO_SELFIE -> FOTO_CARRO -> FOTO_SOAT -> RESUMEN.
 * Cada step guarda la foto en bucket eco-choferes-docs + path en eco_chofer_signup_drafts.
 * En process_all: corre Claude Vision sobre las 5 fotos y prefilla RESUMEN.
 * En submit: upserta eco_choferes con status pending y limpia draft.
 */
import type { FlowDefinition } from "../../../wa-flows-platform/registry";
import { createClient } from "@supabase/supabase-js";
import { decryptFlowMedia, type FlowMediaRef } from "../../../wa-flows-platform/media-decrypt";
import { extractFromImage, VISION_PROMPTS } from "../../../wa-flows-platform/claude-vision";

type Step =
  | "save_dni"
  | "save_licencia"
  | "save_selfie"
  | "save_carro"
  | "process_all"
  | "submit";

type Payload = {
  step?: Step;
  foto?: FlowMediaRef[];
  // submit fields
  nombre?: string;
  dni?: string;
  licencia?: string;
  marca?: string;
  modelo?: string;
  anio?: string;
  color?: string;
  placa?: string;
  soat_vence?: string;
};

type DraftRow = {
  wa_id: string;
  dni_path: string | null;
  licencia_path: string | null;
  selfie_path: string | null;
  carro_path: string | null;
  soat_path: string | null;
  ai_extraction: Record<string, unknown> | null;
};

const NEXT_SCREEN: Record<Step, string> = {
  save_dni: "FOTO_LICENCIA",
  save_licencia: "FOTO_SELFIE",
  save_selfie: "FOTO_CARRO",
  save_carro: "FOTO_SOAT",
  process_all: "RESUMEN",
  submit: "SUCCESS",
};

const STEP_TO_KIND: Record<Step, "dni" | "licencia" | "selfie" | "carro" | "soat" | null> = {
  save_dni: "dni",
  save_licencia: "licencia",
  save_selfie: "selfie",
  save_carro: "carro",
  process_all: "soat",
  submit: null,
};

const STEP_TO_COLUMN: Record<string, keyof DraftRow> = {
  dni: "dni_path",
  licencia: "licencia_path",
  selfie: "selfie_path",
  carro: "carro_path",
  soat: "soat_path",
};

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function uploadPhoto(
  waId: string,
  kind: string,
  ref: FlowMediaRef
): Promise<string | null> {
  try {
    const buf = await decryptFlowMedia(ref);
    const path = `${waId}/${Date.now()}_${kind}.jpg`;
    const sb = db();
    const { error } = await sb.storage
      .from("eco-choferes-docs")
      .upload(path, buf, { contentType: "image/jpeg", upsert: true });
    if (error) return null;
    return path;
  } catch {
    return null;
  }
}

async function downloadFromBucket(path: string): Promise<Buffer | null> {
  try {
    const sb = db();
    const { data, error } = await sb.storage.from("eco-choferes-docs").download(path);
    if (error || !data) return null;
    const ab = await data.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

const flow: FlowDefinition = {
  tenant: "ecodrive",
  flow_key: "inscripcion-chofer",
  meta: {
    name: "EcoDrive_Inscripcion_Chofer_v1",
    description: "Inscripcion 100% por fotos + IA",
  },
  async handle(req) {
    if (req.action === "ping") {
      return { version: "3.0", data: { status: "active" } };
    }

    if (req.action === "INIT") {
      return { version: "3.0", screen: "FOTO_DNI", data: {} };
    }

    if (req.action !== "data_exchange") {
      return { version: "3.0", data: { status: "unknown_action" } };
    }

    const data = (req.data || {}) as Payload;
    const step = data.step as Step | undefined;
    if (!step) {
      return { version: "3.0", screen: "FOTO_DNI", data: {} };
    }

    const tokenParts = (req.flow_token || "").split(":");
    const waId = tokenParts[2] || "unknown";
    const sb = db();

    // ========== Steps que guardan una foto y avanzan ==========
    if (["save_dni", "save_licencia", "save_selfie", "save_carro", "process_all"].includes(step)) {
      const kind = STEP_TO_KIND[step];
      if (kind && data.foto && data.foto[0]) {
        const path = await uploadPhoto(waId, kind, data.foto[0]);
        if (path) {
          const column = STEP_TO_COLUMN[kind];
          await sb
            .from("eco_chofer_signup_drafts")
            .upsert(
              { wa_id: waId, [column]: path, updated_at: new Date().toISOString() },
              { onConflict: "wa_id" }
            );
        }
      }
    }

    // ========== process_all: corre Claude Vision sobre las 5 fotos ==========
    if (step === "process_all") {
      const { data: draft } = await sb
        .from("eco_chofer_signup_drafts")
        .select("*")
        .eq("wa_id", waId)
        .maybeSingle();

      if (!draft) {
        return {
          version: "3.0",
          screen: "RESUMEN",
          data: {
            nombre_inicial: "",
            dni_inicial: "",
            licencia_inicial: "",
            marca_inicial: "",
            modelo_inicial: "",
            anio_inicial: "",
            color_inicial: "",
            placa_inicial: "",
            soat_vence_inicial: "",
            linea_estado: "No pude leer las fotos. Edita manualmente lo necesario.",
          },
        };
      }

      const extractions: Record<string, Record<string, unknown> | null> = {};
      const kinds: Array<keyof typeof VISION_PROMPTS> = ["dni", "licencia", "selfie", "carro", "soat"];

      await Promise.all(
        kinds.map(async (kind) => {
          const path = (draft as DraftRow)[STEP_TO_COLUMN[kind] as keyof DraftRow] as string | null;
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

      // Persistir extracciones en draft
      await sb
        .from("eco_chofer_signup_drafts")
        .update({ ai_extraction: extractions, updated_at: new Date().toISOString() })
        .eq("wa_id", waId);

      const dniE = extractions.dni || {};
      const licE = extractions.licencia || {};
      const carE = extractions.carro || {};
      const soatE = extractions.soat || {};

      const detectados: string[] = [];
      if (dniE.es_dni) detectados.push("DNI");
      if (licE.es_licencia) detectados.push("licencia");
      if (carE.es_vehiculo) detectados.push("vehiculo");
      if (soatE.es_soat) detectados.push("SOAT");

      return {
        version: "3.0",
        screen: "RESUMEN",
        data: {
          nombre_inicial: (dniE.nombre_completo as string) || "",
          dni_inicial: (dniE.dni as string) || "",
          licencia_inicial: (licE.numero_licencia as string) || "",
          marca_inicial: (carE.marca as string) || "",
          modelo_inicial: (carE.modelo as string) || "",
          anio_inicial: (carE.anio_aproximado as string) || "",
          color_inicial: (carE.color as string) || "",
          placa_inicial:
            (carE.placa as string) || (soatE.placa as string) || "",
          soat_vence_inicial: (soatE.fecha_vencimiento as string) || "",
          linea_estado:
            detectados.length === 4
              ? "Detecte todo: DNI, licencia, vehiculo y SOAT. Edita lo que no coincida."
              : `Detecte: ${detectados.join(", ") || "ningun documento claro"}. Revisa y completa lo faltante.`,
        },
      };
    }

    // ========== Steps que solo navegan ==========
    if (["save_dni", "save_licencia", "save_selfie", "save_carro"].includes(step)) {
      return { version: "3.0", screen: NEXT_SCREEN[step], data: {} };
    }

    // ========== Submit final ==========
    if (step === "submit") {
      if (!data.dni || !data.placa) {
        return {
          version: "3.0",
          screen: "RESUMEN",
          data: { linea_estado: "Faltan DNI o placa. Completalos antes de enviar." },
        };
      }

      const { data: draft } = await sb
        .from("eco_chofer_signup_drafts")
        .select("*")
        .eq("wa_id", waId)
        .maybeSingle();

      const draftRow = draft as DraftRow | null;
      const ai = (draftRow?.ai_extraction || {}) as Record<string, Record<string, unknown> | null>;

      // ===== Auto-aprobacion si IA verifico TODO =====
      const placaForm = (data.placa || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const placaCarroAi = ((ai.carro?.placa as string) || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const placaSoatAi = ((ai.soat?.placa as string) || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

      const checks = {
        tieneDniValido: ai.dni?.es_dni === true && !!ai.dni?.dni,
        tieneLicenciaValida: ai.licencia?.es_licencia === true,
        tieneVehiculo: ai.carro?.es_vehiculo === true && !!ai.carro?.placa,
        tieneSoat: ai.soat?.es_soat === true && !!ai.soat?.placa,
        tieneSelfie: ai.selfie?.es_persona === true,
        placasCoinciden:
          placaCarroAi.length >= 5 &&
          placaSoatAi.length >= 5 &&
          (placaCarroAi === placaSoatAi || placaCarroAi === placaForm || placaSoatAi === placaForm),
      };
      const aiAprobaTodo = Object.values(checks).every(Boolean);

      const finalStatus = aiAprobaTodo ? "approved" : "pending";

      // SELECT-then-INSERT/UPDATE (DNI tiene unique parcial, no onConflict)
      const dniClean = (data.dni || "").trim();
      const placaFinal = placaForm || `PEND-${waId.slice(-4)}`;
      const row = {
        wa_id: waId,
        nombre: (data.nombre || "").trim() || "Chofer",
        dni: dniClean,
        licencia_numero: data.licencia || null,
        vehiculo_marca: (data.marca || "").trim() || "—",
        vehiculo_modelo: (data.modelo || "").trim() || "—",
        vehiculo_anio: (data.anio || "").trim() || "—",
        vehiculo_color: (data.color || "").trim() || "—",
        placa: placaFinal,
        soat_vencimiento: data.soat_vence || null,
        dni_foto_url: draftRow?.dni_path || null,
        licencia_foto_url: draftRow?.licencia_path || null,
        selfie_foto_url: draftRow?.selfie_path || null,
        carro_foto_url: draftRow?.carro_path || null,
        soat_foto_url: draftRow?.soat_path || null,
        ai_extraction: { ...ai, _checks: checks, _auto_approved: aiAprobaTodo },
        status: finalStatus,
        approved_at: aiAprobaTodo ? new Date().toISOString() : null,
        approved_by: aiAprobaTodo ? "ai" : null,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await sb
        .from("eco_choferes")
        .select("id")
        .or(`dni.eq.${dniClean},wa_id.eq.${waId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const upsertErr = existing
        ? (await sb.from("eco_choferes").update(row).eq("id", (existing as { id: string }).id)).error
        : (await sb.from("eco_choferes").insert(row)).error;

      if (upsertErr) {
        try {
          await sb.from("wa_flow_health").insert({
            endpoint_url: "inscripcion-chofer/submit",
            status_code: 500,
            duration_ms: 0,
            error: `upsert chofer failed: ${upsertErr.message} | wa=${waId} dni=${data.dni}`,
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

      // Limpiar draft
      await sb.from("eco_chofer_signup_drafts").delete().eq("wa_id", waId);

      const firstName = (data.nombre || "amigo").split(" ")[0];
      const phoneId = process.env.ECODRIVE_META_PHONE_ID;
      const token = process.env.ECODRIVE_META_ACCESS_TOKEN;

      // ===== Mensaje al chofer segun resultado =====
      if (phoneId && token) {
        try {
          const payload = aiAprobaTodo
            ? {
                // Bienvenida inmediata via template aprobado
                messaging_product: "whatsapp",
                to: waId,
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
                          text: `${data.marca || ""} ${data.modelo || ""}`.trim() || "tu vehiculo",
                        },
                        { type: "text", text: placaForm },
                      ],
                    },
                  ],
                },
              }
            : {
                // Pendiente: mensaje libre dentro de ventana 24h
                messaging_product: "whatsapp",
                to: waId,
                type: "text",
                text: {
                  body:
                    `Recibimos tu inscripcion ${firstName}. ` +
                    `Algunos datos necesitan revision manual y te avisamos por aqui en menos de 24h.`,
                },
              };
          await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
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
