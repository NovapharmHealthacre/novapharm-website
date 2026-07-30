import type { Metadata } from "next";
import { PageHero, Prose } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getPage } from "@/lib/content";
import { breadcrumbSchema, pageMetadata, webPageSchema } from "@/lib/seo";

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
      <Prose className="prose-page section" source={page.body} />
    </>
  );
}
