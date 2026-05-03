/**
 * Registry de flows registrados en la plataforma.
 * Cada flow se importa estáticamente para auto-routing en el webhook.
 *
 * Para agregar un flow nuevo:
 *  1. Crear archivo en lib/wa-flows-tenants/<tenant>/flows/<flow_key>.ts
 *  2. Exportar default un objeto que cumpla FlowDefinition
 *  3. Importarlo y agregarlo a FLOW_REGISTRY abajo
 */

export type FlowAction = "INIT" | "data_exchange" | "BACK" | "ping";

export type FlowRequestPayload = {
  version: string;
  action: FlowAction | string;
  screen?: string;
  data?: Record<string, unknown>;
  flow_token?: string;
};

export type FlowResponse = {
  version: string;
  screen?: string;
  data?: Record<string, unknown>;
  // Para errores:
  error_msg?: string;
};

export interface FlowDefinition {
  tenant: string;
  flow_key: string;
  meta: {
    name: string;
    description: string;
    waba_id?: string;       // si null, usa el global
    phone_id?: string;      // si null, usa el global
  };
  /**
   * Handler principal: recibe el payload decifrado, retorna respuesta.
   * Aquí va toda la lógica del flow (transiciones de pantallas, validación).
   */
  handle: (req: FlowRequestPayload, ctx: FlowContext) => Promise<FlowResponse>;
  /**
   * Cuando el flow termina (action='COMPLETE'), se llama esto para
   * persistir los datos finales en BD del tenant.
   */
  onComplete?: (data: Record<string, unknown>, ctx: FlowContext) => Promise<void>;
}

export type FlowContext = {
  user_phone?: string;
  user_wa_id?: string;
  flow_token?: string;
  tenant: string;
  flow_key: string;
};

const FLOW_REGISTRY = new Map<string, FlowDefinition>();

export function registerFlow(flow: FlowDefinition) {
  const key = `${flow.tenant}:${flow.flow_key}`;
  FLOW_REGISTRY.set(key, flow);
}

export function getFlow(tenant: string, flow_key: string): FlowDefinition | undefined {
  return FLOW_REGISTRY.get(`${tenant}:${flow_key}`);
}

export function listFlows(): FlowDefinition[] {
  return Array.from(FLOW_REGISTRY.values());
}

/**
 * Health check: respuesta a un ping de Meta.
 */
export function pingResponse(): FlowResponse {
  return {
    version: "3.0",
    data: { status: "active" },
  };
}
