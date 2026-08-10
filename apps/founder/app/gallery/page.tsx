import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Portrait } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { absolute, breadcrumbSchema, founderPersonSchema, pageMetadata, webPageSchema } from "@/lib/seo";
import { founderProfile, vishal } from "@/lib/site-data";

const title = "Official Portrait of Vishal Chakravarty";
const description =
  "The approved professional portrait of Vishal Chakravarty, Chief Executive Officer of NovaPharm Healthcare Ltd.";
export const metadata: Metadata = pageMetadata({ title, description, path: "/gallery/" });

export default function GalleryPage(): React.JSX.Element {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Official portrait", path: "/gallery/" },
  ];
  const imageSchema = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "@id": `${absolute("/gallery/")}#portrait`,
    contentUrl: absolute(founderProfile.portrait.path),
    url: absolute(founderProfile.portrait.path),
    width: founderProfile.portrait.width,
    height: founderProfile.portrait.height,
    caption: founderProfile.portrait.alt,
    representativeOfPage: true,
    about: { "@id": vishal.id },
  } as const;
  return (
    <>
      <JsonLdScript data={webPageSchema({ path: "/gallery/", name: title, description, mainEntity: vishal.id })} />
      <JsonLdScript data={founderPersonSchema()} />
      <JsonLdScript data={imageSchema} />
      <JsonLdScript data={breadcrumbSchema(crumbs)} />
      <PageHero
        eyebrow="Approved professional image"
        title={
          <>
            Portrait of
            <br />
            <em>Vishal Chakravarty.</em>
          </>
        }
        deck="The owner-approved principal portrait used across Vishal’s professional platform and entity record."
        items={crumbs}
      />
      <section className="gallery-intro section">
        <p className="section-number">Official portrait</p>
        <div>
          <h2>
            One verified image.
            <br />A consistent public identity.
          </h2>
          <p>
            The application publishes the approved principal portrait with a stable descriptive URL, accurate dimensions
            and direct connection to Vishal’s canonical Person entity.
          </p>
        </div>
      </section>
      <section className="profile-spread section" aria-label="Official portrait of Vishal Chakravarty">
        <div className="profile-image">
          <Portrait priority />
          <p>Vishal Chakravarty · Chief Executive Officer</p>
        </div>
        <div className="statement-copy">
          <p>
            Alternative portraits are not carried into this application unless they receive explicit publication
            approval. This avoids fabricated or ambiguous executive imagery.
          </p>
          <Link className="button button-primary" href="/contact/">
            Editorial enquiries <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </>
  );
}
