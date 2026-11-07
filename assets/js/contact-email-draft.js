/* Public contact enhancement: email draft ONLY, never an HTTP form submission.
 * No fetch, analytics, local storage, cookie, or server receipt is performed here.
 * Opening the user's mail client is NOT confirmation of sending or delivery.
 */
const emailDraft = document.querySelector("[data-email-enquiry-form]");
if (emailDraft) {
  const status = document.querySelector("[data-email-draft-status]");
  const topic = emailDraft.elements.namedItem("enquiryType");
  const requestedTopic = new URLSearchParams(window.location.search).get("enquiry");
  if (topic instanceof HTMLSelectElement && requestedTopic) {
    const match = [...topic.options].find((option) => option.value.toLowerCase() === requestedTopic.toLowerCase());
    if (match) topic.value = match.value;
  }

  emailDraft.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!emailDraft.reportValidity()) return;
    const data = new FormData(emailDraft);
    const subject = "NovaPharm | " + String(data.get("enquiryType") || "General enquiry");
    const body = [
      "NovaPharm business enquiry",
      "",
      "Full name: " + String(data.get("name") || "").trim(),
      "Work email: " + String(data.get("email") || "").trim(),
      "Company: " + String(data.get("company") || "").trim(),
      "Country / region: " + String(data.get("country") || "").trim(),
      "Enquiry type: " + String(data.get("enquiryType") || "").trim(),
      "",
      "Message:",
      String(data.get("message") || "").trim()
    ].join("\n");

    if (status) {
      status.textContent = "An email draft is ready. You must send it from your own email application. The website has not received or stored your enquiry.";
    }

    const mailto = "mailto:vishal@novapharmhealthcare.com?subject=" +
      encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    window.location.assign(mailto);
  });
}
