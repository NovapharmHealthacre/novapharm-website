import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "Privacy information for the Novapharm Innovation Technology website.",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        index="P"
        title={<>How this website handles <em>information.</em></>}
        intro="This notice explains the limited ways information may be processed when you visit this website or contact Novapharm Innovation Technology."
      />
      <section className="section section--paper legal-page">
        <div className="shell legal-page__grid">
          <aside><p>Last updated</p><strong>21 July 2026</strong></aside>
          <div>
            <section>
              <h2>1. Website enquiries</h2>
              <p>The project-brief form on this website does not submit information to a website database. It creates a structured email in your own email application. Information is sent only when you choose to send that email.</p>
            </section>
            <section>
              <h2>2. Information you provide</h2>
              <p>When you contact us, we may receive your name, organisation, business contact details, project context, and other information you decide to provide. Please do not send patient-identifiable information, special-category personal data, confidential clinical data, or other sensitive information unless an appropriate and lawful process has been agreed.</p>
            </section>
            <section>
              <h2>3. How information may be used</h2>
              <p>Information may be used to understand and respond to your enquiry, evaluate whether NIT can support the matter, arrange discussions, prepare an engagement proposal, maintain business records, and meet applicable legal or compliance obligations.</p>
            </section>
            <section>
              <h2>4. Website hosting and technical logs</h2>
              <p>The website is hosted using third-party infrastructure. Hosting and security providers may automatically process limited technical data such as IP address, request time, browser information, referring page, and requested resource for delivery, diagnostics, abuse prevention, and security.</p>
            </section>
            <section>
              <h2>5. Cookies and analytics</h2>
              <p>This version of the website does not intentionally use advertising cookies or behavioural profiling. If analytics or other optional technologies are introduced, this notice and any consent controls should be updated before deployment.</p>
            </section>
            <section>
              <h2>6. Sharing and retention</h2>
              <p>Information may be shared with professional advisers, service providers, or appropriately qualified collaborators where reasonably necessary and subject to suitable obligations. Information is retained only for as long as reasonably required for the purpose collected, business record-keeping, dispute management, and legal obligations.</p>
            </section>
            <section>
              <h2>7. Your rights and contact</h2>
              <p>Applicable privacy rights vary by jurisdiction. To ask a privacy question or make a request, contact <a href="mailto:bd@novapharmhealthcare.com">bd@novapharmhealthcare.com</a>.</p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
