import type { Metadata } from "next";
import { PageHero, Prose } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getPage } from "@/lib/content";
import {
  breadcrumbSchema,
  founderOrganisationSchema,
  founderPersonSchema,
  pageMetadata,
  webPageSchema,
} from "@/lib/seo";
import { vishal } from "@/lib/site-data";

const page = getPage("facts");
export const metadata: Metadata = pageMetadata({
  title: `${page.title} — Vishal Chakravarty`,
  description: page.description,
  path: page.canonicalPath,
});

export default function FactsPage(): React.JSX.Element {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Founder profile", path: "/facts/" },
  ];
  return (
    <>
      <JsonLdScript
        data={webPageSchema({
          path: page.canonicalPath,
          name: page.title,
          description: page.description,
          mainEntity: vishal.id,
        })}
      />
      <JsonLdScript data={founderPersonSchema()} />
      <JsonLdScript data={founderOrganisationSchema()} />
      <JsonLdScript data={breadcrumbSchema(crumbs)} />
      <PageHero
        compact
        eyebrow="Founder profile"
        title="Vishal Chakravarty."
        deck="Biography, professional focus, selected publications and official links."
        items={crumbs}
      />
      <Prose className="prose-page section" source={page.body} />
    </>
  );
}
