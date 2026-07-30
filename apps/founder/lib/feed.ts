import type { ArticleRecord } from "./content";
import { absolute } from "./seo";

export function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cdata(value: string): string {
  return value.replaceAll("]]>", "]]]]><![CDATA[>");
}

export function rssXml(articles: readonly ArticleRecord[]): string {
  const items = articles
    .map(
      (article) => `    <item>
      <title>${xmlEscape(article.title)}</title>
      <link>${absolute(article.canonicalPath)}</link>
      <guid isPermaLink="true">${absolute(article.canonicalPath)}</guid>
      <pubDate>${new Date(`${article.published}T00:00:00Z`).toUTCString()}</pubDate>
      <dc:creator>${xmlEscape(article.author)}</dc:creator>
      <category>${xmlEscape(article.category)}</category>
      <description>${xmlEscape(article.summary)}</description>
      <content:encoded><![CDATA[${cdata(article.html)}]]></content:encoded>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Thinking by Vishal Chakravarty</title>
    <link>${absolute("/thinking/")}</link>
    <description>Essays on pharmaceutical market access, manufacturing, technology transfer, supply, portfolio strategy and founder execution.</description>
    <language>en-gb</language>
    <atom:link href="${absolute("/rss.xml")}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>\n`;
}

export function jsonFeed(articles: readonly ArticleRecord[]): Readonly<Record<string, unknown>> {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: "Thinking by Vishal Chakravarty",
    home_page_url: absolute("/thinking/"),
    feed_url: absolute("/feed.json"),
    description:
      "Essays on pharmaceutical market access, manufacturing, technology transfer, supply and founder execution.",
    authors: [{ name: "Vishal Chakravarty", url: absolute("/about/") }],
    language: "en-GB",
    items: articles.map((article) => ({
      id: absolute(article.canonicalPath),
      url: absolute(article.canonicalPath),
      title: article.title,
      summary: article.summary,
      content_html: article.html,
      date_published: `${article.published}T00:00:00Z`,
      date_modified: `${article.modified}T00:00:00Z`,
      authors: [{ name: article.author, url: absolute("/about/") }],
      tags: [article.category],
      _reading_time_minutes: article.reading.minutes,
    })),
  };
}
