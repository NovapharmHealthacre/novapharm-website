/* NovaPharm public Nutraxin storefront.
 * Public catalogue is presentation data only. Never use browser totals to authorise a payment.
 * Retail checkout remains fail-closed until a trusted server creates a priced, verified order.
 */
export const BAG_KEY = "novapharm.nutraxin.public-bag.v1";
export const MAX_PER_SKU = 10000;
const CATALOGUE_URL = "/assets/data/nutraxin-retail-catalogue.json";
const CHECKOUT_API_ORIGIN = "https://7cs8kxkj5d.execute-api.eu-north-1.amazonaws.com";
const BAG_URL = "/products/nutraxin/bag/";
const ACCOUNT_URL = "/products/nutraxin/account/";
const ACCOUNT_SESSION_KEY = "np.nutraxin.consumer.access.v1";
function consumerAccess(){
 try{
  const v=JSON.parse(sessionStorage.getItem(ACCOUNT_SESSION_KEY)||"null");
  if(v&&typeof v.accessToken==="string"&&Number.isFinite(v.expiresAt)&&v.expiresAt>Date.now()+15000)return v.accessToken;
 }catch{}
 return null;
}
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
  const viewable = (data?.price_authority === "approved_consumer_retail" && data.payment_collection_enabled === true) ||
    (data?.price_authority === "owner_authorized_provisional_public_display" &&
      data?.checkout_enabled === false && data?.payment_collection_enabled === false &&
      data?.price_includes_estimated_uk_vat === true && data?.vat_estimate_rate_percent === 20);
  if (!viewable || !Number.isSafeInteger(product?.retail_price_pence) || product.retail_price_pence < 1) return null;
  return product.retail_price_pence;
}

export function merchantSaleReady(product, data) {
  return data?.price_authority === "approved_consumer_retail" &&
    data?.delivery_verified === true &&
    data?.checkout_enabled === true &&
    data?.payment_collection_enabled === true &&
    product?.ordering_enabled === true &&
    product?.available_to_sell === true;
}

export function basketSubtotal(bag, data) {
  if (!catalogueIsSafe(data) || !bag.length) return null;
  const products = new Map(data.products.map((p) => [p.sku, p]));
  let sum = 0;
  for (const { sku, quantity } of bag) {
    const product = products.get(sku);
    const gross = publicPrice(product, data);
    if (gross === null || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_PER_SKU) return null;
    if (data.price_authority === "approved_consumer_retail") {
      if (!Number.isSafeInteger(product.retail_net_pence) || product.retail_net_pence <= 0) return null;
      if (gross !== product.retail_net_pence + Math.round(product.retail_net_pence * 20 / 100)) return null;
    }
    // Same published per-unit gross in the public store, portal and worker.
    sum += gross * quantity;
    if (!Number.isSafeInteger(sum)) return null;
  }
  return sum;
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

function emitRetailFunnelEvent(name) {
  // Only coarse events: no SKU, basket, order, price or personal information.
  window.dispatchEvent(new CustomEvent("novapharm:marketing-event", {
    detail: { event: name }
  }));
}

export function checkoutReturnOutcome(result) {
  // Only a server-confirmed, reconciled paid order can clear the Bag.
  if(result?.paid === true && result?.status === "PAID") return "paid";
  if(result?.paid === false && result?.status === "CHECKOUT_EXPIRED") return "expired";
  if(result?.paid === false && result?.status === "PAYMENT_FAILED") return "failed";
  return "pending";
}

function runStore(data) {
  let bag = loadBag(data);
  let approvedRelease = false;
  let confirmedOrder = "";
  let awaitingOrder = "";
  let closedOrder = "";
  let closedOutcome = "";
  const productMap = new Map(data.products.map((p) => [p.sku, p]));
  const slugMap = new Map(data.products.map((p) => [p.slug, p]));
  const updateNav = () => {
    for (const item of document.querySelectorAll("[data-nx-bag-count]")) item.textContent = String(count(bag));
  };
  const put = (sku, qty) => {
    if (!productMap.has(sku) || !Number.isSafeInteger(qty) || qty < 1 || qty > MAX_PER_SKU) return;
    if (!merchantSaleReady(productMap.get(sku), data)) {
      toast("This product is currently unavailable to order online.");
      return;
    }
    const existing = bag.find((item) => item.sku === sku);
    bag = safeBasket([...bag.filter((item) => item.sku !== sku), { sku, quantity: Math.min(MAX_PER_SKU, (existing?.quantity || 0) + qty) }], data.products);
    saveBag(bag);
    updateNav();
    toast("Added to bag. Review your selection when you're ready.");
    emitRetailFunnelEvent("add_to_cart");
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
  nav.append(anchor("Account",ACCOUNT_URL,"nx-store-account-link"));
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
          const quantityInput = make("input");
          quantityInput.type = "number";
          quantityInput.min = "1";
          quantityInput.max = String(MAX_PER_SKU);
          quantityInput.step = "1";
          quantityInput.inputMode = "numeric";
          quantityInput.value = String(line.quantity);
          quantityInput.setAttribute("aria-label", "Quantity for " + p.name);
          quantityInput.addEventListener("change", () => {
            const quantity = Number(quantityInput.value);
            if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_PER_SKU) {
              quantityInput.value = String(line.quantity);
              return;
            }
            bag = bag.map((v) => v.sku === p.sku ? { sku: p.sku, quantity } : v);
            saveBag(bag); updateNav(); render();
          });
          label.append(quantityInput);
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
        const ready = !!(approvedRelease && bag.length > 0 && subtotalMinor !== null && bag.every((line) => merchantSaleReady(productMap.get(line.sku), data)) && !confirmedOrder && !awaitingOrder);
        // A public catalogue flag or browser price NEVER authorises a charge; the
        // server independently verifies all release evidence and recalculates totals.
        const indicative = data.price_authority === "owner_authorized_provisional_public_display";
        subtotal.textContent = subtotalMinor === null ? "Pending" : (indicative ? "Guide " : "") + formatGBP(subtotalMinor);
        const ukDeliveryIncluded = indicative && data.provisional_uk_delivery_charge_pence === 0 &&
          data.provisional_uk_delivery_cost_seller_funded === true;
        shipping.textContent = ready ? "Included · UK" : (ukDeliveryIncluded ? "£0.00 · UK only" : "Not confirmed");
        tax.textContent = "20% UK VAT included";
        grand.textContent = subtotalMinor === null ? "Not available" : formatGBP(subtotalMinor);
        checkout.disabled = !ready;
        checkout.textContent = confirmedOrder ? "Payment confirmed" : awaitingOrder ? "Payment pending" : ready ? (consumerAccess() ? "Continue with your account" : "Continue as guest") : "Checkout not available yet";
        explanation.textContent = confirmedOrder
          ? "Payment confirmed for order " + confirmedOrder + ". NovaPharm will process your order."
          : closedOutcome === "expired"
          ? "Checkout expired for order " + closedOrder + " without a completed payment. Your Bag is saved and you may start a new checkout."
          : closedOutcome === "failed"
          ? "Payment failed for order " + closedOrder + ". No successful payment has been recorded. Your Bag is saved so you may try again."
          : awaitingOrder
          ? "Payment status is being verified for order " + awaitingOrder + ". Please do not attempt another payment for this order."
          : ready
          ? "Continue as a guest. Stripe will collect your email, UK delivery details and payment. NovaPharm independently verifies the order total and payment before fulfilment."
          : "Your Bag is saved. Checkout is temporarily unavailable; no card details are collected here.";
        checkout.onclick = async () => {
          if (!ready) return;
          const terms = container.querySelector("[data-nx-consumer-terms]");
          if (!terms || !terms.checked) {
            explanation.textContent = "Accept the UK consumer and manufacturer delivery terms before checkout.";
            return;
          }
          checkout.disabled = true;
          explanation.textContent = "Verifying your order securely…";
          try {
            const basketId = JSON.stringify([...bag].sort((a,b)=>a.sku.localeCompare(b.sku)));
            let stored;
            try { stored = JSON.parse(sessionStorage.getItem("np-retail-checkout-attempt") || "null"); }
            catch { stored = null; }
            const requestId = stored?.basket === basketId && /^[0-9a-f-]{36}$/.test(stored?.id || "")
              ? stored.id : crypto.randomUUID();
            try { sessionStorage.setItem("np-retail-checkout-attempt",JSON.stringify({basket:basketId,id:requestId})); } catch {}
            const accountToken=consumerAccess();
            const headers={ "content-type": "application/json" };
            if(accountToken)headers.authorization="Bearer "+accountToken;
            const target=accountToken?"/account/checkout":"/checkout";
            const response = await fetch(CHECKOUT_API_ORIGIN + target, {
              method: "POST", mode: "cors", credentials: "omit", headers,
              body: JSON.stringify({ request_id:requestId, lines:bag, accept_terms:true }), cache: "no-store"
            });
            if (response.status === 401) {
              if(accountToken)try{sessionStorage.removeItem(ACCOUNT_SESSION_KEY)}catch{}
              throw new Error("Your account session expired. Please sign in again or choose guest checkout.");
            }
            if (!response.ok) throw new Error("Checkout has not been activated for this basket.");
            const result = await response.json();
            const url = new URL(result.checkoutUrl || "");
            if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Invalid payment destination");
            emitRetailFunnelEvent("begin_checkout");
            window.location.assign(url.href);
          } catch {
            explanation.textContent = "Checkout is not available. No payment was taken. Your bag is still saved.";
            checkout.disabled = false;
          }
        };
      };
      render();
      const query = new URLSearchParams(window.location.search);
      const returnedOrder = query.get("order_id");
      if (query.get("checkout") === "return" && /^NUT-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(returnedOrder || "")) {
        const status = async (attempt = 0) => {
          try {
            const r = await fetch(CHECKOUT_API_ORIGIN + "/status/" + encodeURIComponent(returnedOrder),{mode:"cors",credentials:"omit",cache:"no-store"});
            const result = r.ok ? await r.json() : null;
            const outcome = checkoutReturnOutcome(result);
            if (outcome === "paid") {
              confirmedOrder = returnedOrder;
              awaitingOrder = "";
              closedOutcome = "";
              bag=[];saveBag(bag);updateNav();
              try {sessionStorage.removeItem("np-retail-checkout-attempt");}catch{}
              render();
              return;
            }
            if (outcome === "expired" || outcome === "failed") {
              // A signed payment outcome is authoritative; a redirect alone is not.
              awaitingOrder = "";
              closedOrder = returnedOrder;
              closedOutcome = outcome;
              try {sessionStorage.removeItem("np-retail-checkout-attempt");}catch{}
              render();
              return;
            }
            awaitingOrder = returnedOrder;
            render();
            if(attempt < 3) window.setTimeout(()=>status(attempt+1),3000);
          } catch {
            awaitingOrder = returnedOrder;
            render();
          }
        };
        void status();
      }
      // Products-site readiness is determined by a standalone checkout API.
      // It can enable the UX only when the private AWS release gates pass.
      void (async () => {
        try {
          const r=await fetch(CHECKOUT_API_ORIGIN + "/readiness",
            {credentials:"omit",cache:"no-store",mode:"cors"});
          const v=r.ok?await r.json():null;
          approvedRelease = v?.checkout_ready === true && v?.payment_collection_active === true && v?.origin === "novapharmhealthcare.com";
        } catch { approvedRelease=false; }
        render();
      })();
    }
  } else if (path === SHOP_URL || path === SHOP_URL.slice(0, -1)) {
    for (const shell of document.querySelectorAll(".nx-product-card-shell")) {
      const link = shell.querySelector("[data-nx-product-slug]");
      const p = slugMap.get(link?.dataset.nxProductSlug);
      if (!p) continue;
      const footer = make("div", "nx-store-card-footer");
      const priceWrap = make("div");
      const price = make("span", "nx-store-price", productPriceLabel(p, data));
      const tax = make("p", "nx-store-vat-note", "20% UK VAT included · UK delivery included");
      priceWrap.append(price, tax);
      const add = make("button", "nx-store-add", "Add to Bag");
      add.type = "button";
      add.addEventListener("click", () => put(p.sku, 1));
      const buy = make("button", "nx-store-add nx-store-buy-now", "Buy now");
      buy.type = "button";
      add.disabled = !merchantSaleReady(p, data);
      buy.disabled = !merchantSaleReady(p, data);
      buy.addEventListener("click", () => { put(p.sku, 1); window.location.assign(BAG_URL); });
      footer.append(priceWrap, add, buy);
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
      panel.append(make("p", "nx-store-note", "Includes 20% UK VAT. UK delivery is included. Buy securely with Stripe from your Bag."));
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
      const buy = make("button","nx-store-add nx-store-buy-now","Buy now");
      buy.type="button";
      add.disabled = !merchantSaleReady(p, data);
      buy.disabled = !merchantSaleReady(p, data);buy.addEventListener("click",()=>{put(p.sku,Number(quantity.value));window.location.assign(BAG_URL);});
      options.append(label, add, buy, anchor("View Bag", BAG_URL, "nx-store-bag-link"));
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
