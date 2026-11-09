/* NovaPharm managed B2B contact receiver.
 * This script is shipped ONLY after the production AWS endpoint has passed
 * receipt, security, notification and publication acceptance checks.
 * It never stores form content in browser storage or writes it into URLs.
 */
const form = document.querySelector("[data-live-b2b-enquiry-form]");
if (form instanceof HTMLFormElement) {
  const status = document.querySelector("[data-live-contact-status]");
  const submit = form.querySelector("button[type=submit]");
  const origin = form.dataset.apiOrigin || "";
  if (!/^https:\/\/[a-z0-9]+\.execute-api\.eu-north-1\.amazonaws\.com$/i.test(origin)) {
    if (submit) submit.disabled = true;
    if (status) status.textContent = "Secure online enquiries are temporarily unavailable. Please use the published business email address.";
  } else {
    const requestedType = new URLSearchParams(location.search).get("enquiry");
    const topic = form.elements.namedItem("enquiryType");
    if (topic instanceof HTMLSelectElement && requestedType) {
      const match = [...topic.options].find(option => option.value.toLowerCase() === requestedType.toLowerCase());
      if (match) topic.value = match.value;
    }
    // Product details arrive only as public, non-sensitive URL hints. They
    // prefill a customer-controlled enquiry, never an order or a price.
    // Treat URL content as untrusted and insert it only using input.value.
    const intent = new URLSearchParams(location.search);
    const productName = intent.get("product") || "";
    const sku = intent.get("sku") || "";
    const messageField = form.elements.namedItem("message");
    // ESCO quote-list hints are untrusted. Accept only model-independent
    // catalogue IDs and safe quantities; no buyer-provided HTML or pricing.
    const rawEscoQuote = intent.get("quote") || "";
    if (messageField instanceof HTMLTextAreaElement && !messageField.value.trim()
        && rawEscoQuote.startsWith("ESCO Anand UK quotation request")
        && rawEscoQuote.length <= 850
        && !/[<>\u0000-\u001f\u007f]/u.test(rawEscoQuote)) {
      const items = [...rawEscoQuote.matchAll(/\b(ESCO-CAT-\d{4}) qty ([1-9][0-9]{0,2}|1000)\b/gu)];
      const unique = new Set(items.map((item) => item[1]));
      if (items.length > 0 && items.length <= 12 && unique.size === items.length) {
        messageField.value = "ESCO Anand 2026 catalogue: request for a non-binding UK procurement quotation.\n\n" +
          items.map((item) => "- " + item[1] + ": " + item[2] + " units").join("\n") +
          "\n\nPlease confirm the precise product variants, UK market compliance, delivered prices excluding and including applicable VAT, and lead times. This is not an order or an instruction to collect payment.";
      }
    }
    // Basket hints contain SKU and requested units only. Validate length,
    // syntax, duplicates and quantity before touching the visible enquiry.
    // They must not be interpreted as confirmed or priced orders.
    const rawBasket = intent.get("basket") || "";
    const orderLines = rawBasket && rawBasket.length <= 1250 ? rawBasket.split(",") : [];
    const seenOrderSkus = new Set();
    const basketValid = orderLines.length > 0 && orderLines.length <= 19 && orderLines.every((line) => {
      const match = /^(NUT-UK-[A-Z0-9-]{3,48}):([1-9][0-9]{0,3}|10000)$/u.exec(line);
      if (!match || seenOrderSkus.has(match[1])) return false;
      seenOrderSkus.add(match[1]);
      return true;
    });
    if (messageField instanceof HTMLTextAreaElement
        && !messageField.value.trim()
        && basketValid) {
      const items = orderLines.map((line) => {
        const [productSku, count] = line.split(":");
        return `- ${productSku}: ${count} units`;
      });
      messageField.value = `Please review this preliminary Nutraxin business purchase request and provide a formal quotation, subject to customer qualification, current availability, approved selling prices, delivery costs, UK VAT status and applicable terms.\n\n${items.join("\n")}\n\nThis is a non-binding quotation request, not a confirmed order. No payment is authorised.`;
    }
    if (messageField instanceof HTMLTextAreaElement
        && !messageField.value.trim()
        && !rawBasket
        && productName.length > 0 && productName.length <= 160
        && !/[<>\u0000-\u001f\u007f]/u.test(productName)) {
      const validSku = /^NUT-UK-[A-Z0-9-]{3,48}$/u.test(sku) ? sku : "";
      const reference = validSku ? ` (SKU: ${validSku})` : "";
      messageField.value = `I would like to discuss a qualified NovaPharm business account and future purchasing for ${productName}${reference}.\n\nThis is a non-binding business enquiry, not an order or a request to pay.`;
    }
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (submit?.disabled || !form.reportValidity()) return;
      const data = new FormData(form);
      if (data.get("website")) {
        if (status) status.textContent = "We could not process this request.";
        return;
      }
      const value = key => String(data.get(key) || "").trim();
      const body = {
        name: value("name"),
        email: value("email"),
        company: value("company"),
        role: value("role"),
        country: value("country"),
        telephone: value("telephone"),
        enquiryType: value("enquiryType"),
        message: value("message"),
        website: "",
        safetyConfirmation: value("safetyConfirmation"),
        privacyAcknowledgement: value("privacyAcknowledgement")
      };
      const controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 15000);
      if (submit) submit.disabled = true;
      if (status) status.textContent = "Submitting your business enquiry securely…";
      try {
        const response = await fetch(origin + "/contact", {
          method: "POST", mode: "cors", redirect: "error", credentials: "omit", cache: "no-store",
          headers: { "Content-Type": "application/json", "X-Novapharm-Intake": "v1" },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        const result = await response.json().catch(() => null);
        if (response.status !== 201 || result?.persisted !== true ||
            !/^[0-9a-f-]{36}$/i.test(result.receiptId || "")) {
          throw new Error("No durable receipt confirmed");
        }
        form.reset();
        if (status) status.textContent = "Your business enquiry has been received. Reference: " + result.receiptId + ". The NovaPharm team will review your message.";
      } catch {
        if (status) {
          status.replaceChildren();
          status.append(document.createTextNode("We could not confirm that your enquiry was received. Please try again or email "));
          const link = document.createElement("a");
          link.href = "mailto:vishal@novapharmhealthcare.com";
          link.textContent = "vishal@novapharmhealthcare.com";
          status.append(link, document.createTextNode("."));
        }
      } finally {
        clearTimeout(deadline);
        if (submit) submit.disabled = false;
      }
    });
  }
}
