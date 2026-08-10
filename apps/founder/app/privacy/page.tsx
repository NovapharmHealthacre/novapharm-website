import type { Metadata } from "next";
import { PageHero, Prose } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getPage } from "@/lib/content";
import { breadcrumbSchema, pageMetadata, webPageSchema } from "@/lib/seo";

const page = getPage("privacy");
export const metadata: Metadata = pageMetadata({
  title: `${page.title} — Vishal Chakravarty`,
  description: page.description,
  path: page.canonicalPath,
});

export default function PrivacyPage(): React.JSX.Element {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Privacy", path: "/privacy/" },
  ];
  return (
    <>
      <JsonLdScript
        data={webPageSchema({ path: page.canonicalPath, name: page.title, description: page.description })}
      />
      <JsonLdScript data={breadcrumbSchema(crumbs)} />
      <PageHero
        compact
        eyebrow="Privacy"
        title="How this website handles information."
        deck="A concise description of the data practices used by this website and its email contact route."
        items={crumbs}
      />
      <Prose className="prose-page section" source={page.body} />
    </>
  );
}
