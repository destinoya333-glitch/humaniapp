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

      // Routing multi-tenant: flow_token codifica {tenant}:{flow_key}:{context}
      // Ej: "ecodrive:tracking-viaje:viaje123", "miss-sofia:pacto-cuna:+51964304268"
      // Fallback a screen hint + tenant ecodrive para backwards compat con templates antiguos.
      const explicitTenant = (payload.data as Record<string, unknown> | undefined)?.tenant as string | undefined;
      const explicitKey = (payload.data as Record<string, unknown> | undefined)?.flow_key as string | undefined;
      const screenHint = payload.screen?.toUpperCase();
      const tokenParts = (payload.flow_token || "").split(":");

      let tenant = "ecodrive"; // default backwards compat
      let flowKey = "tracking-viaje"; // default
      if (tokenParts.length >= 2) {
        tenant = tokenParts[0];
        flowKey = tokenParts[1];
      }
      if (explicitTenant) tenant = explicitTenant;
      if (explicitKey) flowKey = explicitKey;
      // Backwards compat: token sin tenant + screen hello-test
      if (tokenParts.length < 2 && (screenHint === "WELCOME" || screenHint === "SUCCESS")) {
        tenant = "ecodrive";
        flowKey = "hello-test";
      }

      const flow = getFlow(tenant, flowKey);
      if (!flow) {
        statusCode = 404;
        errorMsg = `Flow ${tenant}:${flowKey} no encontrado`;
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
