import {
  registrarPagoPendiente,
  esVIP,
  activarVIP,
  yaUsoGratuita,
  marcarGratuitaUsada,
  guardarLectura,
  buscarPagoReciente,
  actualizarEstadoPago,
  contarReconsultas,
  getSaldo,
  debitarSaldo,
} from "./db";

// Catálogo de planes (precios fijos)
export const PLANES: Record<number, { secciones: number; label: string; palabras: number }> = {
  3: { secciones: 3, label: "BÁSICO", palabras: 120 },
  6: { secciones: 4, label: "INTERMEDIO", palabras: 135 },
  9: { secciones: 6, label: "PREMIUM", palabras: 100 },
  9.9: { secciones: 3, label: "PRO", palabras: 280 },
};

// Límites de reconsultas por plan
export const LIMITES_RECONSULTAS: Record<number, number> = {
  3: 1,
  6: 2,
  9: 3,
  9.9: 999, // ilimitadas para PRO
};

export const destinoyaTools = [
  {
    name: "verificar_vip",
    description: "Verifica si el celular tiene una suscripción VIP activa",
    input_schema: {
      type: "object",
      properties: {
        celular: { type: "string" },
      },
      required: ["celular"],
    },
  },
  {
    name: "verificar_lectura_gratuita",
    description: "Verifica si el celular ya usó su lectura gratuita (1 sola vez en la vida)",
    input_schema: {
      type: "object",
      properties: { celular: { type: "string" } },
      required: ["celular"],
    },
  },
  {
    name: "registrar_pago_pendiente",
    description:
      "Registra que el cliente eligió un servicio y plan, y queda esperando que MadroDroid detecte el yape. NO marca como pagado. Usar cuando el cliente eligió plan y vamos a darle datos de Yape.",
    input_schema: {
      type: "object",
      properties: {
        celular: { type: "string" },
        monto: { type: "number", enum: [3, 6, 9, 9.9, 18, 63] },
        servicio: {
          type: "string",
          description: "Identificador del servicio: legal, salud, veterinaria, plantas, financiero, nutricionista, mano, compatibilidad, carta_astral, futuro_30, futuro_60, futuro_90, feng_shui, numerologia, cv, consejo, decision, problema, peso, alimentacion, vip_mensual, vip_anual",
        },
        temas: { type: "string", description: "Temas elegidos por el cliente (ej: '2,5,9') si aplica" },
        nombre1: { type: "string", description: "Nombre 1 (carta astral, compatibilidad, etc.)" },
        fecha1: { type: "string", description: "Fecha 1" },
        nombre2: { type: "string", description: "Nombre 2 (compatibilidad)" },
        fecha2: { type: "string", description: "Fecha 2 (compatibilidad)" },
      },
      required: ["celular", "monto", "servicio"],
    },
  },
  {
    name: "activar_vip",
    description: "Activa una suscripción VIP (mensual S/18 o anual S/63) tras confirmar pago",
    input_schema: {
      type: "object",
      properties: {
        celular: { type: "string" },
        plan: { type: "string", enum: ["mensual", "anual"] },
      },
      required: ["celular", "plan"],
    },
  },
  {
    name: "marcar_lectura_gratuita_usada",
    description: "Marca que el celular ya usó su lectura gratuita (1 sola vez en la vida)",
    input_schema: {
      type: "object",
      properties: { celular: { type: "string" } },
      required: ["celular"],
    },
  },
  {
    name: "guardar_consulta_entregada",
    description:
      "Guarda en historial la consulta entregada al cliente (lectura, asesoría, etc.) y marca el pago como entregado",
    input_schema: {
      type: "object",
      properties: {
        celular: { type: "string" },
        servicio: { type: "string" },
        respuesta_completa: { type: "string", description: "El texto completo de la respuesta entregada" },
        pago_id: { type: "string", description: "ID del pago asociado (opcional)" },
      },
      required: ["celular", "servicio", "respuesta_completa"],
    },
  },
  {
    name: "consultar_reconsultas_disponibles",
    description: "Consulta cuántas reconsultas le quedan al cliente del último pago",
    input_schema: {
      type: "object",
      properties: { celular: { type: "string" } },
      required: ["celular"],
    },
  },
  {
    name: "consultar_saldo",
    description: "Consulta el saldo a favor del cliente (de pagos en exceso o yapes sin servicio activo)",
    input_schema: {
      type: "object",
      properties: { celular: { type: "string" } },
      required: ["celular"],
    },
  },
  {
    name: "usar_saldo",
    description: "Usa el saldo del cliente para pagar (total o parcial) un servicio. Lo descuenta del saldo y crea un pago confirmado.",
    input_schema: {
      type: "object",
      properties: {
        celular: { type: "string" },
        monto: { type: "number", description: "Monto a debitar del saldo" },
        servicio: { type: "string", description: "Servicio que está pagando con saldo" },
      },
      required: ["celular", "monto", "servicio"],
    },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ejecutarTool(toolName: string, input: Record<string, unknown>): Promise<string> {
  switch (toolName) {
    case "verificar_vip": {
      const activo = await esVIP(input.celular as string);
      return JSON.stringify({ es_vip: activo });
    }

    case "verificar_lectura_gratuita": {
      const usada = await yaUsoGratuita(input.celular as string);
      return JSON.stringify({ ya_uso_gratuita: usada });
    }

    case "registrar_pago_pendiente": {
      const pago = await registrarPagoPendiente({
        celular: input.celular as string,
        monto: input.monto as number,
        servicio: input.servicio as string,
        temas: input.temas as string | undefined,
        nombre1: input.nombre1 as string | undefined,
        fecha1: input.fecha1 as string | undefined,
        nombre2: input.nombre2 as string | undefined,
        fecha2: input.fecha2 as string | undefined,
      });
      return JSON.stringify({ ok: true, pago_id: pago.id, estado: "esperando_pago" });
    }

    case "activar_vip": {
      const v = await activarVIP(
        input.celular as string,
        input.plan as "mensual" | "anual"
      );
      return JSON.stringify({
        ok: true,
        fecha_inicio: v.fecha_inicio,
        fecha_vencimiento: v.fecha_vencimiento,
      });
    }

    case "marcar_lectura_gratuita_usada": {
      await marcarGratuitaUsada(input.celular as string);
      return JSON.stringify({ ok: true });
    }

    case "guardar_consulta_entregada": {
      await guardarLectura(
        input.celular as string,
        input.servicio as string,
        input.respuesta_completa as string
      );
      const pagoId = input.pago_id as string | undefined;
      if (pagoId) {
        await actualizarEstadoPago(pagoId, "consulta_entregada");
      }
      return JSON.stringify({ ok: true });
    }

    case "consultar_saldo": {
      const saldo = await getSaldo(input.celular as string);
      return JSON.stringify({ saldo_disponible: saldo });
    }

    case "usar_saldo": {
      try {
        const nuevoSaldo = await debitarSaldo(
          input.celular as string,
          input.monto as number,
          `pago_servicio_${input.servicio}`
        );
        return JSON.stringify({ ok: true, saldo_restante: nuevoSaldo });
      } catch (e) {
        return JSON.stringify({ ok: false, error: String(e) });
      }
    }

    case "consultar_reconsultas_disponibles": {
      const pago = await buscarPagoReciente(input.celular as string);
      if (!pago) {
        return JSON.stringify({ disponibles: 0, motivo: "Sin pago activo" });
      }
      const usadas = await contarReconsultas(pago.id);
      const limite = LIMITES_RECONSULTAS[pago.monto] || 1;
      return JSON.stringify({
        disponibles: Math.max(0, limite - usadas),
        usadas,
        limite,
        plan: PLANES[pago.monto]?.label || "BÁSICO",
      });
    }

    default:
      return JSON.stringify({ error: `Herramienta desconocida: ${toolName}` });
  }
}
