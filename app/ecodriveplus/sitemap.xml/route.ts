// Served at ecodriveplus.com/sitemap.xml (the ecodriveplus.com domain rewrites
// /* -> /ecodriveplus/*). Lists the public EcoDrive+ URLs on their own domain.

export const dynamic = "force-static";

const BASE = "https://ecodriveplus.com";
const lastmod = new Date().toISOString();

const urls: Array<{ loc: string; changefreq: string; priority: string }> = [
  { loc: `${BASE}/`, changefreq: "weekly", priority: "1.0" },
  { loc: `${BASE}/descargar-app`, changefreq: "weekly", priority: "0.9" },
  { loc: `${BASE}/club`, changefreq: "daily", priority: "0.95" },
  { loc: `${BASE}/club/como-funciona`, changefreq: "weekly", priority: "0.7" },
  { loc: `${BASE}/club/bases`, changefreq: "weekly", priority: "0.6" },
  { loc: `${BASE}/sorteos`, changefreq: "daily", priority: "0.8" },
];

export function GET() {
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n` +
          `    <loc>${u.loc}</loc>\n` +
          `    <lastmod>${lastmod}</lastmod>\n` +
          `    <changefreq>${u.changefreq}</changefreq>\n` +
          `    <priority>${u.priority}</priority>\n` +
          `  </url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
