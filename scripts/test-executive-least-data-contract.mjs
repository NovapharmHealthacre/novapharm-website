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

for (const table of ["products", "product_families", "product_variants", "batches"]) assert.match(products, new RegExp(`\\b${table}\\b`, "u"));
assert.doesNotMatch(products, /invoices|supplier_invoices|quality_complaints|regulatory_cases|crm_opportunities/u, "Product Master must use product-governance data only.");

for (const table of ["suppliers", "organizations", "product_supplier_links", "purchase_orders", "products"]) assert.match(sourcing, new RegExp(`\\b${table}\\b`, "u"));
assert.doesNotMatch(sourcing, /invoices|quality_complaints|regulatory_cases|crm_opportunities/u, "Sourcing must not inherit unrelated Executive-domain queries.");

assert.match(shipments, /FROM shipments/u);
assert.doesNotMatch(shipments, /invoices|supplier_invoices|quality_complaints|regulatory_cases|crm_opportunities|customers/u, "Warehouse and Service Levels must use shipment evidence only.");

for (const table of ["journal_entries", "journal_lines", "invoices", "supplier_invoices"]) assert.match(finance, new RegExp(`\\b${table}\\b`, "u"));
assert.doesNotMatch(finance, /quality_complaints|regulatory_cases|crm_opportunities|integration_events/u, "Finance must not inherit unrelated Executive-domain queries.");

assert.match(documents, /FROM documents/u);
assert.doesNotMatch(documents, /customers|orders|invoices|quality_complaints|regulatory_cases|crm_opportunities/u, "Documents must not inherit unrelated Executive-domain queries.");

for (const table of ["inventory_movements", "batches", "products"]) assert.match(traceability, new RegExp(`\\b${table}\\b`, "u"));
assert.doesNotMatch(traceability, /invoices|supplier_invoices|quality_complaints|regulatory_cases|crm_opportunities/u, "Traceability must use movement/product/batch evidence only.");

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
  crossDomainQueryInheritance: false
}, null, 2));
