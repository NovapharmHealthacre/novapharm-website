import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowLink } from "@/components/arrow-link";
import { CapabilityExplorer } from "@/components/capability-explorer";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import { NetworkCanvas } from "@/components/network-canvas";
import { Reveal } from "@/components/reveal";
import { decisions, insights, sectors } from "@/data/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <section className="hero hero--dark">
        <NetworkCanvas />
        <div className="hero__grid shell">
          <Reveal className="hero__kicker" immediate>
            <p>Pharmaceutical strategy & execution</p>
            <span>India · UK · International</span>
          </Reveal>
          <Reveal className="hero__content" immediate>
            <h1>
              Turn pharmaceutical ambition into <em>executable choices.</em>
            </h1>
          </Reveal>
          <Reveal className="hero__bottom" immediate>
            <p>
              Strategy, market access, development, supply and digital transformation for pharmaceutical leaders.
            </p>
            <div className="hero__actions">
              <Link className="button button--light" href="/expertise">
                Explore expertise <ArrowRight />
              </Link>
              <Link className="text-link text-link--light" href="/contact">
                Discuss a decision <ArrowUpRight />
              </Link>
            </div>
          </Reveal>
        </div>
        <div className="hero__rail" aria-hidden="true">
          <span>Choice</span><span>Evidence</span><span>Execution</span>
        </div>
      </section>

      <section className="section section--paper decision-section">
        <div className="shell">
          <Reveal className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">Decision first</p>
              <h2>Start with the choice that changes the business.</h2>
            </div>
            <p>Frame the decision, test the evidence and make the path executable.</p>
          </Reveal>

          <div className="decision-grid">
            {decisions.slice(0, 3).map((decision, index) => (
              <Reveal className="decision-card" delay={index * 0.035} key={decision}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{decision}</h3>
                <ArrowUpRight />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--ink capabilities-section">
        <div className="shell">
          <Reveal className="section-heading section-heading--split section-heading--light">
            <div>
              <p className="eyebrow eyebrow--light">Expertise</p>
              <h2>Pharma depth. Integrated judgement.</h2>
            </div>
            <div>
              <p>Connect strategy, science, manufacturing, markets, operations and technology.</p>
              <ArrowLink href="/expertise" className="arrow-link--light">View all expertise</ArrowLink>
            </div>
          </Reveal>
          <CapabilityExplorer />
        </div>
      </section>

      <section className="section section--paper horizon-section">
        <div className="shell">
          <Reveal className="horizon-intro">
            <p className="eyebrow">Decision horizon</p>
            <h2>See the whole route.</h2>
            <p>Choices made early shape access, launch and scale later.</p>
          </Reveal>

          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Safari requires keyboard focus on scrollable regions. */}
          <section className="horizon-map-scroll" aria-label="Pharmaceutical value chain advisory" tabIndex={0}>
            <ol className="horizon-map">
              {["Opportunity", "Portfolio", "Development", "Transfer", "Access", "Launch", "Scale"].map((stage, index) => (
                <Reveal as="li" className="horizon-map__stage" delay={index * 0.04} key={stage}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{stage}</strong>
                </Reveal>
              ))}
              <li className="horizon-map__line" aria-hidden="true"><span /></li>
            </ol>
          </section>
        </div>
      </section>

      <section className="section section--red geography-section">
        <div className="geography-section__grid shell">
          <Reveal className="geography-section__title">
            <p className="eyebrow eyebrow--light">Perspective</p>
            <h2>India intelligence.<br />International perspective.</h2>
          </Reveal>
          <Reveal className="geography-section__body" delay={0.08}>
            <p className="geography-section__lead">
              Connect Indian pharmaceutical capability with international market expectations.
            </p>
            <ArrowLink href="/about" className="arrow-link--light">About NIT</ArrowLink>
          </Reveal>
        </div>
      </section>

      <section className="section section--paper sectors-preview">
        <div className="shell">
          <Reveal className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">Sectors</p>
              <h2>Focused where health products meet complex markets.</h2>
            </div>
            <ArrowLink href="/sectors">Explore sectors</ArrowLink>
          </Reveal>
          <div className="sector-list">
            {sectors.slice(0, 4).map((sector) => (
              <Link href="/sectors" className="sector-row" key={sector.title}>
                <span>{sector.index}</span>
                <h3>{sector.title}</h3>
                <p>{sector.priorities.slice(0, 2).join(" · ")}</p>
                <ArrowUpRight />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--mist insights-preview">
        <div className="shell">
          <Reveal className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">Current thinking</p>
              <h2>Ideas for the next decision.</h2>
            </div>
            <ArrowLink href="/insights">View all insights</ArrowLink>
          </Reveal>
          <div className="insight-grid">
            {insights.slice(0, 3).map((insight, index) => (
              <Reveal className={`insight-card${index === 0 ? " insight-card--feature" : ""}`} delay={index * 0.06} key={insight.slug}>
                <Link href={`/insights/${insight.slug}/` as Route}>
                  <div className="insight-card__visual" aria-hidden="true">
                    <span>{insight.category}</span>
                    <i>{String(index + 1).padStart(2, "0")}</i>
                  </div>
                  <div className="insight-card__body">
                    <p>{insight.category} · {insight.readTime}</p>
                    <h3>{insight.title}</h3>
                    <span>Read perspective <ArrowRight /></span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="manifesto-section">
        <div className="shell">
          <Reveal>
            <p>Clear choices. Strong evidence.</p>
            <h2>Make uncertainty <em>decision-ready.</em></h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p>Turn trade-offs, responsibilities and evidence into a path that teams can execute.</p>
            <Link className="button button--dark" href="/approach">How we work <ArrowRight /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
