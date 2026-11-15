import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relative) => readFileSync(new URL("../" + relative, import.meta.url), "utf8");
const ui = read("apps/portal/components/observed-medicine-workspaces.tsx");
const router = read("apps/portal/components/medicines-intelligence.tsx");
const catalogue = read("apps/portal/data/intelligence-workspaces.ts");

test("all three previously placeholder workspaces have genuine source-constrained UI routes", () => {
  assert.match(router, /current === "medicine-tape" \|\| current === "market-structure" \|\| current === "pricing-reimbursement"/u);
  assert.match(router, /<ObservedMedicineWorkspace kind=\{current\} detail=\{detail\} analytics=\{analytics\}/u);
  assert.match(ui, /"medicine-tape": \{/u);
  assert.match(ui, /"market-structure": \{/u);
  assert.match(ui, /"pricing-reimbursement": \{/u);
  for (const slug of ["medicine-tape", "market-structure", "pricing-reimbursement"]) {
    assert.match(catalogue, new RegExp('slug: "' + slug + '".*state: "gated"'));
  }
});

test("research gates reject missing identity, missing accepted facts, truncated and unreconciled source", () => {
  for (const guard of [
    'Boolean(detail && analytics',
    'analytics.dataState === "accepted_facts"',
    'analytics.reconciliation.applicable === true',
    'analytics.reconciliation.reconciles === true',
    'analytics.reconciliation.seriesTruncated !== true'
  ]) assert.ok(ui.includes(guard), "Missing mandatory observable-fact gate: " + guard);
  assert.match(ui, /Accepted non-sample source facts, exact medicine identity and independent production rights remain required/u);
  assert.match(ui, /No illustrative values are displayed/u);
});

test("medicine tape only displays unique valid monthly values with bounded history, not live signals", () => {
  assert.match(ui, /const month = /u);
  assert.match(ui, /typeof item\["month_key"\] === "string"/u);
  assert.match(ui, /finite\(item\["metric_value"\]\)/u);
  assert.match(ui, /new Set\(ordered.map\(\(item\) => String\(item\["month_key"\]\)\)\).size === ordered.length/u);
  assert.match(ui, /ordered.slice\(-36\)/u);
  assert.match(ui, /not real-time trading or stock movements/u);
});

test("presentation mix and cost numbers never impersonate market shares or commercial prices", () => {
  assert.match(ui, /finite\(row\["items"\]\) && finite\(row\["selected_metric"\]\)/u);
  assert.match(ui, /presentations.slice\(0, 20\)/u);
  assert.match(ui, /not national product market shares/u);
  assert.match(ui, /finite\(analytics.summary.totalNic\) && finite\(analytics.summary.totalActualCost\)/u);
  assert.match(ui, /not NHS reimbursement tariffs/u);
  assert.match(ui, /customer release, redistribution permissions/iu);
});

test("legacy observed-market and evidence workspaces remain separate", () => {
  assert.match(router, /current === "observed-market"\) central = /u);
  assert.match(router, /current === "evidence"\) central = <ClinicalTrialsDiscovery/u);
  assert.match(router, /current === "signals"\) central = <ProfessionalWorkspace kind="signals"/u);
});
