"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

const enquiryTypes = [
  "Product opportunity",
  "Distribution partnership",
  "Pharmacy or wholesaler account",
  "CMO/CDMO partnership",
  "Regulatory services",
  "Clinical development & CRO support",
  "Oncology & specialist medicines",
  "Supplier enquiry",
  "Media",
  "Careers",
  "General enquiry",
] as const;

const platformEndpoint = (path: string) => `/api/platform${path}`;

function serverEnquiryType(selected: string): string {
  if (selected === "Clinical development & CRO support") return "Regulatory services";
  if (selected === "Oncology & specialist medicines") return "Product opportunity";
  return selected;
}

function friendlyError(status: number, offline: boolean, submissionAttempted: boolean): string {
  if (status === 400 || status === 422) return "Please check the highlighted information and try again.";
  if (status === 403) return "The security check expired. Please refresh the page and try again.";
  if (status === 429) return "Too many submissions were received. Please wait before trying again.";
  if (status === 202 || submissionAttempted) return "We could not verify whether your enquiry was received. Please avoid resubmitting immediately. Use the verified corporate email route to follow up if necessary.";
  if (offline) return "You appear to be offline. Your enquiry was not sent by this form. Reconnect and try again.";
  return "The secure enquiry service cannot be reached right now. Your enquiry was not sent by this form. Please try again later or use the verified email route.";
}

function referringHost(referrer: string): string {
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname;
  } catch {
    return "";
  }
}

export function ContactWorkflow() {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [defaultType, setDefaultType] = useState("");
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("enquiry") ?? "";
    setDefaultType(enquiryTypes.includes(requested as (typeof enquiryTypes)[number]) ? requested : "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setState("sending");
    setMessage("Submitting your enquiry securely.");
    let submissionAttempted = false;
    try {
      const csrfResponse = await fetch(platformEndpoint("/security/csrf"), { credentials: "include", headers: { Accept: "application/json" } });
      const csrfPayload = await csrfResponse.json().catch(() => ({})) as { csrfToken?: string };
      if (!csrfResponse.ok || !csrfPayload.csrfToken) throw Object.assign(new Error("csrf_unavailable"), { status: csrfResponse.status });
      const data = new FormData(form);
      const params = new URLSearchParams(window.location.search);
      const payload = Object.fromEntries(data.entries());
      const selectedType = String(payload.enquiryType ?? "");
      const selectedMessage = String(payload.message ?? "");
      Object.assign(payload, {
        enquiryType: serverEnquiryType(selectedType),
        message: serverEnquiryType(selectedType) === selectedType ? selectedMessage : `Topic: ${selectedType}. ${selectedMessage}`,
        sourcePage: window.location.pathname,
        sourceCta: params.get("cta") ?? "corporate-contact",
        attributionPayload: JSON.stringify({
          campaign: { utm_source: params.get("utm_source"), utm_medium: params.get("utm_medium"), utm_campaign: params.get("utm_campaign") },
          referringHost: referringHost(document.referrer),
        }),
      });
      submissionAttempted = true;
      const response = await fetch(platformEndpoint("/contact"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfPayload.csrfToken },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw Object.assign(new Error("submission_failed"), { status: response.status });
      const receipt = await response.json().catch(() => ({})) as { ok?: boolean; lead?: { id?: string | number } };
      if (receipt.ok !== true || !receipt.lead?.id) {
        throw Object.assign(new Error("receipt_unverified"), { status: 202 });
      }
      form.reset();
      setDefaultType("");
      setState("success");
      setMessage("Thank you. Your enquiry has been received and recorded securely.");
    } catch (error) {
      setState("error");
      setMessage(friendlyError(Number((error as { status?: number }).status ?? 0), !navigator.onLine, submissionAttempted));
    } finally {
      window.setTimeout(() => statusRef.current?.focus(), 0);
    }
  }

  return (
    <div className="contact-workflow np-contact-managed">
      <form className="contact-form np-contact-reference-form" onSubmit={submit}>
        <div className="honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
        <div className="np-contact-reference-grid">
          <label className="np-contact-reference-field"><span>Full name</span><input name="name" autoComplete="name" placeholder="Your name" maxLength={120} required /></label>
          <label className="np-contact-reference-field"><span>Work email</span><input name="email" type="email" autoComplete="email" placeholder="name@company.com" maxLength={160} required /></label>
          <label className="np-contact-reference-field"><span>Company</span><input name="company" autoComplete="organization" placeholder="Organisation name" maxLength={160} required /></label>
          <label className="np-contact-reference-field"><span>Country / region</span><input name="country" autoComplete="country-name" placeholder="Select or enter a country" maxLength={80} required /></label>
        </div>
        <div className="np-contact-reference-extra">
          <label className="np-contact-reference-field"><span>Role or job title</span><input name="role" autoComplete="organization-title" placeholder="Your position" maxLength={120} required /></label>
          <label className="np-contact-reference-field"><span>Telephone (optional)</span><input name="telephone" type="tel" autoComplete="tel" placeholder="+44 ..." maxLength={40} /></label>
        </div>
        <label className="np-contact-reference-field np-contact-reference-full"><span>What is your enquiry about?</span>
          <select name="enquiryType" value={defaultType} onChange={(event) => setDefaultType(event.target.value)} required>
            <option value="">Choose a topic</option>{enquiryTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="np-contact-reference-field np-contact-reference-full np-contact-reference-message"><span>Your message</span>
          <textarea name="message" placeholder="Tell us a little about your enquiry." minLength={20} maxLength={2000} required aria-describedby="contact-safety-warning" />
        </label>
        <p className="np-contact-reference-warning" id="contact-safety-warning">
          Do not include patient-identifiable information, adverse-event reports or urgent medical information.
          Report suspected side effects through the <a href="https://yellowcard.mhra.gov.uk/">MHRA Yellow Card service</a>.
        </p>
        <div className="np-contact-reference-confirmations">
          <label className="check-row"><input type="checkbox" name="safetyConfirmation" value="yes" required /><span>I confirm this message contains no patient-identifiable information, adverse-event report or urgent medical information.</span></label>
          <label className="check-row"><input type="checkbox" name="privacyAcknowledgement" value="yes" required /><span>I have read the <a href="/legal/privacy/#business-enquiries">business-enquiry privacy notice</a>. This is not marketing consent.</span></label>
        </div>
        <div className="np-contact-reference-actions">
          <p className="np-contact-reference-privacy">Your information will be used to respond to your enquiry, in accordance with our <a href="/legal/privacy/">privacy notice</a>.</p>
          <button className="np-contact-reference-submit" type="submit" disabled={state === "sending"}>{state === "sending" ? "Submitting..." : "Send enquiry"}</button>
        </div>
      </form>
      <div className={"np-contact-reference-status form-status form-status-" + state} ref={statusRef} role="status" aria-live="polite" tabIndex={-1}>
        <p>{message || "Your enquiry is transmitted only to NovaPharm's verified secure API when you select Send enquiry."}</p>
      </div>
      {state === "error" ? <a className="verified-email" href="mailto:vishal@novapharmhealthcare.com?subject=NovaPharm%20business%20enquiry">Use the verified corporate email route</a> : null}
    </div>
  );
}
