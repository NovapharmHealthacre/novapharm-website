import type { MetadataRoute } from "next";
import { articles } from "@/data/articles";
import { indexableSlugs } from "@/data/pages";
import { leadership } from "@/data/site";
import { absoluteUrl } from "@/lib/seo";

const contentDate = new Date("2026-07-30T00:00:00Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...indexableSlugs.map((slug) => ({ url: absoluteUrl(slug ? `/${slug}/` : "/"), lastModified: contentDate, changeFrequency: slug.startsWith("legal/") ? "yearly" as const : "monthly" as const, priority: slug === "" ? 1 : ["services", "regulatory-services", "product-portfolio", "partner-with-us"].includes(slug) ? 0.9 : 0.7 })),
    ...leadership.map((person) => ({ url: absoluteUrl(`/leadership/${person.slug}/`), lastModified: contentDate, changeFrequency: "yearly" as const, priority: 0.7 })),
    ...articles.map((article) => ({ url: absoluteUrl(`/news-insights/${article.slug}/`), lastModified: new Date(`${article.updated}T00:00:00Z`), changeFrequency: "yearly" as const, priority: 0.8 })),
  ];
}
