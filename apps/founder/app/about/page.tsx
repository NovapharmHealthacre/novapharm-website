import type { Metadata } from "next";
import { PageHero, Portrait, Prose } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getPage } from "@/lib/content";
import { breadcrumbSchema, founderPersonSchema, pageMetadata, profileSchema } from "@/lib/seo";

const page = getPage("about");
export const metadata: Metadata = pageMetadata({
  title: `${page.title} — Vishal Chakravarty`,
  description: page.description,
  path: page.canonicalPath,
});

export default function AboutPage(): React.JSX.Element {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about/" },
  ];
  return (
    <>
      <JsonLdScript data={profileSchema()} />
      <JsonLdScript data={founderPersonSchema()} />
      <JsonLdScript data={breadcrumbSchema(crumbs)} />
      <PageHero
        eyebrow="Founder profile"
        title="Vishal Chakravarty."
        deck="Pharmaceutical entrepreneur building NovaPharm Healthcare around market access, specialist medicines, manufacturing partnerships and resilient supply."
        items={crumbs}
      />
      <section className="profile-spread section">
        <div className="profile-image">
          <Portrait />
          <p>Vishal Chakravarty · Chief Executive Officer</p>
        </div>
        <Prose className="profile-copy" source={page.body} />
      </section>
    </>
  );
}
