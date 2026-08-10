import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (process.env.PUBLIC_INDEXABLE === "false") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/portal/", "/employee/", "/board/", "/admin/", "/executive-platform/", "/_secure/"] },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: ["/api/", "/portal/", "/employee/", "/board/", "/admin/", "/executive-platform/", "/_secure/"] },
      { userAgent: "GPTBot", disallow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
