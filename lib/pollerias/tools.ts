import { getMenu, getDeliveryTarifas } from "./db";

export const polleriasTools = [
  {
    name: "consultar_menu",
    description: "Consulta el menú completo de la pollería con categorías, productos y precios",
    input_schema: {
      type: "object",
      properties: {
        tenant_id: { type: "string", description: "ID del tenant (pollería)" }
      },
      required: ["tenant_id"]
    }
  },
  {
    name: "calcular_delivery",
    description: "Calcula el costo de delivery según la distancia en km desde la pollería al cliente",
    input_schema: {
      type: "object",
      properties: {
        tenant_id: { type: "string" },
        distancia_km: { type: "number", description: "Distancia en kilómetros" }
      },
      required: ["tenant_id", "distancia_km"]
    }
  },
  {
    name: "confirmar_pedido",
    description: "Confirma el pedido con todos los items, tipo de entrega y datos del cliente",
    input_schema: {
      type: "object",
      properties: {
        tenant_id: { type: "string" },
        telefono: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nombre: { type: "string" },
              precio: { type: "number" },
              cantidad: { type: "number" },
              modificaciones: { type: "string" }
            },
            required: ["nombre", "precio", "cantidad"]
          }
        },
        tipo: { type: "string", enum: ["delivery", "recojo"] },
        direccion_entrega: { type: "string" },
        lat_entrega: { type: "number" },
        lon_entrega: { type: "number" },
        distancia_km: { type: "number" },
        costo_delivery: { type: "number" },
        hora_recojo: { type: "string" }
      },
      required: ["tenant_id", "telefono", "items", "tipo"]
    }
  },
  {
    name: "registrar_pago",
    description: "Registra el pago del pedido (Yape, transferencia o contra entrega)",
    input_schema: {
      type: "object",
      properties: {
        pedido_id: { type: "string" },
        metodo: { type: "string", enum: ["yape", "transferencia", "contra_entrega"] },
        referencia: { type: "string", description: "Número de operación Yape o referencia" }
      },
      required: ["pedido_id", "metodo"]
    }
  },
  {
    name: "consultar_pedido",
    description: "Consulta el estado actual del pedido del cliente",
    input_schema: {
      type: "object",
      properties: {
        tenant_id: { type: "string" },
        telefono: { type: "string" }
      },
      required: ["tenant_id", "telefono"]
    }
  }
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ejecutarTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: { supabase: any }
): Promise<string> {
  const { supabase } = context;

  switch (toolName) {
    case "consultar_menu": {
      const menu = await getMenu(toolInput.tenant_id as string);
      if (!menu || menu.length === 0) return "No hay productos disponibles en este momento.";
      let texto = "MENÚ:\n";
      for (const cat of menu) {
        texto += `\n🍽️ ${cat.nombre}\n`;
        const productos = (cat as Record<string, unknown>).pol_productos as Array<{nombre: string; precio: number; disponible: boolean}>;
        for (const p of productos || []) {
          if (p.disponible) texto += `  • ${p.nombre} — S/${p.precio}\n`;
        }
      }
      return texto;
    }

    case "calcular_delivery": {
      const tarifas = await getDeliveryTarifas(toolInput.tenant_id as string);
      if (!tarifas) return JSON.stringify({ error: "Sin tarifas configuradas" });
      const km = toolInput.distancia_km as number;
      const tarifa = tarifas.find((t: {km_desde: number; km_hasta: number; costo: number}) => km >= t.km_desde && km <= t.km_hasta);
      if (!tarifa) return JSON.stringify({ cobertura: false, mensaje: "Fuera del área de delivery" });
      return JSON.stringify({ cobertura: true, costo: tarifa.costo, distancia_km: km });
    }

    case "confirmar_pedido": {
      const items = toolInput.items as Array<{nombre: string; precio: number; cantidad: number; modificaciones?: string}>;
      const subtotal = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
      const costo_delivery = (toolInput.costo_delivery as number) || 0;
      const total = subtotal + costo_delivery;

      const { data: pedido } = await supabase
        .from("pol_pedidos")
        .insert({
          tenant_id: toolInput.tenant_id,
          tipo: toolInput.tipo,
          estado: "pago_pendiente",
          direccion_entrega: toolInput.direccion_entrega,
          lat_entrega: toolInput.lat_entrega,
          lon_entrega: toolInput.lon_entrega,
          distancia_km: toolInput.distancia_km,
          costo_delivery,
          hora_recojo: toolInput.hora_recojo,
          metodo_pago: null,
          subtotal,
          total
        })
        .select()
        .single();

      if (!pedido) return JSON.stringify({ error: "No se pudo crear el pedido" });

      const pedidoItems = items.map(i => ({
        pedido_id: pedido.id,
        nombre: i.nombre,
        precio: i.precio,
        cantidad: i.cantidad,
        modificaciones: i.modificaciones || null,
        subtotal: i.precio * i.cantidad
      }));

      await supabase.from("pol_pedido_items").insert(pedidoItems);

      return JSON.stringify({
        pedido_id: pedido.id,
        numero: pedido.numero,
        subtotal,
        costo_delivery,
        total
      });
    }

    case "registrar_pago": {
      const metodo = toolInput.metodo as string;
      const estado_pago = metodo === "contra_entrega" ? "confirmado" : "pendiente";
      const estado = metodo === "contra_entrega" ? "pago_confirmado" : "pago_pendiente";

      await supabase
        .from("pol_pedidos")
        .update({ metodo_pago: metodo, estado_pago, estado, referencia_pago: toolInput.referencia })
        .eq("id", toolInput.pedido_id);

      return JSON.stringify({ ok: true, estado_pago, pedido_id: toolInput.pedido_id });
    }

    case "consultar_pedido": {
      const { data } = await supabase
        .from("pol_pedidos")
        .select("numero, estado, total, tipo, created_at")
        .eq("tenant_id", toolInput.tenant_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (!data) return "No encontré pedidos recientes.";
      return JSON.stringify(data);
    }

    default:
      return JSON.stringify({ error: `Herramienta desconocida: ${toolName}` });
  }
}
