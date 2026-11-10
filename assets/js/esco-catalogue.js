const root = document.querySelector("[data-esco-catalogue]");
if (root) {
  const input = root.querySelector("[data-esco-search]");
  const filter = root.querySelector("[data-esco-category]");
  const counter = root.querySelector("[data-esco-visible-count]");
  const noResults = root.querySelector("[data-esco-no-results]");
  const readyToggle = root.querySelector("[data-esco-ready-only]");
  const clearFilters = root.querySelector("[data-esco-reset-filters]");
  const topBagCount = root.querySelector("[data-esco-top-bag-count]");
  const mobileBag = root.querySelector("[data-esco-mobile-bag]");
  const mobileCount = root.querySelector("[data-esco-mobile-count]");
  const feedback = root.querySelector("[data-esco-cart-feedback]");
  const dialog = root.querySelector("[data-esco-product-dialog]");
  const dialogClose = root.querySelector("[data-esco-dialog-close]");
  const readyPrices = new Map();

  const sections = [...root.querySelectorAll("[data-esco-section]")];
  const entries = [...root.querySelectorAll("[data-esco-entry]")];
  const folded = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-GB").trim();
  const apply = () => {
    const search = folded(input?.value);
    const category = filter?.value || "";
    let visible = 0;
    for (const item of entries) {
      const matched = (!category || item.dataset.escoCategory === category) &&
        (!search || folded(item.dataset.escoSearch).includes(search)) &&
        (!readyToggle?.checked || readyPrices.has(item.dataset.escoCatalogueId));
      item.hidden = !matched;
      if (matched) visible++;
    }
    for (const section of sections) {
      section.hidden = ![...section.querySelectorAll("[data-esco-entry]")].some((item) => !item.hidden);
      for (const heading of section.querySelectorAll("[data-esco-subcategory]")) {
        const grid = heading.nextElementSibling;
        const matched = grid && [...grid.querySelectorAll("[data-esco-entry]")].some((item) => !item.hidden);
        heading.hidden = !matched;
        if (grid) grid.hidden = !matched;
      }
    }
    if (counter) counter.textContent = visible + " catalogue entries";
    if (clearFilters) clearFilters.hidden = !(search || category || readyToggle?.checked);
    if (noResults) noResults.hidden = visible !== 0;
  };
  input?.addEventListener("input", apply);
  filter?.addEventListener("change", apply);
  readyToggle?.addEventListener("change", apply);
  clearFilters?.addEventListener("click", () => {
    if (input) input.value = "";
    if (filter) filter.value = "";
    if (readyToggle) readyToggle.checked = false;
    apply();
    input?.focus();
  });
  apply();

  // The catalogue stores only references and quantities. Approved payment prices
  // are read from the server; Stripe alone collects card information.
  const known = new Map(entries.map((entry) => [
    entry.dataset.escoAdd || entry.querySelector("[data-esco-add]")?.dataset.escoAdd,
    { name: entry.querySelector("h4")?.textContent?.trim() || "",
      model: entry.querySelector(".esco-model")?.textContent?.trim() || "",
      guidePence: Math.round(Number(entry.dataset.escoPrice || 0) * 100) }
  ]).filter(([id, item]) => /^ESCO-CAT-\d{4}$/.test(id || "") && item.name));
  const KEY = "novapharm-esco-quote-list-v1";
  const MAX_ITEMS = 12;
  const state = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(saved)) for (const row of saved.slice(0, MAX_ITEMS)) {
      if (known.has(row?.id) && Number.isSafeInteger(row.quantity) && row.quantity >= 1 && row.quantity <= 10000)
        state.set(row.id, row.quantity);
    }
  } catch { /* Private browsing may disable storage. Quote list still works in memory. */ }

  const list = root.querySelector("[data-esco-quote-items]");
  const count = root.querySelector("[data-esco-quote-count]");
  const send = root.querySelector("[data-esco-send-quote]");
  const clear = root.querySelector("[data-esco-clear-quote]");
  const subtotalNode = root.querySelector("[data-esco-subtotal]");
  const GBP = new Intl.NumberFormat("en-GB", {style:"currency",currency:"GBP"});
  async function syncShopAvailability() {
    const cfgResponse = await fetch("/assets/data/esco-checkout-config.json", {credentials:"omit",cache:"no-store"});
    if (!cfgResponse.ok) return;
    const cfg = await cfgResponse.json();
    if (cfg?.enabled !== true || typeof cfg.api_origin !== "string") return;
    let url;
    try { url = new URL(cfg.api_origin); } catch { return; }
    if (url.protocol !== "https:" ||
        !/^[a-z0-9]+\.execute-api\.eu-north-1\.amazonaws\.com$/.test(url.hostname) ||
        url.pathname !== "/") return;
    const res = await fetch(url.origin + "/readiness", {
      credentials:"omit",cache:"no-store",headers:{"accept":"application/json"}
    });
    if (!res.ok) return;
    const body = await res.json();
    if (body?.checkout_ready !== true || body?.payment_collection_active !== true ||
        !Array.isArray(body.approved_catalogue_ids)) return;
    const prices = body.approved_unit_prices_pence || {};
    for (const id of body.approved_catalogue_ids) {
      const value = prices[id];
      if (!/^ESCO-CAT-\d{4}$/.test(id) || !known.has(id) ||
          !Number.isSafeInteger(value) || value <= 0 || value > 99999999) continue;
      readyPrices.set(id,value);
      const card = root.querySelector('[data-esco-catalogue-id="' + id + '"]');
      if (card) {
        const primary = card.querySelector("[data-esco-price-primary]");
        const note = card.querySelector("[data-esco-price-note]");
        const status = card.querySelector("[data-esco-status]");
        if (primary) primary.textContent = GBP.format(value / 100);
        if (note) note.textContent = "UK delivery included · ex VAT";
        if (status) {status.textContent="Ready to order"; status.classList.add("is-ready");}
        card.classList.add("esco-product-ready");
      }
      const spotlight = root.querySelector('[data-esco-live-price="' + id + '"]');
      if (spotlight) spotlight.textContent = GBP.format(value / 100) + " · UK delivered, ex VAT";
      const spotlightCard = root.querySelector('[data-esco-spotlight="' + id + '"]');
      const spotlightLabel = spotlightCard?.querySelector(".esco-spotlight-label");
      if (spotlightLabel) spotlightLabel.textContent = "READY TO ORDER";
    }
    if (readyToggle) {
      readyToggle.disabled = readyPrices.size === 0;
      if (readyPrices.size && new URLSearchParams(window.location.search).get("availability") === "ready") readyToggle.checked = true;
      readyToggle.title = readyPrices.size
        ? "Show only products currently available for secure card checkout"
        : "No products currently available for immediate card checkout";
    }
    render();
    apply();
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify([...state].map(([id,quantity]) => ({id,quantity})))); }
    catch { /* In-memory fallback. */ }
  }
  function render() {
    if (!list || !send) return;
    list.replaceChildren();
    for (const [id, quantity] of state) {
      const item = known.get(id);
      if (!item) continue;
      const li = document.createElement("li");
      const title = document.createElement("span");
      const trustedPence = readyPrices.get(id);
      title.textContent = item.name + (item.model && item.model !== "Model to be confirmed" ? " · " + item.model : "") +
        " · " + (trustedPence ? "UK delivered " : "Base price ") + GBP.format((trustedPence ?? item.guidePence) / 100) + " ex VAT";
      const label = document.createElement("label");
      label.textContent = "Qty ";
      const qty = document.createElement("input");
      qty.type = "number"; qty.min = "1"; qty.max = "10000"; qty.step = "1";
      qty.value = String(quantity); qty.dataset.escoQty = id;
      qty.setAttribute("aria-label", "Quantity of " + item.name);
      label.append(qty);
      const remove = document.createElement("button");
      remove.type = "button"; remove.dataset.escoRemove = id; remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + item.name + " from quotation");
      li.append(title, label, remove);
      list.append(li);
    }
    const countText = state.size + (state.size === 1 ? " product in Bag" : " products in Bag");
    const pennies = [...state].reduce((sum,[id,quantity]) => sum + Math.max(0,readyPrices.get(id) ?? known.get(id)?.guidePence ?? 0) * quantity,0);
    if(subtotalNode) subtotalNode.textContent=GBP.format(pennies / 100);
    if (count) count.textContent = countText;
    if (topBagCount) topBagCount.textContent = String(state.size);
    if (mobileCount) mobileCount.textContent = String(state.size);
    if (mobileBag) mobileBag.hidden = state.size === 0;
    const readyBasket = state.size > 0 && [...state.keys()].every(id => readyPrices.has(id));
    const miniLabel = root.querySelector(".esco-mini-bag-value > span");
    const miniNote = root.querySelector(".esco-mini-bag-value > small");
    if (miniLabel) miniLabel.textContent = readyBasket ? "UK delivered subtotal" : "Estimated subtotal";
    if (miniNote) miniNote.textContent = readyBasket
      ? "Ex VAT · final tax shown at secure checkout"
      : "Base price excludes delivery and VAT · confirmed before acceptance";
    if (clear) clear.disabled = state.size === 0;
    const lines = [...state].map(([id, quantity]) => id + " qty " + quantity);
    const text = "ESCO Anand UK quotation request (catalogue 2026). Items: " + lines.join("; ") + ". Please confirm exact variants, UK compliance, price ex VAT, delivery and lead times.";
    send.href = "/contact/?enquiry=" + encodeURIComponent("Distribution partnership") + "&quote=" + encodeURIComponent(text);
    send.setAttribute("aria-disabled", state.size === 0 ? "true" : "false");
    send.tabIndex = state.size === 0 ? -1 : 0;
    for (const button of root.querySelectorAll("[data-esco-add]")) {
      const selected = state.has(button.dataset.escoAdd);
      button.textContent = selected ? "In your Bag" : "Add to Bag";
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label",(selected?"In Bag: ":"Add to Bag: ") + (known.get(button.dataset.escoAdd)?.name || "ESCO product"));
    }
  }

  let notificationTimer;
  function notify(message) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.add("is-visible");
    clearTimeout(notificationTimer);
    notificationTimer = setTimeout(() => feedback.classList.remove("is-visible"), 2600);
  }
  function openProductDetails(id) {
    const card = root.querySelector('[data-esco-catalogue-id="' + id + '"]');
    if (!dialog || !card || !known.has(id)) return;
    const picture = dialog.querySelector("[data-esco-dialog-picture]");
    const source = card.querySelector(".esco-product-visual");
    if (picture && source) picture.replaceChildren(source.cloneNode(true));
    const title = dialog.querySelector("[data-esco-dialog-title]");
    const model = dialog.querySelector("[data-esco-dialog-model]");
    const price = dialog.querySelector("[data-esco-dialog-price]");
    const provenance = dialog.querySelector("[data-esco-dialog-provenance]");
    const add = dialog.querySelector("[data-esco-dialog-add]");
    const item = known.get(id);
    if (title) title.textContent = item.name;
    if (model) model.textContent = (item.model || "Model to confirm") + " · " + card.dataset.escoCategory;
    if (price) price.textContent = (readyPrices.has(id) ? "UK delivered " : "Base price ") +
      GBP.format((readyPrices.get(id) ?? item.guidePence) / 100) +
      (readyPrices.has(id) ? " ex VAT · secure checkout available" : " ex VAT · delivery confirmed before acceptance");
    if (provenance) provenance.textContent =
      card.querySelector(".esco-product-art-caption")?.textContent?.trim() ||
      "Product imagery is illustrative; specification to confirm";
    if (add) { add.dataset.escoAdd = id; add.textContent = state.has(id) ? "In your Bag" : "Add to Bag"; }
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open","");
    dialogClose?.focus();
  }
  dialogClose?.addEventListener("click",() => dialog?.close());
  dialog?.addEventListener("click",event => { if (event.target === dialog) dialog.close(); });
  root.addEventListener("click", (event) => {
    const jump = event.target.closest("[data-esco-spotlight-jump]");
    if (jump && root.contains(jump)) {
      event.preventDefault();
      // A selected product opens immediately, without discarding the customer's
      // current search or scrolling them away from the featured selection.
      openProductDetails(jump.dataset.escoSpotlightJump);
      return;
    }
    const details = event.target.closest("[data-esco-details]");
    if (details && root.contains(details)) {
      openProductDetails(details.dataset.escoDetails);
      return;
    }
    const add = event.target.closest("[data-esco-add]");
    if (add && root.contains(add)) {
      const id = add.dataset.escoAdd;
      if (known.has(id) && (state.has(id) || state.size < MAX_ITEMS)) {
        state.set(id, state.get(id) || 1); persist(); render();
        notify((known.get(id)?.name || "Product") + " added to your Bag.");
        if (dialog?.open) dialog.close();
        if (state.size === MAX_ITEMS) add.title = "Up to 12 products per Bag";
      } else if (known.has(id)) {
        const countNode = root.querySelector("[data-esco-quote-count]");
        if (countNode) countNode.textContent = "Your Bag holds up to 12 different product references";
      }
      return;
    }
    const remove = event.target.closest("[data-esco-remove]");
    if (remove && root.contains(remove)) { state.delete(remove.dataset.escoRemove); persist(); render(); return; }
    if (event.target.closest("[data-esco-clear-quote]")) { state.clear(); persist(); render(); return; }
    if (event.target.closest("[data-esco-send-quote]") && state.size === 0) event.preventDefault();
  });
  root.addEventListener("change", (event) => {
    const el = event.target.closest("[data-esco-qty]");
    if (!el || !root.contains(el)) return;
    const quantity = Number(el.value);
    if (state.has(el.dataset.escoQty) && Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 10000)
      state.set(el.dataset.escoQty, quantity);
    persist(); render();
  });
  render();
  syncShopAvailability().catch(() => { /* Catalogue remains available for enquiry. */ });
}
