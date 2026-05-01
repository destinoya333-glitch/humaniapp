import TrackChoferClient from "./TrackChoferClient";

type Params = Promise<{ token: string }>;

export const metadata = {
  title: "EcoDrive+ Tracker",
  // Mobile PWA hints
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default async function TrackChoferPage({ params }: { params: Params }) {
  const { token } = await params;
  return <TrackChoferClient token={token} />;
}
