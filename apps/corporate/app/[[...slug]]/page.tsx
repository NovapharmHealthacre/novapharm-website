import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { ArticlePage, CorporatePageRenderer, PersonPage } from "@/components/page-renderer";
import { articleBySlug, articles } from "@/data/articles";
import { corporatePages, pageBySlug } from "@/data/pages";
import { leadership } from "@/data/site";
import { articleSchema, metadataForArticle, metadataForPage, metadataForPerson, pageSchema, personSchema } from "@/lib/seo";

interface RouteProps {
  readonly params: Promise<{ readonly slug?: readonly string[] }>;
}

function joined(segments?: readonly string[]): string {
  return segments?.join("/") ?? "";
}

function personForRoute(slug: string) {
  const match = slug.match(/^leadership\/([^/]+)$/);
  return match ? leadership.find((person) => person.slug === match[1]) : undefined;
}

function articleForRoute(slug: string) {
  const match = slug.match(/^news-insights\/([^/]+)$/);
  return match ? articleBySlug.get(match[1] ?? "") : undefined;
}

export function generateStaticParams() {
  return [
    { slug: [] },
    ...corporatePages.filter((page) => page.slug).map((page) => ({ slug: page.slug.split("/") })),
    ...leadership.map((person) => ({ slug: ["leadership", person.slug] })),
    ...articles.map((article) => ({ slug: ["news-insights", article.slug] })),
  ];
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const slug = joined((await params).slug);
  const person = personForRoute(slug);
  if (person) return metadataForPerson(person.slug) ?? {};
  const article = articleForRoute(slug);
  if (article) return metadataForArticle(article);
  const page = pageBySlug.get(slug);
  return page ? metadataForPage(page) : {};
}

export default async function CorporateRoute({ params }: RouteProps) {
  const slug = joined((await params).slug);
  const person = personForRoute(slug);
  if (person) return <><PersonPage person={person} /><JsonLd id="person-page-schema" value={personSchema(person.slug)} /></>;
  const article = articleForRoute(slug);
  if (article) return <><ArticlePage article={article} /><JsonLd id="article-page-schema" value={articleSchema(article)} /></>;
  const page = pageBySlug.get(slug);
  if (!page) notFound();
  return <><CorporatePageRenderer page={page} /><JsonLd id="corporate-page-schema" value={pageSchema(page)} /></>;
}
