import type { Metadata } from "next";
import { AccountInterestWorkflow } from "@/components/account-interest-workflow";
import { JsonLd } from "@/components/json-ld";
import { PageHero, SectionHeading, StatusNotice } from "@/components/ui";
import { type CorporatePage, pageBySlug } from "@/data/pages";
import { metadataForPage, pageSchema } from "@/lib/seo";

function requiredPage(slug: string): CorporatePage {
  const match = pageBySlug.get(slug);
  if (!match) throw new Error(`The ${slug} page definition is missing.`);
  return match;
}

const page = requiredPage("account-application");

export const metadata: Metadata = metadataForPage(page);

const steps = [
  "Submit non-confidential company interest",
  "Internal eligibility and scope review",
  "Controlled invitation to the secure application",
  "Company and regulatory due diligence",
  "Private document upload and quarantine",
  "Quality, finance and commercial review",
  "Approval decision and audited status",
  "External identity invitation after approval",
] as const;

export default function AccountApplicationPage() {
  return (
    <>
      <PageHero
        eyebrow="Business account"
        title="A controlled route to a future NovaPharm business account."
        intro="Submission never creates privileged access automatically. Qualification, evidence and approval remain required."
        image="/assets/media/modules/account-controlled-onboarding.jpg"
        alt="Controlled business account onboarding documentation"
      />
      <section className="section">
        <div className="shell">
          <StatusNotice />
          <SectionHeading
            kicker="Account pathway"
            title="Approval before access."
            intro="Public interest is separated from regulated due diligence and portal identity."
          />
          <ol className="journey-track account-journey" style={{ background: "transparent" }}>
            {steps.map((step, index) => (
              <li key={step} style={{ border: "1px solid var(--line)" }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>
            ))}
          </ol>
          <aside className="status-notice">
            <strong>Private documents</strong>
            <p>Licences, insurance, bank evidence, contracts and quality records must be uploaded only through a separately controlled private workflow. They are never accepted by email or through this public interest form.</p>
          </aside>
        </div>
      </section>
      <section className="section section-soft" id="account-interest">
        <div className="shell contact-layout">
          <div>
            <SectionHeading
              kicker="Qualified account interest"
              title="Start with non-confidential business information."
              intro="This first step records your organisation and intended business use so NovaPharm can determine whether a controlled application should be invited."
            />
            <div className="contact-boundaries">
              <p><strong>No automatic account creation.</strong> A submission creates neither approval nor portal access.</p>
              <p><strong>No private evidence here.</strong> Do not submit licences, bank details, contracts, quality records or patient information in this public step.</p>
              <p><strong>Controlled next stage.</strong> If the opportunity is eligible, NovaPharm can issue the appropriate due-diligence route separately.</p>
            </div>
          </div>
          <AccountInterestWorkflow />
        </div>
      </section>
      <JsonLd id="corporate-page-schema" value={pageSchema(page)} />
    </>
  );
}