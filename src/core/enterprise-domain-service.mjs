import { randomUUID } from "node:crypto";
import { all, audit, nowIso, one, run, transaction } from "../data/database.mjs";
import { portalModuleByCode } from "./portal-module-catalog.mjs";

function forbidden(message = "You do not have permission for this module.") {
  return Object.assign(new Error(message), { statusCode: 403 });
}

function invalid(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function conflict(message) {
  return Object.assign(new Error(message), { statusCode: 409 });
}

function clean(value, maximum = 500) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum);
}

function integer(value, name, minimum = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) throw invalid(`${name} is invalid.`);
  return parsed;
}

function section(title, columns, rows, emptyState, { source = "Canonical application database", description = "" } = {}) {
  return { title, description, columns, rows, emptyState, source, rowCount: rows.length };
}

function metric(key, label, value, format = "number", href = null) {
  return { key, label, value: Number(value || 0), format, href };
}

function canUseModule(module, context) {
  const scope = { customer: "customer", employee: "employee", executive: "board", admin: "admin" }[module.area];
  return context.accessScopes?.includes(scope) || context.accessScopes?.includes("admin");
}

function baseSnapshot(module, extras = {}) {
  return {
    module,
    environment: process.env.LOCAL_PORTAL_MODE === "true" ? "local_validation" : process.env.NODE_ENV === "production" ? "production" : "development",
    dataState: process.env.LOCAL_PORTAL_MODE === "true" ? "synthetic" : "canonical",
    dataFreshness: nowIso(),
    readOnly: module.area === "executive",
    metrics: [],
    sections: [],
    notices: [],
    actions: [],
    ...extras
  };
}

async function customerAccount(customerId) {
  const account = await one(`SELECT c.id, c.customer_number, c.customer_type, c.lifecycle_status, c.credit_limit_minor,
      c.outstanding_balance_minor, c.currency, c.payment_terms_days, o.legal_name, o.trading_name,
      o.company_number, o.vat_number, o.country_code
    FROM customers c JOIN organizations o ON o.id = c.organization_id WHERE c.id = ?`, customerId);
  if (!account) throw forbidden("A customer account is not linked to this portal identity.");
  return account;
}

async function authorisedCustomerProducts(customerId) {
  return all(`SELECT p.id, p.sku, p.product_name, p.pack_size, p.dosage_form, p.regulatory_status,
      pv.public_slug, pv.sale_status, pv.claims_review_status, pf.family_name, pm.fallback_path, pm.alt_text,
      pl.price_list_code, pl.name AS price_list_name, pl.currency, pl.valid_from, pl.valid_to,
      pli.unit_price_minor, pli.minimum_quantity,
      COALESCE((SELECT SUM(ib.available_quantity) FROM inventory_balances ib JOIN batches b ON b.id = ib.batch_id
        WHERE ib.product_id = p.id AND b.release_status = 'released' AND b.expiry_date > date('now')), 0) AS available_quantity,
      COALESCE((SELECT SUM(ib.quarantine_quantity) FROM inventory_balances ib WHERE ib.product_id = p.id), 0) AS quarantine_quantity
    FROM customer_price_lists cpl
    JOIN price_lists pl ON pl.id = cpl.price_list_id
    JOIN price_list_items pli ON pli.price_list_id = pl.id
    JOIN products p ON p.id = pli.product_id
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN product_families pf ON pf.id = pv.family_id
    LEFT JOIN product_media pm ON pm.product_id = p.id AND pm.media_role = 'pack_front'
    WHERE cpl.customer_id = ? AND pl.status IN ('active', 'active_validation')
      AND pli.status IN ('active', 'validation_only')
      AND (pl.valid_from IS NULL OR pl.valid_from <= date('now'))
      AND (pl.valid_to IS NULL OR pl.valid_to >= date('now'))
    ORDER BY pf.family_name, p.product_name`, customerId);
}

async function customerDocuments(customerId, classes = null) {
  const parameters = [customerId, customerId];
  let classFilter = "";
  if (classes?.length) {
    classFilter = ` AND d.document_class IN (${classes.map(() => "?").join(", ")})`;
    parameters.push(...classes);
  }
  return all(`SELECT DISTINCT d.id, d.document_number, d.title, d.file_name, d.document_class,
      d.lifecycle_status, d.security_status, d.version, d.updated_at
    FROM documents d JOIN document_links dl ON dl.document_id = d.id
    WHERE ((dl.entity_type = 'customer' AND dl.entity_id = ?)
      OR (dl.entity_type = 'order' AND dl.entity_id IN (SELECT id FROM orders WHERE customer_id = ?)))
      AND d.security_status = 'clean'${classFilter}
    ORDER BY d.updated_at DESC`, ...parameters);
}

async function customerSnapshot(module, customerId, context) {
  const account = await customerAccount(customerId);
  const creditAvailable = Math.max(0, Number(account.credit_limit_minor) - Number(account.outstanding_balance_minor));
  if (module.slug === "dashboard") {
    const orders = await all("SELECT order_number, status, total_minor, currency, requested_delivery_date, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 8", customerId);
    const invoices = await all("SELECT invoice_number, status, due_date, total_minor, outstanding_minor, currency FROM invoices WHERE customer_id = ? AND outstanding_minor > 0 ORDER BY due_date LIMIT 8", customerId);
    const complaints = await all("SELECT complaint_number, severity, status, due_at FROM quality_complaints WHERE customer_id = ? AND status <> 'closed' ORDER BY created_at DESC LIMIT 8", customerId);
    return baseSnapshot(module, {
      metrics: [
        metric("available_credit", "Available credit", creditAvailable, "money", "/portal/account/"),
        metric("outstanding", "Outstanding balance", account.outstanding_balance_minor, "money", "/portal/invoices/"),
        metric("open_orders", "Open orders", (await one("SELECT COUNT(*) AS value FROM orders WHERE customer_id = ? AND status NOT IN ('closed', 'cancelled', 'delivered', 'invoiced')", customerId))?.value, "number", "/portal/orders/"),
        metric("invoices_due", "Invoices due", invoices.length, "number", "/portal/invoices/"),
        metric("active_complaints", "Active complaints", complaints.length, "number", "/portal/quality-complaints/")
      ],
      sections: [
        section("Recent orders", [["order_number", "Order"], ["status", "Status", "status"], ["total_minor", "Total", "money"], ["requested_delivery_date", "Requested"]], orders, "No customer orders are recorded."),
        section("Invoices requiring attention", [["invoice_number", "Invoice"], ["due_date", "Due"], ["status", "Status", "status"], ["outstanding_minor", "Outstanding", "money"]], invoices, "No invoices currently require attention."),
        section("Quality actions", [["complaint_number", "Complaint"], ["severity", "Severity", "status"], ["status", "Status", "status"], ["due_at", "Due"]], complaints, "No active quality complaints are recorded.")
      ],
      notices: [`Account ${account.customer_number} · ${account.legal_name}`, "All values are restricted to this customer account."]
    });
  }
  if (module.slug === "account") {
    const contacts = await all("SELECT name, role_title, email, is_primary, status FROM customer_contacts WHERE customer_id = ? ORDER BY is_primary DESC, name", customerId);
    const addresses = await all(`SELECT oa.address_type, oa.line_1, oa.line_2, oa.city, oa.region, oa.postcode, oa.country_code, oa.is_primary
      FROM organization_addresses oa JOIN customers c ON c.organization_id = oa.organization_id WHERE c.id = ? ORDER BY oa.is_primary DESC, oa.address_type`, customerId);
    const details = Object.entries({
      "Legal entity": account.legal_name, "Trading name": account.trading_name, "Company number": account.company_number,
      "VAT number": account.vat_number, "Account number": account.customer_number, "Customer type": account.customer_type,
      "Account status": account.lifecycle_status, "Payment terms": `${account.payment_terms_days} days`,
      "Credit limit": account.credit_limit_minor, "Outstanding": account.outstanding_balance_minor
    }).map(([label, value]) => ({ label, value }));
    return baseSnapshot(module, {
      metrics: [metric("credit_limit", "Credit limit", account.credit_limit_minor, "money"), metric("available_credit", "Available credit", creditAvailable, "money")],
      sections: [
        section("Account record", [["label", "Field"], ["value", "Value", "adaptive"]], details, "Account details are unavailable."),
        section("Authorised contacts", [["name", "Name"], ["role_title", "Role"], ["email", "Business email"], ["status", "Status", "status"]], contacts, "No authorised contacts are recorded."),
        section("Controlled addresses", [["address_type", "Type"], ["line_1", "Address"], ["city", "City"], ["postcode", "Postcode"], ["country_code", "Country"]], addresses, "No controlled addresses are recorded.")
      ],
      actions: [{ code: "account_change_request", label: "Request account change", method: "controlled_request", enabled: false }],
      notices: ["Controlled legal and regulatory fields require an approved change request; they cannot be silently edited here."]
    });
  }
  if (module.slug === "orders") {
    const rows = await all(`SELECT o.order_number, o.status, o.requested_delivery_date, o.customer_po_reference,
        o.total_minor, o.currency, o.created_at, COUNT(ol.id) AS line_count
      FROM orders o LEFT JOIN order_lines ol ON ol.order_id = o.id WHERE o.customer_id = ?
      GROUP BY o.id, o.order_number, o.status, o.requested_delivery_date, o.customer_po_reference, o.total_minor, o.currency, o.created_at
      ORDER BY o.created_at DESC`, customerId);
    return baseSnapshot(module, { sections: [section("Orders", [["order_number", "Order"], ["customer_po_reference", "PO reference"], ["status", "Status", "status"], ["line_count", "Lines", "number"], ["total_minor", "Total", "money"], ["requested_delivery_date", "Requested"]], rows, "No orders are recorded for this account.")], notices: ["Order status is derived from canonical order and fulfilment records."] });
  }
  if (module.slug === "invoices") {
    const invoices = await all(`SELECT i.invoice_number, o.order_number, i.issue_date, i.due_date, i.status,
        i.total_minor, i.outstanding_minor, i.currency
      FROM invoices i LEFT JOIN orders o ON o.id = i.order_id WHERE i.customer_id = ? ORDER BY i.issue_date DESC`, customerId);
    const payments = await all("SELECT payment_number, amount_minor, currency, payment_method, reference, status, received_at FROM payments WHERE customer_id = ? ORDER BY received_at DESC", customerId);
    const credits = await all("SELECT credit_note_number, status, issue_date, total_minor, currency, reason FROM credit_notes WHERE customer_id = ? ORDER BY issue_date DESC", customerId);
    return baseSnapshot(module, { metrics: [metric("outstanding", "Outstanding", account.outstanding_balance_minor, "money")], sections: [
      section("Invoices", [["invoice_number", "Invoice"], ["order_number", "Order"], ["issue_date", "Issued"], ["due_date", "Due"], ["status", "Status", "status"], ["total_minor", "Total", "money"], ["outstanding_minor", "Outstanding", "money"]], invoices, "No invoices are recorded."),
      section("Payments", [["payment_number", "Payment"], ["received_at", "Received"], ["status", "Status", "status"], ["amount_minor", "Amount", "money"], ["reference", "Reference"]], payments, "No payments are recorded."),
      section("Credit notes", [["credit_note_number", "Credit note"], ["issue_date", "Issued"], ["status", "Status", "status"], ["total_minor", "Amount", "money"], ["reason", "Reason"]], credits, "No credit notes are recorded.")
    ] });
  }
  if (module.slug === "statements") {
    const statements = await all("SELECT statement_number, period_start, period_end, opening_balance_minor, closing_balance_minor, currency, generated_at FROM customer_statements WHERE customer_id = ? ORDER BY period_end DESC", customerId);
    const lines = await all(`SELECT sl.line_date, sl.line_type, sl.reference, sl.description, sl.debit_minor, sl.credit_minor, sl.running_balance_minor
      FROM statement_lines sl JOIN customer_statements cs ON cs.id = sl.statement_id WHERE cs.customer_id = ? ORDER BY sl.line_date DESC`, customerId);
    return baseSnapshot(module, { sections: [
      section("Statements", [["statement_number", "Statement"], ["period_start", "From"], ["period_end", "To"], ["opening_balance_minor", "Opening", "money"], ["closing_balance_minor", "Closing", "money"]], statements, "No statements are recorded."),
      section("Statement activity", [["line_date", "Date"], ["line_type", "Type", "status"], ["reference", "Reference"], ["debit_minor", "Debit", "money"], ["credit_minor", "Credit", "money"], ["running_balance_minor", "Balance", "money"]], lines, "No statement activity is recorded.")
    ] });
  }
  if (["products", "price-lists", "stock-availability"].includes(module.slug)) {
    const products = await authorisedCustomerProducts(customerId);
    if (module.slug === "products") return baseSnapshot(module, { sections: [section("Authorised catalogue", [["sku", "SKU"], ["product_name", "Product"], ["family_name", "Range"], ["pack_size", "Pack"], ["unit_price_minor", "Account price", "money"], ["minimum_quantity", "MOQ", "number"], ["sale_status", "Order status", "status"], ["available_quantity", "Available", "number"]], products, "No products are assigned to this customer account.")], notices: ["Nutraxin records are controlled B2B catalogue references. A listed validation price does not assert public availability or an approved health claim."] });
    if (module.slug === "price-lists") return baseSnapshot(module, { sections: [section("Effective prices", [["price_list_code", "Price list"], ["product_name", "Product"], ["pack_size", "Pack"], ["unit_price_minor", "Price", "money"], ["minimum_quantity", "MOQ", "number"], ["valid_from", "Effective"], ["valid_to", "Expires"]], products, "No effective price list is assigned.")], notices: ["Prices are account-specific and must not be shared outside the authorised organisation."] });
    return baseSnapshot(module, { sections: [section("Available-to-promise", [["sku", "SKU"], ["product_name", "Product"], ["available_quantity", "Released ATP", "number"], ["quarantine_quantity", "Quarantine", "number"], ["sale_status", "Order status", "status"]], products, "No authorised stock records are available.")], notices: ["Batch identities and supplier-confidential details are not exposed in this customer view."] });
  }
  if (["order-tracking", "delivery-tracking"].includes(module.slug)) {
    const shipments = await all(`SELECT o.order_number, o.status AS order_status, s.shipment_number, s.status AS shipment_status,
        s.carrier_name, s.tracking_reference, s.dispatched_at, s.delivered_at,
        (SELECT MAX(de.occurred_at) FROM delivery_events de WHERE de.shipment_id = s.id) AS latest_event_at
      FROM orders o LEFT JOIN shipments s ON s.order_id = o.id WHERE o.customer_id = ? ORDER BY o.created_at DESC`, customerId);
    return baseSnapshot(module, { sections: [section(module.slug === "order-tracking" ? "Order and shipment progress" : "Deliveries", [["order_number", "Order"], ["order_status", "Order status", "status"], ["shipment_number", "Shipment"], ["shipment_status", "Delivery status", "status"], ["carrier_name", "Carrier"], ["tracking_reference", "Tracking"], ["latest_event_at", "Last event"]], shipments, "No shipment tracking records are available.")], notices: ["Carrier information is shown only when an approved source record exists."] });
  }
  if (module.slug === "returns") {
    const rows = await all(`SELECT r.return_number, o.order_number, r.status, r.reason_code, r.quality_hold,
        COUNT(rl.id) AS line_count, SUM(rl.quantity) AS quantity, MAX(cn.status) AS credit_note_status, r.created_at
      FROM returns r LEFT JOIN orders o ON o.id = r.order_id LEFT JOIN return_lines rl ON rl.return_id = r.id
      LEFT JOIN credit_notes cn ON cn.return_id = r.id WHERE r.customer_id = ?
      GROUP BY r.id, r.return_number, o.order_number, r.status, r.reason_code, r.quality_hold, r.created_at ORDER BY r.created_at DESC`, customerId);
    const eligibleLines = await all(`SELECT o.id AS order_id, o.order_number, ol.id AS order_line_id, p.id AS product_id,
        p.sku, p.product_name, ol.quantity AS ordered_quantity
      FROM orders o JOIN order_lines ol ON ol.order_id = o.id JOIN products p ON p.id = ol.product_id
      WHERE o.customer_id = ? AND o.status IN ('delivered','invoiced','closed') ORDER BY o.created_at DESC, p.product_name`, customerId);
    return baseSnapshot(module, { sections: [section("Returns", [["return_number", "Return"], ["order_number", "Order"], ["reason_code", "Reason", "status"], ["status", "Status", "status"], ["quantity", "Quantity", "number"], ["credit_note_status", "Credit status", "status"]], rows, "No returns are recorded.")], actions: [{ code: "request_return", label: "Request a return", endpoint: "/api/enterprise/customer/returns", method: "POST", options: eligibleLines }] });
  }
  if (module.slug === "quality-complaints") {
    const rows = await all(`SELECT qc.complaint_number, p.product_name, b.batch_number, o.order_number, qc.severity,
        qc.status, qc.pv_escalation_status, qc.due_at, qc.created_at
      FROM quality_complaints qc LEFT JOIN products p ON p.id = qc.product_id LEFT JOIN batches b ON b.id = qc.batch_id
      LEFT JOIN orders o ON o.id = qc.order_id WHERE qc.customer_id = ? ORDER BY qc.created_at DESC`, customerId);
    const eligibleProducts = await all(`SELECT DISTINCT o.id AS order_id, o.order_number, p.id AS product_id, p.sku, p.product_name
      FROM orders o JOIN order_lines ol ON ol.order_id = o.id JOIN products p ON p.id = ol.product_id
      WHERE o.customer_id = ? ORDER BY o.created_at DESC, p.product_name`, customerId);
    return baseSnapshot(module, { sections: [section("Quality complaints", [["complaint_number", "Complaint"], ["product_name", "Product"], ["order_number", "Order"], ["severity", "Severity", "status"], ["status", "Status", "status"], ["due_at", "Due"]], rows, "No quality complaints are recorded.")], actions: [{ code: "open_quality_complaint", label: "Open quality complaint", endpoint: "/api/enterprise/customer/quality-complaints", method: "POST", options: eligibleProducts }], notices: ["Do not submit adverse-event or patient-identifiable information. Use the controlled medical-safety route."] });
  }
  if (["documents", "regulatory-documents", "downloads"].includes(module.slug)) {
    const classes = module.slug === "regulatory-documents" ? ["regulatory", "licence"] : null;
    const rows = await customerDocuments(customerId, classes);
    return baseSnapshot(module, { sections: [section(module.title, [["document_number", "Document"], ["title", "Title"], ["document_class", "Class", "status"], ["lifecycle_status", "Lifecycle", "status"], ["version", "Version", "number"], ["updated_at", "Updated"]], rows, "No authorised clean documents are available for this account.")], notices: ["Private storage paths are never returned to the browser."] });
  }
  if (module.slug === "support") {
    const rows = await all("SELECT ticket_number, category, priority, status, subject, created_at, updated_at FROM support_tickets WHERE customer_id = ? ORDER BY created_at DESC", customerId);
    return baseSnapshot(module, { sections: [section("Support tickets", [["ticket_number", "Ticket"], ["category", "Category", "status"], ["priority", "Priority", "status"], ["status", "Status", "status"], ["subject", "Subject"], ["updated_at", "Updated"]], rows, "No support tickets are recorded.")], actions: [{ code: "create_support_ticket", label: "Create support ticket", endpoint: "/api/enterprise/customer/support", method: "POST" }] });
  }
  if (module.slug === "analytics") {
    const metrics = await one(`SELECT COUNT(DISTINCT o.id) AS order_count, COALESCE(SUM(DISTINCT i.total_minor), 0) AS invoiced_minor,
        COUNT(DISTINCT r.id) AS return_count, COUNT(DISTINCT qc.id) AS complaint_count
      FROM customers c LEFT JOIN orders o ON o.customer_id = c.id LEFT JOIN invoices i ON i.customer_id = c.id
      LEFT JOIN returns r ON r.customer_id = c.id LEFT JOIN quality_complaints qc ON qc.customer_id = c.id WHERE c.id = ?`, customerId);
    const mix = await all(`SELECT p.product_name, SUM(ol.quantity) AS quantity, SUM(ol.line_total_minor) AS spend_minor
      FROM orders o JOIN order_lines ol ON ol.order_id = o.id JOIN products p ON p.id = ol.product_id
      WHERE o.customer_id = ? GROUP BY p.id, p.product_name ORDER BY spend_minor DESC`, customerId);
    return baseSnapshot(module, { metrics: [metric("orders", "Orders", metrics?.order_count), metric("invoiced", "Invoiced", metrics?.invoiced_minor, "money"), metric("returns", "Returns", metrics?.return_count), metric("complaints", "Complaints", metrics?.complaint_count)], sections: [section("Product mix", [["product_name", "Product"], ["quantity", "Units", "number"], ["spend_minor", "Order value", "money"]], mix, "No product activity is available.")] });
  }
  if (module.slug === "settings") {
    return baseSnapshot(module, { sections: [section("Portal identity", [["label", "Setting"], ["value", "Current value"]], [
      { label: "Signed-in identity", value: context.displayName || context.username }, { label: "Access area", value: context.accessType },
      { label: "Account", value: account.customer_number }, { label: "Notification preference", value: "Service notifications only" }
    ], "Portal identity settings are unavailable.")], notices: ["Identity and controlled-account changes require approval; no password or secret is displayed."] });
  }
  return baseSnapshot(module, { notices: ["This customer module has no canonical records to display."] });
}

async function employeeSnapshot(module) {
  if (module.slug === "dashboard") {
    const [counts, workflows, exceptions] = await Promise.all([
      one(`SELECT
        (SELECT COUNT(*) FROM customers WHERE lifecycle_status = 'active') AS customers,
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM orders WHERE status NOT IN ('closed','cancelled','delivered','invoiced')) AS open_orders,
        (SELECT COUNT(*) FROM purchase_orders WHERE status NOT IN ('closed','cancelled','received')) AS open_purchase_orders,
        (SELECT COUNT(*) FROM quality_complaints WHERE status <> 'closed') AS open_quality,
        (SELECT COUNT(*) FROM regulatory_cases WHERE status NOT IN ('closed','approved')) AS open_regulatory`),
      all("SELECT workflow_code, status, current_step, updated_at FROM workflow_instances ORDER BY updated_at DESC LIMIT 12"),
      all(`SELECT 'Integration event' AS exception_type, destination_system AS area, status, event_type AS detail, created_at
        FROM integration_events WHERE status IN ('pending','retrying','blocked') ORDER BY created_at DESC LIMIT 12`)
    ]);
    return baseSnapshot(module, { metrics: [metric("customers", "Active customers", counts.customers), metric("products", "Products", counts.products), metric("orders", "Open orders", counts.open_orders), metric("purchasing", "Open POs", counts.open_purchase_orders), metric("quality", "Quality actions", counts.open_quality), metric("regulatory", "Regulatory actions", counts.open_regulatory)], sections: [
      section("Workflow queue", [["workflow_code", "Workflow"], ["status", "Status", "status"], ["current_step", "Current step"], ["updated_at", "Updated"]], workflows, "No workflow tasks are recorded."),
      section("Exceptions", [["exception_type", "Type"], ["area", "Area"], ["status", "Status", "status"], ["detail", "Detail"], ["created_at", "Raised"]], exceptions, "No integration exceptions require attention.")
    ], notices: ["Local validation values are synthetic and externally disconnected."] });
  }
  if (module.slug === "customers") {
    const rows = await all(`SELECT c.customer_number, o.legal_name, c.customer_type, c.lifecycle_status,
      c.credit_limit_minor, c.outstanding_balance_minor, c.payment_terms_days,
      (SELECT COUNT(*) FROM orders ord WHERE ord.customer_id = c.id) AS order_count,
      (SELECT COUNT(*) FROM quality_complaints qc WHERE qc.customer_id = c.id AND qc.status <> 'closed') AS open_complaints
      FROM customers c JOIN organizations o ON o.id = c.organization_id ORDER BY o.legal_name`);
    return baseSnapshot(module, { sections: [section("Customer master", [["customer_number", "Account"], ["legal_name", "Company"], ["customer_type", "Type", "status"], ["lifecycle_status", "Status", "status"], ["credit_limit_minor", "Credit limit", "money"], ["outstanding_balance_minor", "Outstanding", "money"], ["order_count", "Orders", "number"], ["open_complaints", "Open complaints", "number"]], rows, "No customers are recorded.")] });
  }
  if (module.slug === "suppliers") {
    const rows = await all(`SELECT s.supplier_number, o.legal_name, s.supplier_type, s.qualification_status, s.gdp_status, s.gmp_status,
      (SELECT COUNT(*) FROM product_supplier_links psl WHERE psl.supplier_id = s.id) AS product_count,
      (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id) AS po_count
      FROM suppliers s JOIN organizations o ON o.id = s.organization_id ORDER BY o.legal_name`);
    return baseSnapshot(module, { sections: [section("Supplier qualification", [["supplier_number", "Supplier"], ["legal_name", "Company"], ["supplier_type", "Type", "status"], ["qualification_status", "Qualification", "status"], ["gdp_status", "GDP", "status"], ["gmp_status", "GMP", "status"], ["product_count", "Products", "number"], ["po_count", "POs", "number"]], rows, "No suppliers are recorded.")] });
  }
  if (module.slug === "products") {
    const rows = await all(`SELECT p.id, p.sku, p.product_name, p.pack_size, pf.family_name, p.regulatory_status,
      p.lifecycle_status, pv.claims_review_status, pv.sale_status,
      (SELECT COUNT(*) FROM product_composition_items pci WHERE pci.product_id = p.id) AS composition_count,
      (SELECT COUNT(*) FROM product_media pm WHERE pm.product_id = p.id) AS media_count,
      (SELECT COUNT(*) FROM batches b WHERE b.product_id = p.id) AS batch_count,
      p.updated_at
      FROM products p LEFT JOIN product_variants pv ON pv.product_id = p.id LEFT JOIN product_families pf ON pf.id = pv.family_id
      ORDER BY CASE WHEN pv.catalogue_order IS NULL THEN 1 ELSE 0 END, pv.catalogue_order, p.product_name`);
    return baseSnapshot(module, { sections: [section("Product master", [["sku", "SKU"], ["product_name", "Product"], ["family_name", "Range"], ["pack_size", "Pack"], ["regulatory_status", "Classification", "status"], ["lifecycle_status", "Lifecycle", "status"], ["claims_review_status", "Claims", "status"], ["sale_status", "Sale status", "status"], ["composition_count", "Composition", "number"], ["media_count", "Media", "number"]], rows, "No products are recorded.")], actions: [{ code: "product_transition", label: "Request lifecycle transition", endpointTemplate: "/api/enterprise/products/{id}/status", method: "POST" }], notices: ["Lifecycle transitions are validated on the server. Nutraxin cannot be activated without completed evidence and regulatory controls."] });
  }
  if (module.slug === "orders") {
    const rows = await all(`SELECT o.id, o.order_number, org.legal_name AS customer, o.status, o.requested_delivery_date,
      o.total_minor, o.currency, o.customer_po_reference, COUNT(ol.id) AS line_count, o.created_at
      FROM orders o JOIN customers c ON c.id = o.customer_id JOIN organizations org ON org.id = c.organization_id
      LEFT JOIN order_lines ol ON ol.order_id = o.id
      GROUP BY o.id, o.order_number, org.legal_name, o.status, o.requested_delivery_date, o.total_minor, o.currency, o.customer_po_reference, o.created_at
      ORDER BY o.created_at DESC`);
    return baseSnapshot(module, { sections: [section("Orders", [["order_number", "Order"], ["customer", "Customer"], ["status", "Status", "status"], ["line_count", "Lines", "number"], ["total_minor", "Total", "money"], ["customer_po_reference", "PO reference"], ["requested_delivery_date", "Requested"]], rows, "No orders are recorded.")] });
  }
  if (module.slug === "warehouse") {
    const balances = await all(`SELECT il.location_code, il.name AS location, p.sku, p.product_name, b.batch_number, b.expiry_date,
      b.release_status, ib.on_hand_quantity, ib.reserved_quantity, ib.available_quantity, ib.quarantine_quantity, ib.updated_at
      FROM inventory_balances ib JOIN inventory_locations il ON il.id = ib.location_id JOIN products p ON p.id = ib.product_id
      JOIN batches b ON b.id = ib.batch_id ORDER BY b.expiry_date, p.product_name`);
    const movements = await all(`SELECT im.movement_type, p.sku, b.batch_number, im.quantity, im.balance_after,
      im.reference_type, im.reference_id, im.actor, im.occurred_at
      FROM inventory_movements im JOIN products p ON p.id = im.product_id LEFT JOIN batches b ON b.id = im.batch_id
      ORDER BY im.occurred_at DESC LIMIT 40`);
    return baseSnapshot(module, { metrics: [
      metric("available", "Released available", balances.reduce((sum, row) => sum + Number(row.available_quantity), 0)),
      metric("quarantine", "Quarantine", balances.reduce((sum, row) => sum + Number(row.quarantine_quantity), 0)),
      metric("expiring", "Expiring batches", balances.filter((row) => row.expiry_date <= "2026-10-31").length)
    ], sections: [
      section("Inventory ledger", [["location_code", "Location"], ["sku", "SKU"], ["product_name", "Product"], ["batch_number", "Batch"], ["expiry_date", "Expiry"], ["release_status", "Quality status", "status"], ["available_quantity", "Available", "number"], ["reserved_quantity", "Reserved", "number"], ["quarantine_quantity", "Quarantine", "number"]], balances, "No inventory balances are recorded."),
      section("Stock movements", [["occurred_at", "Time"], ["movement_type", "Movement", "status"], ["sku", "SKU"], ["batch_number", "Batch"], ["quantity", "Quantity", "number"], ["reference_type", "Reference type"], ["reference_id", "Reference"]], movements, "No stock movements are recorded.")
    ], notices: ["Synthetic locations represent a third-party warehouse validation model; NovaPharm-owned warehousing is not claimed."] });
  }
  if (module.slug === "purchasing") {
    const purchaseOrders = await all(`SELECT po.po_number, org.legal_name AS supplier, po.status, po.total_minor, po.currency,
      po.expected_date, COUNT(pol.id) AS line_count, po.created_at
      FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id JOIN organizations org ON org.id = s.organization_id
      LEFT JOIN purchase_order_lines pol ON pol.purchase_order_id = po.id
      GROUP BY po.id, po.po_number, org.legal_name, po.status, po.total_minor, po.currency, po.expected_date, po.created_at ORDER BY po.created_at DESC`);
    const receipts = await all(`SELECT gr.receipt_number, po.po_number, org.legal_name AS supplier, gr.status, gr.received_at,
      SUM(grl.quantity_received) AS received_quantity, SUM(grl.quantity_rejected) AS rejected_quantity
      FROM goods_receipts gr JOIN purchase_orders po ON po.id = gr.purchase_order_id JOIN suppliers s ON s.id = gr.supplier_id
      JOIN organizations org ON org.id = s.organization_id LEFT JOIN goods_receipt_lines grl ON grl.goods_receipt_id = gr.id
      GROUP BY gr.id, gr.receipt_number, po.po_number, org.legal_name, gr.status, gr.received_at ORDER BY gr.received_at DESC`);
    const invoices = await all(`SELECT si.supplier_invoice_number, org.legal_name AS supplier, po.po_number, si.status,
      si.invoice_date, si.due_date, si.total_minor, si.currency, im.match_status, im.variance_minor
      FROM supplier_invoices si JOIN suppliers s ON s.id = si.supplier_id JOIN organizations org ON org.id = s.organization_id
      LEFT JOIN purchase_orders po ON po.id = si.purchase_order_id LEFT JOIN invoice_matches im ON im.supplier_invoice_id = si.id
      ORDER BY si.invoice_date DESC`);
    return baseSnapshot(module, { sections: [
      section("Purchase orders", [["po_number", "PO"], ["supplier", "Supplier"], ["status", "Status", "status"], ["line_count", "Lines", "number"], ["total_minor", "Total", "money"], ["expected_date", "Expected"]], purchaseOrders, "No purchase orders are recorded."),
      section("Goods receipts", [["receipt_number", "Receipt"], ["po_number", "PO"], ["supplier", "Supplier"], ["status", "Status", "status"], ["received_quantity", "Received", "number"], ["rejected_quantity", "Rejected", "number"]], receipts, "No goods receipts are recorded."),
      section("Supplier invoices and match", [["supplier_invoice_number", "Invoice"], ["supplier", "Supplier"], ["po_number", "PO"], ["status", "Status", "status"], ["match_status", "3-way match", "status"], ["variance_minor", "Variance", "money"], ["total_minor", "Total", "money"]], invoices, "No supplier invoices are recorded.")
    ] });
  }
  if (module.slug === "finance") {
    const journals = await all(`SELECT je.journal_number, je.journal_date, je.description, je.source_type, je.status,
      je.prepared_by, je.approved_by, SUM(jl.debit_minor) AS debit_minor, SUM(jl.credit_minor) AS credit_minor
      FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id = je.id
      GROUP BY je.id, je.journal_number, je.journal_date, je.description, je.source_type, je.status, je.prepared_by, je.approved_by
      ORDER BY je.journal_date DESC, je.journal_number`);
    const receivables = await all(`SELECT i.invoice_number, org.legal_name AS customer, i.status, i.issue_date, i.due_date,
      i.total_minor, i.outstanding_minor, i.currency FROM invoices i JOIN customers c ON c.id = i.customer_id
      JOIN organizations org ON org.id = c.organization_id ORDER BY i.due_date`);
    const payables = await all(`SELECT si.supplier_invoice_number, org.legal_name AS supplier, si.status, si.invoice_date,
      si.due_date, si.total_minor, si.currency FROM supplier_invoices si JOIN suppliers s ON s.id = si.supplier_id
      JOIN organizations org ON org.id = s.organization_id ORDER BY si.due_date`);
    const totals = journals.reduce((state, row) => ({ debit: state.debit + Number(row.debit_minor), credit: state.credit + Number(row.credit_minor) }), { debit: 0, credit: 0 });
    return baseSnapshot(module, { metrics: [metric("debits", "Posted debits", totals.debit, "money"), metric("credits", "Posted credits", totals.credit, "money"), metric("ar", "Receivables", receivables.reduce((sum, row) => sum + Number(row.outstanding_minor), 0), "money"), metric("ap", "Payables", payables.reduce((sum, row) => sum + Number(row.total_minor), 0), "money")], sections: [
      section("Double-entry journals", [["journal_number", "Journal"], ["journal_date", "Date"], ["source_type", "Source", "status"], ["status", "Status", "status"], ["prepared_by", "Preparer"], ["approved_by", "Approver"], ["debit_minor", "Debits", "money"], ["credit_minor", "Credits", "money"]], journals, "No journals are recorded."),
      section("Accounts receivable", [["invoice_number", "Invoice"], ["customer", "Customer"], ["due_date", "Due"], ["status", "Status", "status"], ["outstanding_minor", "Outstanding", "money"]], receivables, "No receivables are recorded."),
      section("Accounts payable", [["supplier_invoice_number", "Invoice"], ["supplier", "Supplier"], ["due_date", "Due"], ["status", "Status", "status"], ["total_minor", "Amount", "money"]], payables, "No payables are recorded.")
    ], notices: ["All displayed finance values are synthetic local-validation transactions and do not represent NovaPharm performance."] });
  }
  if (module.slug === "quality") {
    const complaints = await all(`SELECT qc.complaint_number, p.product_name, b.batch_number, qc.severity, qc.status,
      qc.pv_escalation_status, qc.due_at, qc.created_at FROM quality_complaints qc
      LEFT JOIN products p ON p.id = qc.product_id LEFT JOIN batches b ON b.id = qc.batch_id ORDER BY qc.created_at DESC`);
    const deviations = await all(`SELECT qd.deviation_number, p.product_name, b.batch_number, qd.severity, qd.status,
      qd.root_cause_status, qd.due_at FROM quality_deviations qd LEFT JOIN products p ON p.id = qd.product_id
      LEFT JOIN batches b ON b.id = qd.batch_id ORDER BY qd.created_at DESC`);
    const capas = await all("SELECT capa_number, source_type, status, effectiveness_status, due_at, closed_at FROM capa_records ORDER BY created_at DESC");
    return baseSnapshot(module, { sections: [
      section("Complaints", [["complaint_number", "Complaint"], ["product_name", "Product"], ["batch_number", "Batch"], ["severity", "Severity", "status"], ["status", "Status", "status"], ["pv_escalation_status", "Safety boundary", "status"]], complaints, "No complaints are recorded."),
      section("Deviations", [["deviation_number", "Deviation"], ["product_name", "Product"], ["batch_number", "Batch"], ["severity", "Severity", "status"], ["status", "Status", "status"], ["root_cause_status", "Root cause", "status"]], deviations, "No deviations are recorded."),
      section("CAPA", [["capa_number", "CAPA"], ["source_type", "Source"], ["status", "Status", "status"], ["effectiveness_status", "Effectiveness", "status"], ["due_at", "Due"], ["closed_at", "Closed"]], capas, "No CAPA records are recorded.")
    ], notices: ["This operational foundation does not claim to replace a validated pharmaceutical QMS."] });
  }
  if (module.slug === "regulatory") {
    const rows = await all(`SELECT rc.case_number, p.product_name, rc.case_type, rc.jurisdiction, rc.authority,
      rc.status, rc.current_stage, rc.external_reference, rc.target_date,
      (SELECT COUNT(*) FROM regulatory_milestones rm WHERE rm.regulatory_case_id = rc.id AND rm.status NOT IN ('completed','approved')) AS open_milestones
      FROM regulatory_cases rc LEFT JOIN products p ON p.id = rc.product_id ORDER BY rc.target_date`);
    return baseSnapshot(module, { sections: [section("Regulatory records", [["case_number", "Case"], ["product_name", "Product"], ["case_type", "Classification", "status"], ["jurisdiction", "Territory"], ["authority", "Authority"], ["status", "Status", "status"], ["current_stage", "Current stage"], ["open_milestones", "Open milestones", "number"], ["target_date", "Target"]], rows, "No regulatory cases are recorded.")], notices: ["Nutraxin is treated as a food-supplement classification workflow. No MHRA medicinal-product authorisation is assigned."] });
  }
  if (module.slug === "crm") {
    const opportunities = await all(`SELECT co.opportunity_number, co.name, co.opportunity_type, co.stage,
      co.probability_basis_points, co.estimated_value_minor, co.currency, co.next_action, co.next_action_at,
      l.lead_number, org.legal_name AS organisation
      FROM crm_opportunities co LEFT JOIN leads l ON l.id = co.lead_id LEFT JOIN organizations org ON org.id = co.organization_id
      ORDER BY co.next_action_at`);
    const leads = await all("SELECT lead_number, company, enquiry_type, status, delivery_state, created_at FROM leads ORDER BY created_at DESC LIMIT 30");
    return baseSnapshot(module, { metrics: [metric("pipeline", "Pipeline value", opportunities.reduce((sum, row) => sum + Number(row.estimated_value_minor || 0), 0), "money"), metric("opportunities", "Opportunities", opportunities.length), metric("leads", "Leads", leads.length)], sections: [
      section("Opportunities", [["opportunity_number", "Opportunity"], ["name", "Name"], ["organisation", "Organisation"], ["stage", "Stage", "status"], ["probability_basis_points", "Probability", "basis_points"], ["estimated_value_minor", "Value", "money"], ["next_action", "Next action"], ["next_action_at", "Due"]], opportunities, "No opportunities are recorded."),
      section("Lead queue", [["lead_number", "Lead"], ["company", "Company"], ["enquiry_type", "Type"], ["status", "Status", "status"], ["delivery_state", "Notification", "status"], ["created_at", "Created"]], leads, "No leads are recorded.")
    ] });
  }
  if (module.slug === "reports") {
    const rows = [
      ["Sales pipeline", "crm_opportunities", (await one("SELECT COUNT(*) AS value FROM crm_opportunities"))?.value],
      ["Customer activity", "customers + orders + invoices", (await one("SELECT COUNT(*) AS value FROM customers"))?.value],
      ["Order status", "orders", (await one("SELECT COUNT(*) AS value FROM orders"))?.value],
      ["Purchasing", "purchase_orders + goods_receipts", (await one("SELECT COUNT(*) AS value FROM purchase_orders"))?.value],
      ["Inventory", "inventory_balances + movements", (await one("SELECT COUNT(*) AS value FROM inventory_balances"))?.value],
      ["Finance", "journals + AR + AP", (await one("SELECT COUNT(*) AS value FROM journal_entries"))?.value],
      ["Quality", "complaints + deviations + CAPA", (await one("SELECT COUNT(*) AS value FROM quality_complaints"))?.value],
      ["Regulatory", "regulatory_cases", (await one("SELECT COUNT(*) AS value FROM regulatory_cases"))?.value],
      ["Security events", "security_events", (await one("SELECT COUNT(*) AS value FROM security_events"))?.value],
      ["Integration health", "integration_events + outbox", (await one("SELECT COUNT(*) AS value FROM integration_events"))?.value]
    ].map(([report, source, records]) => ({ report, source, records, state: "synthetic_local_validation", currency: report === "Finance" ? "GBP" : "Not applicable" }));
    return baseSnapshot(module, { sections: [section("Governed report catalogue", [["report", "Report"], ["source", "Canonical source"], ["records", "Records", "number"], ["state", "Data state", "status"], ["currency", "Currency"]], rows, "No governed reports are configured.")], notices: ["Reports are generated server-side from authorised canonical tables; the browser never receives unrestricted table access."] });
  }
  if (module.slug === "administration") {
    const workflows = await all("SELECT id, workflow_code, business_key, status, current_step, started_by, updated_at FROM workflow_instances ORDER BY updated_at DESC");
    const permissions = await all("SELECT role_scope, module_code, permission_code, effect, created_at FROM role_permissions ORDER BY role_scope, module_code, permission_code");
    return baseSnapshot(module, { sections: [
      section("Workflow administration", [["workflow_code", "Workflow"], ["business_key", "Business key"], ["status", "Status", "status"], ["current_step", "Current step"], ["updated_at", "Updated"]], workflows, "No workflow instances are recorded."),
      section("Role controls", [["role_scope", "Scope"], ["module_code", "Module"], ["permission_code", "Permission"], ["effect", "Effect", "status"]], permissions, "No granular permissions are recorded.")
    ], actions: workflows.filter((workflow) => workflow.status === "active").map((workflow) => ({
      code: "advance_workflow", label: `Advance ${workflow.workflow_code.replaceAll("_", " ")}`,
      endpoint: `/api/enterprise/workflows/${workflow.id}/advance`, method: "POST", workflowId: workflow.id
    })), notices: ["Security identities and secrets remain in the administrator portal; raw table editing is not available."] });
  }
  return baseSnapshot(module, { notices: ["No canonical employee dataset is configured for this module."] });
}

async function executiveSnapshot(module) {
  const counts = await one(`SELECT
    (SELECT COUNT(*) FROM customers WHERE lifecycle_status = 'active') AS customers,
    (SELECT COUNT(*) FROM products) AS products,
    (SELECT COUNT(*) FROM orders) AS orders,
    (SELECT COALESCE(SUM(total_minor),0) FROM invoices) AS invoice_value,
    (SELECT COALESCE(SUM(outstanding_minor),0) FROM invoices) AS receivables,
    (SELECT COALESCE(SUM(total_minor),0) FROM supplier_invoices) AS payables,
    (SELECT COUNT(*) FROM quality_complaints WHERE status <> 'closed') AS quality_exceptions,
    (SELECT COUNT(*) FROM regulatory_cases WHERE status NOT IN ('closed','approved')) AS regulatory_actions,
    (SELECT COUNT(*) FROM crm_opportunities WHERE stage NOT IN ('won','lost','closed')) AS pipeline,
    (SELECT COUNT(*) FROM integration_events WHERE status IN ('pending','retrying','blocked')) AS integration_exceptions`);
  const commonMetrics = [metric("customers", "Customers", counts.customers), metric("products", "Products", counts.products), metric("orders", "Orders", counts.orders), metric("quality", "Quality exceptions", counts.quality_exceptions), metric("regulatory", "Regulatory actions", counts.regulatory_actions)];
  if (["nhs-data", "pharmacovigilance", "microsoft-365", "capital", "ai-technology", "tenders"].includes(module.slug)) {
    const sourceState = module.slug === "microsoft-365"
      ? await all("SELECT destination_system, status, COUNT(*) AS event_count, MAX(created_at) AS latest_event FROM integration_events WHERE destination_system = 'sharepoint' GROUP BY destination_system, status")
      : [];
    return baseSnapshot(module, { readOnly: true, metrics: commonMetrics, sections: [section("Source status", [["source", "Source"], ["state", "State", "status"], ["dependency", "Required next control"]], sourceState.length ? sourceState.map((row) => ({ source: row.destination_system, state: row.status, dependency: module.externalDependency })) : [{ source: module.title, state: module.maturity, dependency: module.externalDependency || "Board-approved canonical records" }], "No approved source is connected.")], notices: [module.purpose, "No operational capability, award, authorisation or commercial result is inferred from this integration boundary."] });
  }
  if (module.slug === "plpi") {
    const rows = await all("SELECT case_number, status, current_stage, target_date FROM regulatory_cases WHERE case_type = 'plpi' ORDER BY target_date");
    return baseSnapshot(module, { readOnly: true, metrics: commonMetrics, sections: [section("PLPI governance projects", [["case_number", "Project"], ["status", "Status", "status"], ["current_stage", "Stage"], ["target_date", "Target"]], rows, "No approved PLPI project records exist.")], notices: ["This is an internal governance tracker only. No PLPI licence is represented as granted."] });
  }
  if (module.slug === "finance" || module.slug === "ceo-dashboard") {
    const journals = await all(`SELECT je.journal_number, je.source_type, je.status, SUM(jl.debit_minor) AS debit_minor, SUM(jl.credit_minor) AS credit_minor
      FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id = je.id GROUP BY je.id, je.journal_number, je.source_type, je.status ORDER BY je.journal_number`);
    return baseSnapshot(module, { readOnly: true, metrics: [metric("invoice_value", "Synthetic invoice value", counts.invoice_value, "money"), metric("receivables", "Synthetic receivables", counts.receivables, "money"), metric("payables", "Synthetic payables", counts.payables, "money"), ...commonMetrics], sections: [section("Posted journal control", [["journal_number", "Journal"], ["source_type", "Source"], ["status", "Status", "status"], ["debit_minor", "Debits", "money"], ["credit_minor", "Credits", "money"]], journals, "No posted journals are available.")], notices: ["All finance values are synthetic local-validation data and are not NovaPharm revenue, cash or performance."] });
  }
  if (module.slug === "sales-intelligence") {
    const rows = await all("SELECT opportunity_number, name, opportunity_type, stage, probability_basis_points, estimated_value_minor, currency, next_action_at FROM crm_opportunities ORDER BY next_action_at");
    return baseSnapshot(module, { readOnly: true, metrics: [metric("pipeline", "Open opportunities", counts.pipeline), ...commonMetrics], sections: [section("Commercial pipeline", [["opportunity_number", "Opportunity"], ["name", "Name"], ["opportunity_type", "Type"], ["stage", "Stage", "status"], ["probability_basis_points", "Probability", "basis_points"], ["estimated_value_minor", "Synthetic value", "money"], ["next_action_at", "Next action"]], rows, "No approved opportunities are recorded.")], notices: ["Values are synthetic validation records and do not represent revenue achievement."] });
  }
  if (module.slug === "customer-analytics") {
    const rows = await all(`SELECT c.customer_number, o.legal_name, c.customer_type, c.lifecycle_status,
      c.credit_limit_minor, c.outstanding_balance_minor, COUNT(DISTINCT ord.id) AS orders,
      COUNT(DISTINCT qc.id) AS complaints FROM customers c JOIN organizations o ON o.id = c.organization_id
      LEFT JOIN orders ord ON ord.customer_id = c.id LEFT JOIN quality_complaints qc ON qc.customer_id = c.id
      GROUP BY c.id, c.customer_number, o.legal_name, c.customer_type, c.lifecycle_status, c.credit_limit_minor, c.outstanding_balance_minor
      ORDER BY o.legal_name`);
    return baseSnapshot(module, { readOnly: true, metrics: commonMetrics, sections: [section("Customer portfolio", [["customer_number", "Account"], ["legal_name", "Company"], ["customer_type", "Type"], ["lifecycle_status", "Status", "status"], ["orders", "Orders", "number"], ["complaints", "Complaints", "number"], ["outstanding_balance_minor", "Outstanding", "money"]], rows, "No customers are recorded.")] });
  }
  if (module.slug === "product-master") {
    const rows = await all(`SELECT p.sku, p.product_name, pf.family_name, p.regulatory_status, p.lifecycle_status,
      pv.claims_review_status, pv.sale_status, COUNT(DISTINCT b.id) AS batches
      FROM products p LEFT JOIN product_variants pv ON pv.product_id = p.id LEFT JOIN product_families pf ON pf.id = pv.family_id
      LEFT JOIN batches b ON b.product_id = p.id GROUP BY p.id, p.sku, p.product_name, pf.family_name, p.regulatory_status, p.lifecycle_status, pv.claims_review_status, pv.sale_status
      ORDER BY p.product_name`);
    return baseSnapshot(module, { readOnly: true, metrics: commonMetrics, sections: [section("Strategic product readiness", [["sku", "SKU"], ["product_name", "Product"], ["family_name", "Range"], ["regulatory_status", "Classification", "status"], ["lifecycle_status", "Lifecycle", "status"], ["claims_review_status", "Claims", "status"], ["sale_status", "Sale status", "status"], ["batches", "Batches", "number"]], rows, "No products are recorded.")] });
  }
  if (module.slug === "sourcing") {
    const rows = await all(`SELECT s.supplier_number, o.legal_name, s.supplier_type, s.qualification_status, s.gdp_status, s.gmp_status,
      COUNT(DISTINCT psl.product_id) AS linked_products, COUNT(DISTINCT po.id) AS purchase_orders
      FROM suppliers s JOIN organizations o ON o.id = s.organization_id LEFT JOIN product_supplier_links psl ON psl.supplier_id = s.id
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id GROUP BY s.id, s.supplier_number, o.legal_name, s.supplier_type, s.qualification_status, s.gdp_status, s.gmp_status ORDER BY o.legal_name`);
    return baseSnapshot(module, { readOnly: true, metrics: commonMetrics, sections: [section("Supplier readiness", [["supplier_number", "Supplier"], ["legal_name", "Organisation"], ["supplier_type", "Type"], ["qualification_status", "Qualification", "status"], ["gdp_status", "GDP", "status"], ["gmp_status", "GMP", "status"], ["linked_products", "Products", "number"]], rows, "No supplier records are available.")] });
  }
  if (module.slug === "warehouse" || module.slug === "service-levels") {
    const rows = await all(`SELECT o.order_number, s.shipment_number, s.status, s.carrier_name, s.dispatched_at, s.delivered_at,
      CASE WHEN s.delivered_at IS NOT NULL THEN 'measured_from_synthetic_record' ELSE 'not_complete' END AS service_measure
      FROM orders o LEFT JOIN shipments s ON s.order_id = o.id ORDER BY o.created_at DESC`);
    return baseSnapshot(module, { readOnly: true, metrics: commonMetrics, sections: [section(module.slug === "warehouse" ? "Warehouse integration view" : "Service-level evidence", [["order_number", "Order"], ["shipment_number", "Shipment"], ["status", "Status", "status"], ["carrier_name", "Carrier"], ["dispatched_at", "Dispatched"], ["delivered_at", "Delivered"], ["service_measure", "Measure state", "status"]], rows, "No approved shipment records are available.")], notices: ["Synthetic third-party fulfilment records do not imply NovaPharm-owned warehousing or live service performance."] });
  }
  if (module.slug === "documents") {
    const rows = await all("SELECT document_number, title, document_class, lifecycle_status, security_status, version, updated_at FROM documents ORDER BY updated_at DESC LIMIT 40");
    return baseSnapshot(module, { readOnly: true, metrics: commonMetrics, sections: [section("Controlled document metadata", [["document_number", "Document"], ["title", "Title"], ["document_class", "Class", "status"], ["lifecycle_status", "Lifecycle", "status"], ["security_status", "Security", "status"], ["version", "Version", "number"], ["updated_at", "Updated"]], rows, "No controlled document metadata is recorded.")], notices: ["Storage paths and file contents are not exposed in the executive response."] });
  }
  if (module.slug === "traceability") {
    const rows = await all(`SELECT p.sku, p.product_name, b.batch_number, im.movement_type, im.quantity,
      im.reference_type, im.reference_id, im.occurred_at FROM inventory_movements im JOIN products p ON p.id = im.product_id
      LEFT JOIN batches b ON b.id = im.batch_id ORDER BY im.occurred_at DESC LIMIT 50`);
    return baseSnapshot(module, { readOnly: true, metrics: commonMetrics, sections: [section("Batch and transaction evidence", [["occurred_at", "Time"], ["sku", "SKU"], ["product_name", "Product"], ["batch_number", "Batch"], ["movement_type", "Event", "status"], ["quantity", "Quantity", "number"], ["reference_type", "Reference type"], ["reference_id", "Reference"]], rows, "No traceability events are recorded.")], notices: ["This view uses canonical database events. It does not claim a deployed blockchain."] });
  }
  const workflows = await all("SELECT workflow_code, status, current_step, updated_at FROM workflow_instances ORDER BY updated_at DESC");
  return baseSnapshot(module, { readOnly: true, metrics: [...commonMetrics, metric("integrations", "Integration exceptions", counts.integration_exceptions)], sections: [section("Cross-functional workflows", [["workflow_code", "Workflow"], ["status", "Status", "status"], ["current_step", "Current step"], ["updated_at", "Updated"]], workflows, "No workflow records are available.")], notices: ["Board access is read-only; all figures are synthetic local-validation records."] });
}

async function adminSnapshot(module) {
  const workflows = await all("SELECT workflow_code, business_key, status, current_step, updated_at FROM workflow_instances ORDER BY updated_at DESC");
  const imports = await all("SELECT catalogue_code, catalogue_version, product_count, status, imported_by, imported_at FROM catalogue_imports ORDER BY imported_at DESC");
  const migrations = await all("SELECT version, checksum_sha256, applied_at FROM schema_migrations ORDER BY version");
  const events = await all("SELECT event_type, aggregate_type, aggregate_id, actor, occurred_at FROM domain_events ORDER BY occurred_at DESC LIMIT 40");
  return baseSnapshot(module, { metrics: [
    metric("workflows", "Workflow instances", workflows.length), metric("imports", "Catalogue imports", imports.length),
    metric("outbox", "Pending outbox", (await one("SELECT COUNT(*) AS value FROM outbox_messages WHERE status IN ('pending','retrying','blocked')"))?.value),
    metric("security", "Security events", (await one("SELECT COUNT(*) AS value FROM security_events"))?.value)
  ], sections: [
    section("Workflow control", [["workflow_code", "Workflow"], ["business_key", "Business key"], ["status", "Status", "status"], ["current_step", "Current step"], ["updated_at", "Updated"]], workflows, "No workflows are recorded."),
    section("Controlled catalogue imports", [["catalogue_code", "Catalogue"], ["catalogue_version", "Version"], ["product_count", "Products", "number"], ["status", "Status", "status"], ["imported_by", "Actor"], ["imported_at", "Imported"]], imports, "No catalogue imports are recorded."),
    section("Schema migrations", [["version", "Migration"], ["checksum_sha256", "Checksum", "code"], ["applied_at", "Applied"]], migrations, "No schema migrations are recorded."),
    section("Domain event audit", [["event_type", "Event"], ["aggregate_type", "Entity type"], ["aggregate_id", "Entity"], ["actor", "Actor"], ["occurred_at", "Time"]], events, "No domain events are recorded.")
  ], notices: ["State changes remain available only through authorised, CSRF-protected workflow endpoints. Raw-table editing is intentionally unavailable."] });
}

export async function enterpriseModuleSnapshot(code, context) {
  const module = portalModuleByCode.get(code);
  if (!module) throw Object.assign(new Error("Portal module not found."), { statusCode: 404 });
  if (!canUseModule(module, context)) throw forbidden();
  if (module.area === "customer") {
    if (!context.customerId) throw forbidden("A customer account context is required.");
    return customerSnapshot(module, context.customerId, context);
  }
  if (module.area === "employee") return employeeSnapshot(module, context);
  if (module.area === "executive") return executiveSnapshot(module, context);
  return adminSnapshot(module, context);
}

export async function authorisedEnterpriseSearch(query, context) {
  const term = clean(query, 80);
  if (term.length < 2) return { query: term, results: [], dataFreshness: nowIso() };
  const like = `%${term}%`;
  const results = [];
  const push = (type, rows, route, titleKey, referenceKey) => rows.forEach((row) => results.push({ type, title: row[titleKey], reference: row[referenceKey], route, status: row.status || null }));
  if (context.accessType === "customer") {
    if (!context.customerId) throw forbidden("A customer account context is required.");
    push("Order", await all("SELECT order_number, order_number AS title, status FROM orders WHERE customer_id = ? AND (order_number LIKE ? OR COALESCE(customer_po_reference,'') LIKE ?) ORDER BY created_at DESC LIMIT 10", context.customerId, like, like), "/portal/orders/", "title", "order_number");
    push("Invoice", await all("SELECT invoice_number, invoice_number AS title, status FROM invoices WHERE customer_id = ? AND invoice_number LIKE ? ORDER BY issue_date DESC LIMIT 10", context.customerId, like), "/portal/invoices/", "title", "invoice_number");
    const products = (await authorisedCustomerProducts(context.customerId)).filter((row) => `${row.sku} ${row.product_name}`.toLowerCase().includes(term.toLowerCase())).slice(0, 10);
    push("Product", products.map((row) => ({ ...row, title: row.product_name, status: row.sale_status })), "/portal/products/", "title", "sku");
    return { query: term, results: results.slice(0, 30), dataFreshness: nowIso() };
  }
  push("Product", await all("SELECT sku, product_name AS title, lifecycle_status AS status FROM products WHERE sku LIKE ? OR product_name LIKE ? ORDER BY product_name LIMIT 10", like, like), "/employee/products/", "title", "sku");
  push("Order", await all("SELECT order_number, order_number AS title, status FROM orders WHERE order_number LIKE ? OR COALESCE(customer_po_reference,'') LIKE ? ORDER BY created_at DESC LIMIT 10", like, like), "/employee/orders/", "title", "order_number");
  if (context.accessScopes?.includes("employee") || context.accessScopes?.includes("admin")) {
    push("Customer", await all(`SELECT c.customer_number, o.legal_name AS title, c.lifecycle_status AS status FROM customers c
      JOIN organizations o ON o.id = c.organization_id WHERE c.customer_number LIKE ? OR o.legal_name LIKE ? ORDER BY o.legal_name LIMIT 10`, like, like), "/employee/customers/", "title", "customer_number");
    push("Supplier", await all(`SELECT s.supplier_number, o.legal_name AS title, s.qualification_status AS status FROM suppliers s
      JOIN organizations o ON o.id = s.organization_id WHERE s.supplier_number LIKE ? OR o.legal_name LIKE ? ORDER BY o.legal_name LIMIT 10`, like, like), "/employee/suppliers/", "title", "supplier_number");
    push("Quality", await all("SELECT complaint_number, complaint_number AS title, status FROM quality_complaints WHERE complaint_number LIKE ? OR description LIKE ? ORDER BY created_at DESC LIMIT 10", like, like), "/employee/quality/", "title", "complaint_number");
    push("Regulatory", await all("SELECT case_number, case_number AS title, status FROM regulatory_cases WHERE case_number LIKE ? OR case_type LIKE ? ORDER BY created_at DESC LIMIT 10", like, like), "/employee/regulatory/", "title", "case_number");
  }
  return { query: term, results: results.slice(0, 50), dataFreshness: nowIso() };
}

function safetyContent(value) {
  return /\b(?:adverse[ -]?event|side effect|serious reaction|allergic reaction|overdose|medical emergency|patient name|date of birth|nhs number|yellow card)\b/i.test(value);
}

export async function createCustomerSupport(input, context) {
  if (!context.customerId) throw forbidden("A customer account context is required.");
  const subject = clean(input.subject, 200);
  const description = clean(input.description, 2000);
  const category = clean(input.category, 80) || "account";
  if (!subject || description.length < 10) throw invalid("Subject and a meaningful description are required.");
  const id = randomUUID();
  const number = `TEST-TKT-${id.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const now = nowIso();
  await transaction(async () => {
    await run(`INSERT INTO support_tickets(id, ticket_number, customer_id, requester_user_id, category, priority, status,
      subject, description, order_id, product_id, created_at, updated_at)
      VALUES(?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?)`, id, number, context.customerId, context.userId || null,
    category, clean(input.priority, 32) || "normal", subject, description, clean(input.orderId, 64) || null, clean(input.productId, 64) || null, now, now);
    await audit({ actor: context.username, action: "support_ticket.created", entityType: "support_ticket", entityId: id, after: { number, customerId: context.customerId, category } });
  });
  return { id, ticketNumber: number, status: "open" };
}

export async function createCustomerReturn(input, context) {
  if (!context.customerId) throw forbidden("A customer account context is required.");
  const order = await one("SELECT id FROM orders WHERE id = ? AND customer_id = ?", clean(input.orderId, 64), context.customerId);
  if (!order) throw invalid("Select an order belonging to this customer account.");
  const line = await one("SELECT id, product_id FROM order_lines WHERE id = ? AND order_id = ?", clean(input.orderLineId, 64), order.id);
  if (!line) throw invalid("Select an order line belonging to the order.");
  const quantity = integer(input.quantity, "Quantity");
  const ordered = Number((await one("SELECT quantity FROM order_lines WHERE id = ?", line.id))?.quantity || 0);
  if (quantity > ordered) throw conflict("Return quantity cannot exceed the ordered quantity.");
  const id = randomUUID();
  const number = `TEST-RTN-${id.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const now = nowIso();
  await transaction(async () => {
    await run("INSERT INTO returns(id, return_number, customer_id, order_id, status, reason_code, quality_hold, created_at, updated_at) VALUES(?, ?, ?, ?, 'requested', ?, 1, ?, ?)", id, number, context.customerId, order.id, clean(input.reasonCode, 80) || "other", now, now);
    await run("INSERT INTO return_lines(id, return_id, product_id, quantity, disposition) VALUES(?, ?, ?, ?, 'pending')", randomUUID(), id, line.product_id, quantity);
    await audit({ actor: context.username, action: "return.requested", entityType: "return", entityId: id, after: { number, customerId: context.customerId, orderId: order.id, quantity } });
  });
  return { id, returnNumber: number, status: "requested" };
}

export async function createCustomerQualityComplaint(input, context) {
  if (!context.customerId) throw forbidden("A customer account context is required.");
  const description = clean(input.description, 2000);
  if (description.length < 20) throw invalid("Provide at least 20 characters describing the quality issue.");
  if (safetyContent(description) || input.safetyInformationPresent === true) throw invalid("Do not submit adverse-event or patient-identifiable information here. Use the controlled medical-safety route.");
  const order = await one("SELECT id FROM orders WHERE id = ? AND customer_id = ?", clean(input.orderId, 64), context.customerId);
  if (!order) throw invalid("Select an order belonging to this customer account.");
  const product = await one("SELECT p.id FROM order_lines ol JOIN products p ON p.id = ol.product_id WHERE ol.order_id = ? AND p.id = ?", order.id, clean(input.productId, 64));
  if (!product) throw invalid("Select a product from the customer order.");
  const id = randomUUID();
  const number = `TEST-QC-${id.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const now = nowIso();
  await transaction(async () => {
    await run(`INSERT INTO quality_complaints(id, complaint_number, customer_id, order_id, product_id, batch_id,
      severity, status, description, safety_information_present, pv_escalation_status, owner_user_id, due_at, created_at, updated_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, 'open', ?, 0, 'not_required', NULL, ?, ?, ?)`, id, number, context.customerId,
    order.id, product.id, clean(input.batchId, 64) || null, clean(input.severity, 32) || "untriaged", description,
    new Date(Date.now() + 5 * 86400000).toISOString(), now, now);
    await audit({ actor: context.username, action: "complaint.opened", entityType: "quality_complaint", entityId: id, after: { number, customerId: context.customerId, orderId: order.id, productId: product.id } });
  });
  return { id, complaintNumber: number, status: "open" };
}

export async function advanceWorkflow(workflowId, actor) {
  const workflow = await one("SELECT * FROM workflow_instances WHERE id = ?", clean(workflowId, 80));
  if (!workflow) throw Object.assign(new Error("Workflow not found."), { statusCode: 404 });
  if (workflow.status === "completed") throw conflict("Workflow is already complete.");
  const steps = await all("SELECT * FROM workflow_steps WHERE workflow_instance_id = ? ORDER BY sequence_number", workflow.id);
  const currentIndex = steps.findIndex((step) => step.status === "active");
  if (currentIndex < 0) throw conflict("Workflow has no active step.");
  const now = nowIso();
  const next = steps[currentIndex + 1] || null;
  await transaction(async () => {
    await run("UPDATE workflow_steps SET status = 'completed', actor = ?, completed_at = ? WHERE id = ? AND status = 'active'", actor, now, steps[currentIndex].id);
    if (next) await run("UPDATE workflow_steps SET status = 'active', actor = ?, started_at = ? WHERE id = ? AND status = 'pending'", actor, now, next.id);
    await run("UPDATE workflow_instances SET status = ?, current_step = ?, completed_at = ?, updated_at = ? WHERE id = ?", next ? "active" : "completed", next?.step_code || steps[currentIndex].step_code, next ? null : now, now, workflow.id);
    await audit({ actor, action: next ? "workflow.advanced" : "workflow.completed", entityType: "workflow", entityId: workflow.id, correlationId: workflow.correlation_id, before: { step: steps[currentIndex].step_code }, after: { step: next?.step_code || steps[currentIndex].step_code, status: next ? "active" : "completed" } });
    const eventId = randomUUID();
    const version = steps.filter((step) => step.status === "completed").length + 1;
    await run("INSERT INTO domain_events(id, event_type, aggregate_type, aggregate_id, aggregate_version, correlation_id, actor, payload_json, occurred_at) VALUES(?, ?, 'workflow', ?, ?, ?, ?, ?, ?)", eventId, next ? "workflow.advanced" : "workflow.completed", workflow.id, version, workflow.correlation_id, actor, JSON.stringify({ fromStep: steps[currentIndex].step_code, toStep: next?.step_code || null }), now);
    await run("INSERT INTO outbox_messages(id, domain_event_id, destination, message_type, idempotency_key, payload_json, status, attempt_count, next_attempt_at, created_at) VALUES(?, ?, 'local_validation', 'workflow.status', ?, ?, 'pending', 0, ?, ?)", randomUUID(), eventId, `${workflow.id}:${version}`, JSON.stringify({ workflowId: workflow.id, status: next ? "active" : "completed" }), now, now);
  });
  return { id: workflow.id, status: next ? "active" : "completed", currentStep: next?.step_code || steps[currentIndex].step_code };
}

const productTransitions = new Map([
  ["draft", new Set(["review", "retired"])],
  ["review", new Set(["approved", "suspended", "draft"])],
  ["approved", new Set(["active", "suspended"])],
  ["active", new Set(["suspended", "retired"])],
  ["suspended", new Set(["review", "retired"])],
  ["retired", new Set()]
]);

export async function transitionProductLifecycle(productId, nextStatus, actor) {
  const product = await one("SELECT * FROM products WHERE id = ?", clean(productId, 80));
  if (!product) throw Object.assign(new Error("Product not found."), { statusCode: 404 });
  const target = clean(nextStatus, 32);
  if (!productTransitions.get(product.lifecycle_status)?.has(target)) throw conflict(`Product cannot move from ${product.lifecycle_status} to ${target}.`);
  if (target === "active") {
    const variant = await one("SELECT claims_review_status, sale_status FROM product_variants WHERE product_id = ?", product.id);
    const regulatory = await one("SELECT status FROM regulatory_cases WHERE product_id = ? ORDER BY updated_at DESC LIMIT 1", product.id);
    if (product.source_system === "owner_supplied_nutraxin_catalogue" && (variant?.claims_review_status !== "approved" || variant?.sale_status !== "approved" || regulatory?.status !== "approved")) {
      throw conflict("Nutraxin activation requires approved claims, commercial sale status and regulatory classification evidence.");
    }
  }
  const now = nowIso();
  await transaction(async () => {
    await run("UPDATE products SET lifecycle_status = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ? AND lifecycle_status = ?", target, now, actor, product.id, product.lifecycle_status);
    await audit({ actor, action: `product.${target}`, entityType: "product", entityId: product.id, before: { lifecycleStatus: product.lifecycle_status }, after: { lifecycleStatus: target } });
    const eventId = randomUUID();
    await run("INSERT INTO domain_events(id, event_type, aggregate_type, aggregate_id, aggregate_version, correlation_id, actor, payload_json, occurred_at) VALUES(?, ?, 'product', ?, ?, ?, ?, ?, ?)", eventId, `product.${target}`, product.id, Number(product.version) + 1, eventId, actor, JSON.stringify({ from: product.lifecycle_status, to: target }), now);
    await run("INSERT INTO outbox_messages(id, domain_event_id, destination, message_type, idempotency_key, payload_json, status, attempt_count, next_attempt_at, created_at) VALUES(?, ?, 'internal_product_governance', ?, ?, ?, 'pending', 0, ?, ?)", randomUUID(), eventId, `product.${target}`, `${product.id}:${Number(product.version) + 1}`, JSON.stringify({ productId: product.id, status: target }), now, now);
  });
  return { id: product.id, sku: product.sku, lifecycleStatus: target, version: Number(product.version) + 1 };
}
