import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import MapaClient from "./MapaClient";

const COOKIE = "ecodrive_admin";

async function isAuthorized(): Promise<boolean> {
  const expected = process.env.ECODRIVE_ADMIN_PASSCODE;
  if (!expected) return false;
  const c = await cookies();
  return c.get(COOKIE)?.value === expected;
}

export default async function MapaPage() {
  if (!(await isAuthorized())) {
    redirect("/admin/ecodrive");
  }
  return <MapaClient />;
}
