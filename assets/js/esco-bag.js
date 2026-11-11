/* Customer-first ESCO Bag. All prices are non-binding estimates.
 * Browser prices never authorise a charge. A separately deployed AWS service
 * can enable Stripe-hosted checkout only for individually verified UK SKUs.
 * Card details are collected by Stripe, never by this static page.
 */
const BAG_KEY = "novapharm-esco-quote-list-v1";
const itemsRoot = document.querySelector("[data-esco-bag-items]");
const totalNode = document.querySelector("[data-esco-bag-total]");
const send = document.querySelector("[data-esco-bag-quote]");
const itemCountNode = document.querySelector("[data-esco-bag-count]");
const checkoutButton = document.querySelector("[data-esco-card-checkout]");
const termsCheckbox = document.querySelector("[data-esco-payment-terms]");
const checkoutNote = document.querySelector("#esco-payment-note");
const checkoutResult = document.querySelector("[data-esco-checkout-status]");
const orderRequestForm = document.querySelector("[data-esco-order-request-form]");
const orderRequestSubmit = document.querySelector("[data-esco-order-request-submit]");
const orderRequestReceipt = document.querySelector("[data-esco-order-request-receipt]");
const boqExportButton = document.querySelector("[data-esco-export-boq]");
const requestLookupForm = document.querySelector("[data-esco-request-lookup]");
const requestLookupInput = document.querySelector("[data-esco-request-id]");
const requestLookupState = document.querySelector("[data-esco-request-state]");
const REQUEST_REF = /^ESCO-REQ-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let sendingOrderRequest = false;
let draftRequestId = null;
const termsLabel = termsCheckbox?.closest(".esco-payment-terms");
if (checkoutNote && termsLabel) termsLabel.before(checkoutNote);
const readyShopLink = (() => {
  if (!checkoutNote) return null;
  const link = document.createElement("a");
  link.className = "esco-ready-shop-link";
  link.href = "/products/esco/?availability=ready#esco-catalogue";
  link.textContent = "Browse products ready for secure checkout ›";
  link.hidden = true;
  checkoutNote.after(link);
  return link;
})();
const ESCO_PAYMENT_CONFIG = "/assets/data/esco-checkout-config.json";
let checkoutApiOrigin = "";
let approvedCatalogIds = new Set();
let approvedUnitPricesPence = new Map();
let paymentServiceReady = false;
let sendingPayment = false;
function checkoutStatus(text) {
  if (checkoutResult) { checkoutResult.textContent = text; checkoutResult.hidden = !text; }
}
async function configurePayment() {
  if (!checkoutButton || !termsCheckbox) return;
  const configResponse = await fetch(ESCO_PAYMENT_CONFIG, { credentials:"omit",cache:"no-store" });
  if (!configResponse.ok) return;
  const cfg = await configResponse.json();
  if (cfg?.enabled !== true || typeof cfg.api_origin !== "string") return;
  let url;
  try { url = new URL(cfg.api_origin); } catch { return; }
  if (url.protocol !== "https:" || !/^[a-z0-9]+\.execute-api\.eu-north-1\.amazonaws\.com$/.test(url.hostname) || url.pathname !== "/") return;
  checkoutApiOrigin = url.origin;
  const response = await fetch(checkoutApiOrigin + "/readiness", { credentials:"omit",cache:"no-store", headers:{"accept":"application/json"} });
  if (!response.ok) return;
  const readiness = await response.json();
  if (readiness?.checkout_ready !== true || readiness?.payment_collection_active !== true ||
      !Array.isArray(readiness?.approved_catalogue_ids)) return;
  approvedCatalogIds = new Set(readiness.approved_catalogue_ids.filter(id=>/^ESCO-CAT-[0-9]{4}$/.test(id)));
  const serverPrices = readiness.approved_unit_prices_pence || {};
  approvedUnitPricesPence = new Map([...approvedCatalogIds].filter(id=>
    Number.isSafeInteger(serverPrices[id]) && serverPrices[id]>0 && serverPrices[id]<=99999999
  ).map(id=>[id,serverPrices[id]]));
  paymentServiceReady = approvedCatalogIds.size > 0 && approvedUnitPricesPence.size === approvedCatalogIds.size;
}
function reportRequestState(message) {
  if (!requestLookupState) return;
  requestLookupState.textContent = message;
  requestLookupState.hidden = !message;
}
async function checkOrderRequestStatus(rawReference) {
  const provided = String(rawReference || "").trim();
  const orderId = /^esco-req-/i.test(provided)
    ? "ESCO-REQ-" + provided.slice(9).toLowerCase() : "";
  if (!REQUEST_REF.test(orderId)) {
    reportRequestState("Enter a valid ESCO-REQ receipt reference.");
    return;
  }
  if (!checkoutApiOrigin) {
    reportRequestState("The order status service is temporarily unavailable. Keep your reference and contact product support.");
    return;
  }
  reportRequestState("Checking your order request…");
  try {
    const response = await fetch(checkoutApiOrigin + "/order-request-status/" + encodeURIComponent(orderId), {
      credentials: "omit", cache: "no-store", headers: {accept: "application/json"}
    });
    if (!response.ok) {
      reportRequestState(response.status === 404
        ? "Request not found. Check the reference and try again."
        : "Order status is temporarily unavailable. Your receipt is still valid.");
      return;
    }
    const info = await response.json();
    const descriptions = {
      RECEIVED_AWAITING_CONFIRMATION: "Received. Our team must confirm the product, price, availability and delivery.",
      AWAITING_CUSTOMER_ACCEPTANCE: "Awaiting customer acceptance of confirmed terms.",
      ACCEPTED_AWAITING_PAYMENT: "Accepted and awaiting a separate authorised payment instruction.",
      CANCELLED: "Cancelled. Contact product support if you need assistance."
    };
    if (info.orderId !== orderId || info.paymentCollected !== false ||
        !Object.hasOwn(descriptions, info.status)) throw new Error("Unrecognised order status");
    reportRequestState(orderId + ": " + descriptions[info.status] + " No payment has been collected for this request.");
  } catch {
    reportRequestState("Unable to confirm the request status right now. Keep your receipt reference.");
  }
}
function renderPaymentEligibility(lines) {
  if (!checkoutButton || !termsCheckbox) return;
  const eligible = paymentServiceReady && lines.length > 0 &&
    lines.every(item => approvedCatalogIds.has(item.id) && approvedUnitPricesPence.has(item.id) && item.quantity <= MAX_CARD_QTY);
  const quoteOnly = paymentServiceReady
    ? lines.filter(item => !approvedCatalogIds.has(item.id) || !approvedUnitPricesPence.has(item.id) || item.quantity > MAX_CARD_QTY)
    : [];
  // A disabled payment button for quote-only products creates a dead end.
  // Show exactly one primary purchase path: Stripe for approved goods or
  // a confirmed order request for every other catalogue reference.
  if (termsLabel) termsLabel.hidden = !eligible;
  checkoutButton.hidden = !eligible;
  checkoutButton.disabled = !eligible || !termsCheckbox.checked || sendingPayment;
  if (orderRequestForm) orderRequestForm.hidden = eligible || !lines.length;
  if (orderRequestSubmit) orderRequestSubmit.disabled = sendingOrderRequest || !lines.length;
  if (send) {
    send.textContent = eligible ? "Contact product support" : "Contact sales";
    send.classList.remove("esco-order-request-primary");
  }
  if (checkoutNote) {
    if (!paymentServiceReady) {
      checkoutNote.textContent = "You can submit an order request for any product. Card payment is available only where a fixed UK-delivered price is authorised.";
    } else if (lines.length === 0) {
      checkoutNote.textContent = "Add products to your Bag to submit an order request or use immediate card payment for approved items.";
    } else if (quoteOnly.length) {
      const codes = quoteOnly.map(item => item.id).join(", ");
      checkoutNote.textContent = "Submit your order request below. " + quoteOnly.length +
        (quoteOnly.length === 1 ? " selected reference (" : " selected references (") +
        codes + ") require product and delivery confirmation before payment.";
    } else {
      checkoutNote.textContent = "These prices include UK delivery, excluding VAT. Stripe confirms the final VAT and total before your card is charged.";
    }
  }
  if (readyShopLink) readyShopLink.hidden = !paymentServiceReady || quoteOnly.length === 0;
}
async function startCheckout(lines) {
  if (sendingPayment || !checkoutApiOrigin || !paymentServiceReady || !termsCheckbox?.checked ||
      !lines.length || !lines.every(item => approvedCatalogIds.has(item.id) && item.quantity <= MAX_CARD_QTY)) return;
  sendingPayment = true;
  renderPaymentEligibility(lines);
  checkoutStatus("Connecting securely to payment…");
  try {
    const response = await fetch(checkoutApiOrigin + "/checkout", {
      method:"POST", credentials:"omit",
      headers:{"content-type":"application/json"},
      body: JSON.stringify({request_id:crypto.randomUUID(), accept_terms:true,
        lines:lines.map(item=>({id:item.id, quantity:item.quantity}))})
    });
    if (!response.ok) throw new Error("This order needs a confirmed product quotation before payment.");
    const data = await response.json();
    const redirect = new URL(data.checkoutUrl);
    if (redirect.protocol !== "https:" || redirect.hostname !== "checkout.stripe.com") throw new Error("Invalid secure payment destination.");
    window.location.assign(redirect.href);
  } catch (err) {
    checkoutStatus(err instanceof Error ? err.message : "Secure checkout is currently unavailable.");
    sendingPayment = false;
    renderPaymentEligibility(lines);
  }
}
async function checkPaymentReturn() {
  if (!checkoutApiOrigin) return;
  const query = new URLSearchParams(window.location.search);
  const order = query.get("order_id") || "";
  if (query.get("checkout") === "cancelled") { checkoutStatus("Payment was not completed. Your Bag is saved."); return; }
  if (query.get("checkout") !== "return" || !/^ESCO-[0-9a-f-]{36}$/.test(order)) return;
  checkoutStatus("Your payment is being verified securely. Please do not place a duplicate order.");
  try {
    const response=await fetch(checkoutApiOrigin + "/status/" + encodeURIComponent(order),{credentials:"omit",cache:"no-store"});
    if(!response.ok)return;
    const info=await response.json();
    if(info.paid === true && info.status === "PAID"){
      checkoutStatus("Payment confirmed. Your order reference is " + order + ". Our team will confirm fulfilment.");
    }else if(info.status === "PAYMENT_FAILED"){
      checkoutStatus("Payment was not completed. Your Bag is saved for another attempt.");
    }
  } catch { /* Do not mistake the return redirect for proof of payment. */ }
}
const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const MAX_ITEMS = 12;
const MAX_QTY = 10000;
const MAX_CARD_QTY = 1000;
const validId = (id) => typeof id === "string" && /^ESCO-CAT-[0-9]{4}$/.test(id);
function loadBag() {
  try {
    const data = JSON.parse(localStorage.getItem(BAG_KEY) || "[]");
    if (!Array.isArray(data)) return [];
    const seen = new Set();
    return data.slice(0, MAX_ITEMS).filter((item) => {
      if (!validId(item?.id) || seen.has(item.id) ||
          !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QTY) return false;
      seen.add(item.id); return true;
    });
  } catch { return []; }
}
function saveBag(state) {
  try { localStorage.setItem(BAG_KEY, JSON.stringify(state)); } catch {}
}
function node(tag, content, classname = "") {
  const element = document.createElement(tag);
  element.textContent = content;
  if (classname) element.className = classname;
  return element;
}
// CSV stays on the buyer's device: no supplier email, payment, customer data or public API call.
function downloadBoq(lines, known, categoryNameById) {
  const headers = ["ESCO catalogue reference", "NovaPharm internal SKU", "Manufacturer",
    "ESCO manufacturer model", "Product", "Category", "Quantity",
    "Exact specification / size / variant (buyer to complete)",
    "Delivery requirement / location (buyer to complete)"];
  const rows = lines.filter(item => known.has(item.id)).map(item => {
    const product = known.get(item.id);
    return [item.id, "NP-ESCO-" + item.id.slice(-4), "Eastern Surgical Company (ESCO)",
      product.model || "", product.name, categoryNameById.get(item.id) || "", item.quantity, "", ""];
  });
  if (!rows.length) return;
  const safeCsv = value => {
    let cell = String(value ?? "").replace(/[\r\n]+/g, " ");
    if (/^\s*[=+@\t]/.test(cell) || /^\s*-(?!\d)/.test(cell)) cell = "'" + cell;
    return '"' + cell.replaceAll('"', '""') + '"';
  };
  const csv = [headers, ...rows].map(row => row.map(safeCsv).join(",")).join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = "novapharm-esco-bill-of-quantities.csv";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
async function init() {
  if (!itemsRoot || !send || !totalNode) return;
  itemsRoot.replaceChildren(node("p", "Loading your Bag…", "esco-bag-message"));
  const [catalogueResponse, pricesResponse, photosResponse] = await Promise.all([
    fetch("/assets/data/esco-catalogue.json", { credentials: "omit", cache: "no-store" }),
    fetch("/assets/data/esco-uk-guide-prices.json", { credentials: "omit", cache: "no-store" }),
    fetch("/assets/data/esco-model-photo-map.json", { credentials: "omit", cache: "no-store" })
  ]);
  if (!catalogueResponse.ok || !pricesResponse.ok) throw new Error("The ESCO catalogue could not load");
  const [catalogue, priceData, photos] = await Promise.all([
    catalogueResponse.json(), pricesResponse.json(), photosResponse.ok ? photosResponse.json() : Promise.resolve({images:{}})
  ]);
  if (catalogue?.entriesTotal !== 373 || priceData?.entriesTotal !== 373 ||
      priceData?.checkoutEnabled !== false || priceData?.paymentCollectionEnabled !== false ||
      priceData?.requestQuoteOnly !== true) throw new Error("This Bag cannot verify safe ESCO catalogue authority");
  const all = catalogue.categories.flatMap((category) => category.entries);
  const categoryNameById = new Map(catalogue.categories.flatMap(category =>
    category.entries.map(product => [product.id, category.name])));

  const known = new Map(all.map(p => [p.id, p]));
  if (known.size !== 373) throw new Error("Duplicate catalogue item");
  let state = loadBag().filter(item => known.has(item.id) && Number.isFinite(priceData.guidePrices?.[item.id]?.guidePriceExVatGbp));
  function productImage(id, product) {
    const manufacturer = photos?.images?.[id];
    if (manufacturer?.model === product.model &&
        /^\/assets\/media\/esco\/esco-p[0-9]{2}-image[0-9]{2}\.webp$/.test(manufacturer.path)) {
      return {src: manufacturer.path, alt: "Catalogue photograph associated with " + product.name,
        note: "Supplier catalogue photo · exact variant to confirm"};
    }
    const illustration = priceData?.visualPreviews?.[id];
    if (typeof illustration === "string" &&
        /^\/assets\/media\/esco\/previews\/esco-cat-[0-9]{4}\.svg$/.test(illustration)) {
      return {src:illustration, alt:"Illustrative product preview for " + product.name,
        note:"Product illustration · not an exact supplier photograph"};
    }
    return null;
  }
  function render() {
    itemsRoot.replaceChildren();
    if (!state.length) itemsRoot.append(node("p", "Your Bag is empty. Explore the ESCO range to add products.", "esco-bag-message"));
    let pennies = 0;
    let unitCount = 0;
    for (const item of state) {
      const p = known.get(item.id);
      const guide = priceData.guidePrices[item.id];
      const approvedPrice = paymentServiceReady && approvedCatalogIds.has(item.id) ? approvedUnitPricesPence.get(item.id) : null;
      const unitPennies = approvedPrice ?? Math.round(guide.guidePriceExVatGbp * 100);
      const linePennies = unitPennies * item.quantity;
      pennies += linePennies;
      unitCount += item.quantity;
      const article = document.createElement("article");
      article.className = "esco-bag-row esco-shopping-item";
      const pictureInfo = productImage(item.id, p);
      const pictureBox = node("div", "", "esco-shopping-picture");
      if (pictureInfo) {
        const pic = document.createElement("img");
        pic.src = pictureInfo.src; pic.alt = pictureInfo.alt;
        pic.loading = "lazy"; pic.decoding = "async";
        pic.width = 220; pic.height = 186;
        pictureBox.append(pic);
      } else {
        pictureBox.append(node("span", "ESCO", "esco-shopping-image-fallback"));
      }
      const content = node("div", "", "esco-shopping-product");
      content.append(
        node("h3", p.name, "esco-shopping-product-name"),
        node("p", (p.model ? "ESCO " + p.model : "Model to confirm") + " · NovaPharm SKU NP-ESCO-" + item.id.slice(-4) + " · " + item.id, "esco-shopping-model"),
        node("p", pictureInfo?.note || "Exact product imagery to be confirmed", "esco-shopping-provenance"),
        node("p", (approvedPrice ? "UK delivered price " : "Base price ") + GBP.format(unitPennies / 100) + " per unit · ex VAT", "esco-shopping-unitprice")
      );
      const controls = node("div", "", "esco-bag-row-controls");
      const label = node("label", "Quantity", "esco-shopping-qty-label");
      const qty = document.createElement("select");
      const choices = new Set([1,2,3,4,5,6,7,8,9,10,12,24,48,100,250,500,1000,2500,5000,10000,item.quantity]);
      for(const n of [...choices].sort((a,b)=>a-b)) {
        const opt = document.createElement("option");
        opt.value = String(n); opt.textContent = String(n);
        if (n === item.quantity) opt.selected = true;
        qty.append(opt);
      }
      qty.dataset.escoBagQty = item.id;
      qty.setAttribute("aria-label", "Quantity of " + p.name);
      label.append(qty);
      const remove = node("button", "Remove", "esco-shopping-remove");
      remove.type = "button"; remove.dataset.escoBagRemove = item.id;
      remove.setAttribute("aria-label", "Remove " + p.name + " from your Bag");
      controls.append(label, remove);
      const linePrice = node("div", "", "esco-shopping-line");
      linePrice.append(node("strong", GBP.format(linePennies / 100), "esco-shopping-line-total"),
        node("small", approvedPrice ? "UK delivery included · ex VAT" : "Base amount · delivery and VAT confirmed before acceptance", "esco-shopping-line-note"));
      content.append(controls);
      article.append(pictureBox,content,linePrice);
      itemsRoot.append(article);
    }
    if (itemCountNode) itemCountNode.textContent = unitCount + (unitCount === 1 ? " item" : " items");
    totalNode.textContent = GBP.format(pennies / 100);
    const allPayable = paymentServiceReady && state.length>0 &&
      state.every(item=>approvedCatalogIds.has(item.id) && approvedUnitPricesPence.has(item.id) && item.quantity <= MAX_CARD_QTY);
    const summaryTitle = document.querySelector(".esco-bag-totals dt");
    const deliverySummary = document.querySelector(".esco-bag-totals>div:nth-child(2) dd");
    const estimateTitle = document.querySelector(".esco-bag-estimate span");
    const estimateNote = document.querySelector(".esco-bag-estimate small");
    const financialNote = document.querySelector(".esco-bag-financial-note");
    if (summaryTitle) summaryTitle.textContent = allPayable ? "Order subtotal" : "Base subtotal";
    if (deliverySummary) deliverySummary.textContent = allPayable ? "Included" : "Calculated on approval";
    if (estimateTitle) estimateTitle.textContent = allPayable ? "UK delivered prices" : "Base prices";
    if (estimateNote) estimateNote.textContent = allPayable ? "Ex VAT · final tax shown at Stripe" : "Ex VAT and delivery · total confirmed before order acceptance";
    if (financialNote) financialNote.textContent = allPayable
      ? "Your selected items have fixed UK delivered prices. Stripe calculates applicable VAT and displays the final amount before payment."
      : "These merchant-approved base prices exclude delivery and VAT. Your order request is not a completed sale; the final amount is confirmed before acceptance.";
    const lines = state.map((item) => item.id + " qty " + item.quantity);
    const quote = "ESCO Anand UK quotation request (catalogue 2026). Items: " + lines.join("; ") +
      ". Please confirm exact variant, UK compliance, selling price, applicable VAT, delivery and lead time.";
    send.href = "/contact/?enquiry=Distribution%20partnership&quote=" + encodeURIComponent(quote);
    send.setAttribute("aria-disabled", state.length ? "false" : "true");
    send.tabIndex = state.length ? 0 : -1;
    saveBag(state);
    if (boqExportButton) boqExportButton.disabled = !state.length;
    renderPaymentEligibility(state);
  }
  itemsRoot.addEventListener("click", event => {
    const button = event.target.closest("[data-esco-bag-remove]");
    if (!button || !itemsRoot.contains(button)) return;
    state = state.filter(item => item.id !== button.dataset.escoBagRemove);
    render();
  });
  itemsRoot.addEventListener("change", event => {
    const input = event.target.closest("[data-esco-bag-qty]");
    if (!input || !itemsRoot.contains(input)) return;
    const qty = Number(input.value);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > MAX_QTY) { render(); return; }
    state = state.map(item => item.id === input.dataset.escoBagQty ? { ...item, quantity: qty } : item);
    render();
  });
  send.addEventListener("click", event => { if (!state.length) event.preventDefault(); });

  if (orderRequestForm) orderRequestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.length || sendingOrderRequest) return;
    if (!orderRequestForm.reportValidity()) return;
    if (!checkoutApiOrigin) {
      checkoutStatus("Order requests are temporarily unavailable. Use Contact product support.");
      return;
    }
    const fields = new FormData(orderRequestForm);
    const lines = state.map(item => ({id:item.id, quantity:item.quantity}));
    if (!draftRequestId) draftRequestId = crypto.randomUUID();
    sendingOrderRequest = true;
    renderPaymentEligibility(state);
    checkoutStatus("Submitting your order request securely…");
    try {
      const response = await fetch(checkoutApiOrigin + "/order-requests", {
        method:"POST",credentials:"omit",headers:{"content-type":"application/json"},
        body:JSON.stringify({
          request_id:draftRequestId,
          lines,
          customer:{
            name:String(fields.get("customer-name") || "").trim(),
            email:String(fields.get("customer-email") || "").trim(),
            organisation:String(fields.get("customer-organisation") || "").trim(),
            postcode:String(fields.get("customer-postcode") || "").trim()
          },
          accept_order_terms:fields.get("accept-order-terms") === "on",
          website:String(fields.get("website") || "")
        })
      });
      const receipt = await response.json().catch(() => ({}));
      if (response.status !== 202 || !/^ESCO-REQ-[0-9a-f-]{36}$/.test(receipt.orderId)) {
        throw new Error("We could not submit your order request. Your Bag is saved. Please try again or contact our team.");
      }
      const orderId = receipt.orderId;
      if (requestLookupInput) requestLookupInput.value = orderId;
      reportRequestState("Request received. Use this reference to check its status whenever needed.");
      state = [];
      saveBag(state);
      orderRequestForm.reset();
      draftRequestId = null;
      render();
      if (orderRequestReceipt) {
        orderRequestReceipt.textContent = "Order request received. Reference: " + orderId +
          ". No payment has been collected. We will confirm the exact products, availability, delivery, VAT and final amount before accepting the order.";
        orderRequestReceipt.hidden = false;
      }
      checkoutStatus("Request recorded. Keep your reference " + orderId + " for any follow-up.");
    } catch (error) {
      checkoutStatus(error instanceof Error ? error.message : "Order request is unavailable right now.");
    } finally {
      sendingOrderRequest = false;
      renderPaymentEligibility(state);
    }
  });
  if (boqExportButton) boqExportButton.addEventListener("click", () =>
    downloadBoq(state, known, categoryNameById));
  if (requestLookupForm) requestLookupForm.addEventListener("submit", event => {
    event.preventDefault();
    void checkOrderRequestStatus(requestLookupInput?.value);
  });
  if (termsCheckbox) termsCheckbox.addEventListener("change", () => renderPaymentEligibility(state));
  if (checkoutButton) checkoutButton.addEventListener("click", () => startCheckout(state));
  await configurePayment().catch(()=>{ paymentServiceReady=false; });
  render();
  await checkPaymentReturn();
}
init().catch(() => {
  if (itemsRoot) itemsRoot.replaceChildren(node("p", "Bag details are temporarily unavailable. Please use the ESCO enquiry link to contact our team.", "esco-bag-message"));
  if (send) { send.setAttribute("aria-disabled", "true"); send.tabIndex = -1; }
});