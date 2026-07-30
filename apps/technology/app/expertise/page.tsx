import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { capabilities } from "@/data/site";

export const metadata: Metadata = {
  title: "Pharmaceutical Consulting Expertise",
  description: "Explore NIT advisory capabilities across pharma strategy, portfolio, market entry, product development, technology transfer, operations, launch, digital and partnerships.",
  alternates: { canonical: "/expertise/" },
};

export default function ExpertisePage() {
  return (
    <>
      <PageHero
        eyebrow="Expertise"
        index="01"
        title={<>Pharmaceutical decisions require <em>connected expertise.</em></>}
        intro="Our work connects strategic, technical, operational, commercial, and market realities. The objective is not a longer list of recommendations. It is a better decision and a controllable route to execution."
      />

      <section className="section section--paper expertise-intro">
        <div className="shell">
          <Reveal className="statement-grid">
            <p className="eyebrow">How we create value</p>
            <h2>We bring the functions into the same room—before their assumptions collide in execution.</h2>
            <p>
              A portfolio decision changes development priorities. A market choice changes evidence, manufacturing, pack, price, partner, and supply requirements. A technology decision changes data, governance, and operating behaviour. Our role is to make those connections visible early.
            </p>
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
                  <p className="expertise-item__statement">{capability.statement}</p>
                  <div>
                    <h3>Questions we help answer</h3>
                    <ul>{capability.questions.map((question) => <li key={question}>{question}</li>)}</ul>
                  </div>
                  <div>
                    <h3>Typical outputs</h3>
                    <ul>{capability.deliverables.map((deliverable) => <li key={deliverable}>{deliverable}</li>)}</ul>
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
            <h2>Focused enough for one decision. Integrated enough for the system around it.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p>
              Engagements may begin with a market, product, partner, manufacturing, portfolio, launch, or operating-model question. We define the scope around the decision and bring in qualified specialists where formal regulated, legal, laboratory, engineering, clinical, or other expert work is required.
            </p>
            <Link className="button button--light" href="/contact">Discuss an engagement <ArrowRight /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
