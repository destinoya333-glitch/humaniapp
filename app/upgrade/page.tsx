import { redirect } from "next/navigation";

// Paywall legacy de Stripe retirado (2026-06-08). Todo el cobro de Miss Sofia
// ahora vive en /sofia-upgrade (Culqi + Yape). Redirigimos para no romper links.
export default function UpgradeRedirect() {
  redirect("/sofia-upgrade");
}
