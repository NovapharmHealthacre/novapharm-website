import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { ProjectBrief } from "@/components/project-brief";
import { Reveal } from "@/components/reveal";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Discuss a pharmaceutical strategy, portfolio, market-entry, development, manufacturing, partnership, commercial or digital decision with NIT.",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        index="06"
        title={<>Bring us the decision—not a <em>generic brief.</em></>}
        intro="Tell us what choice must be made, what is at stake, what is known, what remains uncertain, and when the organisation needs to move. We will begin from there."
      />

      <section className="section section--paper contact-section">
        <div className="shell">
          <ProjectBrief />
        </div>
      </section>

      <section className="section section--ink direct-contact">
        <div className="shell direct-contact__grid">
          <Reveal>
            <p className="eyebrow eyebrow--light">Direct contact</p>
            <h2>Prefer to write directly?</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <a className="direct-contact__email" href={`mailto:${site.email}`}>{site.email}</a>
            <address>{site.address.map((line) => <span key={line}>{line}</span>)}</address>
            <p>
              Please do not send patient-identifiable information, confidential clinical data, trade secrets, or other sensitive material before appropriate confidentiality arrangements are in place.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
