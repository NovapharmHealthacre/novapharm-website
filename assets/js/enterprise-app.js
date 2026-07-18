const pageModule = document.body.dataset.enterpriseModule || "";
let currentSnapshot = null;

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}

async function enterpriseRequest(path, options = {}) {
  try {
    return await window.NovaPharmApi.request(path, options);
  } catch (error) {
    if (error.status === 401) {
      window.location.href = "/portal/";
      return null;
    }
    throw error;
  }
}

async function csrfHeaders() {
  return { "Content-Type": "application/json", "x-csrf-token": await window.NovaPharmApi.csrf() };
}

function money(minor, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(minor || 0) / 100);
}

function readableStatus(value) {
  return String(value ?? "Not recorded").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formattedValue(value, type, row = {}) {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "money") return money(value, row.currency || "GBP");
  if (type === "number") return new Intl.NumberFormat("en-GB").format(Number(value || 0));
  if (type === "basis_points") return `${(Number(value || 0) / 100).toFixed(0)}%`;
  if (type === "status") return readableStatus(value);
  if (type === "adaptive" && /credit|outstanding|balance/i.test(String(row.label || "")) && Number.isFinite(Number(value))) return money(value, row.currency || "GBP");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  return String(value);
}

function setStatus(message, error = false) {
  const status = document.querySelector("[data-workflow-status]");
  if (!status) return;
  status.hidden = false;
  status.textContent = message;
  status.classList.toggle("alert-error", error);
  status.focus?.({ preventScroll: true });
}

function workflowError(error) {
  return window.NovaPharmApi.friendlyError(error, "workflow");
}

function renderMetrics(metrics = []) {
  const root = document.querySelector("[data-module-metrics]");
  if (!root) return;
  root.replaceChildren();
  for (const metric of metrics) {
    const wrapper = element(metric.href ? "a" : "div", "metric");
    if (metric.href) wrapper.href = metric.href;
    wrapper.append(element("strong", "", formattedValue(metric.value, metric.format)));
    wrapper.append(element("span", "", metric.label));
    root.append(wrapper);
  }
  root.hidden = metrics.length === 0;
}

function renderNotices(notices = []) {
  const root = document.querySelector("[data-module-notices]");
  if (!root) return;
  root.replaceChildren();
  for (const notice of notices) root.append(element("p", "enterprise-notice", notice));
  root.hidden = notices.length === 0;
}

function renderSection(section) {
  const wrapper = element("section", "enterprise-data-section");
  const heading = element("div", "section-heading-row");
  const titleBlock = element("div");
  titleBlock.append(element("h2", "", section.title));
  if (section.description) titleBlock.append(element("p", "", section.description));
  heading.append(titleBlock);
  const source = element("span", "source-label", section.source || "Canonical application database");
  heading.append(source);
  wrapper.append(heading);

  const tableRegion = element("div", "table-wrap");
  tableRegion.setAttribute("role", "region");
  tableRegion.setAttribute("aria-label", section.title);
  tableRegion.tabIndex = 0;
  const table = element("table");
  const head = element("thead");
  const headRow = element("tr");
  for (const [, label] of section.columns || []) {
    const header = element("th", "", label);
    header.scope = "col";
    headRow.append(header);
  }
  head.append(headRow);
  table.append(head);
  const body = element("tbody");
  if (!section.rows?.length) {
    const row = element("tr");
    const cell = element("td", "table-empty", section.emptyState || "No records are available.");
    cell.colSpan = Math.max(1, section.columns?.length || 1);
    row.append(cell);
    body.append(row);
  } else {
    for (const record of section.rows) {
      const row = element("tr");
      for (const [key, , type] of section.columns || []) {
        const cell = element("td", type === "status" ? "table-status" : "", formattedValue(record[key], type, record));
        if (type === "status") cell.dataset.state = String(record[key] || "unknown").toLowerCase();
        row.append(cell);
      }
      body.append(row);
    }
  }
  table.append(body);
  tableRegion.append(table);
  wrapper.append(tableRegion);
  return wrapper;
}

function renderSections(sections = []) {
  const root = document.querySelector("[data-module-sections]");
  if (!root) return;
  root.replaceChildren(...sections.map(renderSection));
}

function renderReturnOptions(action) {
  const select = document.querySelector("[data-return-options]");
  if (!select) return;
  select.replaceChildren(new Option("Select an order line", ""));
  (action?.options || []).forEach((item, index) => {
    select.add(new Option(`${item.order_number} · ${item.sku} · ${item.product_name} · ${item.ordered_quantity} ordered`, String(index)));
  });
}

function renderQualityOptions(action) {
  const select = document.querySelector("[data-quality-options]");
  if (!select) return;
  select.replaceChildren(new Option("Select an order and product", ""));
  (action?.options || []).forEach((item, index) => select.add(new Option(`${item.order_number} · ${item.sku} · ${item.product_name}`, String(index))));
}

function renderLifecycleControl(action, snapshot, root) {
  const products = snapshot.sections?.flatMap((section) => section.rows || []).filter((row) => row.id && row.lifecycle_status) || [];
  if (!products.length) return;
  const form = element("form", "enterprise-action-form");
  form.dataset.lifecycleForm = "";
  const productLabel = element("label", "", "Product");
  const productSelect = element("select");
  productSelect.name = "productId";
  productSelect.required = true;
  productSelect.append(new Option("Select product", ""));
  products.forEach((product) => productSelect.add(new Option(`${product.sku} · ${product.product_name} · ${readableStatus(product.lifecycle_status)}`, product.id)));
  productLabel.append(productSelect);
  const statusLabel = element("label", "", "Next lifecycle state");
  const statusSelect = element("select");
  statusSelect.name = "status";
  statusSelect.required = true;
  for (const status of ["review", "approved", "active", "suspended", "draft", "retired"]) statusSelect.add(new Option(readableStatus(status), status));
  statusLabel.append(statusSelect);
  const submit = element("button", "btn btn-outline", action.label);
  submit.type = "submit";
  form.append(productLabel, statusLabel, submit);
  root.append(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(form));
      await enterpriseRequest(action.endpointTemplate.replace("{id}", encodeURIComponent(values.productId)), { method: "POST", headers: await csrfHeaders(), body: JSON.stringify({ status: values.status }) });
      setStatus("The product lifecycle transition was recorded.");
      await loadModule();
    } catch (error) { setStatus(workflowError(error), true); }
  });
}

function renderActions(actions = [], snapshot = {}) {
  const root = document.querySelector("[data-module-actions]");
  if (!root) return;
  root.replaceChildren();
  renderReturnOptions(actions.find((action) => action.code === "request_return"));
  renderQualityOptions(actions.find((action) => action.code === "open_quality_complaint"));
  for (const action of actions) {
    if (action.code === "product_transition") {
      renderLifecycleControl(action, snapshot, root);
      continue;
    }
    if (action.code !== "advance_workflow") continue;
    const button = element("button", "btn btn-outline", action.label);
    button.type = "button";
    button.addEventListener("click", async () => {
      try {
        button.disabled = true;
        await enterpriseRequest(action.endpoint, { method: "POST", headers: await csrfHeaders(), body: "{}" });
        setStatus("The workflow advanced to its next governed step.");
        await loadModule();
      } catch (error) { setStatus(workflowError(error), true); }
      finally { button.disabled = false; }
    });
    root.append(button);
  }
  root.hidden = root.childElementCount === 0;
}

function renderSnapshot(snapshot) {
  currentSnapshot = snapshot;
  const workspace = document.querySelector("[data-enterprise-workspace]");
  if (workspace) workspace.setAttribute("aria-busy", "false");
  const state = document.querySelector("[data-module-state]");
  if (state) state.textContent = snapshot.dataState === "synthetic" ? "Synthetic validation data" : readableStatus(snapshot.module.maturity);
  document.querySelectorAll("[data-module-freshness]").forEach((node) => { node.textContent = new Date(snapshot.dataFreshness).toLocaleString("en-GB"); });
  renderMetrics(snapshot.metrics);
  renderNotices(snapshot.notices);
  renderSections(snapshot.sections);
  renderActions(snapshot.actions, snapshot);
}

async function loadModule() {
  if (!pageModule || !document.querySelector("[data-enterprise-workspace]")) return null;
  const snapshot = await enterpriseRequest(`/api/enterprise/modules/${encodeURIComponent(pageModule)}`);
  if (snapshot) renderSnapshot(snapshot);
  return snapshot;
}

async function legacyProducts() {
  return (await enterpriseRequest("/api/catalog/products"))?.products || [];
}

async function legacyCustomers() {
  return (await enterpriseRequest("/api/customers"))?.customers || [];
}

async function legacySuppliers() {
  return (await enterpriseRequest("/api/suppliers"))?.suppliers || [];
}

async function populateOperationalSelectors() {
  if (document.querySelector("[data-customer-order-form]")) {
    const product = document.querySelector("[data-customer-order-form] [name=productId]");
    product.replaceChildren(new Option("Select an authorised product", ""));
    (await legacyProducts()).filter((item) => item.lifecycle_status === "active").forEach((item) => product.add(new Option(`${item.sku} · ${item.product_name}`, item.id)));
  }
  if (document.querySelector("[data-order-form]")) {
    const [customers, products] = await Promise.all([legacyCustomers(), legacyProducts()]);
    const customer = document.querySelector("[data-order-form] [name=customerId]");
    const product = document.querySelector("[data-order-form] [name=productId]");
    customer.replaceChildren(new Option("Select customer", ""));
    customers.forEach((item) => customer.add(new Option(`${item.customer_number} · ${item.legal_name}`, item.id)));
    product.replaceChildren(new Option("Select product", ""));
    products.filter((item) => item.lifecycle_status === "active").forEach((item) => product.add(new Option(`${item.sku} · ${item.product_name}`, item.id)));
  }
  if (document.querySelector("[data-po-form]")) {
    const [suppliers, products] = await Promise.all([legacySuppliers(), legacyProducts()]);
    const supplier = document.querySelector("[data-po-form] [name=supplierId]");
    const product = document.querySelector("[data-po-form] [name=productId]");
    supplier.replaceChildren(new Option("Select qualified supplier", ""));
    suppliers.filter((item) => ["approved", "conditional"].includes(item.qualification_status)).forEach((item) => supplier.add(new Option(`${item.supplier_number} · ${item.legal_name}`, item.id)));
    product.replaceChildren(new Option("Select product", ""));
    products.forEach((item) => product.add(new Option(`${item.sku} · ${item.product_name}`, item.id)));
  }
}

async function postForm(form, endpoint, transform, success) {
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(form));
      const result = await enterpriseRequest(endpoint, { method: "POST", headers: await csrfHeaders(), body: JSON.stringify(transform(values)) });
      form.reset();
      setStatus(success(result));
      await populateOperationalSelectors();
      await loadModule();
    } catch (error) { setStatus(workflowError(error), true); }
  });
}

async function bindForms() {
  await postForm(document.querySelector("[data-supplier-form]"), "/api/suppliers", (values) => values, (result) => `Supplier ${result.supplier.supplierNumber} was created as a prospect.`);
  await postForm(document.querySelector("[data-product-form]"), "/api/products", (values) => ({ ...values, listPriceMinor: Math.round(Number(values.listPrice || 0) * 100), listPrice: undefined }), (result) => `Product ${result.product.sku} was created in draft status.`);
  await postForm(document.querySelector("[data-order-form]"), "/api/orders", (values) => ({ customerId: values.customerId, customerPoReference: values.customerPoReference, requestedDeliveryDate: values.requestedDeliveryDate, lines: [{ productId: values.productId, quantity: Number(values.quantity) }] }), (result) => `Order ${result.order.orderNumber} was submitted.`);
  await postForm(document.querySelector("[data-customer-order-form]"), "/api/orders", (values) => ({ customerPoReference: values.customerPoReference, requestedDeliveryDate: values.requestedDeliveryDate, lines: [{ productId: values.productId, quantity: Number(values.quantity) }] }), (result) => `Order ${result.order.orderNumber} was submitted for the authorised account.`);
  await postForm(document.querySelector("[data-po-form]"), "/api/purchase-orders", (values) => ({ supplierId: values.supplierId, expectedDate: values.expectedDate, lines: [{ productId: values.productId, quantity: Number(values.quantity), unitCostMinor: Math.round(Number(values.unitCost || 0) * 100) }] }), (result) => `Purchase order ${result.purchaseOrder.poNumber} was submitted.`);
  await postForm(document.querySelector("[data-support-form]"), "/api/enterprise/customer/support", (values) => values, (result) => `Support ticket ${result.ticket.ticketNumber} was created.`);

  document.querySelector("[data-return-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      const action = currentSnapshot?.actions?.find((item) => item.code === "request_return");
      const option = action?.options?.[Number(values.orderLine)];
      if (!option) throw Object.assign(new Error("Select an eligible order line."), { status: 400 });
      const result = await enterpriseRequest(action.endpoint, { method: "POST", headers: await csrfHeaders(), body: JSON.stringify({ orderId: option.order_id, orderLineId: option.order_line_id, quantity: Number(values.quantity), reasonCode: values.reasonCode }) });
      form.reset();
      setStatus(`Return ${result.returnRequest.returnNumber} was requested.`);
      await loadModule();
    } catch (error) { setStatus(workflowError(error), true); }
  });

  document.querySelector("[data-quality-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      const action = currentSnapshot?.actions?.find((item) => item.code === "open_quality_complaint");
      const option = action?.options?.[Number(values.orderProduct)];
      if (!option) throw Object.assign(new Error("Select an eligible order and product."), { status: 400 });
      const result = await enterpriseRequest(action.endpoint, { method: "POST", headers: await csrfHeaders(), body: JSON.stringify({ orderId: option.order_id, productId: option.product_id, description: values.description, severity: "untriaged" }) });
      form.reset();
      setStatus(`Quality complaint ${result.complaint.complaintNumber} was opened.`);
      await loadModule();
    } catch (error) { setStatus(workflowError(error), true); }
  });
}

function bindSearch() {
  const input = document.querySelector("[data-enterprise-search]");
  const results = document.querySelector("[data-enterprise-search-results]");
  if (!input || !results) return;
  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (query.length < 2) {
      results.hidden = true;
      results.replaceChildren();
      return;
    }
    timer = setTimeout(async () => {
      try {
        const data = await enterpriseRequest(`/api/enterprise/search?q=${encodeURIComponent(query)}`);
        results.replaceChildren();
        if (!data?.results?.length) results.append(element("p", "portal-search-empty", "No authorised records found."));
        for (const item of data?.results || []) {
          const link = element("a", "portal-search-result");
          link.href = item.route;
          const title = element("strong", "", item.title);
          const meta = element("span", "", `${item.type} · ${item.reference}${item.status ? ` · ${readableStatus(item.status)}` : ""}`);
          link.append(title, meta);
          results.append(link);
        }
        results.hidden = false;
      } catch (error) { setStatus(workflowError(error), true); }
    }, 220);
  });
  document.addEventListener("click", (event) => {
    if (!results.contains(event.target) && event.target !== input) results.hidden = true;
  });
}

async function bootEnterprisePage() {
  bindSearch();
  await bindForms();
  await Promise.all([loadModule(), populateOperationalSelectors()]);
}

bootEnterprisePage().catch((error) => setStatus(workflowError(error), true));
