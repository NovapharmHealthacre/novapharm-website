import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { sectors } from "@/data/site";

export const metadata: Metadata = {
  title: "Pharma & Life Sciences Sectors",
  description: "Advisory for pharmaceuticals, generics, biotech, consumer health, medical devices, CDMOs, manufacturers, distributors and market-access organisations.",
  alternates: { canonical: "/sectors/" },
};

export default function SectorsPage() {
  return (
    <>
      <PageHero
        eyebrow="Sectors"
        index="02"
        title={<>One industry. Distinct <em>business systems.</em></>}
        intro="Pharmaceuticals, biotech, consumer health, devices, manufacturing, and distribution share a regulated ecosystem—but create value through different economics, capabilities, risks, and routes to market."
      />

      <section className="section section--paper sector-detail-section">
        <div className="shell">
          <Reveal className="statement-grid">
            <p className="eyebrow">Sector judgement</p>
            <h2>Industry knowledge matters when it changes the question, not when it decorates the answer.</h2>
            <p>
              We examine each business through its own value-creation logic while keeping sight of the wider system: science, evidence, regulation, quality, manufacturing, access, channels, economics, technology, and organisational capability.
            </p>
          </Reveal>

          <div className="sector-detail-grid">
            {sectors.map((sector, index) => (
              <Reveal className="sector-detail" delay={index * 0.04} key={sector.title}>
                <div className="sector-detail__index">{sector.index}</div>
                <h2>{sector.title}</h2>
                <p>{sector.description}</p>
                <div className="sector-detail__tags">
                  {sector.priorities.map((priority) => <span key={priority}>{priority}</span>)}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="cross-sector-section">
        <div className="shell cross-sector-section__grid">
          <Reveal>
            <p className="eyebrow eyebrow--light">Cross-sector advantage</p>
            <h2>The most useful ideas often move across boundaries.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p>
              A distributor&apos;s view can expose an unrealistic launch plan. A manufacturer&apos;s constraint can reshape portfolio priorities. A consumer-health channel can reveal a better adoption mechanism. A digital operating model can improve transfer governance. We connect those perspectives deliberately.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
