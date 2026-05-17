import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: "/ecodriveplus/icon.png",
    apple: "/ecodriveplus/apple-icon.png",
  },
};

export default function EcoDrivePlusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
