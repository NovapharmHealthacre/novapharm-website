import { getArticles } from "@/lib/content";
import { jsonFeed } from "@/lib/feed";

export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(jsonFeed(getArticles()), {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
