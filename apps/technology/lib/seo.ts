import { novapharmOrganisation } from "@novapharm/content";
import { organisationNode } from "@novapharm/seo";
import type { Insight } from "@/data/site";
import { site } from "@/data/site";

export type JsonLdValue = Readonly<Record<string, unknown>>;

export const technologyOrganisationId = `${site.url}/#organization`;
export const technologyWebsiteId = `${site.url}/#website`;

export function technologyOrganisationSchema(): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": technologyOrganisationId,
    name: site.name,
    alternateName: site.shortName,
    url: site.url,
    email: site.email,
    description: site.description,
    logo: {
      "@type": "ImageObject",
      url: `${site.url}/assets/NIT-logo.svg`,
      contentUrl: `${site.url}/assets/NIT-logo.svg`,
      caption: site.name,
    },
    parentOrganization: { "@id": novapharmOrganisation.id },
    areaServed: ["India", "United Kingdom", "International"],
  };
}

export function technologyWebsiteSchema(): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": technologyWebsiteId,
    url: `${site.url}/`,
    name: site.name,
    description: site.description,
    inLanguage: "en-GB",
    publisher: { "@id": technologyOrganisationId },
    isPartOf: { "@id": novapharmOrganisation.id },
  };
}

export function parentOrganisationSchema(): JsonLdValue {
  return { "@context": "https://schema.org", ...organisationNode() };
}

export function articleSchema(insight: Insight): JsonLdValue {
  const url = `${site.url}/insights/${insight.slug}/`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: insight.title,
    description: insight.dek,
    datePublished: insight.publishedIso,
    dateModified: insight.modifiedIso,
    author: { "@id": technologyOrganisationId, name: site.name },
    publisher: { "@id": technologyOrganisationId },
    mainEntityOfPage: { "@id": `${url}#page` },
    url,
    inLanguage: "en-GB",
    articleSection: insight.category,
    isAccessibleForFree: true,
  };
}

export function jsonLdText(value: JsonLdValue): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
