import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "About NIT",
  description: "Novapharm Innovation Technology is an India-based pharmaceutical strategy and execution advisory firm.",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        index="05"
        title={<>Built between <em>strategy and execution.</em></>}
        intro="India-based pharmaceutical advisory for complex growth, product, market, manufacturing and technology decisions."
      />

      <section className="section section--paper about-story">
        <div className="shell about-story__grid">
          <Reveal>
            <p className="eyebrow">Why NIT exists</p>
            <h2>Disconnected decisions create avoidable risk.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="lead-copy">NIT connects commercial logic, product and CMC planning, partners, markets, supply and technology around the decision leadership needs to make.</p>
          </Reveal>
        </div>
      </section>

      <section className="section section--ink principles-section">
        <div className="shell">
          <Reveal className="section-heading section-heading--split section-heading--light">
            <div><p className="eyebrow eyebrow--light">Operating principles</p><h2>How we earn trust.</h2></div>
            <p>Clear evidence, explicit choices and useful execution.</p>
          </Reveal>
          <div className="principles-grid">
            {[
              ["Evidence before assertion", "Keep known, assumed and unresolved facts distinct."],
              ["Choice before consensus", "Expose real alternatives and trade-offs first."],
              ["Execution before theatre", "Design around owners, dependencies and gates."],
              ["Scope before overreach", "Use qualified specialists where formal responsibility requires them."],
              ["Resilience before efficiency alone", "Find material single points of failure."],
              ["Technology before novelty", "Start with the decision or workflow, not the tool."],
            ].map(([title, text], index) => (
              <Reveal className="principle-card" delay={index * 0.04} key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--red location-section">
        <div className="shell location-section__grid">
          <Reveal>
            <p className="eyebrow eyebrow--light">Our base</p>
            <h2>Vadodara, Gujarat, India.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p>Close to a major pharmaceutical and manufacturing ecosystem, with an international market perspective.</p>
            <address>
              403, R.K Plaza<br />
              Near Utkarsh School, Diwalipura<br />
              Vadodara, Gujarat 390007<br />
              India
            </address>
            <Link className="button button--light" href="/contact">Start a conversation <ArrowRight /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
