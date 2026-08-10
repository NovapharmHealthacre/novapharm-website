import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import { getInsight, insights, site } from "@/data/site";
import { articleSchema } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return insights.map((insight) => ({ slug: insight.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) return {};
  return {
    title: insight.title,
    description: insight.dek,
    alternates: { canonical: `/insights/${insight.slug}/` },
    openGraph: {
      type: "article",
      title: insight.title,
      description: insight.dek,
      publishedTime: `${insight.publishedIso}T00:00:00+05:30`,
      modifiedTime: `${insight.modifiedIso}T00:00:00+05:30`,
      authors: [site.name],
      url: `${site.url}/insights/${insight.slug}/`,
    },
  };
}

export default async function InsightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) notFound();
  const related = insights.filter((item) => item.slug !== insight.slug).slice(0, 2);

  return (
    <>
      <article className="article-page">
        <header className="article-hero">
          <div className="shell article-hero__grid">
            <Reveal className="article-hero__meta" immediate>
              <Link href="/insights">Insights</Link>
              <span>{insight.category}</span>
              <span>{insight.published}</span>
              <span>{insight.readTime}</span>
              <span>By {site.name}</span>
            </Reveal>
            <Reveal className="article-hero__content" immediate>
              <h1>{insight.title}</h1>
              <p>{insight.dek}</p>
            </Reveal>
          </div>
        </header>

        <div className="article-body shell">
          <aside>
            <p>Core thesis</p>
            <blockquote>{insight.thesis}</blockquote>
          </aside>
          <div className="article-body__content">
            {insight.sections.map((section, index) => (
              <Reveal className="article-section" delay={index * 0.04} key={section.heading}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </Reveal>
            ))}
            <div className="article-disclaimer">
              <p>
                This perspective is general information and does not constitute formal regulatory, legal, investment, clinical, manufacturing, quality, or other specialist advice.
              </p>
            </div>
          </div>
        </div>
      </article>

      <section className="section section--mist related-insights">
        <div className="shell">
          <div className="section-heading section-heading--split">
            <div><p className="eyebrow">Continue reading</p><h2>Related perspectives</h2></div>
          </div>
          <div className="related-insights__grid">
            {related.map((item) => (
              <Link href={`/insights/${item.slug}` as Route} key={item.slug}>
                <span>{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.dek}</p>
                <strong>Read perspective <ArrowRight /></strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <JsonLd id={`article-schema-${insight.slug}`} value={articleSchema(insight)} />
    </>
  );
}
