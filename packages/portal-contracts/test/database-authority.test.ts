import assert from "node:assert/strict";
import test from "node:test";
import moduleCatalog from "../src/module-catalog.json";
import {
  currentRuntimeDatabaseAuthorityByModule,
  executiveSharedSnapshotDatabaseAuthority,
  noCurrentRuntimeDatabaseAuthorityReason,
} from "../src/database-authority";

const hiddenCodes = new Set(moduleCatalog
  .filter((module) => module.releaseClassification === "hidden_until_dependency_exists")
  .map((module) => module.code));

const preservedExecutiveCodes = [
  "executive.sales-intelligence",
  "executive.customer-analytics",
  "executive.product-master",
  "executive.sourcing",
  "executive.warehouse",
  "executive.service-levels",
  "executive.finance",
  "executive.documents",
  "executive.traceability",
] as const;

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

test("preserved Executive snapshots include the shared count-query authority they actually execute", () => {
  assert.deepEqual(executiveSharedSnapshotDatabaseAuthority, [
    "customers",
    "products",
    "orders",
    "invoices",
    "supplier_invoices",
    "quality_complaints",
    "regulatory_cases",
    "crm_opportunities",
    "integration_events",
  ]);
  for (const code of preservedExecutiveCodes) {
    const tables = currentRuntimeDatabaseAuthorityByModule[code];
    for (const sharedTable of executiveSharedSnapshotDatabaseAuthority) {
      assert.ok(tables.includes(sharedTable), `${code}: missing executed shared Executive table ${sharedTable}`);
    }
  }
});

test("direct authored overlays expose lean boundaries instead of inherited Executive/Admin queries", () => {
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["executive.command-centre"], [
    "workflow_instances", "integration_events", "quality_complaints", "regulatory_cases",
  ]);
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["executive.ceo-dashboard"], [
    "customers", "orders", "invoices", "crm_opportunities", "workflow_instances", "quality_complaints", "regulatory_cases",
  ]);
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["admin.dashboard"], [
    "workflow_instances", "integration_events", "outbox_messages", "security_events",
  ]);
  assert.deepEqual(currentRuntimeDatabaseAuthorityByModule["admin.users"], [
    "users", "auth_user_scopes", "auth_sessions", "security_events",
  ]);
  assert.ok(!currentRuntimeDatabaseAuthorityByModule["executive.command-centre"].includes("supplier_invoices"));
  assert.ok(!currentRuntimeDatabaseAuthorityByModule["executive.ceo-dashboard"].includes("integration_events"));
});
