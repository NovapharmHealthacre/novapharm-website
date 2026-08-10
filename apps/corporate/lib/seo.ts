import { novapharmOrganisation, personBySlug } from "@novapharm/content";
import type { Metadata } from "next";
import type { Article } from "@/data/articles";
import type { CorporatePage } from "@/data/pages";
import { company, leadership, pageMeta, servicePillars } from "@/data/site";

interface PersonRecord {
  readonly slug: string;
  readonly displayName: string;
  readonly title: string;
  readonly schemaTitle: string;
  readonly summary: string;
  readonly image: string | null;
  readonly imageWidth?: number;
  readonly imageHeight?: number;
  readonly imageAlt: string | null;
  readonly sameAs: readonly string[];
  readonly expertise: readonly string[];
}

const people = leadership as unknown as readonly PersonRecord[];

export const siteUrl = "https://novapharmhealthcare.com";
export const organisationId = novapharmOrganisation.id;
export const websiteId = novapharmOrganisation.websiteId;

export function absoluteUrl(pathname = "/"): string {
  return new URL(pathname, siteUrl).toString();
}

export function organisationSchema() {
  const vishal = personBySlug("vishal-chakravarty");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organisationId,
    name: company.name,
    legalName: company.legalName,
    alternateName: "NovaPharm",
    url: siteUrl,
    logo: { "@type": "ImageObject", url: `${siteUrl}/assets/brand/novapharm-healthcare-logo.png`, width: 2048, height: 256 },
    image: `${siteUrl}/assets/brand/novapharm-healthcare-logo.png`,
    description: company.summary,
    foundingDate: company.incorporated,
    identifier: { "@type": "PropertyValue", propertyID: "Companies House", value: company.companyNumber },
    founder: { "@id": vishal.id },
    sameAs: [company.companiesHouseUrl],
    areaServed: ["United Kingdom"],
    knowsAbout: ["Pharmaceutical market access", "Pharmaceutical sourcing", "Good Distribution Practice", "PLPI strategy", "Oncology supply continuity"],
    contactPoint: { "@type": "ContactPoint", contactType: "business enquiries", url: `${siteUrl}/contact/`, availableLanguage: "English" },
  };
}

export function websiteSchema() {
  return { "@context": "https://schema.org", "@type": "WebSite", "@id": websiteId, name: company.name, url: siteUrl, publisher: { "@id": organisationId }, inLanguage: "en-GB" };
}

function breadcrumbs(slug: string, name: string) {
  const pieces = slug ? slug.split("/") : [];
  const items = [{ "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` }];
  let current = "";
  pieces.forEach((piece, index) => {
    current += `/${piece}`;
    items.push({ "@type": "ListItem", position: index + 2, name: index === pieces.length - 1 ? name : piece.replaceAll("-", " "), item: `${siteUrl}${current}/` });
  });
  const pageUrl = absoluteUrl(slug ? `/${slug}/` : "/");
  return { "@type": "BreadcrumbList", "@id": `${pageUrl}#breadcrumb`, itemListElement: items };
}

export function pageSchema(page: CorporatePage) {
  const meta = pageMeta[page.slug as keyof typeof pageMeta];
  const url = absoluteUrl(page.slug ? `/${page.slug}/` : "/");
  const pageType = page.kind === "contact" ? "ContactPage" : page.slug === "about" ? "AboutPage" : "WebPage";
  const graph: unknown[] = [
    { "@type": pageType, "@id": `${url}#webpage`, url, name: meta.title, description: meta.description, isPartOf: { "@id": websiteId }, about: { "@id": organisationId }, breadcrumb: { "@id": `${url}#breadcrumb` }, inLanguage: "en-GB" },
    breadcrumbs(page.slug, page.heroTitle),
  ];
  if (page.kind === "services") {
    graph.push(...servicePillars.map((service) => ({ "@type": "Service", "@id": `${url}#${service.slug}`, name: service.title, description: service.approach, provider: { "@id": organisationId }, audience: service.audience, areaServed: "United Kingdom" })));
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function personSchema(slug: string) {
  const person = people.find((candidate) => candidate.slug === slug);
  if (!person) return null;
  const canonicalPerson = personBySlug(slug);
  const profileUrl = `${siteUrl}/leadership/${person.slug}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "ProfilePage", "@id": `${profileUrl}#profilepage`, url: profileUrl, name: `${person.displayName} | NovaPharm Healthcare`, mainEntity: { "@id": canonicalPerson.id }, isPartOf: { "@id": websiteId }, breadcrumb: { "@id": `${profileUrl}#breadcrumb` } },
      { "@type": "Person", "@id": canonicalPerson.id, name: canonicalPerson.displayName, jobTitle: canonicalPerson.publicTitle, description: person.summary, url: canonicalPerson.canonicalUrl, image: canonicalPerson.canonicalImageUrl ?? (person.image ? absoluteUrl(person.image) : undefined), worksFor: { "@id": organisationId }, sameAs: canonicalPerson.sameAs, knowsAbout: person.expertise, subjectOf: { "@id": `${profileUrl}#profilepage` } },
      breadcrumbs(`leadership/${person.slug}`, person.displayName),
    ],
  };
}

export function articleSchema(article: Article) {
  const url = `${siteUrl}/news-insights/${article.slug}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", "@id": `${url}#article`, headline: article.title, description: article.summary, image: absoluteUrl(article.heroImage), datePublished: article.published, dateModified: article.updated, mainEntityOfPage: { "@id": `${url}#webpage` }, author: { "@type": "Organization", "@id": `${organisationId}#editorial-team`, name: article.author }, publisher: { "@id": organisationId }, inLanguage: "en-GB" },
      { "@type": "WebPage", "@id": `${url}#webpage`, url, name: article.seoTitle, description: article.seoDescription, isPartOf: { "@id": websiteId }, breadcrumb: { "@id": `${url}#breadcrumb` } },
      breadcrumbs(`news-insights/${article.slug}`, article.title),
    ],
  };
}

export function metadataForPage(page: CorporatePage): Metadata {
  const meta = pageMeta[page.slug as keyof typeof pageMeta];
  const pathname = page.slug ? `/${page.slug}/` : "/";
  const image = page.heroImage ?? "/assets/media/home/supply-network-hero.jpg";
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: pathname },
    openGraph: { type: "website", locale: "en_GB", url: pathname, siteName: company.name, title: meta.title, description: meta.description, images: [{ url: image, width: 1600, height: 900, alt: page.heroAlt ?? company.name }] },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description, images: [image] },
  };
}

export function metadataForPerson(slug: string): Metadata | null {
  const person = people.find((candidate) => candidate.slug === slug);
  if (!person) return null;
  const title = `${person.displayName} | ${person.title} | NovaPharm Healthcare`;
  const pathname = `/leadership/${person.slug}/`;
  return { title, description: person.summary, alternates: { canonical: pathname }, openGraph: { type: "profile", url: pathname, title, description: person.summary, images: person.image ? [{ url: person.image, width: person.imageWidth, height: person.imageHeight, alt: person.imageAlt ?? person.displayName }] : [] } };
}

export function metadataForArticle(article: Article): Metadata {
  const pathname = `/news-insights/${article.slug}/`;
  return { title: article.seoTitle, description: article.seoDescription, alternates: { canonical: pathname }, openGraph: { type: "article", url: pathname, title: article.title, description: article.summary, publishedTime: article.published, modifiedTime: article.updated, authors: [article.author], images: [{ url: article.heroImage, width: 1600, height: 900, alt: article.title }] }, twitter: { card: "summary_large_image", title: article.title, description: article.summary, images: [article.heroImage] } };
}
