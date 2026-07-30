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
            <p>Pharmaceutical strategy & execution advisory</p>
            <span>India · UK · International</span>
          </Reveal>
          <Reveal className="hero__content" immediate>
            <h1>
              Where pharmaceutical ambition becomes <em>executable strategy.</em>
            </h1>
          </Reveal>
          <Reveal className="hero__bottom" immediate>
            <p>
              We advise pharmaceutical leaders on growth, portfolio, product development, technology transfer, market entry, commercial readiness, supply resilience, and digital operating models.
            </p>
            <div className="hero__actions">
              <Link className="button button--light" href="/expertise">
                Explore our expertise <ArrowRight />
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
              <p className="eyebrow">The work begins with a decision</p>
              <h2>Questions that change the direction of the business.</h2>
            </div>
            <p>
              Leading advisory firms organise around the client&apos;s hardest decisions—not around a catalogue of services. That is now the organising principle of NIT.
            </p>
          </Reveal>

          <div className="decision-grid">
            {decisions.map((decision, index) => (
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
              <p className="eyebrow eyebrow--light">Our expertise</p>
              <h2>Specialist pharma depth. Integrated business judgement.</h2>
            </div>
            <div>
              <p>
                We connect strategy, science, manufacturing, markets, partners, operations, and technology—because pharmaceutical decisions rarely fail in only one function.
              </p>
              <ArrowLink href="/expertise" className="arrow-link--light">View all expertise</ArrowLink>
            </div>
          </Reveal>
          <CapabilityExplorer />
        </div>
      </section>

      <section className="section section--paper horizon-section">
        <div className="shell">
          <Reveal className="horizon-intro">
            <p className="eyebrow">An end-to-end decision horizon</p>
            <h2>From product thesis to market performance.</h2>
            <p>
              Our perspective follows the full chain of value. We identify where a decision made today creates an advantage—or a hidden constraint—several stages later.
            </p>
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
              We work at the intersection of Indian pharmaceutical capability and international market expectations.
            </p>
            <p>
              That perspective is valuable where development, manufacturing, licensing, distribution, quality, commercial, and market-entry choices must work across different operating realities. We translate between them without reducing either side to a stereotype.
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
              <h2>Built for the businesses shaping access to health.</h2>
            </div>
            <ArrowLink href="/sectors">Explore sectors</ArrowLink>
          </Reveal>
          <div className="sector-list">
            {sectors.map((sector) => (
              <Link href="/sectors" className="sector-row" key={sector.title}>
                <span>{sector.index}</span>
                <h3>{sector.title}</h3>
                <p>{sector.description}</p>
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
              <h2>Ideas designed to improve the next decision.</h2>
            </div>
            <ArrowLink href="/insights">View all insights</ArrowLink>
          </Reveal>
          <div className="insight-grid">
            {insights.map((insight, index) => (
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
            <p>We do not sell certainty.</p>
            <h2>We make uncertainty <em>decision-ready.</em></h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p>
              The purpose of advisory work is not to make a complicated situation sound simple. It is to make the choices, evidence, trade-offs, responsibilities, and path to action clear enough to move with conviction.
            </p>
            <Link className="button button--dark" href="/approach">How we work <ArrowRight /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
