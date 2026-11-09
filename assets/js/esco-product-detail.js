/* ESCO Anand product detail: customer-facing guide only, never a payment surface.
 * All 373 illustrations are original placeholders unless a supplier catalogue
 * photo is model-matched. Item-specific photo rights and variants remain pending.
 */
const page = document.querySelector("[data-esco-detail-page]");
const BAG_KEY = "novapharm-esco-quote-list-v1";
const MAX_LINES = 12;
const MAX_QTY = 1000;
const ITEM_ID = /^ESCO-CAT-[0-9]{4}$/;
const PHOTO_PATH = /^\/assets\/media\/esco\/esco-p[0-9]{2}-image[0-9]{2}\.webp$/;
const PREVIEW_PATH = /^\/assets\/media\/esco\/previews\/esco-cat-[0-9]{4}\.svg$/;
const GBP = new Intl.NumberFormat("en-GB", {style:"currency",currency:"GBP"});
const el = (name) => page?.querySelector("[data-esco-detail-" + name + "]");
function showMessage(message, isError = false) {
  const node = el("status");
  if (node) { node.textContent = message; node.dataset.error = String(isError); }
}
function loadBag() {
  const stored = localStorage.getItem(BAG_KEY);
  const data = stored ? JSON.parse(stored) : [];
  if (!Array.isArray(data)) throw Error("Invalid Bag content");
  const seen = new Set();
  const clean = [];
  for (const line of data) {
    if (clean.length >= MAX_LINES) break;
    if (!ITEM_ID.test(line?.id || "") || seen.has(line.id) ||
        !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QTY) continue;
    seen.add(line.id);
    clean.push({id: line.id,quantity: line.quantity});
  }
  return clean;
}
function safeImage(img, url, alt) {
  if (img) {
    img.src = url; img.alt = alt;
    img.width = 640; img.height = 420;
    img.loading = "eager"; img.decoding = "async"; img.hidden = false;
  }
}
async function boot() {
  if (!page) return;
  const id = new URLSearchParams(location.search).get("id") || "";
  const add = el("add");
  if (add) add.disabled = true;
  if (!ITEM_ID.test(id)) {
    showMessage("Choose a valid product from the ESCO catalogue.", true);
    return;
  }
  const [catalogueResponse, guidesResponse, imagesResponse] = await Promise.all([
    fetch("/assets/data/esco-catalogue.json", {credentials:"omit",cache:"no-store"}),
    fetch("/assets/data/esco-uk-guide-prices.json", {credentials:"omit",cache:"no-store"}),
    fetch("/assets/data/esco-model-photo-map.json", {credentials:"omit",cache:"no-store"})
  ]);
  if (![catalogueResponse,guidesResponse,imagesResponse].every((res) => res.ok))
    throw Error("The latest product details could not be loaded.");
  const [catalogue,guides,photos] = await Promise.all([
    catalogueResponse.json(),guidesResponse.json(),imagesResponse.json()
  ]);
  if (catalogue?.entriesTotal !== 373 || guides?.entriesTotal !== 373 ||
      guides?.checkoutEnabled !== false || guides?.paymentCollectionEnabled !== false ||
      guides?.requestQuoteOnly !== true || photos?.mappedImagesCount !== 61)
    throw Error("The ESCO catalogue approval status cannot be verified.");
  const rows = catalogue.categories.flatMap((category) =>
    category.entries.map((item) => ({...item,category:category.name})));
  if (rows.length !== 373 || new Set(rows.map((item) => item.id)).size !== 373)
    throw Error("ESCO catalogue identity validation failed.");
  const item = rows.find((row) => row.id === id);
  const guide = guides.guidePrices?.[id];
  if (!item || !guide || !Number.isFinite(guide.guidePriceExVatGbp) ||
      guide.guidePriceExVatGbp <= 0 || guide.priceApprovedForCheckout !== false ||
      guide.checkoutEligible !== false)
    throw Error("This product is not currently available for an approved sale.");
  const title = el("title"), category = el("category"), model = el("model"),
    price = el("price"), ref = el("reference"), photoNote = el("photo-note");
  if (title) title.textContent = item.name;
  if (category) category.textContent = item.category + " / " + item.subcategory;
  if (model) model.textContent = item.model ? "ESCO " + item.model : "Exact model or variant to confirm";
  if (price) price.textContent = GBP.format(guide.guidePriceExVatGbp);
  if (ref) ref.textContent = id + " · 2026 source catalogue index p. " + item.sourceIndexPage;
  const mappedPhoto = photos.images?.[id];
  const exactModelPhoto = mappedPhoto?.model === item.model &&
    PHOTO_PATH.test(mappedPhoto?.path || "");
  const preview = guides.visualPreviews?.[id];
  if (!PREVIEW_PATH.test(preview || "")) throw Error("A product preview is missing.");
  const primary = el("image");
  if (exactModelPhoto) {
    safeImage(primary,mappedPhoto.path,"ESCO source catalogue photograph associated with " + item.model);
    if (photoNote) photoNote.textContent = "Model-code-matched supplier catalogue photograph. Exact variant and online image-use rights await confirmation.";
  } else {
    safeImage(primary,preview,"Original illustrative preview of " + item.name + ", not a manufacturer photograph");
    if (photoNote) photoNote.textContent = "Original product-type illustration. This is not an exact manufacturer photograph or an approved product representation.";
  }
  const quote = el("quote");
  if (quote) {
    quote.href = "/contact/?enquiry=" + encodeURIComponent("ESCO Anand equipment") + "&quote=" +
      encodeURIComponent("ESCO Anand UK quotation request (catalogue 2026). Items: " + id +
      " qty 1. Please confirm model, variant, supplier photograph, UK compliance, VAT, delivered price and lead time.");
  }
  document.title = item.name + " | ESCO Anand | NovaPharm";
  if (add) add.disabled = false;
  if (add) add.addEventListener("click", () => {
    const quantity = Number(el("quantity")?.value);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
      showMessage("Enter a whole-number quantity from 1 to 1,000.", true); return;
    }
    try {
      const bag = loadBag();
      const idx = bag.findIndex((line) => line.id === id);
      if (idx < 0 && bag.length >= MAX_LINES) {
        showMessage("Your Bag already holds 12 product types. Review it before adding more.", true); return;
      }
      if (idx < 0) bag.push({id,quantity});
      else bag[idx] = {id,quantity};
      localStorage.setItem(BAG_KEY,JSON.stringify(bag));
      showMessage(quantity + " unit" + (quantity === 1 ? "" : "s") + " saved to your Bag. A final quotation is required before purchase.");
    } catch {
      showMessage("Your browser could not save the Bag. Use the request-quote link instead.",true);
    }
  });
  showMessage("Review the estimate, select a quantity and add this product to your Bag.");
}
if (page) boot().catch((error) => {
  showMessage(error?.message || "Product details could not load. Return to the catalogue.",true);
});
