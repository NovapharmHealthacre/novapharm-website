import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "About NIT",
  description: "Novapharm Innovation Technology is an India-based pharmaceutical strategy and execution advisory firm connecting business, product, market, manufacturing and technology decisions.",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        index="05"
        title={<>Built for the space between <em>strategy and execution.</em></>}
        intro="Novapharm Innovation Technology is an India-based pharmaceutical advisory firm helping leadership teams make complex growth, portfolio, product, market, manufacturing, partnership, and technology decisions more executable."
      />

      <section className="section section--paper about-story">
        <div className="shell about-story__grid">
          <Reveal>
            <p className="eyebrow">Why NIT exists</p>
            <h2>Pharmaceutical businesses rarely suffer from a shortage of activity. They suffer from disconnected decisions.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="lead-copy">
              Strategy may be developed without manufacturing reality. Product development may progress without a credible route to market. Partnerships may be signed before responsibilities are executable. Technology may be selected before the operating problem is clear.
            </p>
            <p>
              NIT exists to connect those decisions. We bring together commercial logic, product and CMC planning, partner and market understanding, operating-model design, supply resilience, and technology strategy around the decision that leadership must make.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section--ink principles-section">
        <div className="shell">
          <Reveal className="section-heading section-heading--split section-heading--light">
            <div><p className="eyebrow eyebrow--light">Operating principles</p><h2>How we intend to earn trust.</h2></div>
            <p>Authority should come from the quality of the thinking, the discipline of the evidence, and the usefulness of the outcome—not from inflated language.</p>
          </Reveal>
          <div className="principles-grid">
            {[
              ["Evidence before assertion", "We make clear what is known, assumed, inferred, and unresolved."],
              ["Choice before consensus", "We build real alternatives and expose their trade-offs before alignment is sought."],
              ["Execution before theatre", "Recommendations are designed around owners, dependencies, capabilities, and decision gates."],
              ["Scope before overreach", "We are explicit when qualified regulatory, legal, clinical, laboratory, engineering, quality, or other specialist responsibility is required."],
              ["Resilience before efficiency alone", "We examine single points of failure across suppliers, geographies, routes, information, and decision rights."],
              ["Technology before novelty", "Digital and AI choices begin with a valuable decision or workflow—not with a fashionable tool."],
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
            <p>
              Located in one of India&apos;s established pharmaceutical and manufacturing regions, NIT is positioned close to the technical, operational, and partner ecosystem that underpins product development and supply—while maintaining an international market perspective.
            </p>
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
