import { ContactWorkflow } from "./contact-workflow";

const emailAddress = "vishal@novapharmhealthcare.com";

const topics = [
  { title: "Product and dossier opportunities", description: "Introduce a product, dossier or market-entry programme.", category: "Product opportunity" },
  { title: "Distribution partnerships", description: "Discuss UK distribution and qualified supply routes.", category: "Distribution partnership" },
  { title: "Oncology and specialist medicines", description: "Explore a specialist portfolio or continuity requirement.", category: "Oncology & specialist medicines" },
  { title: "Manufacturing and CMO/CDMO", description: "Discuss manufacturing, technology transfer or supply partnerships.", category: "CMO/CDMO partnership" },
  { title: "Regulatory and quality", description: "Explore regulatory intelligence, evidence and compliance support.", category: "Regulatory services" },
  { title: "Clinical development and CRO", description: "Discuss a development, research or clinical-services brief.", category: "Clinical development & CRO support" },
  { title: "Pharmacies and wholesale accounts", description: "Start a qualified business-account conversation.", category: "Pharmacy or wholesaler account" },
  { title: "General, supplier, media and careers", description: "Reach the appropriate NovaPharm team for another business request.", category: "General enquiry" },
] as const;

export function ContactExperience({ managedEnabled }: { readonly managedEnabled: boolean }) {
  return (
    <div className="np-contact">
      <section className="np-contact-hero">
        <div className="np-contact-shell">
          <span className="np-contact-kicker">NovaPharm Healthcare / Contact</span>
          <h1>Let's start the right conversation.</h1>
          <p className="np-contact-lead">Choose the area that best matches your business enquiry. We will start with the opportunity and the evidence needed to assess it.</p>
        </div>
      </section>
      <section className="np-contact-topics" aria-labelledby="np-contact-topics-heading">
        <div className="np-contact-shell">
          <div className="np-contact-sectionhead">
            <span className="np-contact-kicker">01 / Your enquiry</span>
            <h2 id="np-contact-topics-heading">How can we help?</h2>
            <p>Find the right route in one step. Every conversation begins with clarity, confidentiality and appropriate regulatory boundaries.</p>
          </div>
          <div className="np-contact-grid">
            {topics.map((topic) => {
              const href = managedEnabled
                ? `/contact/?enquiry=${encodeURIComponent(topic.category)}#contact-form`
                : `mailto:${emailAddress}?subject=${encodeURIComponent(`NovaPharm | ${topic.category}`)}`;
              return (
                <a className="np-contact-topic" key={topic.category} href={href}>
                  <strong>{topic.title}</strong>
                  <span className="np-contact-topic-copy">{topic.description}</span>
                  <span className="np-contact-topic-action">{managedEnabled ? "Go to secure form" : "Open business email"}</span>
                </a>
              );
            })}
          </div>
        </div>
      </section>
      <section className="np-contact-destination" aria-labelledby="np-contact-route-heading">
        <div className="np-contact-shell np-contact-destination-layout">
          <div>
            <span className="np-contact-kicker">02 / Get in touch</span>
            <h2 id="np-contact-route-heading">A direct way to connect.</h2>
            <p>Tell us your organisation, the market or opportunity, and what decision you need to make. Share sensitive technical or commercial files only through a separately verified secure channel.</p>
            <p><a href="/legal/privacy/">Read the privacy notice</a></p>
          </div>
          {managedEnabled ? (
            <div id="contact-form" className="np-contact-form-panel">
              <h3>Tell us about your enquiry.</h3>
              <p>Your message is submitted only when the managed service is available. Please do not include confidential documents.</p>
              <ContactWorkflow />
            </div>
          ) : (
            <div id="contact-form" className="np-contact-email-panel">
              <h3>Send us an email.</h3>
              <p>Our secure online form is not active on this public website. This public website does not collect or transmit enquiry details. For non-confidential business enquiries, use the corporate email route. Your email application, not this website, handles sending.</p>
              <a className="np-contact-primary" href={`mailto:${emailAddress}?subject=NovaPharm%20business%20enquiry`}>Email NovaPharm</a>
              <a className="np-contact-email-address" href={`mailto:${emailAddress}`}>{emailAddress}</a>
              <p className="np-contact-small">Opening email does not confirm delivery. Do not attach confidential dossiers or patient records.</p>
            </div>
          )}
        </div>
      </section>
      <section className="np-contact-safety" aria-label="Important communication boundaries">
        <div className="np-contact-shell np-contact-safety-grid">
          <div>
            <h3>Business enquiries only.</h3>
            <p>NovaPharm does not sell medicines to patients or provide individual medical advice through this channel. An enquiry does not establish a supply commitment or regulatory approval.</p>
          </div>
          <div>
            <h3>Not a medical or safety channel.</h3>
            <p>Do not provide patient-identifiable information or adverse-event details. Report suspected medicine side effects using the <a href="https://yellowcard.mhra.gov.uk/">MHRA Yellow Card service</a>. For UK emergencies call 999; NHS 111 provides urgent advice.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
