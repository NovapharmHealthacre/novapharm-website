import type { MetadataRoute } from "next";

export const dynamic = "force-static";

import { insights, site } from "@/data/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-07-21T00:00:00+05:30");
  const pages = ["", "/expertise", "/sectors", "/approach", "/insights", "/about", "/contact", "/privacy", "/terms"];
  return [
    ...pages.map((path, index) => ({
      url: `${site.url}${path || ""}/`,
      lastModified: updated,
      changeFrequency: path === "" ? "weekly" as const : "monthly" as const,
      priority: index === 0 ? 1 : path === "/contact" ? 0.8 : 0.7,
    })),
    ...insights.map((insight) => ({
      url: `${site.url}/insights/${insight.slug}/`,
      lastModified: updated,
      changeFrequency: "yearly" as const,
      priority: 0.65,
    })),
  ];
}
