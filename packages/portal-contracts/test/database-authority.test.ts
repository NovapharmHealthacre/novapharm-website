import assert from "node:assert/strict";
import test from "node:test";
import moduleCatalog from "../src/module-catalog.json";
import {
  currentRuntimeDatabaseAuthorityByModule,
  noCurrentRuntimeDatabaseAuthorityReason,
} from "../src/database-authority";

const hiddenCodes = new Set(moduleCatalog
  .filter((module) => module.releaseClassification === "hidden_until_dependency_exists")
  .map((module) => module.code));

const expectedExecutiveAuthority = {
  "executive.command-centre": ["workflow_instances", "integration_events", "quality_complaints", "regulatory_cases"],
  "executive.ceo-dashboard": ["customers", "orders", "invoices", "crm_opportunities", "workflow_instances", "quality_complaints", "regulatory_cases"],
  "executive.sales-intelligence": ["crm_opportunities"],
  "executive.customer-analytics": ["customers", "organizations", "orders", "invoices"],
  "executive.product-master": ["products", "product_variants", "product_families", "batches"],
  "executive.nhs-data": [],
  "executive.plpi": [],
  "executive.pharmacovigilance": [],
  "executive.sourcing": ["suppliers", "organizations", "product_supplier_links", "products", "purchase_orders"],
  "executive.tenders": [],
  "executive.warehouse": ["shipments"],
  "executive.service-levels": ["shipments"],
  "executive.finance": ["journal_entries", "journal_lines", "invoices", "supplier_invoices"],
  "executive.capital": [],
  "executive.microsoft-365": [],
  "executive.documents": ["documents"],
  "executive.ai-technology": [],
  "executive.traceability": ["inventory_movements", "batches", "products"],
} as const;

test("database authority covers the governed 54-module catalogue exactly", () => {
  const authorityCodes = Object.keys(currentRuntimeDatabaseAuthorityByModule);
  const catalogueCodes = moduleCatalog.map((module) => module.code);
  assert.equal(authorityCodes.length, 54);
  assert.deepEqual(new Set(authorityCodes), new Set(catalogueCodes));
  assert.equal(hiddenCodes.size, 7);
});

test("only hidden-for-safety modules have no current runtime table authority", () => {
  for (const module of moduleCatalog) {
    const tables = currentRuntimeDatabaseAuthorityByModule[module.code as keyof typeof currentRuntimeDatabaseAuthorityByModule];
    assert.ok(tables, `${module.code}: table authority record missing`);
    assert.equal(new Set(tables).size, tables.length, `${module.code}: duplicate table/view authority`);
    for (const table of tables) {
      assert.match(table, /^[a-z][a-z0-9_]*$/u, `${module.code}: invalid table/view identifier ${table}`);
    }
    if (hiddenCodes.has(module.code)) assert.equal(tables.length, 0, `${module.code}: hidden module must exercise no runtime table authority`);
    else assert.ok(tables.length > 0, `${module.code}: visible module must state its runtime table/view authority`);
  }
  assert.match(noCurrentRuntimeDatabaseAuthorityReason, /HIDDEN FOR SAFETY/iu);
  assert.match(noCurrentRuntimeDatabaseAuthorityReason, /rejected before snapshot construction/iu);
});

test("all 18 Executive modules use the accepted least-data authority boundary", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(currentRuntimeDatabaseAuthorityByModule).filter(([code]) => code.startsWith("executive."))),
    expectedExecutiveAuthority,
  );
  assert.equal(Object.keys(expectedExecutiveAuthority).length, 18);
});

test("Executive least-data views do not retain the retired shared KPI query footprint", () => {
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["executive.sales-intelligence"], ["crm_opportunities"]);
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["executive.warehouse"], ["shipments"]);
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["executive.service-levels"], ["shipments"]);
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["executive.documents"], ["documents"]);
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["executive.traceability"], ["inventory_movements", "batches", "products"]);

  for (const code of ["executive.sales-intelligence", "executive.warehouse", "executive.service-levels", "executive.documents"] as const) {
    const tableSet = new Set<string>(currentRuntimeDatabaseAuthorityByModule[code]);
    for (const retiredSharedTable of ["customers", "supplier_invoices", "quality_complaints", "regulatory_cases", "integration_events"]) {
      assert.equal(tableSet.has(retiredSharedTable), false, `${code}: must not retain unrelated shared Executive table ${retiredSharedTable}`);
    }
  }
});

test("direct authored Admin and Executive views retain their intentionally narrow authorities", () => {
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["admin.dashboard"], [
    "workflow_instances", "integration_events", "outbox_messages", "security_events",
  ]);
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["admin.users"], [
    "users", "auth_user_scopes", "auth_sessions", "security_events",
  ]);
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["executive.command-centre"], [
    "workflow_instances", "integration_events", "quality_complaints", "regulatory_cases",
  ]);
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["executive.ceo-dashboard"], [
    "customers", "orders", "invoices", "crm_opportunities", "workflow_instances", "quality_complaints", "regulatory_cases",
  ]);
});
