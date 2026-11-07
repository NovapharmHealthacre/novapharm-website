import { ContactEmailDraft } from "./contact-email-draft";
import { ContactWorkflow } from "./contact-workflow";

/**
 * Public and managed contact pages share the same visual design.
 * Only the managed branch can transmit an enquiry to the authenticated API.
 */
export function ContactExperience({ managedEnabled }: { readonly managedEnabled: boolean }) {
  return (
    <div className="np-contact np-contact-reference">
      <section className="np-contact-reference-hero" aria-labelledby="contact-heading">
        <div className="np-contact-reference-shell">
          <span className="np-contact-reference-kicker">Contact NovaPharm</span>
          <h1 id="contact-heading">Let's talk.</h1>
          <p>Big ideas begin with a conversation.<br />Tell us what you're working on.</p>
        </div>
      </section>

      <section className="np-contact-reference-content" aria-labelledby="contact-help-heading">
        <div className="np-contact-reference-shell">
          <header className="np-contact-reference-heading">
            <h2 id="contact-help-heading">How can we help?</h2>
            <p>Share a few details and we'll direct your enquiry to the right team.</p>
          </header>
          {managedEnabled ? <ContactWorkflow /> : <ContactEmailDraft />}
        </div>
      </section>

      <aside className="np-contact-reference-safety" aria-label="Important communication boundaries">
        <div className="np-contact-reference-shell">
          <p>Business enquiries only. This is not a medical or patient-ordering channel. Do not send patient-identifiable information, adverse-event reports or urgent medical details. Report suspected side effects through the <a href="https://yellowcard.mhra.gov.uk/">MHRA Yellow Card service</a>. For UK emergencies call 999 or seek NHS 111 advice.</p>
        </div>
      </aside>

      <footer className="np-contact-reference-footer">
        <div className="np-contact-reference-shell np-contact-reference-footer-inner">
          <div>
            <strong>Medicine. Where it needs to be.</strong>
            <p>NovaPharm Healthcare Ltd · United Kingdom</p>
            <small>Regulated wholesale supply has not commenced.</small>
          </div>
          <nav aria-label="Contact footer">
            <a href="/about/">Company</a>
            <a href="/legal/privacy/">Privacy</a>
            <a href="/legal/terms/">Terms</a>
            <a href="/legal/accessibility/">Accessibility</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
