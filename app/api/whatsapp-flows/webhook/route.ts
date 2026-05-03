/**
 * WhatsApp Flows — Endpoint webhook universal multi-tenant.
 *
 * Meta envía cada request del flow aquí. Decripta, rutea al flow correcto,
 * encripta la respuesta y la devuelve.
 *
 * Para registrar un nuevo flow, agregarlo en lib/wa-flows-tenants/index.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptRequest, encryptResponse } from "@/lib/wa-flows-platform/encryption";
import { getFlow, pingResponse } from "@/lib/wa-flows-platform/registry";
// IMPORTANTE: importar para que se ejecute el registerFlow() de cada flow
import "@/lib/wa-flows-tenants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const start = Date.now();
  let statusCode = 200;
  let errorMsg = "";

  try {
    const body = await req.json();

    // Caso 1 — Health check de Meta (ping)
    if (body?.action === "ping") {
      return new NextResponse(JSON.stringify(pingResponse()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Caso 2 — Request encriptado de Meta Flows
    if (body?.encrypted_flow_data && body?.encrypted_aes_key && body?.initial_vector) {
      const privateKey = process.env.WA_FLOWS_PRIVATE_KEY;
      if (!privateKey) {
        statusCode = 500;
        errorMsg = "WA_FLOWS_PRIVATE_KEY no configurada";
        return new NextResponse("Server config error", { status: 500 });
      }

      // Decriptar el request
      const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptRequest(
        body,
        privateKey
      );

      const payload = decryptedBody as {
        version: string;
        action: string;
        screen?: string;
        flow_token?: string;
        data?: Record<string, unknown>;
      };

      // Routing: identificamos el flow por screen + flow_token contexto
      // Si data tiene flow_key explícito (lo pasamos cuando enviamos el flow), usarlo.
      // Sino caemos a tracking-viaje (el flow productivo principal).
      const explicitKey = (payload.data as Record<string, unknown> | undefined)?.flow_key as string | undefined;
      const screenHint = payload.screen?.toUpperCase();

      let flowKey = "tracking-viaje"; // default
      if (explicitKey) flowKey = explicitKey;
      else if (screenHint === "WELCOME" || screenHint === "SUCCESS") flowKey = "hello-test";

      const flow = getFlow("ecodrive", flowKey);
      if (!flow) {
        statusCode = 404;
        errorMsg = `Flow ecodrive:${flowKey} no encontrado`;
        return new NextResponse("Flow not found", { status: 404 });
      }

      const response = await flow.handle(payload, {
        flow_token: payload.flow_token,
        tenant: flow.tenant,
        flow_key: flow.flow_key,
      });

      // Encriptar respuesta con la misma AES key + IV flippeado
      const encrypted = encryptResponse(
        response as Record<string, unknown>,
        aesKeyBuffer,
        initialVectorBuffer
      );

      return new NextResponse(encrypted, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Caso 3 — payload inesperado
    statusCode = 400;
    errorMsg = "Body no reconocido";
    return new NextResponse("Invalid request body", { status: 400 });
  } catch (e: unknown) {
    statusCode = 500;
    errorMsg = (e as Error).message;
    console.error("[WA-FLOWS webhook]", errorMsg);
    return new NextResponse("Internal error", { status: 500 });
  } finally {
    // Log health (best effort, no rompemos respuesta si falla)
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await sb.from("wa_flow_health").insert({
        endpoint_url: req.nextUrl.pathname,
        status_code: statusCode,
        duration_ms: Date.now() - start,
        error: errorMsg || null,
      });
    } catch {}
  }
}

/**
 * Meta también envía health checks GET ocasionales para verificar que el
 * endpoint está vivo (signed_request flow). Respondemos 200 OK simple.
 */
export async function GET() {
  return new NextResponse(JSON.stringify({ status: "active" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
