import type { Metadata } from "next";
import { ArticleCard, PageHero, PublicationCard } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getArticles } from "@/lib/content";
import { absolute, breadcrumbSchema, externalPublicationSchema, pageMetadata, webPageSchema } from "@/lib/seo";
import { publications } from "@/lib/site-data";

const title = "Pharmaceutical Essays by Vishal Chakravarty";
const description =
  "Original essays on pharmaceutical market access, manufacturing, technology transfer, supply, portfolio strategy and building in regulated markets.";
export const metadata: Metadata = pageMetadata({ title, description, path: "/thinking/" });

export default function ThinkingPage(): React.JSX.Element {
  const articles = getArticles();
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Thinking", path: "/thinking/" },
  ];
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${absolute("/thinking/")}#collection`,
    url: absolute("/thinking/"),
    name: title,
    description,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        ...publications.map((publication, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: publication.canonicalUrl,
          name: publication.title,
        })),
        ...articles.map((article, index) => ({
          "@type": "ListItem",
          position: publications.length + index + 1,
          url: absolute(article.canonicalPath),
          name: article.title,
        })),
      ],
    },
  } as const;
  return (
    <>
      <JsonLdScript data={webPageSchema({ path: "/thinking/", name: title, description })} />
      <JsonLdScript data={collectionSchema} />
      {publications.map((publication) => (
        <JsonLdScript key={publication.id} data={externalPublicationSchema(publication)} />
      ))}
      <JsonLdScript data={breadcrumbSchema(crumbs)} />
      <PageHero
        eyebrow="Pharmaceutical strategy · Founder execution"
        title={
          <>
            Essays from
            <br />
            <em>the work.</em>
          </>
        }
        deck="Original writing on market access, manufacturing, technology transfer, supply, portfolio strategy and building in regulated markets."
        items={crumbs}
      />
      <section className="writing-index section" aria-labelledby="external-publication-title">
        <div className="section-heading">
          <div>
            <p className="section-number">01 / External publications</p>
            <h2 id="external-publication-title">Verified work published by independent outlets</h2>
          </div>
        </div>
        <div className="publication-grid">
          {publications.map((publication) => (
            <PublicationCard key={publication.id} publication={publication} />
          ))}
        </div>
      </section>
      <section className="writing-index section" aria-labelledby="essay-collection-title">
        <h2 id="essay-collection-title" className="sr-only">
          Published essays
        </h2>
        <div className="collection-summary">
          <span>{articles.length} original essays</span>
          <span>{publications.length} verified external publications</span>
          <span>Pharmaceutical strategy</span>
        </div>
        <div className="essay-list essay-list-large">
          {articles.map((article, index) => (
            <ArticleCard key={article.slug} article={article} index={index} />
          ))}
        </div>
      </section>
      <aside className="editorial-policy section">
        <p className="eyebrow">Editorial approach</p>
        <h2>Commercial questions, primary sources and an operator’s point of view.</h2>
        <p>
          Technical articles use current authoritative sources where the subject requires them. The writing focuses on
          operating and commercial decisions rather than patient-specific guidance.
        </p>
      </aside>
    </>
  );
}
