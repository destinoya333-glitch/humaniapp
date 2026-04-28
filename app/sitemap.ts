import type { MetadataRoute } from "next";

const BASE = "https://activosya.com";

const slugs = [
  "miss-sofia",
  "tu-destino-ya",
  "tu-novia-ia",
  "tu-pedido-ya",
  "tu-reserva-ya",
  "ecodrive-plus",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/calculadora-roi`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/agendar`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/comparativa`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/devoluciones`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ...slugs.map((s) => ({
      url: `${BASE}/activos/${s}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    // Subdominios B2C (anunciados en sitemap principal)
    { url: "https://sofia.activosya.com", lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: "https://destino.activosya.com", lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: "https://novia.activosya.com", lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: "https://pedido.activosya.com", lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: "https://reserva.activosya.com", lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}
