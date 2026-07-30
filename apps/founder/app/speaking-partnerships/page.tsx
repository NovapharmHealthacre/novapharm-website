import type { Metadata } from "next";
import { PageHero, Prose } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getPage } from "@/lib/content";
import { breadcrumbSchema, pageMetadata, webPageSchema } from "@/lib/seo";

const page = getPage("speaking-partnerships");
export const metadata: Metadata = pageMetadata({
  title: `${page.title} — Vishal Chakravarty`,
  description: page.description,
  path: page.canonicalPath,
});

export default function SpeakingPage(): React.JSX.Element {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Speaking & partnerships", path: "/speaking-partnerships/" },
  ];
  return (
    <>
      <JsonLdScript
        data={webPageSchema({ path: page.canonicalPath, name: page.title, description: page.description })}
      />
      <JsonLdScript data={breadcrumbSchema(crumbs)} />
      <PageHero
        eyebrow="Speaking · Editorial · Founder roundtables"
        title={
          <>
            Conversations about
            <br />
            <em>building in pharmaceuticals.</em>
          </>
        }
        deck="Themes spanning market access, post-Brexit market entry, manufacturing partnerships, technology transfer, supply and founder execution."
        items={crumbs}
      />
      <Prose className="prose-page section" source={page.body} />
    </>
  );
}
