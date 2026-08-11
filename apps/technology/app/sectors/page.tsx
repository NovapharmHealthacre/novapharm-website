import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { sectors } from "@/data/site";

export const metadata: Metadata = {
  title: "Pharma & Life Sciences Sectors",
  description: "Advisory for pharmaceuticals, biotech, consumer health, devices, manufacturers, CDMOs, distributors and market-access organisations.",
  alternates: { canonical: "/sectors/" },
};

export default function SectorsPage() {
  return (
    <>
      <PageHero
        eyebrow="Sectors"
        index="02"
        title={<>One industry. Distinct <em>business systems.</em></>}
        intro="Different economics, capabilities and routes to market require different decisions."
      />

      <section className="section section--paper sector-detail-section">
        <div className="shell">
          <Reveal className="statement-grid">
            <p className="eyebrow">Sector judgement</p>
            <h2>Use industry knowledge where it changes the decision.</h2>
            <p>Keep science, regulation, manufacturing, access, channels and economics connected.</p>
          </Reveal>

          <div className="sector-detail-grid">
            {sectors.map((sector, index) => (
              <Reveal className="sector-detail" delay={index * 0.04} key={sector.title}>
                <div className="sector-detail__index">{sector.index}</div>
                <h2>{sector.title}</h2>
                <p>{sector.priorities.slice(0, 2).join(" · ")}</p>
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
            <p className="eyebrow eyebrow--light">Cross-sector perspective</p>
            <h2>Useful ideas move across boundaries.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p>Manufacturer, distributor, market-access and digital perspectives often expose risks another function cannot see alone.</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
