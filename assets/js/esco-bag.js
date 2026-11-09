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
const ESCO_PAYMENT_CONFIG = "/assets/data/esco-checkout-config.json";
let checkoutApiOrigin = "";
let approvedCatalogIds = new Set();
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
  paymentServiceReady = approvedCatalogIds.size > 0;
}
function renderPaymentEligibility(lines) {
  if (!checkoutButton || !termsCheckbox) return;
  const approved = paymentServiceReady && lines.length > 0 && lines.every(item => approvedCatalogIds.has(item.id));
  checkoutButton.disabled = !approved || !termsCheckbox.checked || sendingPayment;
  if (checkoutNote) checkoutNote.textContent = approved
    ? "Secure card checkout is available for these approved items. Final VAT and delivery details are confirmed before payment."
    : "Card checkout is available only for individually approved, UK-saleable items. Your Bag can still be submitted for a confirmed quotation.";
}
async function startCheckout(lines) {
  if (sendingPayment || !checkoutApiOrigin || !paymentServiceReady || !termsCheckbox?.checked ||
      !lines.length || !lines.every(item => approvedCatalogIds.has(item.id))) return;
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
const MAX_QTY = 1000;
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
async function init() {
  if (!itemsRoot || !send || !totalNode) return;
  itemsRoot.replaceChildren(node("p", "Loading your Bag…", "esco-bag-message"));
  const [catalogueResponse, pricesResponse, photosResponse] = await Promise.all([
    fetch("/assets/data/esco-catalogue.json", { credentials: "omit", cache: "no-store" }),
    fetch("/assets/data/esco-uk-guide-prices.json", { credentials: "omit", cache: "no-store" }),
    fetch("/assets/data/esco-model-photo-map.json", { credentials: "omit", cache: "no-store" })
    fetch("/assets/data/esco-catalogue.json", { credentials: "omit", cache: "no-store" }),
    fetch("/assets/data/esco-uk-guide-prices.json", { credentials: "omit", cache: "no-store" })
  ]);
  if (!catalogueResponse.ok || !pricesResponse.ok) throw new Error("The ESCO catalogue could not load");
  const [catalogue, priceData, photos] = await Promise.all([
    catalogueResponse.json(), pricesResponse.json(), photosResponse.ok ? photosResponse.json() : Promise.resolve({images:{}})
  ]);
  if (catalogue?.entriesTotal !== 373 || priceData?.entriesTotal !== 373 ||
      priceData?.checkoutEnabled !== false || priceData?.paymentCollectionEnabled !== false ||
      priceData?.requestQuoteOnly !== true) throw new Error("This Bag cannot verify safe ESCO catalogue authority");
  const all = catalogue.categories.flatMap((category) => category.entries);
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
      const unitPennies = Math.round(guide.guidePriceExVatGbp * 100);
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
        node("p", (p.model ? "ESCO " + p.model : "Model to confirm") + " · " + item.id, "esco-shopping-model"),
        node("p", pictureInfo?.note || "Exact product imagery to be confirmed", "esco-shopping-provenance"),
        node("p", "Guide " + GBP.format(unitPennies / 100) + " per unit · ex VAT", "esco-shopping-unitprice")
      );
      const controls = node("div", "", "esco-bag-row-controls");
      const label = node("label", "Quantity", "esco-shopping-qty-label");
      const qty = document.createElement("select");
      const choices = new Set([1,2,3,4,5,6,7,8,9,10,12,24,48,100,250,500,1000,item.quantity]);
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
        node("small", "Guide total · ex VAT", "esco-shopping-line-note"));
      content.append(controls);
      article.append(pictureBox,content,linePrice);
      itemsRoot.append(article);
    }
    if (itemCountNode) itemCountNode.textContent = unitCount + (unitCount === 1 ? " item" : " items");
    totalNode.textContent = GBP.format(pennies / 100);
    const lines = state.map((item) => item.id + " qty " + item.quantity);
    const quote = "ESCO Anand UK quotation request (catalogue 2026). Items: " + lines.join("; ") +
      ". Please confirm exact variant, UK compliance, selling price, applicable VAT, delivery and lead time.";
    send.href = "/contact/?enquiry=Distribution%20partnership&quote=" + encodeURIComponent(quote);
    send.setAttribute("aria-disabled", state.length ? "false" : "true");
    send.tabIndex = state.length ? 0 : -1;
    saveBag(state);
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