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
  "Register interest using non-confidential business details",
  "NovaPharm reviews eligibility and intended business use",
  "Eligible businesses may receive a private application invitation",
  "Complete company and regulatory checks",
  "Upload documents through the secure application",
  "NovaPharm reviews quality, finance and commercial requirements",
  "Receive an application decision",
  "Approved businesses receive a portal invitation",
] as const;

export default function AccountApplicationPage() {
  return (
    <>
      <PageHero
        eyebrow="Business account"
        title="Register interest in a business account."
        intro="Tell NovaPharm about your business. Registering interest does not create an account or grant portal access."
        image="/assets/media/modules/account-controlled-onboarding.jpg"
        alt="Controlled business account onboarding documentation"
      />
      <section className="section">
        <div className="shell">
          <StatusNotice />
          <SectionHeading
            kicker="Account pathway"
            title="How business accounts are approved."
            intro="NovaPharm reviews business interest before requesting private documents or issuing portal invitations."
          />
          <ol className="journey-track account-journey" style={{ background: "transparent" }}>
            {steps.map((step, index) => (
              <li key={step} style={{ border: "1px solid var(--line)" }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>
            ))}
          </ol>
          <details className="account-path-help">
            <summary>What happens after I register interest?</summary>
            <div>
              <p>There is no password or portal account at this stage. NovaPharm reviews non-confidential business interest first. If eligible, your organisation may receive an invitation to complete the necessary private and regulatory checks.</p>
              <p>Browsing the public catalogue never requires account registration. Only approved commercial and regulated services require verified access.</p>
              <p><a href="/trust-centre/">Security and trust</a> · <a href="/legal/privacy/#business-enquiries">How business enquiry data is used</a></p>
            </div>
          </details>
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
              kicker="Business account interest"
              title="Tell NovaPharm about your business."
              intro="Explain how you would use an account. Do not include private documents or patient information."
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
