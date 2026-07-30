import { organisationNode, personNode } from "@novapharm/seo";
import type { Metadata } from "next";
import type { ArticleRecord } from "./content";
import {
  founderOrigin,
  founderProfile,
  founderProfileId,
  founderWebsiteId,
  profileReviewedOn,
  vishal,
} from "./site-data";

export type JsonLd = Readonly<Record<string, unknown>>;

export function absolute(pathname: string): string {
  return new URL(pathname, `${founderOrigin}/`).toString();
}

export function pageMetadata({
  title,
  description,
  path,
  image = founderProfile.portrait.path,
  imageAlt = founderProfile.portrait.alt,
  noIndex = false,
}: {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly image?: string;
  readonly imageAlt?: string;
  readonly noIndex?: boolean;
}): Metadata {
  const canonical = absolute(path);
  return {
    title,
    description,
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: true } : { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      type: "website",
      siteName: "Vishal Chakravarty",
      title,
      description,
      url: canonical,
      images: [
        {
          url: absolute(image),
          alt: imageAlt,
          width: image.includes("portrait") ? 1440 : 1200,
          height: image.includes("portrait") ? 1402 : 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: absolute(image), alt: imageAlt }],
    },
  };
}

export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": founderWebsiteId,
    url: `${founderOrigin}/`,
    name: "Vishal Chakravarty",
    description:
      "The professional platform of Vishal Chakravarty, Chief Executive Officer of NovaPharm Healthcare Ltd and founder of the company.",
    inLanguage: "en-GB",
    publisher: { "@id": vishal.id },
  };
}

export function founderPersonSchema(): JsonLd {
  return { "@context": "https://schema.org", ...personNode(vishal), mainEntityOfPage: { "@id": founderProfileId } };
}

export function profileSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": founderProfileId,
    url: `${founderOrigin}/about/`,
    name: "About Vishal Chakravarty",
    dateModified: profileReviewedOn,
    inLanguage: "en-GB",
    isPartOf: { "@id": founderWebsiteId },
    mainEntity: { "@id": vishal.id },
  };
}

export function founderOrganisationSchema(): JsonLd {
  return { "@context": "https://schema.org", ...organisationNode() };
}

export function webPageSchema({
  path,
  name,
  description,
  type = "WebPage",
  mainEntity,
}: {
  readonly path: string;
  readonly name: string;
  readonly description: string;
  readonly type?: string;
  readonly mainEntity?: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${absolute(path)}#page`,
    url: absolute(path),
    name,
    description,
    dateModified: profileReviewedOn,
    inLanguage: "en-GB",
    isPartOf: { "@id": founderWebsiteId },
    ...(mainEntity ? { mainEntity: { "@id": mainEntity } } : {}),
  };
}

export function breadcrumbSchema(items: readonly { readonly name: string; readonly path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

export function articleSchema(article: ArticleRecord): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${absolute(article.canonicalPath)}#article`,
    mainEntityOfPage: { "@id": `${absolute(article.canonicalPath)}#page` },
    headline: article.title,
    description: article.description,
    datePublished: article.published,
    dateModified: article.modified,
    inLanguage: "en-GB",
    author: { "@id": vishal.id, name: vishal.displayName, url: vishal.canonicalUrl },
    publisher: { "@id": vishal.id },
    image: {
      "@type": "ImageObject",
      url: absolute(article.socialImage),
      contentUrl: absolute(article.socialImage),
      width: 1200,
      height: 630,
      caption: `Social card for “${article.title}”, an essay by Vishal Chakravarty`,
    },
    articleSection: article.category,
    wordCount: article.reading.words,
    isAccessibleForFree: true,
  };
}

export function jsonLdText(value: JsonLd): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
