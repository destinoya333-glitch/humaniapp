import type { Metadata } from "next";
import TrackClient from "./TrackClient";

type Params = Promise<{ viajeId: string }>;

export const metadata: Metadata = {
  title: "Tracking en vivo · EcoDrive+",
  description: "Sigue tu viaje en tiempo real con EcoDrive+",
  robots: { index: false, follow: false },
};

export default async function TrackPage({ params }: { params: Params }) {
  const { viajeId } = await params;
  return <TrackClient viajeId={viajeId} />;
}
