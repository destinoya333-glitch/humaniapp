import type { NextRequest } from "next/server";

const COOKIE = "ecodrive_admin";

/**
 * Auth admin EcoDrive+. Acepta el passcode por cualquiera de estas vías:
 *   - header  x-admin-passcode   (subpáginas client)
 *   - query   ?p=                (descargas <a> de reportes)
 *   - cookie  ecodrive_admin     (login del dashboard, server component)
 *
 * Así un solo login (en el dashboard o en una subpágina) desbloquea todo.
 */
export function isAdmin(req: NextRequest): boolean {
  const expected = process.env.ECODRIVE_ADMIN_PASSCODE;
  if (!expected) return false;
  if (req.headers.get("x-admin-passcode") === expected) return true;
  if (req.nextUrl.searchParams.get("p") === expected) return true;
  if (req.cookies.get(COOKIE)?.value === expected) return true;
  return false;
}
