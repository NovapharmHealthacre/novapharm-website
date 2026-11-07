"use client";

import { type FormEvent, useState } from "react";

const corporateEmail = "vishal@novapharmhealthcare.com";

const topics = [
  "Product opportunity",
  "Distribution partnership",
  "Oncology & specialist medicines",
  "CMO/CDMO partnership",
  "Regulatory services",
  "Clinical development & CRO support",
  "Pharmacy or wholesaler account",
  "Supplier enquiry",
  "Media",
  "Careers",
  "General enquiry",
] as const;

/**
 * Email composition only. No fetch, hidden submission, analytics or local storage.
 * The email application, not NovaPharm's public website, sends the message.
 */
export function ContactEmailDraft() {
  const [notice, setNotice] = useState(
    "This public information release does not collect or transmit enquiry details. Your email app handles sending."
  );

  function prepareEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const entries = new FormData(form);
    const topic = String(entries.get("enquiryType") ?? "").trim();
    const body = [
      "NovaPharm business enquiry",
      "",
      "Full name: " + String(entries.get("name") ?? "").trim(),
      "Work email: " + String(entries.get("email") ?? "").trim(),
      "Company: " + String(entries.get("company") ?? "").trim(),
      "Country / region: " + String(entries.get("country") ?? "").trim(),
      "Enquiry type: " + topic,
      "",
      "Message:",
      String(entries.get("message") ?? "").trim(),
    ].join("\n");

    setNotice("An email draft has been prepared. You must send it from your email application. The website has not received or stored your enquiry.");
    const url = "mailto:" + corporateEmail +
      "?subject=" + encodeURIComponent("NovaPharm | " + topic) +
      "&body=" + encodeURIComponent(body);
    window.location.assign(url);
  }

  return (
    <div className="np-contact-draft">
      <form className="np-contact-reference-form" data-email-enquiry-form
        action={"mailto:" + corporateEmail} method="post" encType="text/plain"
        onSubmit={prepareEmail}>
        <div className="np-contact-reference-grid">
          <label className="np-contact-reference-field"><span>Full name</span><input name="name" autoComplete="name" placeholder="Your name" maxLength={120} required /></label>
          <label className="np-contact-reference-field"><span>Work email</span><input name="email" type="email" autoComplete="email" placeholder="name@company.com" maxLength={160} required /></label>
          <label className="np-contact-reference-field"><span>Company</span><input name="company" autoComplete="organization" placeholder="Organisation name" maxLength={160} required /></label>
          <label className="np-contact-reference-field"><span>Country / region</span><input name="country" autoComplete="country-name" placeholder="Select or enter your country" maxLength={80} required /></label>
        </div>
        <label className="np-contact-reference-field np-contact-reference-full"><span>What is your enquiry about?</span>
          <select name="enquiryType" defaultValue="" required><option value="" disabled>Choose a topic</option>{topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select>
        </label>
        <label className="np-contact-reference-field np-contact-reference-full np-contact-reference-message"><span>Your message</span>
          <textarea name="message" placeholder="Tell us a little about your enquiry." minLength={20} maxLength={850} required />
        </label>
        <div className="np-contact-reference-actions">
          <div>
            <p className="np-contact-reference-privacy">Your information will be used to respond to your enquiry, in accordance with our <a href="/legal/privacy/">privacy notice</a>.</p>
            <p className="np-contact-reference-mode">This website does not submit enquiries. Opening your email draft does not confirm delivery. Please do not include confidential dossiers or patient information.</p>
          </div>
          <button className="np-contact-reference-submit" type="submit">Open email draft</button>
        </div>
      </form>
      <p className="np-contact-reference-status" role="status" aria-live="polite">{notice}</p>
    </div>
  );
}
