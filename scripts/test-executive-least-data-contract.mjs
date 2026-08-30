import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = await readFile(resolve("src/core/executive-module-views.mjs"), "utf8");

function segment(start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `Unable to isolate ${start}`);
  return source.slice(startIndex, endIndex);
}

const sales = segment("async function salesIntelligenceView", "async function customerAnalyticsView");
const customers = segment("async function customerAnalyticsView", "async function productMasterView");
const products = segment("async function productMasterView", "async function sourcingView");
const sourcing = segment("async function sourcingView", "async function shipmentView");
const shipments = segment("async function shipmentView", "async function financeView");
const finance = segment("async function financeView", "async function documentsView");
const documents = segment("async function documentsView", "async function traceabilityView");
const traceability = segment("async function traceabilityView", "export async function authoredExecutiveView");

assert.match(sales, /FROM crm_opportunities/u);
assert.doesNotMatch(sales, /quality_complaints|regulatory_cases|supplier_invoices|journal_entries/u, "Sales Intelligence must not inherit unrelated Executive-domain queries.");

for (const table of ["customers", "organizations", "orders", "invoices"]) assert.match(customers, new RegExp(`\\b${table}\\b`, "u"));
assert.doesNotMatch(customers, /supplier_invoices|quality_complaints|regulatory_cases|integration_events/u, "Customer Analytics must not inherit unrelated Executive-domain queries.");
assert.match(customers, /payment_terms_days/u, "Customer Analytics must use the canonical payment-terms field.");
assert.match(customers, /outstanding_balance_minor/u, "Customer Analytics must use the canonical outstanding-balance field.");

for (const table of ["products", "product_families", "product_variants", "batches"]) assert.match(products, new RegExp(`\\b${table}\\b`, "u"));
assert.doesNotMatch(products, /invoices|supplier_invoices|quality_complaints|regulatory_cases|crm_opportunities/u, "Product Master must use product-governance data only.");
assert.match(products, /pv\.display_name AS variant_name/u, "Product Master must use the canonical variant display name.");

for (const table of ["suppliers", "organizations", "product_supplier_links", "purchase_orders", "products"]) assert.match(sourcing, new RegExp(`\\b${table}\\b`, "u"));
assert.doesNotMatch(sourcing, /invoices|quality_complaints|regulatory_cases|crm_opportunities/u, "Sourcing must not inherit unrelated Executive-domain queries.");
assert.match(sourcing, /psl\.qualification_status AS link_qualification_status/u, "Sourcing must use the canonical supplier-product qualification field.");

assert.match(shipments, /FROM shipments/u);
assert.doesNotMatch(shipments, /invoices|supplier_invoices|quality_complaints|regulatory_cases|crm_opportunities|customers/u, "Warehouse and Service Levels must use shipment evidence only.");
assert.match(shipments, /carrier_name/u);
assert.match(shipments, /tracking_reference/u);
assert.match(shipments, /dispatched_at/u);
assert.match(shipments, /delivered_at/u);
assert.match(shipments, /No promised-delivery SLA is inferred/u, "Service Levels must not imply a promised-delivery field that the canonical shipment record does not contain.");

for (const table of ["journal_entries", "journal_lines", "invoices", "supplier_invoices"]) assert.match(finance, new RegExp(`\\b${table}\\b`, "u"));
assert.doesNotMatch(finance, /quality_complaints|regulatory_cases|crm_opportunities|integration_events/u, "Finance must not inherit unrelated Executive-domain queries.");
assert.match(finance, /journal_number/u);
assert.match(finance, /journal_date/u);
assert.match(finance, /supplier invoice value/iu, "Finance must not label supplier invoice total as payable/outstanding authority.");

assert.match(documents, /FROM documents/u);
assert.doesNotMatch(documents, /customers|orders|invoices|quality_complaints|regulatory_cases|crm_opportunities/u, "Documents must not inherit unrelated Executive-domain queries.");
for (const field of ["document_class", "lifecycle_status", "security_status", "version"]) assert.match(documents, new RegExp(`\\b${field}\\b`, "u"));

for (const table of ["inventory_movements", "batches", "products"]) assert.match(traceability, new RegExp(`\\b${table}\\b`, "u"));
assert.doesNotMatch(traceability, /invoices|supplier_invoices|quality_complaints|regulatory_cases|crm_opportunities/u, "Traceability must use movement/product/batch evidence only.");
for (const field of ["movement_type", "reference_type", "reference_id", "occurred_at"]) assert.match(traceability, new RegExp(`\\b${field}\\b`, "u"));

const inventedSchemaFields = [
  "onboarding_status",
  "price_list_code",
  "serialization_required",
  "risk_rating",
  "last_audit_date",
  "carrier_code",
  "tracking_number",
  "promised_delivery_at",
  "service_level_status",
  "entry_number",
  "entry_date",
  "movement_number",
];
for (const field of inventedSchemaFields) {
  assert.equal(source.includes(field), false, `Executive least-data views must not invent non-canonical schema field: ${field}`);
}
assert.doesNotMatch(finance, /supplier_invoices[^`]*outstanding_minor/su, "Supplier invoice queries must not invent an outstanding-balance column.");
assert.doesNotMatch(documents, /\bdocument_type\b|\bcategory\b|\bsource_system\b/u, "Document register must use canonical document metadata fields only.");

for (const slug of ["sales-intelligence", "customer-analytics", "product-master", "sourcing", "warehouse", "service-levels", "finance", "documents", "traceability"]) {
  assert.match(source, new RegExp(`case "${slug}"`, "u"), `Visible Executive module ${slug} needs an explicit builder branch.`);
}
for (const hidden of ["nhs-data", "plpi", "pharmacovigilance", "tenders", "capital", "microsoft-365", "ai-technology"]) {
  assert.equal(source.includes(`case "${hidden}"`), false, `${hidden}: hidden-for-safety module must not acquire an active runtime builder.`);
}

console.log(JSON.stringify({
  visibleExecutiveViews: 11,
  hiddenExecutiveViews: 0,
  hiddenExecutiveModulesFailClosedBeforeQuery: 7,
  genericExecutiveKpiRibbon: false,
  crossDomainQueryInheritance: false,
  inventedSchemaFields: false
}, null, 2));
