/**
 * TuCuentoYa — Pipeline de generación de cuento.
 *
 * Orquesta:
 *  1. Claude Sonnet 4.6 genera narración estructurada JSON (segmentos multi-voz)
 *  2. Azure Neural TTS sintetiza MP3 con SSML
 *  3. (Opcional) Mezcla con música ambient según escenario
 *  4. Sube MP3 a Supabase Storage
 *  5. Actualiza pedido + registra métricas de costo
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  CLAUDE_SYSTEM_PROMPT,
  buildUserPrompt,
  type ContextoCuento,
  type DuracionCuento,
} from "./prompts";
import { sintetizar, costoEstimadoUSD, type SegmentoNarracion } from "./openai-tts";
import { mezclarConAmbient, detectarAmbient } from "./audio-mixer";
import { subirAudio } from "./storage";
import { actualizarPedido, registrarMetricaCuento, supabase } from "./db";
import { revisarPromptCliente, revisarTextoGenerado } from "./safety";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ResultadoGeneracion = {
  ok: boolean;
  pedido_id: string;
  titulo?: string;
  audio_url?: string;
  texto_cuento?: string;
  costo_usd?: number;
  duracion_audio_seg?: number;
  error?: string;
};

type CuentoEstructurado = {
  titulo: string;
  moraleja: string;
  narracion: SegmentoNarracion[];
};

export async function generarCuento(opts: {
  pedido_id: string;
  contexto: ContextoCuento;
  mezclar_ambient?: boolean;
}): Promise<ResultadoGeneracion> {
  const { pedido_id, mezclar_ambient = false } = opts;
  let contexto = opts.contexto;

  await actualizarPedido(pedido_id, { status: "generando" });

  try {
    // ─── Paso 0: Safety check del prompt del cliente ──────────────
    const safetyPrompt = revisarPromptCliente(contexto.escenario);
    if (safetyPrompt.prompt_reescrito) {
      contexto = { ...contexto, escenario: safetyPrompt.prompt_reescrito };
    }

    // ─── Paso 1: Claude genera narración estructurada ─────────────
    const userPrompt = buildUserPrompt(contexto);

    const claudeRes = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: CLAUDE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const txtBlock = claudeRes.content.find((c) => c.type === "text");
    const rawTxt = txtBlock && "text" in txtBlock ? txtBlock.text : "";
    const jsonMatch = rawTxt.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude no devolvió JSON parseable");

    let cuento: CuentoEstructurado;
    try {
      cuento = JSON.parse(jsonMatch[0]) as CuentoEstructurado;
    } catch (e) {
      throw new Error(`JSON inválido de Claude: ${(e as Error).message}`);
    }

    if (!Array.isArray(cuento.narracion) || cuento.narracion.length === 0) {
      throw new Error("Narración vacía o malformada");
    }

    // Forzar cierre clásico: si el ultimo segmento no contiene "colorin colorado", agregarlo.
    const ultimo = cuento.narracion[cuento.narracion.length - 1];
    const tieneColorin = /colorin colorado|color[íi]n colorado/i.test(ultimo?.texto ?? "");
    if (!tieneColorin) {
      cuento.narracion.push({
        voz: "narrador",
        texto: "Y colorín colorado... este cuento se ha terminado.",
      });
    }

    // ─── Safety post-generación: si hay red flags, fallar el cuento ────
    const textoCheck = cuento.narracion.map((s) => s.texto).join(" ");
    const safetyOut = revisarTextoGenerado(textoCheck);
    if (!safetyOut.ok) {
      throw new Error(
        `Red flags en texto generado: ${safetyOut.red_flags.join(", ")}. Regenerar.`,
      );
    }

    // Texto plano para guardar en BD (sin tags voz)
    const textoCuento = [
      `**${cuento.titulo}**`,
      ``,
      ...cuento.narracion.map((seg) => seg.texto),
      ``,
      `_Moraleja: ${cuento.moraleja}_`,
    ].join("\n");

    // ─── Paso 2: Azure TTS sintetiza ──────────────────────────────
    const tts = await sintetizar(cuento.narracion);

    // ─── Paso 3 (opcional): mezcla con música ambient ─────────────
    let audioFinal = tts.audio;
    if (mezclar_ambient) {
      const ambient = detectarAmbient(contexto.escenario);
      audioFinal = await mezclarConAmbient(tts.audio, ambient);
    }

    // ─── Paso 4: sube a Supabase Storage ──────────────────────────
    const { url: audioUrl } = await subirAudio(pedido_id, audioFinal);

    // ─── Paso 5: actualizar pedido + métricas ─────────────────────
    const costoUSD =
      costoEstimadoUSD(tts.azure_chars) +
      // costo Claude aproximado (Sonnet 4.6: $3/M input, $15/M output)
      (claudeRes.usage.input_tokens * 3) / 1_000_000 +
      (claudeRes.usage.output_tokens * 15) / 1_000_000;

    await actualizarPedido(pedido_id, {
      status: "entregado",
      claude_text: textoCuento,
      audio_url: audioUrl,
    });

    await registrarMetricaCuento({
      pedido_id,
      prompt_used: userPrompt.slice(0, 500),
      claude_tokens_in: claudeRes.usage.input_tokens,
      claude_tokens_out: claudeRes.usage.output_tokens,
      azure_chars: tts.azure_chars,
      duracion_audio_seg: tts.duracion_estimada_seg,
      costo_real_usd: costoUSD,
    });

    return {
      ok: true,
      pedido_id,
      titulo: cuento.titulo,
      audio_url: audioUrl,
      texto_cuento: textoCuento,
      costo_usd: costoUSD,
      duracion_audio_seg: tts.duracion_estimada_seg,
    };
  } catch (e) {
    const err = (e as Error).message;
    await actualizarPedido(pedido_id, { status: "fallido" });
    await supabase.from("tci_pedidos").update({ claude_text: `[ERROR] ${err}` }).eq("id", pedido_id);
    return { ok: false, pedido_id, error: err };
  }
}

/**
 * Validador rápido de duración solicitada.
 */
export function normalizarDuracion(input: string | number): DuracionCuento | null {
  const n = typeof input === "number" ? input : parseInt(String(input).match(/\d+/)?.[0] ?? "0", 10);
  if (n === 2 || n === 3 || n === 5) return n;
  return null;
}
