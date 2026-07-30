import type { Metadata } from "next";
import { PageHero, Prose } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getPage } from "@/lib/content";
import { breadcrumbSchema, founderOrganisationSchema, pageMetadata, webPageSchema } from "@/lib/seo";
import { novapharmOrganisation } from "@/lib/site-data";

const page = getPage("ventures");
export const metadata: Metadata = pageMetadata({
  title: `${page.title} — Vishal Chakravarty`,
  description: page.description,
  path: page.canonicalPath,
});

export default function VenturesPage(): React.JSX.Element {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Ventures", path: "/ventures/" },
  ];
  return (
    <>
      <JsonLdScript
        data={webPageSchema({
          path: page.canonicalPath,
          name: page.title,
          description: page.description,
          mainEntity: novapharmOrganisation.id,
        })}
      />
      <JsonLdScript data={founderOrganisationSchema()} />
      <JsonLdScript data={breadcrumbSchema(crumbs)} />
      <PageHero
        compact
        eyebrow="NovaPharm Healthcare"
        title={
          <>
            Building the route
            <br />
            from product to market.
          </>
        }
        deck="A UK pharmaceutical company connecting product strategy, licensing, manufacturing, supply and commercial market entry."
        items={crumbs}
      />
      <Prose className="prose-page section" source={page.body} />
    </>
  );
}
