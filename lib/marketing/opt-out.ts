// Helper compartido para gestionar opt-out de marketing en todos los bots de la familia
// ActivosYA / EcoDrive+. Una sola tabla `marketing_opt_out` centralizada en Supabase.
//
// Uso típico en un webhook:
//   if (isStopCommand(text)) {
//     await markOptOut(from, "sofia"); // o "destino", "cuento", "club", etc
//     await sendText(from, OPT_OUT_REPLY);
//     return;
//   }
//   if (isStartCommand(text)) {
//     await clearOptOut(from);
//     await sendText(from, OPT_IN_REPLY);
//     return;
//   }
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return client;
}

const STOP_RE = /^(stop|baja|cancelar suscripcion|cancelar suscripción|no recibir|no enviar|no quiero recibir)\b/i;
const START_RE = /^(empezar|start|reactivar|si quiero recibir|reanudar)\b/i;

export function isStopCommand(text: string): boolean {
  return STOP_RE.test(text.trim());
}
export function isStartCommand(text: string): boolean {
  return START_RE.test(text.trim());
}

/** Inserta o actualiza el opt-out del usuario. `source` identifica el bot que lo registró. */
export async function markOptOut(whatsapp: string, source = "user_stop"): Promise<void> {
  try {
    await db()
      .from("marketing_opt_out")
      .upsert(
        { whatsapp, source, opted_out_at: new Date().toISOString() },
        { onConflict: "whatsapp" },
      );
  } catch (e) {
    console.warn("[marketing/opt-out] markOptOut falló:", e);
  }
}

/** Remueve el opt-out (el usuario vuelve a recibir campañas). */
export async function clearOptOut(whatsapp: string): Promise<void> {
  try {
    await db().from("marketing_opt_out").delete().eq("whatsapp", whatsapp);
  } catch (e) {
    console.warn("[marketing/opt-out] clearOptOut falló:", e);
  }
}

export const OPT_OUT_REPLY =
  "Listo, te dimos de baja de nuestros mensajes promocionales. No vas a recibir más campañas marketing.\n\n" +
  "Si cambias de idea, escribe *EMPEZAR* para volver a recibirlas.\n\n" +
  "Los mensajes operativos (estado de viaje, sorteos donde participas, confirmaciones de pago, recordatorios de servicio) siguen activos.";

export const OPT_IN_REPLY =
  "Reactivado. Volverás a recibir nuestras promociones y novedades. Gracias por seguir con nosotros.";
