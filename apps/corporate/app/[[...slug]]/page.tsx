import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ConciseHomePage } from "@/components/concise-home";
import {
  ConciseCroPage,
  ConciseOncologyPage,
  ConciseProductsPage,
  ConciseRegulatoryPage,
  ConciseServicesPage,
} from "@/components/concise-specialist-pages";
import { JsonLd } from "@/components/json-ld";
import { ArticlePage, CorporatePageRenderer, type NutraxinProduct, NutraxinProductPage, PersonPage } from "@/components/page-renderer";
import { articleBySlug, articles } from "@/data/articles";
import { conciseCorporatePage } from "@/data/concise-pages";
import nutraxinRegister from "@/data/nutraxin-product-register.json";
import { corporatePages, pageBySlug } from "@/data/pages";
import { presentationPage } from "@/data/presentation-copy";
import { leadership } from "@/data/site";
import { absoluteUrl, articleSchema, metadataForArticle, metadataForPage, metadataForPerson, pageSchema, personSchema } from "@/lib/seo";

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

function productForRoute(slug: string): NutraxinProduct | undefined {
  const match = slug.match(/^products\/nutraxin\/([^/]+)$/);
  return match ? nutraxinRegister.products.find((product) => product.slug === match[1]) : undefined;
}

function productSchema(product: NutraxinProduct) {
  const url = absoluteUrl(`/products/nutraxin/${product.slug}/`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    url,
    image: absoluteUrl(`/assets/media/products/nutraxin/${product.imageBase}-800.webp`),
    description: `${product.name}, ${product.packSize}. Owner-supplied catalogue reference for qualified B2B evaluation; availability, pricing, permitted claims and regulatory status are not asserted.`,
    sku: product.sku,
    category: product.category,
    brand: { "@type": "Brand", name: "Nutraxin" },
    additionalProperty: product.formulation.map((line) => ({ "@type": "PropertyValue", name: line.name, value: line.amount })),
  };
}

export function generateStaticParams() {
  return [
    { slug: [] },
    ...corporatePages
      .filter((page) => page.slug && page.slug !== "account-application")
      .map((page) => ({ slug: page.slug.split("/") })),
    ...leadership.map((person) => ({ slug: ["leadership", person.slug] })),
    ...articles.map((article) => ({ slug: ["news-insights", article.slug] })),
    ...nutraxinRegister.products.map((product) => ({ slug: ["products", "nutraxin", product.slug] })),
    { slug: ["product-portfolio"] },
    { slug: ["product-portfolio", "nutraxin"] },
  ];
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const slug = joined((await params).slug);
  const person = personForRoute(slug);
  if (person) return metadataForPerson(person.slug) ?? {};
  const article = articleForRoute(slug);
  if (article) return metadataForArticle(article);
  const product = productForRoute(slug);
  if (product) {
    const title = `${product.name} | Nutraxin Catalogue | NovaPharm Healthcare`;
    const description = `${product.name}, ${product.packSize}, presented as an owner-supplied B2B catalogue reference. Availability, price, claims and UK regulatory status are not asserted.`;
    const pathname = `/products/nutraxin/${product.slug}/`;
    const image = `/assets/media/products/nutraxin/${product.imageBase}-800.webp`;
    return { title, description, alternates: { canonical: pathname }, openGraph: { type: "website", url: pathname, title, description, images: [{ url: image, alt: product.altText }] } };
  }
  const page = pageBySlug.get(slug);
  return page ? metadataForPage(page) : {};
}

export default async function CorporateRoute({ params }: RouteProps) {
  const slug = joined((await params).slug);
  const person = personForRoute(slug);
  if (person) return <><PersonPage person={person} /><JsonLd id="person-page-schema" value={personSchema(person.slug)} /></>;

  const article = articleForRoute(slug);
  if (article) return <><ArticlePage article={article} /><JsonLd id="article-page-schema" value={articleSchema(article)} /></>;

  if (slug === "product-portfolio") redirect("/products/");
  if (slug === "product-portfolio/nutraxin") redirect("/products/nutraxin/");

  const product = productForRoute(slug);
  if (product) return <><NutraxinProductPage product={product} /><JsonLd id="nutraxin-product-schema" value={productSchema(product)} /></>;

  const page = pageBySlug.get(slug);
  if (!page) notFound();

  let content: React.ReactNode;
  switch (slug) {
    case "":
      content = <ConciseHomePage />;
      break;
    case "services":
      content = <ConciseServicesPage />;
      break;
    case "regulatory-services":
      content = <ConciseRegulatoryPage />;
      break;
    case "cro":
      content = <ConciseCroPage />;
      break;
    case "oncology":
      content = <ConciseOncologyPage />;
      break;
    case "products":
      content = <ConciseProductsPage />;
      break;
    case "products/nutraxin":
      // Preserve the dedicated authoritative renderer and exact owner-supplied catalogue imagery.
      content = <CorporatePageRenderer page={page} />;
      break;
    default:
      content = <CorporatePageRenderer page={presentationPage(conciseCorporatePage(page))} />;
  }

  return <>{content}<JsonLd id="corporate-page-schema" value={pageSchema(page)} /></>;
}
