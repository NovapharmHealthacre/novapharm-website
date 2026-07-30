import type { Metadata } from "next";
import { ArticleCard, PageHero } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getArticles } from "@/lib/content";
import { absolute, breadcrumbSchema, pageMetadata, webPageSchema } from "@/lib/seo";

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
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absolute(article.canonicalPath),
        name: article.title,
      })),
    },
  } as const;
  return (
    <>
      <JsonLdScript data={webPageSchema({ path: "/thinking/", name: title, description })} />
      <JsonLdScript data={collectionSchema} />
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
      <section className="writing-index section" aria-labelledby="essay-collection-title">
        <h2 id="essay-collection-title" className="sr-only">
          Published essays
        </h2>
        <div className="collection-summary">
          <span>{articles.length} essays</span>
          <span>Pharmaceutical strategy</span>
          <span>Founder perspective</span>
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
