const root = document.querySelector("[data-esco-catalogue]");
if (root) {
  const input = root.querySelector("[data-esco-search]");
  const filter = root.querySelector("[data-esco-category]");
  const counter = root.querySelector("[data-esco-visible-count]");
  const noResults = root.querySelector("[data-esco-no-results]");
  const sections = [...root.querySelectorAll("[data-esco-section]")];
  const entries = [...root.querySelectorAll("[data-esco-entry]")];
  const folded = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-GB").trim();
  const apply = () => {
    const search = folded(input?.value);
    const category = filter?.value || "";
    let visible = 0;
    for (const item of entries) {
      const matched = (!category || item.dataset.escoCategory === category) &&
        (!search || folded(item.dataset.escoSearch).includes(search));
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
    if (noResults) noResults.hidden = visible !== 0;
  };
  input?.addEventListener("input", apply);
  filter?.addEventListener("change", apply);
  apply();

  // This is a non-binding quotation list. It never collects card details or places orders.
  const known = new Map(entries.map((entry) => [
    entry.dataset.escoAdd || entry.querySelector("[data-esco-add]")?.dataset.escoAdd,
    { name: entry.querySelector("h4")?.textContent?.trim() || "",
      model: entry.querySelector(".esco-model")?.textContent?.trim() || "" }
  ]).filter(([id, item]) => /^ESCO-CAT-\d{4}$/.test(id || "") && item.name));
  const KEY = "novapharm-esco-quote-list-v1";
  const MAX_ITEMS = 12;
  const state = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(saved)) for (const row of saved.slice(0, MAX_ITEMS)) {
      if (known.has(row?.id) && Number.isSafeInteger(row.quantity) && row.quantity >= 1 && row.quantity <= 1000)
        state.set(row.id, row.quantity);
    }
  } catch { /* Private browsing may disable storage. Quote list still works in memory. */ }

  const list = root.querySelector("[data-esco-quote-items]");
  const count = root.querySelector("[data-esco-quote-count]");
  const send = root.querySelector("[data-esco-send-quote]");
  const clear = root.querySelector("[data-esco-clear-quote]");
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
      title.textContent = item.name + (item.model && item.model !== "Model to be confirmed" ? " · " + item.model : "");
      const label = document.createElement("label");
      label.textContent = "Qty ";
      const qty = document.createElement("input");
      qty.type = "number"; qty.min = "1"; qty.max = "1000"; qty.step = "1";
      qty.value = String(quantity); qty.dataset.escoQty = id;
      qty.setAttribute("aria-label", "Quantity of " + item.name);
      label.append(qty);
      const remove = document.createElement("button");
      remove.type = "button"; remove.dataset.escoRemove = id; remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + item.name + " from quotation");
      li.append(title, label, remove);
      list.append(li);
    }
    const countText = state.size + (state.size === 1 ? " item selected" : " items selected");
    if (count) count.textContent = countText;
    if (clear) clear.disabled = state.size === 0;
    const lines = [...state].map(([id, quantity]) => {
      const item = known.get(id);
      return id + " | " + item.name + " | " + item.model + " | qty " + quantity;
    });
    const text = "ESCO Anand UK procurement enquiry. Please provide item specifications, confirmed compliant supply, itemised landed prices, delivery and lead times. Requested items: " + lines.join("; ");
    send.href = "/contact/?enquiry=" + encodeURIComponent(text.slice(0, 1700));
    send.setAttribute("aria-disabled", state.size === 0 ? "true" : "false");
    send.tabIndex = state.size === 0 ? -1 : 0;
    for (const button of root.querySelectorAll("[data-esco-add]")) {
      const selected = state.has(button.dataset.escoAdd);
      button.textContent = selected ? "Added to quote list" : "Add to quote list";
      button.setAttribute("aria-pressed", String(selected));
    }
  }
  root.addEventListener("click", (event) => {
    const add = event.target.closest("[data-esco-add]");
    if (add && root.contains(add)) {
      const id = add.dataset.escoAdd;
      if (known.has(id) && (state.has(id) || state.size < MAX_ITEMS)) {
        state.set(id, state.get(id) || 1); persist(); render();
        if (state.size === MAX_ITEMS) add.title = "Up to 12 item references per enquiry";
      } else if (known.has(id)) {
        const countNode = root.querySelector("[data-esco-quote-count]");
        if (countNode) countNode.textContent = "Up to 12 different references per request";
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
    if (state.has(el.dataset.escoQty) && Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 1000)
      state.set(el.dataset.escoQty, quantity);
    persist(); render();
  });
  render();
}
