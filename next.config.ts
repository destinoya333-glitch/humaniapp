import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /ecodrive (legacy) -> /ecodriveplus (canonical)
      { source: "/ecodrive", destination: "/ecodriveplus", permanent: true },
    ];
  },
};

export default nextConfig;
