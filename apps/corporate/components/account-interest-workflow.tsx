"use client";

import { type FormEvent, useRef, useState } from "react";
import { enquiryRequest, requireEnquiryReceipt, submissionUnconfirmed, unconfirmedEnquiryMessage } from "../lib/enquiry-receipt";

function friendlyError(status: number, offline: boolean): string {
  if (offline) return "You appear to be offline. Reconnect and try again.";
  if (status === 400 || status === 422) return "Please check the information in the form and try again.";
  if (status === 403) return "The security check expired. Please refresh the page and try again.";
  if (status === 429) return "Too many submissions were received. Please wait before trying again.";
  return "The secure account-interest service cannot be reached right now. No information was submitted. Please try again later or use the verified corporate email route.";
}

function referringHost(referrer: string): string {
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname;
  } catch {
    return "";
  }
}

export function AccountInterestWorkflow() {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const statusRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (submitting.current || !form.reportValidity()) return;
    submitting.current = true;
    setReference("");

    setState("sending");
    setMessage("Submitting your account interest securely.");
    let submissionStarted = false;

    try {
      const csrfResponse = await enquiryRequest("/security/csrf", {
        headers: { Accept: "application/json" },
      });
      const csrfPayload = await csrfResponse.json().catch(() => ({})) as { csrfToken?: string };
      if (!csrfResponse.ok || !csrfPayload.csrfToken) {
        throw Object.assign(new Error("csrf_unavailable"), { status: csrfResponse.status });
      }

      const data = new FormData(form);
      const organisationType = String(data.get("organisationType") ?? "");
      const interest = String(data.get("interest") ?? "").trim();
      const payload = {
        website: String(data.get("website") ?? ""),
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        company: String(data.get("company") ?? ""),
        role: String(data.get("role") ?? ""),
        country: String(data.get("country") ?? ""),
        telephone: String(data.get("telephone") ?? ""),
        enquiryType: "Pharmacy or wholesaler account",
        message: `Organisation type: ${organisationType}. Account interest: ${interest}`,
        safetyConfirmation: String(data.get("safetyConfirmation") ?? ""),
        privacyAcknowledgement: String(data.get("privacyAcknowledgement") ?? ""),
        sourcePage: window.location.pathname,
        sourceCta: "account-interest",
        attributionPayload: JSON.stringify({ referringHost: referringHost(document.referrer) }),
      };

      submissionStarted = true;
      const response = await enquiryRequest("/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfPayload.csrfToken,
        },
        body: JSON.stringify(payload),
      });
      const receipt = await requireEnquiryReceipt(response);
      setReference(receipt.reference);

      form.reset();
      setState("success");
      setMessage("Your account interest has been received and recorded securely. This does not create an account or portal access; NovaPharm will review eligibility before any controlled application invitation.");
    } catch (error) {
      setState("error");
      const status = Number((error as { status?: number }).status ?? 0);
      setMessage(submissionUnconfirmed(status, submissionStarted) ? unconfirmedEnquiryMessage : friendlyError(status, !navigator.onLine));
    } finally {
      submitting.current = false;
      window.setTimeout(() => statusRef.current?.focus(), 0);
    }
  }

  return (
    <div className="contact-workflow account-interest-workflow">
      <form className="contact-form" onSubmit={submit}>
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="account-website">Website</label>
          <input id="account-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="field-grid">
          <label><span>Full name</span><input name="name" autoComplete="name" maxLength={120} required /></label>
          <label><span>Business email</span><input name="email" type="email" autoComplete="email" maxLength={160} required /></label>
          <label><span>Company</span><input name="company" autoComplete="organization" maxLength={160} required /></label>
          <label><span>Role or job title</span><input name="role" autoComplete="organization-title" maxLength={120} required /></label>
          <label><span>Country</span><input name="country" autoComplete="country-name" maxLength={80} required /></label>
          <label><span>Telephone <small>optional</small></span><input name="telephone" type="tel" autoComplete="tel" maxLength={40} /></label>
        </div>
        <label>
          <span>Organisation type</span>
          <select name="organisationType" required defaultValue="">
            <option value="" disabled>Select an organisation type</option>
            <option>Pharmacy</option>
            <option>Pharmaceutical wholesaler</option>
            <option>Hospital</option>
            <option>Clinic or other healthcare organisation</option>
            <option>Other regulated business</option>
          </select>
        </label>
        <label>
          <span>What would you like the account to support?</span>
          <textarea name="interest" minLength={20} maxLength={1400} required aria-describedby="account-interest-boundary" />
        </label>
        <p className="field-note" id="account-interest-boundary">Submit non-confidential business information only. Do not upload or paste licences, bank details, patient information, adverse-event reports, contracts or other sensitive records here. Any later due-diligence evidence uses a separately controlled workflow.</p>
        <label className="check-row"><input type="checkbox" name="safetyConfirmation" value="yes" required /><span>I confirm that this submission contains no patient-identifiable information, adverse-event report or urgent medical information.</span></label>
        <label className="check-row"><input type="checkbox" name="privacyAcknowledgement" value="yes" required /><span>I have read the <a href="/legal/privacy/#business-enquiries">business-enquiry privacy information</a>. This is not marketing consent.</span></label>
        <button className="button button-primary" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Submitting..." : "Register qualified account interest"}
        </button>
      </form>
      <div className={`form-status form-status-${state}`} ref={statusRef} role="status" aria-live="polite" tabIndex={-1}>
        <p>{message || "This first step records non-confidential account interest only. No customer account, approval or portal identity is created automatically."}</p>
        {reference ? <p>Your reference: <strong>{reference}</strong></p> : null}
      </div>
      {state === "error" ? <a className="verified-email" href="mailto:vishal@novapharmhealthcare.com?subject=NovaPharm%20account%20interest">Use the verified corporate email route</a> : null}
    </div>
  );
}
