import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEGACY_HOSTS = new Set(["humaniapp.com", "www.humaniapp.com"]);

// Subdominio → ruta interna que sirve la app B2C
const SUBDOMAIN_REWRITES: Record<string, string> = {
  "sofia.activosya.com": "/miss-sofia",
  "novia.activosya.com": "/novia-ia",
};

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const url = request.nextUrl;

  // 1. Legacy domain → 308 redirect a activosya.com
  if (LEGACY_HOSTS.has(host)) {
    const target = new URL(url.pathname + url.search, "https://activosya.com");
    return NextResponse.redirect(target, 308);
  }

  // 2. Subdominio de producto → rewrite a la ruta interna
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
