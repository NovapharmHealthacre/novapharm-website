import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard, Breadcrumbs, MarkdownContent } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getArticle, getArticles } from "@/lib/content";
import { absolute, articleSchema, breadcrumbSchema, pageMetadata, webPageSchema } from "@/lib/seo";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function generateStaticParams(): readonly { readonly slug: string }[] {
  return getArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article)
    return pageMetadata({
      title: "Essay not found — Vishal Chakravarty",
      description: "The requested essay could not be found.",
      path: `/essays/${slug}/`,
      noIndex: true,
    });
  return pageMetadata({
    title: `${article.title} — Vishal Chakravarty`,
    description: article.description,
    path: article.canonicalPath,
    image: article.socialImage,
    imageAlt: `Social card for “${article.title}”, an essay by Vishal Chakravarty`,
  });
}

export default async function ArticlePage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const articles = getArticles();
  const article = getArticle(slug);
  if (!article) notFound();
  const currentIndex = articles.findIndex((candidate) => candidate.slug === article.slug);
  const previous = articles[currentIndex + 1];
  const next = articles[currentIndex - 1];
  const related = article.related
    .map((relatedSlug) => articles.find((candidate) => candidate.slug === relatedSlug))
    .filter((candidate): candidate is (typeof articles)[number] => Boolean(candidate));
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Thinking", path: "/thinking/" },
    { name: article.title, path: article.canonicalPath },
  ];

  return (
    <article className="article-shell">
      <JsonLdScript
        data={webPageSchema({
          path: article.canonicalPath,
          name: article.title,
          description: article.description,
          mainEntity: `${absolute(article.canonicalPath)}#article`,
        })}
      />
      <JsonLdScript data={articleSchema(article)} />
      <JsonLdScript data={breadcrumbSchema(crumbs)} />
      <header className="article-header">
        <Breadcrumbs items={crumbs} />
        <p className="eyebrow">{article.category}</p>
        <h1>{article.title}</h1>
        <p className="article-summary">{article.summary}</p>
        <div className="article-byline">
          <span>By {article.author}</span>
          <span>Published {formatDate(article.published)}</span>
          <span>Updated {formatDate(article.modified)}</span>
          <span>
            {article.reading.minutes} min · {article.reading.words.toLocaleString("en-GB")} words
          </span>
        </div>
      </header>
      <div className="article-layout">
        <aside className="article-aside">
          <span>{article.category}</span>
          <p>Founder analysis on the decisions connecting product, market, manufacturing and supply.</p>
          {article.sources.length ? <a href="#sources">Sources ↓</a> : null}
        </aside>
        <div className="article-body">
          <MarkdownContent source={article.body} />
        </div>
      </div>
      {article.sources.length ? (
        <section className="article-sources section" id="sources" aria-labelledby="sources-title">
          <p className="section-number">Sources</p>
          <h2 id="sources-title">Reference points</h2>
          <ol>
            {article.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {related.length ? (
        <section className="related section">
          <p className="section-number">Continue reading</p>
          <div className="essay-list">
            {related.map((relatedArticle, index) => (
              <ArticleCard key={relatedArticle.slug} article={relatedArticle} index={index} />
            ))}
          </div>
        </section>
      ) : null}
      <nav className="article-pagination" aria-label="Essay pagination">
        {previous ? (
          <Link href={previous.canonicalPath}>
            <span>Previous</span>
            <strong>{previous.title}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={next.canonicalPath}>
            <span>Next</span>
            <strong>{next.title}</strong>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
