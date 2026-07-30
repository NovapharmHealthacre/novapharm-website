import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "Claude-SearchBot",
          "Claude-User",
          "PerplexityBot",
          "Perplexity-User",
        ],
        allow: "/",
      },
      { userAgent: ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"], disallow: "/" },
    ],
    sitemap: "https://vishal.novapharmhealthcare.com/sitemap.xml",
    host: "https://vishal.novapharmhealthcare.com",
  };
}
