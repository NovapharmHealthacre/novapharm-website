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
const MULTIBRAND_URL = "/products/health-and-wellbeing/";
const CP_SKU = /^NP-CP-(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$/;

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
  if (!data || data.currency !== "GBP" || !Array.isArray(data.products) || (data.multibrand === true ? data.products.filter(p=>p?.sku?.startsWith("NUT-UK-")).length !== 19 : data.products.length !== 19)) return false;
  const seen = new Set();
  for (const p of data.products) {
    if (!p || !(/^NUT-UK-[A-Z0-9-]+$/.test(p.sku) || (data.multibrand === true && CP_SKU.test(p.sku))) || !/^[a-z0-9-]+$/.test(p.slug) ||
        typeof p.name !== "string" || p.name.length < 3 || typeof p.pack !== "string" || seen.has(p.sku)) return false;
    seen.add(p.sku);
  }
  return true;
}

export function mergeRetailOffers(base, response, saved = []) {
  if (!catalogueIsSafe(base) || base.multibrand) throw new Error("Invalid base catalogue");
  const extra = new Map();
  if(response?.schema==="novapharm-retail-offers-v1" && response.currency==="GBP" && Array.isArray(response.products)){
    for(const p of response.products){
      if(!p || !CP_SKU.test(p.sku) || p.sku!=="NP-CP-"+p.gtin || extra.has(p.sku) ||
         ![p.name,p.pack,p.brand,p.category].every(v=>typeof v==="string"&&v.length>0&&v.length<=90) ||
         typeof p.image!=="string" || !/^\/assets\/media\/products\/[a-zA-Z0-9/_-]+\.(?:avif|webp|png|jpg)$/.test(p.image) ||
         ![0,500,2000].includes(p.vatBasisPoints) || !Number.isSafeInteger(p.netMinor) || p.netMinor<1 ||
         !Number.isSafeInteger(p.grossMinor) || p.grossMinor!==p.netMinor+Math.round(p.netMinor*p.vatBasisPoints/10000) ||
         !Number.isSafeInteger(p.availableQuantity)||p.availableQuantity<1||p.availableQuantity>MAX_PER_SKU) continue;
      if(p.supplyModel!==undefined && !["supplier_backed","stock_verified"].includes(p.supplyModel)) continue;
      extra.set(p.sku,{sku:p.sku,slug:p.gtin,name:p.name,pack:p.pack,range:p.category,brand:p.brand,image:p.image,
        retail_net_pence:p.netMinor,retail_price_pence:p.grossMinor,vatBasisPoints:p.vatBasisPoints,
        availableQuantity:p.availableQuantity,supplyModel:p.supplyModel||"stock_verified",
        available_to_sell:true,ordering_enabled:true,retailOfferVerified:true});
    }
  }
  // An unavailable or withdrawn item must never silently disappear from a saved mixed bag.
  // Keep it removable, unpriced and unorderable until the authoritative offer returns.
  for(const line of Array.isArray(saved)?saved:[]){
    if(!line || !CP_SKU.test(line.sku) || extra.has(line.sku)) continue;
    extra.set(line.sku,{sku:line.sku,slug:line.sku.slice(6),name:"Product currently unavailable",pack:"Reference "+line.sku.slice(6),range:"Unavailable",image:"",available_to_sell:false,ordering_enabled:false});
  }
  return extra.size?{...base,multibrand:true,products:[...base.products,...extra.values()]}:base;
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
    product?.available_to_sell === true && (!CP_SKU.test(product?.sku||"") || product.retailOfferVerified===true);
}

// Comparison is a transient, explicitly selected shortlist, not medical advice.
export function comparisonProducts(skus, data) {
  if (!catalogueIsSafe(data) || !Array.isArray(skus)) return [];
  const bySku = new Map(data.products.map(p => [p.sku, p]));
  return [...new Set(skus)].filter(sku => bySku.has(sku)).slice(0, 3).map(sku => bySku.get(sku));
}

export function bagDiscoveryProducts(bag, data) {
  if (!catalogueIsSafe(data) || !Array.isArray(bag)) return [];
  const selected = new Set(safeBasket(bag, data.products).map(line => line.sku));
  return data.products.filter(p => !selected.has(p.sku) &&
    merchantSaleReady(p, data) && publicPrice(p, data) !== null).slice(0, 3);
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
      if (gross !== product.retail_net_pence + Math.round(product.retail_net_pence * (CP_SKU.test(product.sku)?product.vatBasisPoints:2000) / 10000)) return null;
      if (CP_SKU.test(product.sku) && quantity>product.availableQuantity) return null;
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
function productUrl(product) { return (CP_SKU.test(product.sku)?MULTIBRAND_URL:SHOP_URL) + product.slug + "/"; }
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

const ATTEMPT_KEY = "np-retail-checkout-attempt";
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function basketAttemptId(bag, quote = null) {
  const lines = [...bag].sort((a,b)=>a.sku.localeCompare(b.sku));
  return quote ? JSON.stringify({lines,promo:quote.promotionCode,version:quote.basketVersion}) : JSON.stringify(lines);
}

export function restoreCheckoutAttempt(record, bag, mode) {
  if (!record || !REQUEST_ID.test(record.id || "")) return null;
  const quote = record.quote ?? null;
  const quoteValid = quote === null || (
    quote.currency === "GBP" && /^[A-Z0-9_-]{3,32}$/.test(quote.promotionCode || "") &&
    /^[a-f0-9]{64}$/.test(quote.basketVersion || "") &&
    [quote.originalGrossMinor,quote.discountGrossMinor,quote.totalGrossMinor].every(Number.isSafeInteger) &&
    quote.discountGrossMinor > 0 && quote.totalGrossMinor >= 30 &&
    quote.originalGrossMinor - quote.discountGrossMinor === quote.totalGrossMinor);
  const resumable = quoteValid && record.mode === mode && record.basket === basketAttemptId(bag,quote);
  return {id:record.id,basket:record.basket,mode:record.mode,quote:resumable?quote:null,resumable};
}

function runStore(data) {
  // Source-only pages remain visually unchanged until the private AWS ledger
  // returns this exact SKU with a price/fulfilment-approved retail offer.
  const collectionView = window.location.pathname === MULTIBRAND_URL || window.location.pathname === MULTIBRAND_URL.slice(0, -1);
  if (window.location.pathname.startsWith(MULTIBRAND_URL) && !collectionView) {
    const sku = document.querySelector('[data-npr-retail-sku]')?.dataset.nprRetailSku;
    if (!sku || !merchantSaleReady(data.products.find(p => p.sku === sku), data)) return;
  }
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
    if (CP_SKU.test(sku) && (existing?.quantity||0)+qty>productMap.get(sku).availableQuantity) { toast("Requested quantity is not available."); return false; }
    bag = safeBasket([...bag.filter((item) => item.sku !== sku), { sku, quantity: Math.min(MAX_PER_SKU, (existing?.quantity || 0) + qty) }], data.products);
    saveBag(bag);
    updateNav();
    toast("Added to bag. Review your selection when you're ready.");
    emitRetailFunnelEvent("add_to_cart");
    return true;
  };
  const top = document.querySelector("main");
  if (!top) return;
  document.body.classList.add("nx-retail-store");
  const nav = make("nav", "nx-store-topbar");
  nav.setAttribute("aria-label", "Nutraxin shopping navigation");
  nav.append(anchor("Explore Nutraxin", SHOP_URL));
  if(data.multibrand || window.location.pathname.startsWith(MULTIBRAND_URL)) nav.append(anchor("Health and wellbeing", MULTIBRAND_URL));
  const bagNav = anchor("Bag", BAG_URL, "nx-store-bag-link");
  const tally = make("span", null, String(count(bag)));
  tally.dataset.nxBagCount = "true";
  bagNav.append(" (", tally, ")");
  nav.append(bagNav);
  nav.append(anchor("Account",ACCOUNT_URL,"nx-store-account-link"));
  top.insertAdjacentElement("beforebegin", nav);
  for (const link of nav.querySelectorAll("a")) {
    if (new URL(link.href).pathname.replace(/\/$/, "") === window.location.pathname.replace(/\/$/, "")) link.setAttribute("aria-current", "page");
  }

  const path = window.location.pathname;
  if (path === BAG_URL || path === BAG_URL.slice(0, -1)) {
    const container = document.querySelector("[data-nx-public-bag]");
    if (container) {
      const bagCount = make("p", "nx-bag-count");
      bagCount.setAttribute("role", "status");
      container.querySelector("h1").insertAdjacentElement("afterend", bagCount);
      const discovery = make("section", "nx-bag-discover");
      const discoveryHeading = make("h2", null, "Explore more from Nutraxin");
      discoveryHeading.id = "nx-bag-discover-heading";
      discovery.setAttribute("aria-labelledby", discoveryHeading.id);
      const discoveryGrid = make("div", "nx-bag-discover-grid");
      discovery.append(discoveryHeading, discoveryGrid);
      container.querySelector(".nx-bag-grid").append(discovery);
      const secure = make("div", "nx-bag-secure");
      secure.append(make("strong", null, "Secure payment"), make("p", null, "Payment is handled by Stripe. Available payment methods are shown during secure checkout."), anchor("Delivery, returns and refunds", "/legal/returns/", "nx-shop-link"));
      const summary = container.querySelector(".nx-bag-summary");
      summary.id = "nx-bag-summary";
      summary.tabIndex = -1;
      const klarnaNotice = make("p", "nx-store-note nx-klarna-method");
      klarnaNotice.hidden = true;
      secure.append(klarnaNotice);
      summary.append(secure);
      const review = anchor("View order summary", "#nx-bag-summary", "nx-bag-summary-jump nx-shop-link");
      review.addEventListener("click", () => summary.focus({preventScroll:true}));
      bagCount.insertAdjacentElement("afterend", review);
      let promoSupported = false;
      let accountPromoSupported = false;
      let privilegesSupported = false;
      let promoQuote = null;
      let restoredAttemptBlocked = false;
      try {
        const raw = JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) || "null");
        const restored = restoreCheckoutAttempt(raw,bag,consumerAccess()?"account":"guest");
        if (restored) {
          lastAttempt = restored;
          checkoutUncertain = true;
          restoredAttemptBlocked = !restored.resumable;
          promoQuote = restored.quote;
        }
      } catch {}
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
      if (promoQuote) promoInput.value = promoQuote.promotionCode;
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
      const privileges = make("section", "nx-bag-privileges");
      privileges.hidden = true;
      const privilegeHeading = make("h3", null, "Your privileges");
      privilegeHeading.id = "nx-bag-privileges-heading";
      privileges.setAttribute("aria-labelledby", privilegeHeading.id);
      const privilegeStatus = make("p", "nx-store-note", "Personal offers are available to eligible signed-in customers.");
      privilegeStatus.setAttribute("role", "status");
      const privilegeList = make("div", "nx-bag-privilege-list");
      const privilegeRefresh = make("button", "nx-compare-control", "Check my offers");
      privilegeRefresh.type = "button";
      const privilegeSignIn = anchor("Sign in to discover your privileges", SHOP_URL + "account/", "nx-shop-link");
      privileges.append(privilegeHeading, privilegeStatus, privilegeList, privilegeRefresh, privilegeSignIn);
      promoSection.after(privileges);
      let privilegeToken = null;
      let privilegeLoading = false;
      let privilegeSequence = 0;
      const loadPrivileges = async () => {
        const token = consumerAccess();
        if (!privilegesSupported || !approvedRelease || !token || privilegeLoading ||
            checkoutInFlight || checkoutUncertain || awaitingOrder || confirmedOrder) return;
        const sequence = ++privilegeSequence;
        privilegeToken = token;
        privilegeLoading = true;
        privilegeList.replaceChildren();
        privilegeStatus.textContent = "Checking your available privileges…";
        render();
        try {
          const response = await fetch(CHECKOUT_API_ORIGIN + "/account/privileges", {
            method:"GET", credentials:"omit", mode:"cors", cache:"no-store",
            redirect:"error", referrerPolicy:"no-referrer",
            headers:{authorization:"Bearer " + token, Accept:"application/json"}
          });
          const payload = response.ok ? await response.json() : null;
          if (sequence !== privilegeSequence || token !== consumerAccess()) return;
          const stages = {
            no_recorded_paid_orders:"Welcome to NovaPharm. No paid orders are recorded for this account.",
            one_paid_order:"Thank you for shopping with us. Your next purchase would be your second recorded paid order.",
            two_paid_orders:"Welcome back. Two paid orders are recorded for this account.",
            three_or_more_paid_orders:"Thank you for your continued trust in NovaPharm.",
            unknown:"We could not establish your purchase stage."
          };
          if (!payload || payload.coverage !== "recorded_account_paid_orders_only" ||
              !Object.hasOwn(stages,payload.stage) || !Array.isArray(payload.offers) || payload.offers.length > 8) throw new Error("unavailable");
          privilegeStatus.textContent = stages[payload.stage] +
            (payload.offers.length ? " Select an available offer to check your bag." : " No approved offers are available for this account right now.");
          for (const offer of payload.offers) {
            if (!offer || !/^[A-Z0-9_-]{3,32}$/.test(offer.code || "") ||
                typeof offer.title !== "string" || offer.title.length > 80 ||
                !Number.isSafeInteger(offer.discountBps) || offer.discountBps < 1 || offer.discountBps > 5000 ||
                !Number.isSafeInteger(offer.minimumGrossMinor) || offer.minimumGrossMinor < 0) continue;
            const row = make("div", "nx-bag-privilege");
            const details = make("div");
            const title = make("strong", null, offer.title);
            const description = make("p", null, (offer.discountBps / 100) + "% off eligible products" +
              (offer.minimumGrossMinor ? " · Minimum eligible spend " + formatGBP(offer.minimumGrossMinor) : "") + ". Terms apply.");
            const apply = make("button", "nx-compare-control", "Apply");
            apply.type = "button";
            apply.setAttribute("aria-label", "Apply " + offer.title);
            apply.addEventListener("click", () => {
              if (token !== consumerAccess() || promoQuote || promoPending || checkoutInFlight || checkoutUncertain || awaitingOrder || confirmedOrder) return;
              promoSection.open = true;
              promoInput.value = offer.code;
              void requestPromotion();
            });
            details.append(title, description);
            row.append(details,apply);
            privilegeList.append(row);
          }
        } catch {
          if (sequence === privilegeSequence) privilegeStatus.textContent = "We could not check your privileges. Please try again.";
        } finally {
          if (sequence === privilegeSequence) { privilegeLoading = false; render(); }
        }
      };
      privilegeRefresh.addEventListener("click", () => void loadPrivileges());
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
          const accountToken = accountPromoSupported ? consumerAccess() : null;
          const quoteHeaders = {"content-type":"application/json"};
          if (accountToken) quoteHeaders.authorization = "Bearer " + accountToken;
          const quotePath = accountToken ? "/account/quote" : "/quote";
          const response = await fetch(CHECKOUT_API_ORIGIN + quotePath, {
            method:"POST", mode:"cors", credentials:"omit",
            headers:quoteHeaders,
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
        const focused = document.activeElement?.dataset?.nxBagFocus;
        const nextCount = count(bag) + (count(bag) === 1 ? " item" : " items");
        if (bagCount.textContent !== nextCount) bagCount.textContent = nextCount;
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
          if(p.image) image.src = p.image; else image.hidden=true; image.alt = p.name + " pack"; image.loading = "lazy"; image.width = 96; image.height = 96;
          const details = make("div");
          const name = make("h2", null, p.name);
          const pack = make("p", "nx-bag-pack", p.pack);
          const price = make("p", "nx-bag-price", productPriceLabel(p, data));
          const actions = make("div", "nx-bag-actions");
          const label = make("div", "nx-bag-quantity");
          label.setAttribute("role", "group");
          label.setAttribute("aria-label", "Quantity for " + p.name);
          const quantityInput = make("input");
          quantityInput.type = "number";
          quantityInput.min = "1";
          quantityInput.max = String(MAX_PER_SKU);
          quantityInput.step = "1";
          quantityInput.inputMode = "numeric";
          quantityInput.value = String(line.quantity);
          quantityInput.disabled = locked;
          quantityInput.setAttribute("aria-label", "Quantity for " + p.name);
          quantityInput.dataset.nxBagFocus = p.sku + ":quantity";
          const setQuantity = (quantity) => {
            if (locked) return;
            if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_PER_SKU) {
              quantityInput.value = String(line.quantity);
              return;
            }
            if (promoQuote || promoPending) clearPromotion("Bag updated. Apply your promotional code again.");
            bag = bag.map((v) => v.sku === p.sku ? { sku: p.sku, quantity } : v);
            saveBag(bag); updateNav(); render();
          };
          quantityInput.addEventListener("change", () => setQuantity(Number(quantityInput.value)));
          const step = (delta, text, verb) => {
            const button = make("button", null, text);
            button.type = "button";
            button.setAttribute("aria-label", verb + " quantity for " + p.name);
            button.dataset.nxBagFocus = p.sku + ":" + verb;
            button.disabled = locked || (delta < 0 ? line.quantity <= 1 : line.quantity >= MAX_PER_SKU);
            button.addEventListener("click", () => setQuantity(line.quantity + delta));
            return button;
          };
          label.append(step(-1, "−", "Decrease"), quantityInput, step(1, "+", "Increase"));
          const remove = make("button", "nx-bag-remove", "Remove");
          remove.type = "button";
          remove.disabled = locked;
          remove.dataset.nxBagFocus = p.sku + ":remove";
          remove.setAttribute("aria-label", "Remove " + p.name);
          remove.addEventListener("click", () => {
            if (locked) return;
            if (promoQuote || promoPending) clearPromotion("Bag updated. Apply your promotional code again.");
            bag = bag.filter((v) => v.sku !== p.sku);
            saveBag(bag); updateNav(); render();
          });
          const unit = publicPrice(p, data);
          const lineTotal = make("p", "nx-bag-line-total", unit === null ? "Pending" : formatGBP(unit * line.quantity));
          actions.append(label, lineTotal, remove);
          details.append(name, pack, price, actions);
          item.append(image, details);
          list.append(item);
        }
        // Catalogue browse shelf, not personalised supplement advice.
        const suggestions = locked || confirmedOrder ? [] : bagDiscoveryProducts(bag, data);
        discovery.hidden = suggestions.length === 0;
        discoveryGrid.replaceChildren();
        for (const p of suggestions) {
          const card = make("article", "nx-bag-discover-card");
          const image = make("img");
          image.src = p.image; image.alt = p.name + " pack"; image.loading = "lazy"; image.width = 120; image.height = 120;
          const title = make("h3", null, p.name);
          const add = make("button", "nx-store-add", "Add to Bag");
          add.type = "button";
          add.dataset.nxBagFocus = p.sku + ":discover";
          add.setAttribute("aria-label", "Add " + p.name + " to Bag");
          add.addEventListener("click", () => {
            if (locked || confirmedOrder) return;
            if (promoQuote || promoPending) clearPromotion("Bag updated. Apply your promotional code again.");
            put(p.sku, 1);
            render();
          });
          card.append(image, title, make("p", null, p.pack), make("p", null, productPriceLabel(p, data)), add);
          discoveryGrid.append(card);
        }
        if (focused) {
          const targets = Array.from(container.querySelectorAll("[data-nx-bag-focus]"));
          const exact = targets.find(el => el.dataset.nxBagFocus === focused && !el.disabled);
          const sameProduct = targets.find(el => el.dataset.nxBagFocus === focused.split(":")[0] + ":quantity" && !el.disabled);
          const fallback = targets.find(el => !el.disabled);
          (exact || sameProduct || fallback || container.querySelector(".nx-shop-link"))?.focus();
        }
        const subtotalMinor = basketSubtotal(bag, data);
        const ready = !!(approvedRelease && bag.length > 0 && subtotalMinor !== null && bag.every((line) => merchantSaleReady(productMap.get(line.sku), data)) && !confirmedOrder && !awaitingOrder && !checkoutInFlight && !promoPending && !restoredAttemptBlocked);
        // A public catalogue flag or browser price NEVER authorises a charge; the
        // server independently verifies all release evidence and recalculates totals.
        const indicative = data.price_authority === "owner_authorized_provisional_public_display";
        subtotal.textContent = subtotalMinor === null ? "Pending" : (indicative ? "Guide " : "") + formatGBP(subtotalMinor);
        const ukDeliveryIncluded = indicative && data.provisional_uk_delivery_charge_pence === 0 &&
          data.provisional_uk_delivery_cost_seller_funded === true;
        shipping.textContent = ready ? "Included · UK" : (ukDeliveryIncluded ? "£0.00 · UK only" : "Not confirmed");
        tax.textContent = bag.some(line=>CP_SKU.test(line.sku))?"Applicable UK VAT included":"20% UK VAT included";
        promoSection.hidden = !promoSupported || !approvedRelease || !bag.length || !!confirmedOrder || !!awaitingOrder;
        privileges.hidden = promoSection.hidden || !privilegesSupported;
        const currentPrivilegeToken = consumerAccess();
        if (privilegeToken !== currentPrivilegeToken) {
          privilegeSequence++;
          privilegeToken = currentPrivilegeToken;
          privilegeLoading = false;
          privilegeList.replaceChildren();
          privilegeStatus.textContent = currentPrivilegeToken ? "Check your account for available personal offers." : "Personal offers are available to eligible signed-in customers.";
        }
        privilegeSignIn.hidden = !!currentPrivilegeToken;
        privilegeRefresh.hidden = !currentPrivilegeToken;
        privilegeRefresh.disabled = locked || privilegeLoading || promoPending;
        for (const button of privilegeList.querySelectorAll("button")) button.disabled = locked || promoPending || !!promoQuote;
        promoInput.disabled = locked || promoPending || !!promoQuote;
        promoApply.disabled = locked || promoPending || !bag.length;
        promoApply.textContent = promoPending ? "Checking…" : promoQuote ? "Remove" : "Apply";
        discountRow.hidden = !promoQuote;
        discountAmount.textContent = promoQuote ? "−" + formatGBP(promoQuote.discountGrossMinor) : "";
        if (promoQuote) subtotal.textContent = formatGBP(promoQuote.originalGrossMinor);
        grand.textContent = promoQuote ? formatGBP(promoQuote.totalGrossMinor) : subtotalMinor === null ? "Not available" : formatGBP(subtotalMinor);
        const paymentNotice = klarnaCheckoutNotice(ready && !checkoutUncertain);
        klarnaNotice.textContent = paymentNotice;
        klarnaNotice.hidden = !paymentNotice;
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
          : restoredAttemptBlocked
          ? "An earlier checkout needs reconciliation. Check order NUT-" + lastAttempt.id + " or contact support before starting another payment."
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
            const basketId = basketAttemptId(bag,promoQuote);
            let stored;
            try { stored = JSON.parse(sessionStorage.getItem("np-retail-checkout-attempt") || "null"); }
            catch { stored = null; }
            const accountToken=consumerAccess();
            const mode=accountToken?"account":"guest";
            if (checkoutUncertain && (!lastAttempt || lastAttempt.basket !== basketId || lastAttempt.mode !== mode)) throw new Error("Original checkout cannot be resumed safely");
            const reusedAttempt = (lastAttempt?.basket === basketId && lastAttempt.mode === mode) || (stored?.basket === basketId && stored.mode === mode && REQUEST_ID.test(stored?.id || ""));
            const requestId = lastAttempt?.basket === basketId && lastAttempt.mode === mode ? lastAttempt.id : stored?.basket === basketId && stored.mode === mode && REQUEST_ID.test(stored?.id || "")
              ? stored.id : crypto.randomUUID();
            lastAttempt={basket:basketId,id:requestId,mode,quote:promoQuote};
            // Persist the exact quote before any provider request. If storage
            // is unavailable, do not open an unresumable payment.
            sessionStorage.setItem(ATTEMPT_KEY,JSON.stringify(lastAttempt));
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
            if (response.status === 422 && promoQuote && !checkoutUncertain && !reusedAttempt) {
              const rejection = await response.json().catch(() => null);
              // These specific server errors occur before any order write or
              // payment creation. Never unlock an ambiguous provider response.
              if (["promo_quote_changed","promo_code_unavailable","promo_code_not_applicable","invalid_promo_code"].includes(rejection?.error)) {
                const oldCode = promoQuote.promotionCode;
                clearPromotion("Your promotional offer has changed. Apply the code again to confirm the new total.");
                promoInput.value = oldCode;
                promoSection.open = true;
                lastAttempt = null;
                try { sessionStorage.removeItem("np-retail-checkout-attempt"); } catch {}
                checkoutInFlight = false;
                render();
                promoInput.focus();
                return;
              }
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
      if (query.get("checkout") === "return" && (!lastAttempt || returnedOrder === "NUT-"+lastAttempt.id) && /^NUT-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(returnedOrder || "")) {
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
              checkoutUncertain=false;restoredAttemptBlocked=false;lastAttempt=null;clearPromotion();
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
              checkoutUncertain=false;restoredAttemptBlocked=false;lastAttempt=null;clearPromotion();
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
          accountPromoSupported = v?.account_promotion_preview_supported === true;
          privilegesSupported = accountPromoSupported && v?.account_privileges_supported === true;
        } catch { approvedRelease=false; }
        render();
        if (privilegesSupported && consumerAccess() && bag.length) void loadPrivileges();
      })();
    }
  } else if(path.startsWith(MULTIBRAND_URL) || path===MULTIBRAND_URL.slice(0,-1)){
    for(const host of document.querySelectorAll("[data-npr-retail-sku]")){
      const p=productMap.get(host.dataset.nprRetailSku);
      if(!p || !merchantSaleReady(p,data) || publicPrice(p,data)===null) continue;
      const panel=make("section","nx-store-panel");
      panel.setAttribute("aria-label","Online ordering");
      panel.append(make("p","nx-store-price",formatGBP(publicPrice(p,data))),make("p","nx-store-note",p.vatBasisPoints/100+"% UK VAT · UK delivery included"));
      if(p.supplyModel==="supplier_backed")panel.append(make("p","nx-store-note","Supplier-backed order. Availability is confirmed after purchase. If the supplier cannot fulfil, NovaPharm will refund promptly."));
      const options=make("div","nx-store-options");
      const label=make("label","nx-store-qty-label","Quantity");
      const qty=make("select","nx-store-qty");
      for(let i=1;i<=Math.min(10,p.availableQuantity);i++){const opt=make("option",null,String(i));opt.value=String(i);qty.append(opt);}
      label.append(qty);
      const add=make("button","nx-store-add","Add to Bag");add.type="button";add.onclick=()=>put(p.sku,Number(qty.value));
      const buy=make("button","nx-store-add nx-store-buy-now","Buy now");buy.type="button";buy.onclick=()=>{if(put(p.sku,Number(qty.value)))window.location.assign(BAG_URL);};
      options.append(label,add,buy);panel.append(options);
      const detailLink = host.querySelector('a.npr-card-action[href^="/products/health-and-wellbeing/"]');
      host.replaceChildren(panel);
      if (detailLink) host.append(detailLink);
      host.closest('main')?.querySelector('[data-npr-order-notice]')?.setAttribute('hidden', '');
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
      const klarnaNotice = make("p", "nx-store-note nx-klarna-method");
      klarnaNotice.hidden = true;
      panel.append(klarnaNotice);
      if (merchantSaleReady(p, data)) void (async () => {
        try {
          const response = await fetch(CHECKOUT_API_ORIGIN + "/readiness",
            {credentials:"omit",cache:"no-store",mode:"cors"});
          const status = response.ok ? await response.json() : null;
          const message = klarnaCheckoutNotice(status?.checkout_ready === true &&
            status?.payment_collection_active === true && status?.origin === "novapharmhealthcare.com");
          klarnaNotice.textContent = message;
          klarnaNotice.hidden = !message;
        } catch { klarnaNotice.hidden = true; }
      })();
      const pack = copy.querySelector(".npd-product-pack");
      if (pack) pack.insertAdjacentElement("afterend", panel);
      else copy.prepend(panel);
    }
  }
  updateNav();
}

export const GIFT_DENOMINATIONS = Object.freeze([1000,2500,5000,10000,25000]);

// Payment-method identification only: no credit or instalment advertising.
export function klarnaCheckoutNotice(ready) {
  return ready === true ? "Choose Klarna at checkout. Availability depends on eligibility." : "";
}

export function giftPreviewAmount(value) {
  const amount = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return GIFT_DENOMINATIONS.includes(amount) ? amount : null;
}

function mountGiftPreview(main) {
  const amountLabel = main.querySelector("[data-nx-gift-value]");
  const totalLabel = main.querySelector("[data-nx-gift-total]");
  const options = main.querySelectorAll('input[name="nx-gift-amount"]');
  for (const input of options) {
    input.addEventListener("change", () => {
      const amount = giftPreviewAmount(input.value);
      if (!input.checked || amount === null) return;
      amountLabel.textContent = formatGBP(amount).replace(/\.00$/, "");
      totalLabel.textContent = formatGBP(amount);
    });
  }
  // Preview intentionally has no purchase request, personal data or redirect.
}

async function init() {
  if (typeof document === "undefined") return;
  const path = window.location.pathname;
  if ((!path.startsWith(SHOP_URL) && !path.startsWith(MULTIBRAND_URL)) || path.startsWith(SHOP_URL + "order-request/")) return;
  if (path === SHOP_URL + "gift-cards/" || path === SHOP_URL + "gift-cards") {
    const preview = document.querySelector("[data-nx-gift-preview]");
    if (preview) mountGiftPreview(preview);
    return;
  }
  installStyle();
  try {
    const response = await fetch(CATALOGUE_URL, { cache: "no-store", credentials: "omit" });
    if (!response.ok) throw new Error("Catalogue unavailable");
    const catalogue = await response.json();
    if (!catalogueIsSafe(catalogue)) throw new Error("Unverified catalogue");
    let offers=null,saved=[];
    try { saved=JSON.parse(localStorage.getItem(BAG_KEY)||"[]"); }catch{}
    // Preserve the original Nutraxin-only journey: no calls to an unreleased endpoint.
    const needsExtra=path.startsWith(MULTIBRAND_URL)||(Array.isArray(saved)&&saved.some(line=>CP_SKU.test(line?.sku||"")));
    try {
      if(needsExtra){
      const extra=await fetch(CHECKOUT_API_ORIGIN+"/retail/offers",{cache:"no-store",credentials:"omit",mode:"cors",signal:AbortSignal.timeout(9000)});
      if(extra.ok) offers=await extra.json();
      }
    }catch{}
    runStore(mergeRetailOffers(catalogue,offers,saved));
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
