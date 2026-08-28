import assert from "node:assert/strict";
import test from "node:test";
import { CkanActionError, CkanClient, applyCkanDiscovery, discoverResources, extractCkanSchemaColumns, parseReportingPeriod, registryEntry, revisedPeriods, schemaContracts, sourceRegistry, validateSchema } from "../src/index.ts";

test("governed source registry has unique complete identities", () => {
  assert.ok(sourceRegistry.length >= 32);
  assert.equal(new Set(sourceRegistry.map((entry) => entry.sourceId)).size, sourceRegistry.length);
  for (const entry of sourceRegistry) {
    assert.ok(entry.publisher);
    assert.ok(entry.datasetName);
    assert.ok(entry.purpose);
    assert.ok(entry.knownCaveats);
    assert.ok(entry.provenanceNotes);
  }
  assert.equal(registryEntry("gphc.premises").status, "licence_required");
  assert.equal(registryEntry("nhse.dohs-v3").status, "credentials_required");
  assert.equal(registryEntry("nhse.dohs-v3").accessMethod, "rest_api");
  assert.equal(registryEntry("nhse.registered-patients").latestDiscoveredPeriod, "2026-08");
  assert.equal(registryEntry("nhse.registered-patients").status, "discovery_implemented");
  assert.equal(registryEntry("nhse.qof").latestDiscoveredPeriod, "2024-25");
  assert.equal(registryEntry("nhse.qof").status, "documented_adapter_pending");
  assert.equal(registryEntry("ons.small-area-population").status, "documented_adapter_pending");
  assert.equal(registryEntry("mhclg.imd2025").schemaVersion, "IoD25-v2");
  assert.equal(registryEntry("ons.rural-urban-2021").schemaVersion, "RUC21");
});

test("reporting-period discovery handles monthly, quarterly and named resources", () => {
  assert.equal(parseReportingPeriod("EPD_SNOMED_202606")?.key, "2026-06");
  assert.equal(parseReportingPeriod("CONSOL_PHARMACY_LIST_202606Q1")?.key, "2026/06-Q1");
  assert.equal(parseReportingPeriod("Dispensed Items by GP and Pharmacy, June 2026")?.key, "2026-06");
  assert.equal(parseReportingPeriod("Historic release 2025")?.key, "2025");
  assert.equal(parseReportingPeriod("No period"), null);
});

test("resource discovery sorts periods and detects a revised resource", () => {
  const prior = discoverResources([
    { id: "old", name: "EPD_202605", url: "https://example.test/202605.csv", format: "CSV", hash: "a" },
  ]);
  const current = discoverResources([
    { id: "newer", name: "EPD_202606", url: "https://example.test/202606.csv", format: "CSV", hash: "b" },
    { id: "old", name: "EPD_202605", url: "https://example.test/202605.csv", format: "CSV", hash: "changed" },
  ]);
  assert.deepEqual(current.map((entry) => entry.period.key), ["2026-05", "2026-06"]);
  assert.deepEqual(revisedPeriods(prior, current), ["2026-05"]);
});

test("current EPD metadata schema validates and SNOMED remains an identifier string", () => {
  const schema = "{u'fields': [{u'name': u'YEAR_MONTH', u'type': u'string'}, {u'name': u'SNOMED_CODE', u'type': u'string'}]}";
  assert.deepEqual(extractCkanSchemaColumns(schema), ["YEAR_MONTH", "SNOMED_CODE"]);
  const result = validateSchema(schemaContracts.epd, schemaContracts.epd.required);
  assert.equal(result.status, "exact");
  assert.equal(result.missingColumns.length, 0);
});

test("CKAN schema extraction accepts current object metadata and legacy string metadata", () => {
  assert.deepEqual(extractCkanSchemaColumns({ fields: [{ name: "YEAR_MONTH", type: "yearmonth" }, { name: "BNF_CODE", type: "string" }] }), ["YEAR_MONTH", "BNF_CODE"]);
  assert.deepEqual(extractCkanSchemaColumns({ fields: [{ title: "Missing name" }, null] }), []);
});

test("SCMD adapters recognise both the historic typo and announced unit-dose schema", () => {
  assert.equal(validateSchema(schemaContracts.scmdBeforeJuly2026, schemaContracts.scmdBeforeJuly2026.required).status, "exact");
  assert.equal(validateSchema(schemaContracts.scmdFromJuly2026, schemaContracts.scmdFromJuly2026.required).status, "exact");
  const broken = validateSchema(schemaContracts.scmdFromJuly2026, ["YEAR_MONTH", "ODS_CODE"]);
  assert.equal(broken.status, "schema_review_required");
  assert.ok(broken.missingColumns.includes("VMP_SNOMED_CODE"));
});

test("CKAN client validates success envelopes and discovery never pins resource UUIDs", async () => {
  const calls: string[] = [];
  const fakeFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    return new Response(JSON.stringify({ success: true, result: { id: "package-id", name: "english-prescribing-dataset-epd-with-snomed-code", title: "EPD", license_id: "OGL-UK-3.0", resources: [{ id: "runtime-resource", name: "EPD_SNOMED_202606", title: "English Prescribing Dataset - Jun 2026", url: "https://example.test/epd.csv", format: "CSV", hash: "abc", schema: "{u'fields': [{u'name': u'YEAR_MONTH'}]}" }] } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new CkanClient({ baseUrl: "https://example.test/api/3/action", fetchImplementation: fakeFetch, maxRetries: 0 });
  const dataset = await client.packageShow("english-prescribing-dataset-epd-with-snomed-code");
  const entry = applyCkanDiscovery(registryEntry("nhsbsa.epd"), dataset, "2026-08-24T12:00:00.000Z");
  assert.equal(entry.latestResourceId, "runtime-resource");
  assert.equal(entry.latestDiscoveredPeriod, "2026-06");
  assert.deepEqual(calls, ["/api/3/action/package_show"]);
});

test("CKAN client surfaces success=false instead of publishing partial data", async () => {
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ success: false, error: { message: "Dataset or table not found" } }), { status: 404, headers: { "content-type": "application/json" } });
  const client = new CkanClient({ baseUrl: "https://example.test/api/3/action", fetchImplementation: fakeFetch, maxRetries: 0 });
  await assert.rejects(() => client.datastoreSearch("resource-123"), (error: unknown) => error instanceof CkanActionError && error.statusCode === 404);
});

test("DataStore SQL accepts one bounded SELECT and rejects mutation tokens", async () => {
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ success: true, result: { total: 0, fields: [], records: [] } }), { status: 200, headers: { "content-type": "application/json" } });
  const client = new CkanClient({ baseUrl: "https://example.test/api/3/action", fetchImplementation: fakeFetch, maxRetries: 0 });
  await client.datastoreSearchSql("SELECT * FROM resource LIMIT 10");
  assert.throws(() => client.datastoreSearchSql("SELECT * FROM resource; DROP TABLE resource"));
});
