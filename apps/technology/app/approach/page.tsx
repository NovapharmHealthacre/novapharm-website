import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { approach } from "@/data/site";

export const metadata: Metadata = {
  title: "How We Work",
  description: "NIT's decision-to-execution approach: frame the decision, build evidence, design choices, mobilise the pathway and govern the outcome.",
  alternates: { canonical: "/approach/" },
};

export default function ApproachPage() {
  return (
    <>
      <PageHero
        eyebrow="How we work"
        index="03"
        title={<>Rigorous thinking. <em>Practical movement.</em></>}
        intro="We structure engagements around the decision to be made and the operating system required to carry it. The work is analytical, collaborative, direct, and designed to remain useful after the engagement ends."
      />

      <section className="section section--paper approach-principles">
        <div className="shell">
          <Reveal className="statement-grid">
            <p className="eyebrow">The decision-to-execution model</p>
            <h2>Strategy is not complete until the organisation can act on it.</h2>
            <p>
              Our method separates facts from assumptions, creates real choices, makes trade-offs visible, and converts direction into ownership, sequencing, governance, and measurable movement.
            </p>
          </Reveal>

          <div className="approach-steps">
            {approach.map((step, index) => (
              <Reveal className="approach-step" delay={index * 0.05} key={step.index}>
                <div className="approach-step__index">{step.index}</div>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--ink working-style">
        <div className="shell">
          <Reveal className="section-heading section-heading--split section-heading--light">
            <div>
              <p className="eyebrow eyebrow--light">Working style</p>
              <h2>Clear enough to challenge. Close enough to implement.</h2>
            </div>
            <p>
              We work directly with decision owners and the people who understand the operational reality. The aim is not artificial consensus. It is a shared view of the evidence, choices, consequences, and next actions.
            </p>
          </Reveal>

          <div className="working-style__grid">
            {[
              ["Decision-led", "Scope begins with the choice and its consequence—not a generic workplan."],
              ["Evidence-disciplined", "Facts, assumptions, hypotheses, and unknowns remain visibly distinct."],
              ["Cross-functional", "Technical, commercial, regulatory, operational, and financial logic is connected."],
              ["Owner-connected", "Recommendations are built with the leaders and teams responsible for execution."],
              ["Stage-gated", "Work advances through explicit evidence and decision thresholds."],
              ["Capability-building", "Frameworks, governance, and decision habits remain with the organisation."],
            ].map(([title, text], index) => (
              <Reveal className="working-style__item" delay={index * 0.04} key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--mist scope-section">
        <div className="shell scope-section__grid">
          <Reveal>
            <p className="eyebrow">Responsible scope</p>
            <h2>Advice should be clear about where expertise ends and formal responsibility begins.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p>
              NIT provides strategy, programme design, assessment, coordination, and execution advisory. Formal regulatory opinions, legal advice, clinical work, laboratory testing, engineering certification, manufacturing, quality release, licensing, and other regulated responsibilities are undertaken by appropriately qualified parties under separate terms.
            </p>
            <Link className="button button--dark" href="/contact">Frame your decision <ArrowRight /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
