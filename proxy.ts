import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEGACY_HOSTS = new Set(["humaniapp.com", "www.humaniapp.com"]);

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();

  if (LEGACY_HOSTS.has(host)) {
    const target = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      "https://activosya.com",
    );
    return NextResponse.redirect(target, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|mp3|mp4)$).*)",
  ],
};
