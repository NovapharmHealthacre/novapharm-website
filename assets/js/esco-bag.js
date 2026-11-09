/* Customer-first ESCO Bag. All prices are non-binding estimates.
 * This page never requests a Stripe session or accepts card information.
 * Only a trusted server may later enable checkout for approved, verified SKUs.
 */
const BAG_KEY = "novapharm-esco-quote-list-v1";
const itemsRoot = document.querySelector("[data-esco-bag-items]");
const totalNode = document.querySelector("[data-esco-bag-total]");
const send = document.querySelector("[data-esco-bag-quote]");
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
  const [catalogueResponse, pricesResponse, photoResponse] = await Promise.all([
    fetch("/assets/data/esco-catalogue.json", { credentials: "omit", cache: "no-store" }),
    fetch("/assets/data/esco-uk-guide-prices.json", { credentials: "omit", cache: "no-store" }),
    fetch("/assets/data/esco-model-photo-map.json", { credentials: "omit", cache: "no-store" })
  ]);
  if (!catalogueResponse.ok || !pricesResponse.ok || !photoResponse.ok) throw new Error("The ESCO catalogue could not load");
  const [catalogue, priceData, photoData] = await Promise.all([catalogueResponse.json(), pricesResponse.json(), photoResponse.json()]);
  if (catalogue?.entriesTotal !== 373 || priceData?.entriesTotal !== 373 ||
      priceData?.checkoutEnabled !== false || priceData?.paymentCollectionEnabled !== false ||
      priceData?.requestQuoteOnly !== true || photoData?.mappedImagesCount !== 61) throw new Error("This Bag cannot verify safe ESCO catalogue authority");
  const all = catalogue.categories.flatMap((category) => category.entries);
  const known = new Map(all.map(p => [p.id, p]));
  if (known.size !== 373) throw new Error("Duplicate catalogue item");
  let state = loadBag().filter(item => known.has(item.id) && Number.isFinite(priceData.guidePrices?.[item.id]?.guidePriceExVatGbp));
  function render() {
    itemsRoot.replaceChildren();
    if (!state.length) itemsRoot.append(node("p", "Your Bag is empty. Explore the ESCO range to add products.", "esco-bag-message"));
    let pennies = 0;
    for (const item of state) {
      const p = known.get(item.id);
      const guide = priceData.guidePrices[item.id];
      const unitPennies = Math.round(guide.guidePriceExVatGbp * 100);
      pennies += unitPennies * item.quantity;
      const article = document.createElement("article");
      article.className = "esco-bag-row";
      const detailUrl = "/products/esco/product/?id=" + encodeURIComponent(item.id);
      const photo = photoData.images?.[item.id];
      const matchedPhoto = photo?.model === p.model && /^\/assets\/media\/esco\/esco-p[0-9]{2}-image[0-9]{2}\.webp$/.test(photo?.path || "");
      const preview = priceData.visualPreviews?.[item.id];
      if (!/^\/assets\/media\/esco\/previews\/esco-cat-[0-9]{4}\.svg$/.test(preview || ""))
        throw new Error("A selected product has no approved preview");
      const visualLink = document.createElement("a");
      visualLink.href = detailUrl;
      visualLink.className = "esco-bag-thumb";
      visualLink.setAttribute("aria-label", "View " + p.name + " details");
      const visual = document.createElement("img");
      visual.src = matchedPhoto ? photo.path : preview;
      visual.width = 110; visual.height = 84;
      visual.loading = "lazy"; visual.decoding = "async";
      visual.alt = matchedPhoto ? "ESCO catalogue photo associated with " + p.model : "Original illustrative product preview of " + p.name;
      visualLink.append(visual);
      const text = document.createElement("div");
      text.className = "esco-bag-text";
      const title = node("a", p.name, "esco-bag-name");
      title.href = detailUrl;
      text.append(title, node("p", item.id + " · " + (p.model || "Variant to confirm"), "esco-bag-meta"),
        node("p", GBP.format(unitPennies / 100) + " guide per unit · ex VAT", "esco-bag-meta"),
        node("p", matchedPhoto ? "Supplier catalogue image · variant unconfirmed" : "Original concept image · not a manufacturer photo", "esco-bag-image-meta"));
      const controls = document.createElement("div");
      controls.className = "esco-bag-row-controls";
      const label = node("label", "Quantity");
      const qty = document.createElement("input");
      qty.type = "number"; qty.min = "1"; qty.max = "1000"; qty.step = "1"; qty.value = String(item.quantity);
      qty.dataset.escoBagQty = item.id; qty.setAttribute("aria-label", "Quantity for " + p.name);
      label.append(qty);
      const remove = node("button", "Remove");
      remove.type = "button"; remove.dataset.escoBagRemove = item.id;
      controls.append(label, remove);
      article.append(visualLink, text, controls);
      itemsRoot.append(article);
    }
    totalNode.textContent = GBP.format(pennies / 100);
    const lines = state.map((item) => item.id + " qty " + item.quantity);
    const quote = "ESCO Anand UK quotation request (catalogue 2026). Items: " + lines.join("; ") +
      ". Please confirm exact variant, UK compliance, selling price, applicable VAT, delivery and lead time.";
    send.href = "/contact/?enquiry=Distribution%20partnership&quote=" + encodeURIComponent(quote);
    send.setAttribute("aria-disabled", state.length ? "false" : "true");
    send.tabIndex = state.length ? 0 : -1;
    saveBag(state);
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
  render();
}
init().catch(() => {
  if (itemsRoot) itemsRoot.replaceChildren(node("p", "Bag details are temporarily unavailable. Please use the ESCO enquiry link to contact our team.", "esco-bag-message"));
  if (send) { send.setAttribute("aria-disabled", "true"); send.tabIndex = -1; }
});