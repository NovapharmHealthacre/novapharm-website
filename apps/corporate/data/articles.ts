import batchToBuyer from "./insights/batch-to-buyer-traceability.json";
import complianceFirst from "./insights/compliance-first-distribution.json";
import gdpQms from "./insights/gdp-qms-foundations.json";
import oncologyForecasting from "./insights/oncology-demand-forecasting.json";
import plpiResilience from "./insights/plpi-supply-resilience.json";
import threePillar from "./insights/three-pillar-sourcing.json";

export interface ArticleSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly list?: readonly string[];
}

export interface ArticleLink {
  readonly label: string;
  readonly href: string;
}

export interface Article {
  readonly sourceKey: string;
  readonly title: string;
  readonly slug: string;
  readonly summary: string;
  readonly heroImage: string;
  readonly author: string;
  readonly published: string;
  readonly updated: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly disclaimer: string;
  readonly related: readonly string[];
  readonly internalLinks: readonly ArticleLink[];
  readonly references: readonly ArticleLink[];
  readonly sections: readonly ArticleSection[];
}

const sources = [
  ["batch-to-buyer-traceability", batchToBuyer],
  ["compliance-first-distribution", complianceFirst],
  ["gdp-qms-foundations", gdpQms],
  ["oncology-demand-forecasting", oncologyForecasting],
  ["plpi-supply-resilience", plpiResilience],
  ["three-pillar-sourcing", threePillar],
] as const;

export const articles: readonly Article[] = Object.freeze(
  sources.map(([sourceKey, article]) => Object.freeze({ sourceKey, ...article }) as Article),
);

export const articleBySlug = new Map(articles.map((article) => [article.slug, article]));
export const articleBySourceKey = new Map(articles.map((article) => [article.sourceKey, article]));

export function readingTime(article: Article): number {
  const words = article.sections.reduce(
    (total, section) => total + section.paragraphs.join(" ").split(/\s+/).length + (section.list?.join(" ").split(/\s+/).length ?? 0),
    0,
  );
  return Math.max(1, Math.ceil(words / 220));
}
