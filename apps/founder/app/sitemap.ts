import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/content";
import { absolute } from "@/lib/seo";
import { founderProfile, profileReviewedOn } from "@/lib/site-data";

const pages = Object.freeze([
  "/",
  "/about/",
  "/ventures/",
  "/thinking/",
  "/media/",
  "/gallery/",
  "/speaking-partnerships/",
  "/facts/",
  "/contact/",
  "/privacy/",
]);

export default function sitemap(): MetadataRoute.Sitemap {
  const portrait = { url: absolute(founderProfile.portrait.path), title: founderProfile.portrait.alt };
  return [
    ...pages.map((path) => ({
      url: absolute(path),
      lastModified: profileReviewedOn,
      changeFrequency: path === "/" || path === "/thinking/" ? ("monthly" as const) : ("yearly" as const),
      priority: path === "/" ? 1 : path === "/thinking/" || path === "/about/" ? 0.8 : 0.6,
      ...(path === "/" || path === "/about/" || path === "/gallery/" || path === "/facts/"
        ? { images: [portrait.url] }
        : {}),
    })),
    ...getArticles().map((article) => ({
      url: absolute(article.canonicalPath),
      lastModified: article.modified,
      changeFrequency: "yearly" as const,
      priority: 0.7,
      images: [absolute(article.socialImage)],
    })),
  ];
}
