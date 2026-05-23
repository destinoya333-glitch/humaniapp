import type { Metadata } from "next";
import { AdminClubClient } from "./_components/AdminClubClient";

export const metadata: Metadata = {
  title: "Admin Club EcoDrive+",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminClubPage() {
  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-2">Admin · EcoDrive+ Club</h1>
      <p className="text-gray-400 text-sm mb-6">Solo Percy. Necesita token <code>CLUB_ADMIN_TOKEN</code>.</p>
      <AdminClubClient />
    </main>
  );
}
