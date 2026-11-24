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

// Comparison is a transient, explicitly selected shortlist, not medical advice.
export function comparisonProducts(skus, data) {
  if (!catalogueIsSafe(data) || !Array.isArray(skus)) return [];
  const bySku = new Map(data.products.map(p => [p.sku, p]));
  return [...new Set(skus)].filter(sku => bySku.has(sku)).slice(0, 3).map(sku => bySku.get(sku));
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
// Cosmetic only: align transparent pack photography to a shared optical baseline.
// Never replace, crop, rewrite or stretch a product image. Opaque/unsupported images
// retain their original contained presentation; checkout and availability are independent.
function alignCataloguePack(image) {
  if (!image) return;
  const align = () => {
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) return;
    image.style.removeProperty("--nx-pack-x");
    image.style.removeProperty("--nx-pack-y");
    image.style.removeProperty("--nx-pack-scale");
    image.dataset.nxOptical = "contained";
    try {
      const size = 160;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const fit = Math.min(size / image.naturalWidth, size / image.naturalHeight);
      const width = image.naturalWidth * fit, height = image.naturalHeight * fit;
      ctx.drawImage(image, (size-width)/2, (size-height)/2, width, height);
      const pixels = ctx.getImageData(0,0,size,size).data;
      let left=size, top=size, right=-1, bottom=-1, transparent=0;
      for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
        const alpha=pixels[(y*size+x)*4+3];
        if(alpha<=16) {transparent++;continue;}
        left=Math.min(left,x);right=Math.max(right,x);
        top=Math.min(top,y);bottom=Math.max(bottom,y);
      }
      if(transparent < size*size*.08 || right<=left || bottom<=top) return;
      // A conservative margin protects the whole pack, including soft shadows.
      left=Math.max(0,left-1)/size; top=Math.max(0,top-1)/size;
      right=Math.min(size,right+2)/size; bottom=Math.min(size,bottom+2)/size;
      const scale=Math.min(.90/(right-left),.82/(bottom-top),1.45);
      if(!Number.isFinite(scale)||scale<=0) return;
      const x=.5-(left+right)*scale/2, y=.91-bottom*scale;
      image.style.setProperty("--nx-pack-x", (100*x).toFixed(4)+"%");
      image.style.setProperty("--nx-pack-y", (100*y).toFixed(4)+"%");
      image.style.setProperty("--nx-pack-scale", scale.toFixed(6));
      image.dataset.nxOptical = "aligned";
      image.dataset.nxOpticalBounds = JSON.stringify([left,top,right,bottom]);
    } catch {
      // Rendering must remain safe for unsupported decoding/canvas formats.
      image.dataset.nxOptical = "contained";
    }
  };
  image.addEventListener("load",align);
  if(image.complete) align();
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
  let checkoutInFlight = false;
  let checkoutUncertain = false;
  let lastAttempt = null;
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
      let promoSupported = false;
      let promoQuote = null;
      let promoPending = false;
      let promoGeneration = 0;
      const promoSection = make("details", "nx-bag-promotion");
      promoSection.hidden = true;
      const promoSummary = make("summary", null, "Add a promo code");
      const promoLabel = make("label", null, "Promotional code");
      const promoInput = make("input");
      promoInput.type = "text";
      promoInput.maxLength = 32;
      promoInput.autocomplete = "off";
      promoInput.spellcheck = false;
      promoInput.placeholder = "Enter your promo code";
      promoLabel.append(promoInput);
      const promoApply = make("button", "nx-compare-control", "Apply");
      promoApply.type = "button";
      const promoStatus = make("p", "nx-store-note");
      promoStatus.setAttribute("role", "status");
      const promoControls = make("div");
      promoControls.append(promoLabel, promoApply);
      promoSection.append(promoSummary, promoControls, promoStatus);
      const termsAnchor = container.querySelector(".nx-store-consumer-terms");
      if (termsAnchor) termsAnchor.before(promoSection);
      const discountRow = make("div");
      discountRow.hidden = true;
      const discountAmount = make("dd");
      discountRow.append(make("dt", null, "Promotional discount"), discountAmount);
      const totalRow = container.querySelector(".nx-bag-total");
      if (totalRow) totalRow.before(discountRow);
      const clearPromotion = (message = "") => {
        promoGeneration++;
        promoPending = false;
        promoQuote = null;
        promoInput.value = "";
        promoStatus.textContent = message;
      };
      const requestPromotion = async () => {
        if (!promoSupported || !approvedRelease || !bag.length || promoPending ||
            checkoutInFlight || checkoutUncertain || awaitingOrder || confirmedOrder) return;
        if (promoQuote) {
          clearPromotion("Promotional code removed.");
          render();
          return;
        }
        const code = promoInput.value.trim().toUpperCase();
        if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
          promoStatus.textContent = "Enter a valid promotional code.";
          return;
        }
        const generation = ++promoGeneration;
        promoPending = true;
        promoStatus.textContent = "Checking your promotional code…";
        render();
        try {
          const response = await fetch(CHECKOUT_API_ORIGIN + "/quote", {
            method:"POST", mode:"cors", credentials:"omit",
            headers:{"content-type":"application/json"},
            body:JSON.stringify({lines:bag,promo_code:code}), cache:"no-store"
          });
          const quote = response.ok ? await response.json() : null;
          if (generation !== promoGeneration) return;
          const minor = [quote?.originalGrossMinor, quote?.discountGrossMinor, quote?.totalGrossMinor];
          if (!quote || quote.currency !== "GBP" || quote.promotionCode !== code ||
              !minor.every(Number.isSafeInteger) || minor[1] <= 0 || minor[2] < 30 ||
              minor[0] - minor[1] !== minor[2] || !/^[a-f0-9]{64}$/.test(quote.basketVersion || "")) {
            promoStatus.textContent = "This promotional code is not available for your bag.";
            return;
          }
          promoQuote = quote;
          promoStatus.textContent = "Promotional code applied. Your total has been updated.";
        } catch {
          if (generation === promoGeneration) promoStatus.textContent = "We could not check this code. Please try again.";
        } finally {
          if (generation === promoGeneration) {
            promoPending = false;
            render();
          }
        }
      };
      promoApply.addEventListener("click", requestPromotion);
      promoInput.addEventListener("keydown", event => {
        if (event.key === "Enter") { event.preventDefault(); void requestPromotion(); }
      });
      const render = () => {
        const list = container.querySelector("[data-nx-bag-items]");
        const subtotal = container.querySelector("[data-nx-bag-subtotal]");
        const shipping = container.querySelector("[data-nx-bag-delivery]");
        const tax = container.querySelector("[data-nx-bag-tax]");
        const grand = container.querySelector("[data-nx-bag-total]");
        const checkout = container.querySelector("[data-nx-checkout]");
        const explanation = container.querySelector("[data-nx-checkout-note]");
        const locked = checkoutInFlight || checkoutUncertain || !!awaitingOrder;
        list.replaceChildren();
        if (!bag.length && !confirmedOrder && !awaitingOrder) {
          const empty = make("div", "nx-bag-empty");
          empty.append(make("p", null, "Your bag is empty. Explore the collection and add products to get started."), anchor("Continue shopping", SHOP_URL, "nx-compare-link"));
          list.append(empty);
        }
        if (confirmedOrder || awaitingOrder || checkoutUncertain) {
          const help = make("div", "nx-bag-order-help");
          help.append(anchor("Check an order status", "/products/track/", "nx-compare-link"), anchor("Contact customer support", "mailto:support@novapharmhealthcare.com", "nx-compare-link"));
          list.append(help);
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
          quantityInput.disabled = locked;
          quantityInput.setAttribute("aria-label", "Quantity for " + p.name);
          quantityInput.addEventListener("change", () => {
            const quantity = Number(quantityInput.value);
            if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_PER_SKU) {
              quantityInput.value = String(line.quantity);
              return;
            }
            if (promoQuote || promoPending) clearPromotion("Bag updated. Apply your promotional code again.");
            bag = bag.map((v) => v.sku === p.sku ? { sku: p.sku, quantity } : v);
            saveBag(bag); updateNav(); render();
          });
          label.append(quantityInput);
          const remove = make("button", "nx-bag-remove", "Remove");
          remove.type = "button";
          remove.disabled = locked;
          remove.addEventListener("click", () => {
            if (promoQuote || promoPending) clearPromotion("Bag updated. Apply your promotional code again.");
            bag = bag.filter((v) => v.sku !== p.sku);
            saveBag(bag); updateNav(); render();
          });
          details.append(name, pack, price, label, remove);
          item.append(image, details);
          list.append(item);
        }
        const subtotalMinor = basketSubtotal(bag, data);
        const ready = !!(approvedRelease && bag.length > 0 && subtotalMinor !== null && bag.every((line) => merchantSaleReady(productMap.get(line.sku), data)) && !confirmedOrder && !awaitingOrder && !checkoutInFlight && !promoPending);
        // A public catalogue flag or browser price NEVER authorises a charge; the
        // server independently verifies all release evidence and recalculates totals.
        const indicative = data.price_authority === "owner_authorized_provisional_public_display";
        subtotal.textContent = subtotalMinor === null ? "Pending" : (indicative ? "Guide " : "") + formatGBP(subtotalMinor);
        const ukDeliveryIncluded = indicative && data.provisional_uk_delivery_charge_pence === 0 &&
          data.provisional_uk_delivery_cost_seller_funded === true;
        shipping.textContent = ready ? "Included · UK" : (ukDeliveryIncluded ? "£0.00 · UK only" : "Not confirmed");
        tax.textContent = "20% UK VAT included";
        promoSection.hidden = !promoSupported || !approvedRelease || !bag.length || !!confirmedOrder || !!awaitingOrder;
        promoInput.disabled = locked || promoPending || !!promoQuote;
        promoApply.disabled = locked || promoPending || !bag.length;
        promoApply.textContent = promoPending ? "Checking…" : promoQuote ? "Remove" : "Apply";
        discountRow.hidden = !promoQuote;
        discountAmount.textContent = promoQuote ? "−" + formatGBP(promoQuote.discountGrossMinor) : "";
        if (promoQuote) subtotal.textContent = formatGBP(promoQuote.originalGrossMinor);
        grand.textContent = promoQuote ? formatGBP(promoQuote.totalGrossMinor) : subtotalMinor === null ? "Not available" : formatGBP(subtotalMinor);
        checkout.disabled = !ready;
        checkout.textContent = confirmedOrder ? "Payment confirmed" : awaitingOrder ? "Payment pending" : checkoutInFlight ? "Opening checkout…" : ready ? (checkoutUncertain ? "Retry original checkout" : consumerAccess() ? "Continue with your account" : "Continue as guest") : "Checkout not available yet";
        explanation.textContent = confirmedOrder
          ? "Payment confirmed for order " + confirmedOrder + ". NovaPharm will process your order."
          : closedOutcome === "expired" && !checkoutUncertain && !checkoutInFlight
          ? "Checkout expired for order " + closedOrder + " without a completed payment. Your Bag is saved and you may start a new checkout."
          : closedOutcome === "failed" && !checkoutUncertain && !checkoutInFlight
          ? "Payment failed for order " + closedOrder + ". No successful payment has been recorded. Your Bag is saved so you may try again."
          : awaitingOrder
          ? "Payment status is being verified for order " + awaitingOrder + ". Please do not attempt another payment for this order."
          : checkoutInFlight
          ? "Opening secure checkout. Please wait."
          : checkoutUncertain
          ? "We could not confirm the checkout response. Your basket is saved. Check your existing payment confirmation or contact customer support before retrying this same basket."
          : ready
          ? (consumerAccess() ? "Continue with your verified account. Stripe will collect required delivery and payment details." : "Continue as a guest. Stripe will collect your email, UK delivery details and payment.") + " NovaPharm verifies the order total and payment before fulfilment."
          : "Your Bag is saved. Checkout is temporarily unavailable; no card details are collected here.";
        checkout.onclick = async () => {
          if (!ready || checkoutInFlight) return;
          const terms = container.querySelector("[data-nx-consumer-terms]");
          if (!terms || !terms.checked) {
            explanation.textContent = "Accept the UK consumer and manufacturer delivery terms before checkout.";
            return;
          }
          checkoutInFlight = true;
          render();
          explanation.textContent = "Verifying your order securely…";
          try {
            const sortedBag = [...bag].sort((a,b)=>a.sku.localeCompare(b.sku));
            const basketId = promoQuote ? JSON.stringify({lines:sortedBag,promo:promoQuote.promotionCode,version:promoQuote.basketVersion}) : JSON.stringify(sortedBag);
            let stored;
            try { stored = JSON.parse(sessionStorage.getItem("np-retail-checkout-attempt") || "null"); }
            catch { stored = null; }
            const accountToken=consumerAccess();
            const mode=accountToken?"account":"guest";
            if (checkoutUncertain && (!lastAttempt || lastAttempt.basket !== basketId || lastAttempt.mode !== mode)) throw new Error("Original checkout cannot be resumed safely");
            const requestId = lastAttempt?.basket === basketId && lastAttempt.mode === mode ? lastAttempt.id : stored?.basket === basketId && /^[0-9a-f-]{36}$/.test(stored?.id || "")
              ? stored.id : crypto.randomUUID();
            lastAttempt={basket:basketId,id:requestId,mode};
            try { sessionStorage.setItem("np-retail-checkout-attempt",JSON.stringify({basket:basketId,id:requestId})); } catch {}
            const headers={ "content-type": "application/json" };
            if(accountToken)headers.authorization="Bearer "+accountToken;
            const target=accountToken?"/account/checkout":"/checkout";
            const response = await fetch(CHECKOUT_API_ORIGIN + target, {
              method: "POST", mode: "cors", credentials: "omit", headers,
              body: JSON.stringify({ request_id:requestId, lines:bag, accept_terms:true,
                ...(promoQuote ? {promo_code:promoQuote.promotionCode,basket_version:promoQuote.basketVersion} : {}) }), cache: "no-store"
            });
            if (response.status === 401) {
              if(accountToken)try{sessionStorage.removeItem(ACCOUNT_SESSION_KEY)}catch{}
              throw new Error("Your account session expired. Please sign in again or choose guest checkout.");
            }
            if (!response.ok) throw new Error("Checkout has not been activated for this basket.");
            const result = await response.json();
            // The server may reconcile a previous idempotent attempt as already paid.
            // Re-enter the normal status-verification path rather than open a second checkout.
            if (result?.already_paid === true && result?.status === "PAID" && /^NUT-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(result.orderId || "")) {
              window.location.assign(BAG_URL + "?checkout=return&order_id=" + encodeURIComponent(result.orderId));
              return;
            }
            const url = new URL(result.checkoutUrl || "");
            if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Invalid payment destination");
            emitRetailFunnelEvent("begin_checkout");
            window.location.assign(url.href);
          } catch {
            checkoutUncertain = true;
            checkoutInFlight = false;
            render();
          }
        };
      };
      render();
      const query = new URLSearchParams(window.location.search);
      const returnedOrder = query.get("order_id");
      if (query.get("checkout") === "return" && /^NUT-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(returnedOrder || "")) {
        // Lock checkout before the first asynchronous verification can race readiness.
        awaitingOrder = returnedOrder;
        render();
        const status = async (attempt = 0) => {
          try {
            const r = await fetch(CHECKOUT_API_ORIGIN + "/status/" + encodeURIComponent(returnedOrder),{mode:"cors",credentials:"omit",cache:"no-store"});
            const result = r.ok ? await r.json() : null;
            const outcome = checkoutReturnOutcome(result?.orderId === returnedOrder ? result : null);
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
          promoSupported = v?.promotion_preview_supported === true;
        } catch { approvedRelease=false; }
        render();
      })();
    }
  } else if (path === SHOP_URL || path === SHOP_URL.slice(0, -1)) {
    const selected = new Set();
    const compareButtons = new Map();
    const comparison = make("section", "nx-compare");
    comparison.setAttribute("aria-labelledby", "nx-compare-title");
    const heading = make("h2", null, "Compare your favourites.");
    heading.id = "nx-compare-title";
    const intro = make("p", null, "Select up to three products. Compare pack sizes, published prices and product ranges, then view the full product information. This is not advice on suitability or treatment.");
    const announcement = make("p", "nx-compare-status", "No products selected.");
    announcement.setAttribute("role", "status");
    const clear = make("button", "nx-compare-control", "Clear comparison");
    clear.type = "button";
    const results = make("div", "nx-compare-results");
    const renderComparison = () => {
      const products = comparisonProducts([...selected], data);
      announcement.textContent = products.length + " of 3 products selected.";
      clear.disabled = products.length === 0;
      results.replaceChildren();
      for (const [sku, button] of compareButtons) {
        const chosen = selected.has(sku);
        button.setAttribute("aria-pressed", String(chosen));
        button.disabled = !chosen && products.length >= 3;
      }
      if (!products.length) return;
      const grid = make("div", "nx-compare-grid");
      for (const p of products) {
        const item = make("article", "nx-compare-card");
        item.append(make("h3", null, p.name));
        const details = make("dl");
        for (const [label, value] of [["Range", p.range || "Not recorded"], ["Pack", p.pack], ["Published price", productPriceLabel(p, data)]]) {
          details.append(make("dt", null, label), make("dd", null, value));
        }
        item.append(details, anchor("View product details", productUrl(p), "nx-compare-link"));
        grid.append(item);
      }
      results.append(grid);
    };
    clear.onclick = () => { selected.clear(); renderComparison(); heading.setAttribute("tabindex", "-1"); heading.focus(); };
    comparison.append(heading, intro, announcement, clear, results);
    const range = document.querySelector("#nx-range-overview");
    if (range) range.insertAdjacentElement("beforebegin", comparison);
    for (const shell of document.querySelectorAll(".nx-product-card-shell")) {
      alignCataloguePack(shell.querySelector(".nx-product-visual img"));
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
      if (range) {
        const compare = make("button", "nx-compare-control", "Compare");
        compare.type = "button";
        compare.setAttribute("aria-label", "Compare " + p.name + ", " + p.pack);
        compare.setAttribute("aria-pressed", "false");
        compare.onclick = () => { if (selected.has(p.sku)) selected.delete(p.sku); else if (selected.size < 3) selected.add(p.sku); renderComparison(); };
        compareButtons.set(p.sku, compare);
        shell.append(compare, anchor("View comparison", "#nx-compare-title", "nx-compare-link"));
      }
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
