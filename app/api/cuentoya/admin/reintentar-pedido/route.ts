import { NextRequest, NextResponse } from "next/server";
import { supabase, upsertConversacion, type EstadoConv } from "@/lib/cuentoinfantil/db";
import { generarCuento } from "@/lib/cuentoinfantil/generator";
import { sendText, uploadAndSendMedia } from "@/lib/cuentoinfantil/meta-cloud-sender";

export async function POST(req: NextRequest) {
  const adminKey = (process.env.CUENTOYA_ADMIN_KEY ?? "").trim();
  const sentKey = (req.headers.get("x-admin-key") ?? "").trim();
  if (!adminKey || sentKey !== adminKey) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { pedido_id?: string };
  const pedidoId = body.pedido_id;
  if (!pedidoId) return NextResponse.json({ ok: false, error: "pedido_id requerido" }, { status: 400 });

  const { data: pedido } = await supabase
    .from("tci_pedidos")
    .select("*")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido) return NextResponse.json({ ok: false, error: "pedido no existe" }, { status: 404 });

  const celular = pedido.celular as string;
  const { data: conv } = await supabase
    .from("tci_conversaciones")
    .select("contexto")
    .eq("celular", celular)
    .maybeSingle();

  const ctxConv = (conv?.contexto ?? {}) as {
    hijo?: { nombre: string; edad?: number; genero?: "f" | "m" };
    rol?: string;
  };
  const hijo = ctxConv.hijo ?? { nombre: "tu hijo" };
  const rolPapa = (ctxConv.rol ?? "papa") as
    | "papa" | "mama" | "abuelo" | "abuela" | "tio" | "hermano" | "mascota" | "otro";

  const gen = await generarCuento({
    pedido_id: pedido.id,
    contexto: {
      duracion_min: pedido.duracion_min,
      hijo: hijo as { nombre: string; edad?: number; genero?: "f" | "m" },
      acompanantes: [{ nombre: rolPapa, rol: rolPapa }],
      escenario: pedido.escenario,
      prompt_original: pedido.prompt_input ?? pedido.escenario,
    },
    mezclar_ambient: false,
  });

  if (gen.ok && gen.audio_url) {
    try {
      const r = await fetch(gen.audio_url);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        await uploadAndSendMedia({
          to: celular,
          buffer: buf,
          mimeType: "audio/mpeg",
          filename: `${gen.titulo ?? "cuento"}.mp3`,
        });
      }
    } catch (e) {
      console.error("[admin reintentar upload]", (e as Error).message);
    }
    await sendText(
      celular,
      `🎉 *${gen.titulo}*\n\n${gen.texto_cuento?.slice(0, 800) ?? ""}\n\n_Para otro cuento, escribe *menú*_ 🦮`,
    ).catch(() => {});
    await upsertConversacion(celular, { estado: "entregado" as EstadoConv });
  }

  return NextResponse.json({
    ok: gen.ok,
    pedido_id: pedido.id,
    audio_url: gen.audio_url,
    titulo: gen.titulo,
    error: gen.error,
  });
}
