import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ArticleRecord } from "@/lib/content";
import { type ExternalPublicationRecord, founderProfile } from "@/lib/site-data";

export function Breadcrumbs({
  items,
}: {
  readonly items: readonly { readonly name: string; readonly path: string }[];
}): React.JSX.Element {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={item.path}>
            {index === items.length - 1 ? (
              <span aria-current="page">{item.name}</span>
            ) : (
              <Link href={item.path}>{item.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Portrait({ priority = false }: { readonly priority?: boolean }): React.JSX.Element {
  const sizes = "(max-width: 720px) 84vw, 48vw";
  return (
    <picture className="portrait-frame">
      <source
        type="image/avif"
        srcSet="/images/portrait/vishal-chakravarty-640.avif 640w, /images/portrait/vishal-chakravarty-960.avif 960w, /images/portrait/vishal-chakravarty-1440.avif 1440w"
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet="/images/portrait/vishal-chakravarty-640.webp 640w, /images/portrait/vishal-chakravarty-960.webp 960w, /images/portrait/vishal-chakravarty-1440.webp 1440w"
        sizes={sizes}
      />
      <img
        src="/images/portrait/vishal-chakravarty-960.jpg"
        srcSet="/images/portrait/vishal-chakravarty-640.jpg 640w, /images/portrait/vishal-chakravarty-960.jpg 960w, /images/portrait/vishal-chakravarty-1440.jpg 1440w"
        alt={founderProfile.portrait.alt}
        width={960}
        height={935}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    </picture>
  );
}

export function MarkdownContent({ source }: { readonly source: string }): React.JSX.Element {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href = "", children }) => {
          const external = /^https:\/\//.test(href);
          return (
            <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
              {children}
            </a>
          );
        },
      }}
    >
      {source}
    </ReactMarkdown>
  );
}

export function Prose({
  source,
  className = "",
}: {
  readonly source: string;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <article className={`content-managed ${className}`.trim()}>
      <MarkdownContent source={source} />
    </article>
  );
}

export function ArticleCard({
  article,
  index,
}: {
  readonly article: ArticleRecord;
  readonly index: number;
}): React.JSX.Element {
  return (
    <article className="essay-card">
      <div className="essay-index">{String(index + 1).padStart(2, "0")}</div>
      <div className="essay-card-copy">
        <div className="essay-meta">
          <span>{article.category}</span>
          <span>{article.reading.minutes} min read</span>
        </div>
        <h3>
          <Link href={article.canonicalPath}>{article.title}</Link>
        </h3>
        <p>{article.summary}</p>
      </div>
      <Link className="round-link" href={article.canonicalPath} aria-label={`Read ${article.title}`}>
        <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}

export function PublicationCard({
  publication,
  featured = false,
}: {
  readonly publication: ExternalPublicationRecord;
  readonly featured?: boolean;
}): React.JSX.Element {
  const published = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${publication.publicationDate}T00:00:00Z`));

  return (
    <article className={`publication-card${featured ? " publication-card-featured" : ""}`}>
      <div className="publication-card-meta">
        <span>{publication.publisher}</span>
        <time dateTime={publication.publicationDate}>{published}</time>
      </div>
      <p className="publication-type">{publication.publicationType}</p>
      <h3>{publication.title}</h3>
      <p>{publication.abstract}</p>
      <ul className="publication-topics" aria-label="Topics">
        {publication.topics.slice(0, featured ? 4 : 3).map((topic) => (
          <li key={topic}>{topic}</li>
        ))}
      </ul>
      <div className="publication-actions">
        <a
          className="text-link"
          href={publication.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Read “${publication.title}” on ${publication.publisher} (opens in a new tab)`}
        >
          Read on {publication.publisher} <span aria-hidden="true">↗</span>
        </a>
        {publication.translations.map((translation) => (
          <a
            key={translation.url}
            href={translation.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${translation.title} for “${publication.title}” (opens in a new tab)`}
          >
            日本語 <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </article>
  );
}

export function PageHero({
  eyebrow,
  title,
  deck,
  items,
  compact = false,
}: {
  readonly eyebrow: string;
  readonly title: React.ReactNode;
  readonly deck: string;
  readonly items: readonly { readonly name: string; readonly path: string }[];
  readonly compact?: boolean;
}): React.JSX.Element {
  return (
    <section className={`page-hero ${compact ? "page-hero-compact" : "page-hero-editorial"}`}>
      <Breadcrumbs items={items} />
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="page-deck">{deck}</p>
    </section>
  );
}
