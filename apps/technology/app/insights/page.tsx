import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { insights } from "@/data/site";

export const metadata: Metadata = {
  title: "Pharmaceutical Strategy Insights",
  description: "NIT perspectives on pharmaceutical market entry, portfolio resilience, technology transfer, manufacturing, growth and execution.",
  alternates: { canonical: "/insights/" },
};

export default function InsightsPage() {
  return (
    <>
      <PageHero
        eyebrow="Insights"
        index="04"
        title={<>Ideas for the decisions <em>in front of you.</em></>}
        intro="Our perspectives focus on the points where pharmaceutical strategy becomes operational: portfolio choices, market-entry dependencies, transfer governance, supply resilience, commercial readiness, and technology adoption."
      />

      <section className="section section--paper insights-index">
        <div className="shell">
          <Reveal className="statement-grid">
            <p className="eyebrow">Point of view</p>
            <h2>Useful insight should sharpen a choice—not merely describe a trend.</h2>
            <p>
              We write from the perspective of decision architecture: what leaders need to distinguish, what assumptions deserve pressure-testing, and what must become true for a strategic direction to work in practice.
            </p>
          </Reveal>

          <div className="insights-list">
            {insights.map((insight, index) => (
              <Reveal className="insights-list__item" delay={index * 0.05} key={insight.slug}>
                <Link href={`/insights/${insight.slug}/` as Route}>
                  <div className="insights-list__visual">
                    <span>{insight.category}</span>
                    <i>{String(index + 1).padStart(2, "0")}</i>
                  </div>
                  <div className="insights-list__body">
                    <p>{insight.category} · {insight.published} · {insight.readTime}</p>
                    <h2>{insight.title}</h2>
                    <p>{insight.dek}</p>
                    <span className="insights-list__link">Read perspective <ArrowRight /></span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
