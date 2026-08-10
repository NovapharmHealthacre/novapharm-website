import { articles } from "@/data/articles";
import { siteUrl } from "@/lib/seo";

function xml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function GET() {
  const items = articles.map((article) => `<item><title>${xml(article.title)}</title><link>${siteUrl}/news-insights/${article.slug}/</link><guid isPermaLink="true">${siteUrl}/news-insights/${article.slug}/</guid><pubDate>${new Date(`${article.published}T12:00:00Z`).toUTCString()}</pubDate><description>${xml(article.summary)}</description><category>${xml(article.category)}</category></item>`).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>NovaPharm Healthcare Insights</title><link>${siteUrl}/news-insights/</link><description>Regulatory, quality, oncology, supply-chain and technology perspectives from NovaPharm Healthcare.</description><language>en-gb</language><atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
