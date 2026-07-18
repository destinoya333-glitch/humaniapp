// Served at ecodriveplus.com/robots.txt (the ecodriveplus.com domain rewrites
// /* -> /ecodriveplus/*, so the app-root app/robots.ts is never reached for
// this domain). AI crawlers are explicitly allowed for generative-engine reach.

export const dynamic = "force-static";

const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "Amazonbot",
  "meta-externalagent",
];

export function GET() {
  const lines = [
    "User-Agent: *",
    "Allow: /",
    "Disallow: /mi-cuenta",
    "",
    "# Crawlers de IA — explícitamente permitidos",
    ...AI_BOTS.flatMap((b) => [`User-Agent: ${b}`, "Allow: /", ""]),
    "Sitemap: https://ecodriveplus.com/sitemap.xml",
    "Host: https://ecodriveplus.com",
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
