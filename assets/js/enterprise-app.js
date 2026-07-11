function enterpriseCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "—";
  return cell;
}

function enterpriseRow(values) {
  const row = document.createElement("tr");
  values.forEach((value) => row.append(enterpriseCell(value)));
  return row;
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

function setStatus(message, error = false) {
  const status = document.querySelector("[data-workflow-status]");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("alert-error", error);
}

function workflowError(error) {
  return window.NovaPharmApi.friendlyError(error, "workflow");
}

async function loadDashboard() {
  const data = await enterpriseRequest("/api/dashboard");
  if (!data) return;
  const view = data.account ? {
    ...data,
    accountNumber: data.account.customer_number,
    availableCredit: money(data.availableCreditMinor, data.account.currency),
    annualSpend: money(data.annualSpendMinor, data.account.currency),
    invoicesDue: data.invoicesDue
  } : data;
  document.querySelectorAll("[data-live-metric]").forEach((node) => {
    const key = node.dataset.liveMetric;
    node.textContent = view[key] ?? "—";
  });
  const sources = document.querySelector("[data-source-status]");
  if (sources) {
    sources.replaceChildren();
    Object.entries(data.sourceStatus || {}).forEach(([source, status]) => {
      sources.append(enterpriseRow([source.replace(/([A-Z])/g, " $1"), status.replaceAll("_", " ")]));
    });
  }
  document.querySelectorAll("[data-freshness]").forEach((node) => {
    node.textContent = new Date(data.dataFreshness).toLocaleString("en-GB");
  });
}

async function loadProducts() {
  const q = document.querySelector("[data-product-search]")?.value || "";
  const data = await enterpriseRequest(`/api/catalog/products?q=${encodeURIComponent(q)}`);
  const body = document.querySelector("[data-product-rows]");
  if (!body) return data.products;
  body.replaceChildren();
  data.products.forEach((product) => body.append(enterpriseRow([
    product.sku,
    product.product_name,
    product.strength,
    product.pack_size,
    money(product.list_price_minor, product.currency),
    product.stock_available,
    product.mhra_status,
    product.lifecycle_status
  ])));
  if (!data.products.length) body.append(enterpriseRow(["No products have been created in the master database."]));
  return data.products;
}

async function loadCustomers() {
  const data = await enterpriseRequest("/api/customers");
  const body = document.querySelector("[data-customer-rows]");
  if (body) {
    body.replaceChildren();
    data.customers.forEach((customer) => body.append(enterpriseRow([customer.customer_number, customer.legal_name, customer.customer_type, customer.lifecycle_status, money(customer.credit_limit_minor), money(customer.outstanding_balance_minor)])));
    if (!data.customers.length) body.append(enterpriseRow(["No active customers. Review submitted account applications."]));
  }
  return data.customers;
}

async function loadSuppliers() {
  const data = await enterpriseRequest("/api/suppliers");
  const body = document.querySelector("[data-supplier-rows]");
  if (body) {
    body.replaceChildren();
    data.suppliers.forEach((supplier) => body.append(enterpriseRow([supplier.supplier_number, supplier.legal_name, supplier.supplier_type, supplier.qualification_status, supplier.gdp_status, supplier.gmp_status])));
    if (!data.suppliers.length) body.append(enterpriseRow(["No suppliers have been created."]));
  }
  return data.suppliers;
}

async function loadOrders() {
  const data = await enterpriseRequest("/api/orders");
  const body = document.querySelector("[data-order-rows]");
  if (body) {
    body.replaceChildren();
    data.orders.forEach((order) => body.append(enterpriseRow([order.order_number, order.customer_id, order.status, money(order.total_minor, order.currency), order.customer_po_reference, new Date(order.created_at).toLocaleString("en-GB")])));
    if (!data.orders.length) body.append(enterpriseRow(["No orders have been placed."]));
  }
  return data.orders;
}

async function loadPurchaseOrders() {
  const data = await enterpriseRequest("/api/purchase-orders");
  const body = document.querySelector("[data-po-rows]");
  if (body) {
    body.replaceChildren();
    data.purchaseOrders.forEach((po) => body.append(enterpriseRow([po.po_number, po.supplier_name, po.status, money(po.total_minor, po.currency), po.expected_date, new Date(po.created_at).toLocaleString("en-GB")])));
    if (!data.purchaseOrders.length) body.append(enterpriseRow(["No purchase orders have been raised."]));
  }
}

async function populateOrderSelectors() {
  const [customers, products] = await Promise.all([loadCustomers(), loadProducts()]);
  const customer = document.querySelector("[name=customerId]");
  const product = document.querySelector("[name=productId]");
  if (customer) {
    customer.replaceChildren(new Option("Select customer", ""));
    customers.forEach((item) => customer.add(new Option(`${item.customer_number} · ${item.legal_name}`, item.id)));
  }
  if (product) {
    product.replaceChildren(new Option("Select product", ""));
    products.filter((item) => ["approved", "active"].includes(item.lifecycle_status)).forEach((item) => product.add(new Option(`${item.sku} · ${item.product_name}`, item.id)));
  }
}

async function populatePurchaseSelectors() {
  const [suppliers, products] = await Promise.all([loadSuppliers(), loadProducts()]);
  const supplier = document.querySelector("[name=supplierId]");
  const product = document.querySelector("[name=productId]");
  if (supplier) {
    supplier.replaceChildren(new Option("Select qualified supplier", ""));
    suppliers.filter((item) => ["approved", "conditional"].includes(item.qualification_status)).forEach((item) => supplier.add(new Option(`${item.supplier_number} · ${item.legal_name}`, item.id)));
  }
  if (product) {
    product.replaceChildren(new Option("Select product", ""));
    products.forEach((item) => product.add(new Option(`${item.sku} · ${item.product_name}`, item.id)));
  }
}

async function bindForms() {
  const productForm = document.querySelector("[data-product-form]");
  productForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const body = Object.fromEntries(new FormData(productForm));
      body.listPriceMinor = Math.round(Number(body.listPrice || 0) * 100);
      delete body.listPrice;
      await enterpriseRequest("/api/products", { method: "POST", headers: await csrfHeaders(), body: JSON.stringify(body) });
      productForm.reset();
      setStatus("Product created and SharePoint folder synchronization queued.");
      await loadProducts();
    } catch (error) { setStatus(workflowError(error), true); }
  });

  const supplierForm = document.querySelector("[data-supplier-form]");
  supplierForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await enterpriseRequest("/api/suppliers", { method: "POST", headers: await csrfHeaders(), body: JSON.stringify(Object.fromEntries(new FormData(supplierForm))) });
      supplierForm.reset();
      setStatus("Supplier created and SharePoint folder synchronization queued.");
      await loadSuppliers();
    } catch (error) { setStatus(workflowError(error), true); }
  });

  const orderForm = document.querySelector("[data-order-form]");
  orderForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(orderForm));
      const body = { customerId: values.customerId, customerPoReference: values.customerPoReference, requestedDeliveryDate: values.requestedDeliveryDate, lines: [{ productId: values.productId, quantity: Number(values.quantity) }] };
      const result = await enterpriseRequest("/api/orders", { method: "POST", headers: await csrfHeaders(), body: JSON.stringify(body) });
      orderForm.reset();
      setStatus(`Order ${result.order.orderNumber} created; warehouse reservation and SharePoint workflows queued.`);
      await loadOrders();
    } catch (error) { setStatus(workflowError(error), true); }
  });

  const poForm = document.querySelector("[data-po-form]");
  poForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(poForm));
      const body = { supplierId: values.supplierId, expectedDate: values.expectedDate, lines: [{ productId: values.productId, quantity: Number(values.quantity), unitCostMinor: Math.round(Number(values.unitCost) * 100) }] };
      const result = await enterpriseRequest("/api/purchase-orders", { method: "POST", headers: await csrfHeaders(), body: JSON.stringify(body) });
      poForm.reset();
      setStatus(`Purchase order ${result.purchaseOrder.poNumber} submitted for approval.`);
      await loadPurchaseOrders();
    } catch (error) { setStatus(workflowError(error), true); }
  });
}

async function bootEnterprisePage() {
  const page = document.body.dataset.enterprisePage;
  await bindForms();
  if (page === "dashboard" || page === "analytics") {
    await loadDashboard();
    if (document.querySelector("[data-order-rows]")) await loadOrders();
  }
  if (page === "products") await loadProducts();
  if (page === "customers") await loadCustomers();
  if (page === "suppliers") await loadSuppliers();
  if (page === "orders") { await populateOrderSelectors(); await loadOrders(); }
  if (page === "purchasing") { await populatePurchaseSelectors(); await loadPurchaseOrders(); }
}

document.querySelector("[data-product-search]")?.addEventListener("input", () => loadProducts().catch((error) => setStatus(workflowError(error), true)));

bootEnterprisePage().catch((error) => setStatus(workflowError(error), true));
