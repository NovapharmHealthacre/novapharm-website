import type { Metadata } from "next";
import { Breadcrumbs, Prose } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getPage } from "@/lib/content";
import { breadcrumbSchema, pageMetadata, webPageSchema } from "@/lib/seo";
import { founderContact, vishal } from "@/lib/site-data";

const page = getPage("contact");
export const metadata: Metadata = pageMetadata({
  title: `${page.title} — Vishal Chakravarty`,
  description: page.description,
  path: page.canonicalPath,
});

export default function ContactPage(): React.JSX.Element {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact/" },
  ];
  return (
    <>
      <JsonLdScript
        data={webPageSchema({
          path: page.canonicalPath,
          name: page.title,
          description: page.description,
          type: "ContactPage",
          mainEntity: vishal.id,
        })}
      />
      <JsonLdScript data={breadcrumbSchema(crumbs)} />
      <section className="contact-hero">
        <Breadcrumbs items={crumbs} />
        <p className="eyebrow">Direct contact</p>
        <h1>Start a focused conversation.</h1>
        <p className="page-deck">
          For selected conversations across pharmaceutical market access, manufacturing, supply, company building and
          editorial work.
        </p>
        <a className="contact-email" href={`mailto:${founderContact.email}`}>
          <span>{founderContact.email}</span>
          <span aria-hidden="true">↗</span>
        </a>
        <Prose className="contact-content" source={page.body} />
      </section>
    </>
  );
}
