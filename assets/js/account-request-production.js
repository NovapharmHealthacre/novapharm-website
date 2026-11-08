/* Public customer business-account request, on verified AWS-backed release only.
 * No passwords, documents, client storage, or automatic trading permissions.
 */
const form = document.querySelector("[data-live-account-request-form]");
if (form instanceof HTMLFormElement) {
  const status = form.querySelector("[data-account-request-status]");
  const submit = form.querySelector('button[type="submit"]');
  const origin = form.dataset.apiOrigin || "";
  const validOrigin = /^https:\/\/[a-z0-9]+\.execute-api\.eu-north-1\.amazonaws\.com$/i.test(origin);
  if (!validOrigin) {
    if (submit) submit.disabled = true;
    if (status) status.textContent = "Business account requests are temporarily unavailable. Contact NovaPharm through the published corporate email.";
  } else {
    const businessTypes = new Set(["Pharmacy", "Hospital", "Wholesaler", "Clinic", "Healthcare organisation"]);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (submit?.disabled || !form.reportValidity()) return;
      const data = new FormData(form);
      const field = name => String(data.get(name) || "").trim();
      if (field("website")) {
        if (status) status.textContent = "We could not accept this request.";
        return;
      }
      const businessType = field("businessType");
      if (!businessTypes.has(businessType)) {
        if (status) status.textContent = "Please select a valid business type.";
        return;
      }
      const companyNumber = field("companyNumber");
      if (companyNumber.length > 40 || /[<>\u0000-\u001f\u007f]/u.test(companyNumber)) {
        if (status) status.textContent = "Please check your company number.";
        return;
      }
      const body = {
        name: field("name"),
        email: field("email"),
        company: field("company"),
        role: field("role"),
        country: field("country"),
        telephone: field("telephone"),
        enquiryType: "Pharmacy or wholesaler account",
        message: "I would like to request review for a NovaPharm business account. Business type: " +
          businessType + (companyNumber ? ". Company number: " + companyNumber : "") +
          ". I understand this is an eligibility request only; no account or ordering privileges have been activated.",
        website: "",
        privacyAcknowledgement: field("privacyAcknowledgement"),
        safetyConfirmation: field("safetyConfirmation")
      };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      if (submit) submit.disabled = true;
      if (status) status.textContent = "Sending your account request securely…";
      try {
        const response = await fetch(origin + "/contact", {
          method: "POST",
          mode: "cors",
          redirect: "error",
          credentials: "omit",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "X-Novapharm-Intake": "v1"
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        const receipt = await response.json().catch(() => null);
        if (response.status !== 201 || receipt?.persisted !== true ||
            !/^[0-9a-f-]{36}$/i.test(receipt.receiptId || "")) {
          throw new Error("No durable receipt returned");
        }
        form.reset();
        if (status) {
          status.replaceChildren();
          const strong = document.createElement("strong");
          strong.textContent = "Request received. Reference: " + receipt.receiptId;
          status.append(strong, document.createTextNode(". Keep this reference for enquiries. Your account is not yet activated; our team will review eligibility."));
        }
      } catch {
        if (status) {
          status.replaceChildren();
          status.append(document.createTextNode("Your request could not be confirmed. Please try again or email "));
          const link = document.createElement("a");
          link.href = "mailto:vishal@novapharmhealthcare.com";
          link.textContent = "vishal@novapharmhealthcare.com";
          status.append(link, document.createTextNode("."));
        }
      } finally {
        clearTimeout(timeout);
        if (submit) submit.disabled = false;
      }
    });
  }
}
