import { getArticles } from "@/lib/content";
import { rssXml } from "@/lib/feed";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(rssXml(getArticles()), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
