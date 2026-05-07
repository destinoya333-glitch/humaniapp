import type { Metadata } from "next";
import PickerClient from "./PickerClient";

type Params = Promise<{ token: string }>;

export const metadata: Metadata = {
  title: "Pide tu viaje · EcoDrive+",
  description: "Elige origen y destino en el mapa. Tarifa al toque.",
  robots: { index: false, follow: false },
};

export default async function EcoPedirPage({ params }: { params: Params }) {
  const { token } = await params;
  return <PickerClient token={token} />;
}
