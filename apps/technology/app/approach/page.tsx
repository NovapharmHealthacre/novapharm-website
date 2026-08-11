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
        intro="Frame the decision, test the evidence and build an executable path."
      />

      <section className="section section--paper approach-principles">
        <div className="shell">
          <Reveal className="statement-grid">
            <p className="eyebrow">Decision to execution</p>
            <h2>Strategy is complete when the organisation can act.</h2>
            <p>Separate facts from assumptions, expose trade-offs and convert direction into ownership and sequence.</p>
          </Reveal>

          <div className="approach-steps">
            {approach.map((step, index) => (
              <Reveal className="approach-step" delay={index * 0.05} key={step.index}>
                <div className="approach-step__index">{step.index}</div>
                <h2>{step.title}</h2>
                <p>{step.text.split(".")[0]}.</p>
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
            <p>Work directly with decision owners and the people closest to operational reality.</p>
          </Reveal>

          <div className="working-style__grid">
            {[
              ["Decision-led", "Scope starts with the choice and its consequence."],
              ["Evidence-disciplined", "Facts, assumptions and unknowns stay distinct."],
              ["Cross-functional", "Technical, commercial and operating logic stays connected."],
              ["Owner-connected", "Recommendations are built with the people who execute."],
              ["Stage-gated", "Progress follows explicit evidence and decision thresholds."],
              ["Capability-building", "Useful governance and decision habits remain behind."],
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
            <h2>Know where advisory ends and formal responsibility begins.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p>Formal regulatory, legal, clinical, laboratory, engineering, manufacturing, quality and licensing responsibilities remain with appropriately qualified parties under separate terms.</p>
            <Link className="button button--dark" href="/contact">Frame your decision <ArrowRight /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
