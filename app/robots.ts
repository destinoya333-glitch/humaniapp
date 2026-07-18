import type { MetadataRoute } from "next";

// Robots for activosya.com. AI crawlers are explicitly allowed so the brand can
// be cited by generative engines (ChatGPT, Perplexity, Gemini, AI Overviews).
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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/operador/", "/admin/"] },
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/api/", "/operador/", "/admin/"],
      })),
    ],
    sitemap: "https://activosya.com/sitemap.xml",
    host: "https://activosya.com",
  };
}
