import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEGACY_HOSTS = new Set(["humaniapp.com", "www.humaniapp.com"]);

// www → apex (308) para dominios propios con presencia canónica en el apex
const WWW_REDIRECTS: Record<string, string> = {
  "www.ecodriveplus.com": "https://ecodriveplus.com",
};

// Host → ruta interna que sirve la app B2C
const SUBDOMAIN_REWRITES: Record<string, string> = {
  "sofia.activosya.com": "/miss-sofia",
  "novia.activosya.com": "/novia-ia",
  "pedido.activosya.com": "/pedido",
  "reserva.activosya.com": "/reserva",
  "destino.activosya.com": "/destino",
  "ecodrive.activosya.com": "/ecodrive",
  "ecodriveplus.com": "/ecodriveplus",
};

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const url = request.nextUrl;

  // 1. Legacy domain → 308 redirect a activosya.com
  if (LEGACY_HOSTS.has(host)) {
    const target = new URL(url.pathname + url.search, "https://activosya.com");
    return NextResponse.redirect(target, 308);
  }

  // 2. www.* → apex (308)
  const wwwTarget = WWW_REDIRECTS[host];
  if (wwwTarget) {
    const target = new URL(url.pathname + url.search, wwwTarget);
    return NextResponse.redirect(target, 308);
  }

  // 3. Host de producto → rewrite a la ruta interna
  const rewriteBase = SUBDOMAIN_REWRITES[host];
  if (rewriteBase) {
    // Si ya viene con la ruta base, no la duplicamos
    const path = url.pathname.startsWith(rewriteBase)
      ? url.pathname
      : rewriteBase + (url.pathname === "/" ? "" : url.pathname);
    const target = url.clone();
    target.pathname = path;
    return NextResponse.rewrite(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|mp3|mp4)$).*)",
  ],
};
