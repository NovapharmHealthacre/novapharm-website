/* NovaPharm public Nutraxin storefront.
 * Public catalogue is presentation data only. Never use browser totals to authorise a payment.
 * Retail checkout remains fail-closed until a trusted server creates a priced, verified order.
 */
export const BAG_KEY = "novapharm.nutraxin.public-bag.v1";
export const MAX_PER_SKU = 99;
const CATALOGUE_URL = "/assets/data/nutraxin-retail-catalogue.json";
const BAG_URL = "/products/nutraxin/bag/";
const SHOP_URL = "/products/nutraxin/";

export function safeBasket(items, catalogueProducts) {
  const allowed = new Set(catalogueProducts.map((product) => product.sku));
  if (!Array.isArray(items)) return [];
  const result = [];
  const seen = new Set();
  for (const item of items) {
    const sku = typeof item?.sku === "string" ? item.sku : "";
    const quantity = item?.quantity;
    if (!allowed.has(sku) || seen.has(sku) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_PER_SKU) continue;
    seen.add(sku);
    result.push({ sku, quantity });
  }
  return result.slice(0, allowed.size);
}

export function catalogueIsSafe(data) {
  if (!data || data.currency !== "GBP" || !Array.isArray(data.products) || data.products.length !== 19) return false;
  const seen = new Set();
  for (const p of data.products) {
    if (!p || !/^NUT-UK-[A-Z0-9-]+$/.test(p.sku) || !/^[a-z0-9-]+$/.test(p.slug) ||
        typeof p.name !== "string" || p.name.length < 3 || typeof p.pack !== "string" || seen.has(p.sku)) return false;
    seen.add(p.sku);
  }
  return true;
}

export function publicPrice(product, data) {
  // Explicit owner-authorised guide display is separate from payment authorisation.
  const viewable = data?.price_authority === "approved_consumer_retail" ||
    (data?.price_authority === "owner_authorized_provisional_public_display" &&
      data?.checkout_enabled === false && data?.payment_collection_enabled === false &&
      data?.price_includes_estimated_uk_vat === true && data?.vat_estimate_rate_percent === 20);
  if (!viewable || !Number.isSafeInteger(product?.retail_price_pence) || product.retail_price_pence < 1) return null;
  return product.retail_price_pence;
}

export function basketSubtotal(bag, data) {
  if (!catalogueIsSafe(data) || !bag.length) return null;
  const map = new Map(data.products.map((p) => [p.sku, p]));
  let amount = 0;
  for (const { sku, quantity } of bag) {
    const item = map.get(sku);
    const price = publicPrice(item, data);
    if (price === null || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_PER_SKU) return null;
    amount += price * quantity;
    if (!Number.isSafeInteger(amount)) return null;
  }
  return amount;
}

export const formatGBP = (pence) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

function make(tag, className, value) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (value !== undefined) el.textContent = value;
  return el;
}
function anchor(text, href, className) {
  const a = make("a", className, text);
  a.href = href;
  return a;
}
function loadBag(data) {
  try { return safeBasket(JSON.parse(localStorage.getItem(BAG_KEY) || "[]"), data.products); }
  catch { return []; }
}
function saveBag(items) {
  try { localStorage.setItem(BAG_KEY, JSON.stringify(items)); }
  catch { /* Bag still works in this tab if storage is disabled. */ }
}
function count(items) { return items.reduce((sum, item) => sum + item.quantity, 0); }
function productUrl(product) { return SHOP_URL + product.slug + "/"; }
function productPriceLabel(product, data) {
  const pence = publicPrice(product, data);
  return pence === null ? "Price pending" : formatGBP(pence);
}
function toast(message) {
  const old = document.querySelector(".nx-store-toast");
  if (old) old.remove();
  const n = make("div", "nx-store-toast", message);
  n.setAttribute("role", "status");
  document.body.append(n);
  window.setTimeout(() => n.remove(), 2600);
}
function installStyle() {
  if (document.querySelector('[data-nx-retail-css]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/assets/css/nutraxin-retail-store.css";
  link.dataset.nxRetailCss = "true";
  document.head.append(link);
}

function runStore(data) {
  let bag = loadBag(data);
  const productMap = new Map(data.products.map((p) => [p.sku, p]));
  const slugMap = new Map(data.products.map((p) => [p.slug, p]));
  const updateNav = () => {
    for (const item of document.querySelectorAll("[data-nx-bag-count]")) item.textContent = String(count(bag));
  };
  const put = (sku, qty) => {
    if (!productMap.has(sku) || !Number.isSafeInteger(qty) || qty < 1 || qty > MAX_PER_SKU) return;
    const existing = bag.find((item) => item.sku === sku);
    bag = safeBasket([...bag.filter((item) => item.sku !== sku), { sku, quantity: Math.min(MAX_PER_SKU, (existing?.quantity || 0) + qty) }], data.products);
    saveBag(bag);
    updateNav();
    toast("Added to bag. Review your selection when you're ready.");
  };
  const top = document.querySelector("main");
  if (!top) return;
  document.body.classList.add("nx-retail-store");
  const nav = make("div", "nx-store-topbar");
  nav.append(anchor("Explore Nutraxin", SHOP_URL));
  const bagNav = anchor("Bag", BAG_URL, "nx-store-bag-link");
  const tally = make("span", null, String(count(bag)));
  tally.dataset.nxBagCount = "true";
  bagNav.append(" (", tally, ")");
  nav.append(bagNav);
  top.insertAdjacentElement("beforebegin", nav);

  const path = window.location.pathname;
  if (path === BAG_URL || path === BAG_URL.slice(0, -1)) {
    const container = document.querySelector("[data-nx-public-bag]");
    if (container) {
      const render = () => {
        const list = container.querySelector("[data-nx-bag-items]");
        const subtotal = container.querySelector("[data-nx-bag-subtotal]");
        const shipping = container.querySelector("[data-nx-bag-delivery]");
        const tax = container.querySelector("[data-nx-bag-tax]");
        const grand = container.querySelector("[data-nx-bag-total]");
        const checkout = container.querySelector("[data-nx-checkout]");
        const explanation = container.querySelector("[data-nx-checkout-note]");
        list.replaceChildren();
        if (!bag.length) {
          list.append(make("p", "nx-bag-empty", "Your bag is empty. Explore the collection and add products to get started."));
        }
        for (const line of bag) {
          const p = productMap.get(line.sku);
          if (!p) continue;
          const item = make("article", "nx-bag-item");
          const image = make("img");
          image.src = p.image; image.alt = p.name + " pack"; image.loading = "lazy"; image.width = 96; image.height = 96;
          const details = make("div");
          const name = make("h2", null, p.name);
          const pack = make("p", "nx-bag-pack", p.pack);
          const price = make("p", "nx-bag-price", productPriceLabel(p, data));
          const label = make("label", null, "Quantity");
          const select = make("select");
          select.setAttribute("aria-label", "Quantity for " + p.name);
          for (let i = 1; i <= MAX_PER_SKU; i++) {
            const opt = make("option", null, String(i));
            opt.value = String(i); opt.selected = i === line.quantity;
            select.append(opt);
          }
          select.addEventListener("change", () => {
            bag = bag.map((v) => v.sku === p.sku ? { sku: p.sku, quantity: Number(select.value) } : v);
            saveBag(bag); updateNav(); render();
          });
          label.append(select);
          const remove = make("button", "nx-bag-remove", "Remove");
          remove.type = "button";
          remove.addEventListener("click", () => {
            bag = bag.filter((v) => v.sku !== p.sku);
            saveBag(bag); updateNav(); render();
          });
          details.append(name, pack, price, label, remove);
          item.append(image, details);
          list.append(item);
        }
        const subtotalMinor = basketSubtotal(bag, data);
        const ready = !!(data.checkout_enabled === true && data.payment_collection_enabled === true &&
          data.price_authority === "approved_consumer_retail" &&
          data.delivery_verified === true && bag.length > 0 && subtotalMinor !== null &&
          bag.every(({sku}) => productMap.get(sku)?.available_to_sell === true));
        const indicative = data.price_authority === "owner_authorized_provisional_public_display";
        subtotal.textContent = subtotalMinor === null ? "Pending" : (indicative ? "Guide " : "") + formatGBP(subtotalMinor);
        shipping.textContent = ready ? "Calculated at checkout" : "Not confirmed";
        tax.textContent = indicative ? "Estimated 20% VAT included" : "Verified at checkout";
        grand.textContent = ready ? "Calculated at secure checkout" : "Pending delivery";
        checkout.disabled = !ready;
        checkout.textContent = ready ? "Continue to secure checkout" : "Checkout not available yet";
        explanation.textContent = ready
          ? "Your order will be repriced and checked by NovaPharm's secure payment server before any charge."
          : "Your selections are saved in this browser. Guide prices include estimated 20% UK VAT; delivery, tax registration and stock must be verified before checkout. No order is placed.";
        checkout.onclick = async () => {
          if (!ready) return;
          checkout.disabled = true;
          explanation.textContent = "Verifying your order securely…";
          try {
            const response = await fetch("https://portal.novapharmhealthcare.com/api/retail/checkout", {
              method: "POST", credentials: "omit", headers: { "content-type": "application/json" },
              body: JSON.stringify({ lines: bag }), cache: "no-store"
            });
            if (!response.ok) throw new Error("Checkout is unavailable");
            const result = await response.json();
            const url = new URL(result.url || "");
            if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Invalid payment destination");
            window.location.assign(url.href);
          } catch {
            explanation.textContent = "Checkout is not available. No payment was taken. Your bag is still saved.";
            checkout.disabled = false;
          }
        };
      };
      render();
    }
  } else if (path === SHOP_URL || path === SHOP_URL.slice(0, -1)) {
    for (const shell of document.querySelectorAll(".nx-product-card-shell")) {
      const link = shell.querySelector("[data-nx-product-slug]");
      const p = slugMap.get(link?.dataset.nxProductSlug);
      if (!p) continue;
      const footer = make("div", "nx-store-card-footer");
      const priceWrap = make("div");
      const price = make("span", "nx-store-price", productPriceLabel(p, data));
      const tax = make("p", "nx-store-vat-note", "Guide price · estimated VAT included");
      priceWrap.append(price, tax);
      const add = make("button", "nx-store-add", "Add to Bag");
      add.type = "button";
      add.addEventListener("click", () => put(p.sku, 1));
      footer.append(priceWrap, add);
      shell.append(footer);
    }
  } else {
    const slug = path.split("/").filter(Boolean)[2] || "";
    const p = slugMap.get(slug);
    const copy = document.querySelector(".npd-product-copy");
    if (p && copy) {
      const panel = make("section", "nx-store-panel");
      panel.setAttribute("aria-label", "Nutraxin shopping options");
      panel.append(make("p", "nx-store-kicker", "Nutraxin / Retail"));
      panel.append(make("p", "nx-store-price", productPriceLabel(p, data)));
      panel.append(make("p", "nx-store-note", "Indicative price including estimated 20% UK VAT. Save to your bag; delivery and payment checkout are not yet available."));
      const options = make("div", "nx-store-options");
      const label = make("label", "nx-store-qty-label", "Quantity");
      const quantity = make("select", "nx-store-qty");
      for (let i = 1; i <= 10; i++) {
        const opt = make("option", null, String(i)); opt.value = String(i); quantity.append(opt);
      }
      label.append(quantity);
      const add = make("button", "nx-store-add", "Add to Bag");
      add.type = "button";
      add.addEventListener("click", () => put(p.sku, Number(quantity.value)));
      options.append(label, add, anchor("View Bag", BAG_URL, "nx-store-bag-link"));
      panel.append(options);
      const pack = copy.querySelector(".npd-product-pack");
      if (pack) pack.insertAdjacentElement("afterend", panel);
      else copy.prepend(panel);
    }
  }
  updateNav();
}

async function init() {
  if (typeof document === "undefined") return;
  const path = window.location.pathname;
  if (!path.startsWith(SHOP_URL) || path.startsWith(SHOP_URL + "order-request/")) return;
  installStyle();
  try {
    const response = await fetch(CATALOGUE_URL, { cache: "no-store", credentials: "omit" });
    if (!response.ok) throw new Error("Catalogue unavailable");
    const catalogue = await response.json();
    if (!catalogueIsSafe(catalogue)) throw new Error("Unverified catalogue");
    runStore(catalogue);
  } catch {
    // Fail closed: don't show invented prices or a misleading payment journey.
    const main = document.querySelector("main");
    if (main) {
      const status = make("p", "nx-store-note", "The shopping bag is temporarily unavailable. No order or payment can be placed.");
      status.setAttribute("role", "status");
      main.prepend(status);
    }
  }
}
void init();
