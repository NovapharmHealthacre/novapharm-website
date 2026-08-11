import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { capabilities } from "@/data/site";

export const metadata: Metadata = {
  title: "Pharmaceutical Consulting Expertise",
  description: "Explore NIT advisory capabilities across pharma strategy, portfolio, market entry, development, operations, digital and partnerships.",
  alternates: { canonical: "/expertise/" },
};

export default function ExpertisePage() {
  return (
    <>
      <PageHero
        eyebrow="Expertise"
        index="01"
        title={<>Connected expertise for <em>better decisions.</em></>}
        intro="Strategy, technical reality, operations and markets—considered together."
      />

      <section className="section section--paper expertise-intro">
        <div className="shell">
          <Reveal className="statement-grid">
            <p className="eyebrow">How we create value</p>
            <h2>Connect the functions before assumptions become execution problems.</h2>
            <p>Define the decision, expose dependencies and build a route teams can control.</p>
          </Reveal>
        </div>
      </section>

      <section className="section section--ink expertise-list-section">
        <div className="shell">
          <div className="expertise-list">
            {capabilities.map((capability, index) => (
              <Reveal className="expertise-item" delay={index * 0.025} key={capability.id}>
                <div className="expertise-item__head">
                  <span>{capability.index}</span>
                  <div>
                    <h2>{capability.title}</h2>
                    <p>{capability.short}</p>
                  </div>
                </div>
                <div className="expertise-item__body">
                  <div>
                    <h3>Key questions</h3>
                    <ul>{capability.questions.slice(0, 2).map((question) => <li key={question}>{question}</li>)}</ul>
                  </div>
                  <div>
                    <h3>Typical outputs</h3>
                    <ul>{capability.deliverables.slice(0, 3).map((deliverable) => <li key={deliverable}>{deliverable}</li>)}</ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--red engagement-callout">
        <div className="shell engagement-callout__grid">
          <Reveal>
            <p className="eyebrow eyebrow--light">Engagements</p>
            <h2>Focused on the decision. Integrated around it.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p>Scope starts with the decision. Qualified specialists support formal regulated, legal, laboratory, engineering or clinical work where required.</p>
            <Link className="button button--light" href="/contact">Discuss an engagement <ArrowRight /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
