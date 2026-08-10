import { all, one } from "../data/database.mjs";

function section(title, columns, rows, emptyState, { source = "Canonical application database", description = "" } = {}) {
  return { title, description, columns, rows, emptyState, source, rowCount: rows.length };
}

function metric(key, label, value, format = "number", href = null) {
  return { key, label, value: Number(value || 0), format, href };
}

async function salesIntelligenceView(snapshot) {
  const rows = await all(`SELECT opportunity_number, name, opportunity_type, stage, probability_basis_points,
    estimated_value_minor, currency, next_action_at
    FROM crm_opportunities
    WHERE stage NOT IN ('won','lost','closed')
    ORDER BY next_action_at LIMIT 50`);
  const dueCutoff = Date.now();
  const probabilityRows = rows.filter((row) => Number.isFinite(Number(row.probability_basis_points)));
  const averageProbability = probabilityRows.length
    ? Math.round(probabilityRows.reduce((sum, row) => sum + Number(row.probability_basis_points || 0), 0) / probabilityRows.length)
    : 0;
  const nextActionsDue = rows.filter((row) => row.next_action_at && new Date(row.next_action_at).getTime() <= dueCutoff).length;
  return {
    ...snapshot,
    metrics: [
      metric("open-opportunities", "Open opportunities", rows.length),
      metric("qualified-opportunities", "Qualified opportunities", rows.filter((row) => String(row.stage).toLowerCase() === "qualified").length),
      metric("average-probability", "Average probability", averageProbability, "basis_points"),
      metric("next-actions-due", "Next actions due", nextActionsDue),
    ],
    sections: [section("Commercial pipeline", [["opportunity_number", "Opportunity"], ["name", "Name"], ["opportunity_type", "Type"], ["stage", "Stage", "status"], ["probability_basis_points", "Probability", "basis_points"], ["estimated_value_minor", "Synthetic value", "money"], ["next_action_at", "Next action"]], rows, "No commercial opportunity is recorded.")],
    notices: [...snapshot.notices, "Pipeline values are synthetic validation records and do not represent revenue achievement."],
  };
}

async function customerAnalyticsView(snapshot) {
  const rows = await all(`SELECT c.customer_number, o.legal_name, c.lifecycle_status, c.onboarding_status, c.price_list_code,
    c.credit_limit_minor, c.currency,
    (SELECT COUNT(*) FROM orders ord WHERE ord.customer_id = c.id) AS order_count,
    (SELECT COUNT(*) FROM invoices inv WHERE inv.customer_id = c.id AND inv.outstanding_minor > 0) AS open_invoice_count
    FROM customers c JOIN organizations o ON o.id = c.organization_id
    ORDER BY o.legal_name`);
  return {
    ...snapshot,
    metrics: [
      metric("customer-accounts", "Customer accounts", rows.length),
      metric("active-customers", "Active customers", rows.filter((row) => String(row.lifecycle_status).toLowerCase() === "active").length),
      metric("onboarding-open", "Onboarding open", rows.filter((row) => !["approved", "complete", "completed"].includes(String(row.onboarding_status).toLowerCase())).length),
      metric("accounts-with-open-invoices", "Accounts with open invoices", rows.filter((row) => Number(row.open_invoice_count || 0) > 0).length),
    ],
    sections: [section("Customer relationships", [["customer_number", "Customer"], ["legal_name", "Organisation"], ["lifecycle_status", "Lifecycle", "status"], ["onboarding_status", "Onboarding", "status"], ["price_list_code", "Price list"], ["credit_limit_minor", "Synthetic credit limit", "money"], ["order_count", "Orders", "number"], ["open_invoice_count", "Open invoices", "number"]], rows, "No customer relationship is recorded.")],
    notices: [...snapshot.notices, "Credit limits and account activity are synthetic validation data until production commercial authority is accepted."],
  };
}

async function productMasterView(snapshot) {
  const rows = await all(`SELECT p.id, p.sku, p.product_name, p.lifecycle_status, p.regulatory_status,
    pf.name AS family_name, pv.variant_name, pv.pack_size, pv.pack_unit,
    (SELECT COUNT(*) FROM batches b WHERE b.product_id = p.id) AS batch_count
    FROM products p
    LEFT JOIN product_families pf ON pf.id = p.family_id
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    ORDER BY p.product_name, pv.catalogue_order`);
  const products = new Map();
  for (const row of rows) if (!products.has(row.id)) products.set(row.id, row);
  return {
    ...snapshot,
    metrics: [
      metric("products", "Products", products.size),
      metric("active-products", "Active products", [...products.values()].filter((row) => String(row.lifecycle_status).toLowerCase() === "active").length),
      metric("variants", "Variants", rows.filter((row) => row.variant_name).length),
      metric("batches", "Recorded batches", [...products.values()].reduce((sum, row) => sum + Number(row.batch_count || 0), 0)),
    ],
    sections: [section("Product governance", [["sku", "SKU"], ["product_name", "Product"], ["family_name", "Family"], ["variant_name", "Variant"], ["pack_size", "Pack size"], ["pack_unit", "Unit"], ["lifecycle_status", "Lifecycle", "status"], ["regulatory_status", "Regulatory", "status"], ["batch_count", "Batches", "number"]], rows, "No product master data is recorded.")],
    notices: [...snapshot.notices, "Product master remains governed by lifecycle and regulatory state; this view does not bypass controlled product transitions."],
  };
}

async function sourcingView(snapshot) {
  const rows = await all(`SELECT s.id, s.supplier_number, o.legal_name, s.status, s.risk_rating,
    p.sku, p.product_name, psl.status AS link_status,
    (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id) AS purchase_order_count
    FROM suppliers s
    JOIN organizations o ON o.id = s.organization_id
    LEFT JOIN product_supplier_links psl ON psl.supplier_id = s.id
    LEFT JOIN products p ON p.id = psl.product_id
    ORDER BY o.legal_name, p.product_name`);
  const suppliers = new Map();
  for (const row of rows) if (!suppliers.has(row.id)) suppliers.set(row.id, row);
  return {
    ...snapshot,
    metrics: [
      metric("suppliers", "Suppliers", suppliers.size),
      metric("active-suppliers", "Active suppliers", [...suppliers.values()].filter((row) => String(row.status).toLowerCase() === "active").length),
      metric("product-links", "Product links", rows.filter((row) => row.sku).length),
      metric("purchase-orders", "Purchase orders", [...suppliers.values()].reduce((sum, row) => sum + Number(row.purchase_order_count || 0), 0)),
    ],
    sections: [section("Sourcing relationships", [["supplier_number", "Supplier"], ["legal_name", "Organisation"], ["status", "Status", "status"], ["risk_rating", "Risk", "status"], ["sku", "SKU"], ["product_name", "Product"], ["link_status", "Link status", "status"], ["purchase_order_count", "Purchase orders", "number"]], rows, "No sourcing relationship is recorded.")],
    notices: [...snapshot.notices, "Supplier and purchasing records are synthetic validation data until production sourcing authority is accepted."],
  };
}

async function shipmentView(snapshot, mode) {
  const rows = await all(`SELECT shipment_number, order_id, carrier_code, tracking_number, status, dispatched_at,
    promised_delivery_at, delivered_at, service_level_status
    FROM shipments ORDER BY COALESCE(delivered_at, dispatched_at) DESC`);
  const delivered = rows.filter((row) => row.delivered_at).length;
  const open = rows.length - delivered;
  const tracked = rows.filter((row) => row.tracking_number).length;
  const serviceStateRecorded = rows.filter((row) => row.service_level_status).length;
  const warehouseMetrics = [
    metric("shipments", "Shipments", rows.length),
    metric("open-shipments", "Open shipments", open),
    metric("delivered-shipments", "Delivered shipments", delivered),
    metric("tracked-shipments", "Tracked shipments", tracked),
  ];
  const serviceMetrics = [
    metric("service-records", "Service records", rows.length),
    metric("service-state-recorded", "Service state recorded", serviceStateRecorded),
    metric("delivered-shipments", "Delivered shipments", delivered),
    metric("open-shipments", "Open shipments", open),
  ];
  return {
    ...snapshot,
    metrics: mode === "service" ? serviceMetrics : warehouseMetrics,
    sections: [section(mode === "service" ? "Service-level delivery evidence" : "Shipment position", [["shipment_number", "Shipment"], ["carrier_code", "Carrier"], ["tracking_number", "Tracking"], ["status", "Status", "status"], ["dispatched_at", "Dispatched"], ["promised_delivery_at", "Promised"], ["delivered_at", "Delivered"], ["service_level_status", "Service level", "status"]], rows, "No shipment evidence is recorded.")],
    notices: [...snapshot.notices, "Carrier and service-level records are synthetic/local-validation evidence until an approved live logistics authority is connected."],
  };
}

async function financeView(snapshot) {
  const [rows, totals] = await Promise.all([
    all(`SELECT je.entry_number, je.entry_date, je.reference, je.description, je.status,
      SUM(jl.debit_minor) AS debit_minor, SUM(jl.credit_minor) AS credit_minor
      FROM journal_entries je LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
      GROUP BY je.id, je.entry_number, je.entry_date, je.reference, je.description, je.status
      ORDER BY je.entry_date DESC, je.entry_number DESC LIMIT 50`),
    one(`SELECT
      (SELECT COALESCE(SUM(outstanding_minor),0) FROM invoices) AS receivables_minor,
      (SELECT COALESCE(SUM(outstanding_minor),0) FROM supplier_invoices) AS payables_minor,
      (SELECT COUNT(*) FROM journal_entries WHERE status = 'posted') AS posted_journals`),
  ]);
  return {
    ...snapshot,
    metrics: [
      metric("receivables", "Synthetic receivables", totals?.receivables_minor, "money"),
      metric("payables", "Synthetic payables", totals?.payables_minor, "money"),
      metric("posted-journals", "Posted journals", totals?.posted_journals),
      metric("journal-entries", "Journal entries in view", rows.length),
    ],
    sections: [section("Posted journal evidence", [["entry_number", "Journal"], ["entry_date", "Date"], ["reference", "Reference"], ["description", "Description"], ["status", "Status", "status"], ["debit_minor", "Debit", "money"], ["credit_minor", "Credit", "money"]], rows, "No journal entry is recorded.")],
    notices: [...snapshot.notices, "Finance values are synthetic validation records and are not management accounts or production financial reporting."],
  };
}

async function documentsView(snapshot) {
  const rows = await all(`SELECT document_number, title, document_type, category, status, source_system, updated_at
    FROM documents ORDER BY updated_at DESC LIMIT 80`);
  const categories = new Set(rows.map((row) => row.category).filter(Boolean));
  const sources = new Set(rows.map((row) => row.source_system).filter(Boolean));
  return {
    ...snapshot,
    metrics: [
      metric("documents", "Controlled documents", rows.length),
      metric("active-documents", "Active documents", rows.filter((row) => String(row.status).toLowerCase() === "active").length),
      metric("categories", "Categories", categories.size),
      metric("source-authorities", "Source authorities", sources.size),
    ],
    sections: [section("Controlled document register", [["document_number", "Document"], ["title", "Title"], ["document_type", "Type"], ["category", "Category"], ["status", "Status", "status"], ["source_system", "Source"], ["updated_at", "Updated"]], rows, "No controlled document is recorded.")],
    notices: [...snapshot.notices, "Document metadata is repository validation evidence; binary authority remains subject to the approved private document store."],
  };
}

async function traceabilityView(snapshot) {
  const rows = await all(`SELECT im.movement_number, im.movement_type, im.quantity, im.reference_type, im.reference_id,
    im.occurred_at, b.batch_number, b.expiry_date, p.sku, p.product_name
    FROM inventory_movements im
    LEFT JOIN batches b ON b.id = im.batch_id
    LEFT JOIN products p ON p.id = im.product_id
    ORDER BY im.occurred_at DESC LIMIT 80`);
  const batches = new Set(rows.map((row) => row.batch_number).filter(Boolean));
  const products = new Set(rows.map((row) => row.sku).filter(Boolean));
  return {
    ...snapshot,
    metrics: [
      metric("movements", "Inventory movements", rows.length),
      metric("batches", "Batches represented", batches.size),
      metric("products", "Products represented", products.size),
      metric("referenced-movements", "Referenced movements", rows.filter((row) => row.reference_id).length),
    ],
    sections: [section("Traceability ledger", [["movement_number", "Movement"], ["movement_type", "Type", "status"], ["sku", "SKU"], ["product_name", "Product"], ["batch_number", "Batch"], ["expiry_date", "Expiry"], ["quantity", "Quantity", "number"], ["reference_type", "Reference type"], ["reference_id", "Reference"], ["occurred_at", "Occurred"]], rows, "No traceability movement is recorded.")],
    notices: [...snapshot.notices, "Traceability evidence remains synthetic/local-validation data until production warehouse and logistics authorities are accepted."],
  };
}

export async function authoredExecutiveView(snapshot) {
  switch (snapshot.module.slug) {
    case "sales-intelligence": return salesIntelligenceView(snapshot);
    case "customer-analytics": return customerAnalyticsView(snapshot);
    case "product-master": return productMasterView(snapshot);
    case "sourcing": return sourcingView(snapshot);
    case "warehouse": return shipmentView(snapshot, "warehouse");
    case "service-levels": return shipmentView(snapshot, "service");
    case "finance": return financeView(snapshot);
    case "documents": return documentsView(snapshot);
    case "traceability": return traceabilityView(snapshot);
    default: throw Object.assign(new Error("Executive module requires an authored view or must remain hidden for safety."), { statusCode: 500 });
  }
}
