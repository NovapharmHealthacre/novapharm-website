import type { ArticleRecord } from "./content";
import { absolute } from "./seo";
import type { ExternalPublicationRecord } from "./site-data";

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

export function rssXml(
  articles: readonly ArticleRecord[],
  publications: readonly ExternalPublicationRecord[] = [],
): string {
  const localItems = articles.map(
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
  );
  const externalItems = publications.map(
    (publication) => `    <item>
      <title>${xmlEscape(publication.title)}</title>
      <link>${xmlEscape(publication.canonicalUrl)}</link>
      <guid isPermaLink="true">${xmlEscape(publication.canonicalUrl)}</guid>
      <pubDate>${new Date(`${publication.publicationDate}T00:00:00Z`).toUTCString()}</pubDate>
      <dc:creator>${xmlEscape(publication.author)}</dc:creator>
      <category>${xmlEscape(publication.subject)}</category>
      <description>${xmlEscape(publication.abstract)}</description>
      <content:encoded><![CDATA[<p>${cdata(publication.abstract)}</p><p><a href="${publication.canonicalUrl}">Read on ${cdata(publication.publisher)}</a></p>]]></content:encoded>
    </item>`,
  );
  const items = [...localItems, ...externalItems]
    .sort((left, right) => {
      const date = (value: string) => value.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? "";
      return Date.parse(date(right)) - Date.parse(date(left));
    })
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

export function jsonFeed(
  articles: readonly ArticleRecord[],
  publications: readonly ExternalPublicationRecord[] = [],
): Readonly<Record<string, unknown>> {
  const items = [
    ...articles.map((article) => ({
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
    ...publications.map((publication) => ({
      id: publication.canonicalUrl,
      url: publication.canonicalUrl,
      external_url: publication.canonicalUrl,
      title: publication.title,
      summary: publication.abstract,
      content_text: `${publication.abstract}\n\nRead the complete article on ${publication.publisher}.`,
      date_published: `${publication.publicationDate}T00:00:00Z`,
      date_modified: `${publication.publicationDate}T00:00:00Z`,
      authors: [{ name: publication.author, url: absolute("/about/") }],
      tags: [...publication.topics],
      _external_publisher: publication.publisher,
    })),
  ].sort(
    (left, right) => right.date_published.localeCompare(left.date_published) || left.title.localeCompare(right.title),
  );

  return {
    version: "https://jsonfeed.org/version/1.1",
    title: "Thinking by Vishal Chakravarty",
    home_page_url: absolute("/thinking/"),
    feed_url: absolute("/feed.json"),
    description:
      "Essays on pharmaceutical market access, manufacturing, technology transfer, supply and founder execution.",
    authors: [{ name: "Vishal Chakravarty", url: absolute("/about/") }],
    language: "en-GB",
    items,
  };
}
