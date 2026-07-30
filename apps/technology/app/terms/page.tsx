import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Website Terms",
  description: "Terms governing use of the Novapharm Innovation Technology website.",
  alternates: { canonical: "/terms/" },
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Terms"
        index="T"
        title={<>Terms for using <em>this website.</em></>}
        intro="These terms describe the basis on which the Novapharm Innovation Technology website and its general information may be used."
      />
      <section className="section section--paper legal-page">
        <div className="shell legal-page__grid">
          <aside><p>Last updated</p><strong>21 July 2026</strong></aside>
          <div>
            <section>
              <h2>1. General information only</h2>
              <p>Website content is provided for general business information. It does not constitute medical, clinical, legal, regulatory, tax, accounting, investment, patent, engineering, manufacturing, quality, or other formal professional advice.</p>
            </section>
            <section>
              <h2>2. No engagement created</h2>
              <p>Accessing the website, sending an enquiry, or participating in an introductory conversation does not create a client, adviser, fiduciary, agency, partnership, representative, or other professional relationship. An engagement begins only under separate written terms.</p>
            </section>
            <section>
              <h2>3. No guarantee of approval or outcome</h2>
              <p>Regulatory, commercial, technical, manufacturing, financing, partnership, and market outcomes depend on third parties, evidence, law, execution, and changing conditions. Nothing on this website is a guarantee of approval, registration, launch, supply, revenue, investment, transaction, or other result.</p>
            </section>
            <section>
              <h2>4. Regulated and specialist responsibilities</h2>
              <p>Formal regulated activities and specialist opinions must be undertaken by appropriately authorised or qualified parties. NIT may provide strategy, assessment, programme design, coordination, and execution advisory, but the responsible specialist retains responsibility for work performed within their professional or regulated scope.</p>
            </section>
            <section>
              <h2>5. Confidentiality</h2>
              <p>Unsolicited information sent before a confidentiality agreement or engagement is in place may not be treated as confidential. Do not send trade secrets, patient-identifiable information, confidential clinical data, or other sensitive information until suitable arrangements have been agreed.</p>
            </section>
            <section>
              <h2>6. Intellectual property</h2>
              <p>Unless otherwise stated, website design, original text, frameworks, graphics, and other content are owned by or licensed to Novapharm Innovation Technology. Content may not be reproduced or used commercially without permission, except as permitted by applicable law.</p>
            </section>
            <section>
              <h2>7. Availability and external links</h2>
              <p>The website may change or become unavailable without notice. External links, if any, are provided for convenience and do not imply endorsement or control of the external content.</p>
            </section>
            <section>
              <h2>8. Contact</h2>
              <p>Questions about these terms may be sent to <a href="mailto:bd@novapharmhealthcare.com">bd@novapharmhealthcare.com</a>.</p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
