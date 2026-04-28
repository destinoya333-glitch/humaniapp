import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/operador/"] },
    ],
    sitemap: "https://activosya.com/sitemap.xml",
    host: "https://activosya.com",
  };
}
