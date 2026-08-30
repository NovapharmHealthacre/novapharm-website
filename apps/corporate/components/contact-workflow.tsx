"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
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

function friendlyError(status: number, offline: boolean): string {
  if (offline) return "You appear to be offline. Reconnect and try again.";
  if (status === 400 || status === 422) return "Please check the highlighted information and try again.";
  if (status === 403) return "The security check expired. Please refresh the page and try again.";
  if (status === 429) return "Too many submissions were received. Please wait before trying again.";
  return "The secure enquiry service cannot be reached right now. No information was submitted. Please try again later or use the verified email route.";
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
      const response = await fetch(platformEndpoint("/contact"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfPayload.csrfToken },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw Object.assign(new Error("submission_failed"), { status: response.status });
      form.reset();
      setDefaultType("");
      setState("success");
      setMessage("Thank you. Your enquiry has been received and recorded securely.");
    } catch (error) {
      setState("error");
      setMessage(friendlyError(Number((error as { status?: number }).status ?? 0), !navigator.onLine));
    } finally {
      window.setTimeout(() => statusRef.current?.focus(), 0);
    }
  }

  return (
    <div className="contact-workflow">
      <form className="contact-form" onSubmit={submit} noValidate={false}>
        <div className="honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
        <div className="field-grid">
          <label><span>Full name</span><input name="name" autoComplete="name" maxLength={120} required /></label>
          <label><span>Business email</span><input name="email" type="email" autoComplete="email" maxLength={160} required /></label>
          <label><span>Company</span><input name="company" autoComplete="organization" maxLength={160} required /></label>
          <label><span>Role or job title</span><input name="role" autoComplete="organization-title" maxLength={120} required /></label>
          <label><span>Country</span><input name="country" autoComplete="country-name" maxLength={80} required /></label>
          <label><span>Telephone <small>optional</small></span><input name="telephone" type="tel" autoComplete="tel" maxLength={40} /></label>
        </div>
        <label><span>Enquiry type</span><select name="enquiryType" value={defaultType} onChange={(event) => setDefaultType(event.target.value)} required><option value="">Select an enquiry</option>{enquiryTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label><span>Message</span><textarea name="message" minLength={20} maxLength={2000} required aria-describedby="contact-safety-warning" /></label>
        <p className="field-note" id="contact-safety-warning">Do not include patient-identifiable information, an adverse-event report or urgent medical information. Report suspected medicine side effects through the <a href="https://yellowcard.mhra.gov.uk/">MHRA Yellow Card service</a>. For emergencies call 999; for urgent NHS advice use 111.</p>
        <label className="check-row"><input type="checkbox" name="safetyConfirmation" value="yes" required /><span>I confirm that this message contains no patient-identifiable information, adverse-event report or urgent medical information.</span></label>
        <label className="check-row"><input type="checkbox" name="privacyAcknowledgement" value="yes" required /><span>I have read the <a href="/legal/privacy/#business-enquiries">business-enquiry privacy information</a>. This is not marketing consent.</span></label>
        <button className="button button-primary" type="submit" disabled={state === "sending"}>{state === "sending" ? <LoaderCircle className="spin" aria-hidden="true" /> : <Mail aria-hidden="true" />} Submit enquiry</button>
      </form>
      <div className={`form-status form-status-${state}`} ref={statusRef} role="status" aria-live="polite" tabIndex={-1}>
        {state === "success" ? <CheckCircle2 aria-hidden="true" /> : state === "error" ? <AlertCircle aria-hidden="true" /> : null}
        <p>{message || "Your information is sent only to NovaPharm's secure server when you submit this form."}</p>
      </div>
      {state === "error" ? <a className="verified-email" href="mailto:vishal@novapharmhealthcare.com?subject=NovaPharm%20business%20enquiry">Use the verified corporate email route</a> : null}
    </div>
  );
}
