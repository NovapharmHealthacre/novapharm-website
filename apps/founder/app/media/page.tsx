import type { Metadata } from "next";
import { PageHero, Prose, PublicationCard } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getPage } from "@/lib/content";
import { breadcrumbSchema, externalPublicationSchema, pageMetadata, webPageSchema } from "@/lib/seo";
import { publications } from "@/lib/site-data";

const page = getPage("media");
export const metadata: Metadata = pageMetadata({
  title: `${page.title} — Vishal Chakravarty`,
  description: page.description,
  path: page.canonicalPath,
});

export default function MediaPage(): React.JSX.Element {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Media", path: "/media/" },
  ];
  return (
    <>
      <JsonLdScript
        data={webPageSchema({ path: page.canonicalPath, name: page.title, description: page.description })}
      />
      <JsonLdScript data={breadcrumbSchema(crumbs)} />
      {publications.map((publication) => (
        <JsonLdScript key={publication.id} data={externalPublicationSchema(publication)} />
      ))}
      <PageHero
        compact
        eyebrow="Writing & media"
        title={
          <>
            Published work,
            <br />
            ideas and commentary.
          </>
        }
        deck="Selected writing on UK–EU pharmaceutical market access, post-Brexit regulation, parallel import and the operating decisions behind pharmaceutical companies."
        items={crumbs}
      />
      <section className="publication-series section" aria-labelledby="publication-record-title">
        <div className="series-intro">
          <p className="section-number">Verified external record</p>
          <h2 id="publication-record-title">Five publisher-hosted articles, one evidence-controlled record.</h2>
          <p>
            Each link resolves to the independent publisher. NovaPharm stores only verified metadata and an original
            portfolio summary; publisher article bodies are not reproduced here.
          </p>
        </div>
        <div className="publication-grid">
          {publications.map((publication) => (
            <PublicationCard key={publication.id} publication={publication} />
          ))}
        </div>
      </section>
      <Prose className="prose-page section" source={page.body} />
    </>
  );
}
