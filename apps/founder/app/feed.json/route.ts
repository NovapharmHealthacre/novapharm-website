import { getArticles } from "@/lib/content";
import { jsonFeed } from "@/lib/feed";
import { publications } from "@/lib/site-data";

export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(jsonFeed(getArticles(), publications), {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
