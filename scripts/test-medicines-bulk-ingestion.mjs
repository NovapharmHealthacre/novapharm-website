import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { SqliteProvider } from "../src/data/providers/sqlite.mjs";

const epdHeaders = ["YEAR_MONTH", "REGIONAL_OFFICE_NAME", "REGIONAL_OFFICE_CODE", "ICB_NAME", "ICB_CODE", "PCO_NAME", "PCO_CODE", "PRACTICE_NAME", "PRACTICE_CODE", "ADDRESS_1", "ADDRESS_2", "ADDRESS_3", "ADDRESS_4", "POSTCODE", "BNF_CHEMICAL_SUBSTANCE_CODE", "BNF_CHEMICAL_SUBSTANCE", "BNF_PRESENTATION_CODE", "BNF_PRESENTATION_NAME", "BNF_CHAPTER_PLUS_CODE", "QUANTITY", "ITEMS", "TOTAL_QUANTITY", "ADQ_USAGE", "NIC", "ACTUAL_COST", "UNIDENTIFIED", "SNOMED_CODE"];
const epdValues = ["2026-06", "NORTH EAST AND YORKSHIRE", "Y63", "NHS WEST YORKSHIRE INTEGRATED CARE BOARD", "QWO", "NHS WEST YORKSHIRE ICB", "36J00", "CLARENDON MEDICAL CENTRE", "B83628", "ROYAL STANDARD HOUSE", "26 MANNINGHAM LANE", "BRADFORD", "", "BD1 3DN", "2003", "Wound Management and Other Dressings", "20030100181", "Tegaderm Film dressing 12cm x 12cm", "20 Dressings", "2", "1", "20", "0", "23.8", "21.4632", "N", "694311000001104"];
const epdUnidentifiedOverrides = {
  REGIONAL_OFFICE_NAME: "UNIDENTIFIED", REGIONAL_OFFICE_CODE: "-", ICB_NAME: "UNIDENTIFIED", ICB_CODE: "-",
  PCO_NAME: "UNIDENTIFIED", PCO_CODE: "-", PRACTICE_NAME: "UNIDENTIFIED DOCTORS", PRACTICE_CODE: "-",
  ADDRESS_1: "-", ADDRESS_2: "-", ADDRESS_3: "-", ADDRESS_4: "-", POSTCODE: "-",
  QUANTITY: "5", ITEMS: "1", TOTAL_QUANTITY: "5", NIC: "10.35", ACTUAL_COST: "10.35", UNIDENTIFIED: "Y",
};
const epdUnidentifiedValues = epdHeaders.map((header, index) => epdUnidentifiedOverrides[header] ?? epdValues[index]);
const epdRegionalUnidentifiedOverrides = {
  PRACTICE_NAME: "UNIDENTIFIED DOCTORS", PRACTICE_CODE: "36J998", ADDRESS_1: "", ADDRESS_2: "", ADDRESS_3: "", ADDRESS_4: "",
  POSTCODE: "", QUANTITY: "3", ITEMS: "1", TOTAL_QUANTITY: "3", NIC: "4", ACTUAL_COST: "4", UNIDENTIFIED: "Y",
};
const epdRegionalUnidentifiedValues = epdHeaders.map((header, index) => epdRegionalUnidentifiedOverrides[header] ?? epdValues[index]);
const pcaHeaders = ["YEAR_MONTH", "REGION_NAME", "REGION_CODE", "ICB_NAME", "ICB_CODE", "DISPENSER_ACCOUNT_TYPE", "BNF_PRESENTATION_CODE", "BNF_PRESENTATION_NAME", "SNOMED_CODE", "SUPPLIER_NAME", "UNIT_OF_MEASURE", "GENERIC_BNF_EQUIVALENT_CODE", "GENERIC_BNF_EQUIVALENT_NAME", "BNF_CHEMICAL_SUBSTANCE_CODE", "BNF_CHEMICAL_SUBSTANCE", "BNF_PARAGRAPH_CODE", "BNF_PARAGRAPH", "BNF_SECTION_CODE", "BNF_SECTION", "BNF_CHAPTER_CODE", "BNF_CHAPTER", "PREP_CLASS", "PRESCRIBED_PREP_CLASS", "ITEMS", "TOTAL_QUANTITY", "NIC", "PHARMACY_ADVANCED_SERVICE"];
const pcaValues = ["202606", "NORTH WEST", "Y62", "NHS LANCASHIRE AND SOUTH CUMBRIA INTEGRATED CARE BOARD", "QE1", "English Dispensing Doctor", "0302000N0BBAYBA", "Flixotide 125micrograms per dose Evohaler", "398511000001105", "GlaxoSmithKline UK Ltd", "dose", "0302000N0AABABA", "Fluticasone 125micrograms per dose inhaler CFC free", "0302000N0", "Fluticasone propionate Inhalation", "030200", "Corticosteroids respiratory", "0302", "Corticosteroids respiratory", "03", "Respiratory System", "03", "02", "3", "3", "63.78", "Not applicable"];

function csvCell(value) {
  return /[",\r\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csv(headers, ...rows) {
  return `${headers.map(csvCell).join(",")}\n${rows.map((values) => values.map(csvCell).join(",")).join("\n")}\n`;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function runImporter(manifest, environment) {
  return spawnSync(resolve("node_modules", ".bin", "tsx"), [
    resolve("scripts", "data", "ingest-medicines-resource.ts"),
    "--manifest", manifest,
    "--batch-size", "1000",
  ], { cwd: process.cwd(), env: { ...process.env, ...environment }, encoding: "utf8" });
}

function runMartBuilder(source, environment, omitPracticeMart = false) {
  return spawnSync(resolve("node_modules", ".bin", "tsx"), [
    resolve("scripts", "data", "build-medicines-marts.ts"),
    "--source", source,
    "--period", "2026-06",
    ...(omitPracticeMart ? ["--omit-practice-mart"] : []),
  ], { cwd: process.cwd(), env: { ...process.env, ...environment }, encoding: "utf8" });
}

function runAnalyticsProbe(environment) {
  const source = `
    const context = { accessScopes: ["board"] };
    const service = await import("./src/core/medicines-intelligence-service.mjs");
    const database = await import("./src/data/database.mjs");
    const epdSearch = await service.searchMedicines("20030100181", context, 5);
    const pcaSearch = await service.searchMedicines("0302000N0BBAYBA", context, 5);
    const epd = await service.queryMedicineAnalytics({ dataset: "epd", metric: "items", medicineId: epdSearch.results[0].medicineId, startMonth: "2026-06", endMonth: "2026-06" }, context);
    const pca = await service.queryMedicineAnalytics({ dataset: "pca", metric: "items", medicineId: pcaSearch.results[0].medicineId, startMonth: "2026-06", endMonth: "2026-06" }, context);
    console.log(JSON.stringify({ epdSearch: epdSearch.results.length, pcaSearch: pcaSearch.results.length, epd, pca }));
    await database.closeDatabase();
  `;
  return spawnSync(process.execPath, ["--input-type=module", "--eval", source], {
    cwd: process.cwd(),
    env: { ...process.env, ...environment, DATABASE_PATH: environment.NOVAPHARM_DATABASE_URL, DATABASE_PROVIDER: "sqlite", NODE_ENV: "test" },
    encoding: "utf8",
  });
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "novapharm-bulk-ingestion-"));
const dataRoot = join(temporaryRoot, "private-cloud");
const databasePath = join(dataRoot, "warehouse", "novapharm.sqlite");
const environment = {
  NOVAPHARM_DATA_ROOT: dataRoot,
  NOVAPHARM_DATABASE_URL: databasePath,
  NOVAPHARM_OBJECT_STORE: join(dataRoot, "objects"),
  NOVAPHARM_ENVIRONMENT: "local_private_cloud",
};

try {
  const fixtures = [
    { sourceId: "nhsbsa.epd", resourceId: "test-epd-2026-06", folder: "epd", body: csv(epdHeaders, epdValues, epdUnidentifiedValues, epdRegionalUnidentifiedValues) },
    { sourceId: "nhsbsa.pca", resourceId: "test-pca-2026-06", folder: "pca", body: csv(pcaHeaders, pcaValues) },
  ];
  const database = new SqliteProvider({ DATABASE_PATH: databasePath });
  await database.initialize();
  const now = new Date().toISOString();
  for (const fixture of fixtures) {
    await database.run(`INSERT INTO data_source_registry(
      source_id, publisher, dataset_name, dataset_identifier, jurisdiction, coverage, purpose, access_method,
      discovery_endpoint, licence, publication_frequency, typical_reporting_lag, authority_rank, status,
      known_caveats_json, provenance_notes, first_seen_at, last_checked_at, updated_at)
      VALUES(?, 'NHS Business Services Authority', ?, ?, 'England', 'National', 'Test exact-source ingestion', 'CKAN',
      'https://opendata.nhsbsa.net/api/3/action', 'Open Government Licence 3.0', 'Monthly', 'Publisher-dependent', 1,
      'schema_validated', '[]', 'Synthetic acceptance fixture; never production data.', ?, ?, ?)`,
    [fixture.sourceId, fixture.sourceId, fixture.sourceId, now, now, now]);
    const sourcePath = join(dataRoot, "raw", "nhsbsa", fixture.folder, "2026", "06", `${fixture.resourceId}.csv`);
    await mkdir(dirname(sourcePath), { recursive: true, mode: 0o700 });
    await writeFile(sourcePath, fixture.body, { mode: 0o600 });
    const bytes = Buffer.byteLength(fixture.body);
    await database.run(`INSERT INTO source_resources(
      id, source_id, external_resource_id, reporting_period, resource_name, resource_url, format, byte_size,
      resource_hash, resource_fingerprint, datastore_state, first_seen_at, last_seen_at)
      VALUES(?, ?, ?, '2026-06', ?, ?, 'CSV', ?, ?, ?, 'not_advertised', ?, ?)`,
    [`resource-${fixture.resourceId}`, fixture.sourceId, fixture.resourceId, fixture.resourceId, `https://example.test/${fixture.resourceId}.csv`, bytes, digest(fixture.body), digest(`${fixture.resourceId}:2026-06`), now, now]);
    fixture.sourcePath = sourcePath;
    fixture.bytes = bytes;
    fixture.sha256 = digest(fixture.body);
  }
  await database.close();

  for (const fixture of fixtures) {
    const manifestPath = join(dataRoot, "manifests", `${fixture.resourceId}.json`);
    await mkdir(dirname(manifestPath), { recursive: true, mode: 0o700 });
    await writeFile(manifestPath, `${JSON.stringify({
      sourceId: fixture.sourceId,
      reportingPeriod: "2026-06",
      resourceId: fixture.resourceId,
      sourceUrl: `https://example.test/${fixture.resourceId}.csv`,
      destination: fixture.sourcePath,
      bytes: fixture.bytes,
      sha256: fixture.sha256,
      immutable: true,
    }, null, 2)}\n`, { mode: 0o600 });
    const first = runImporter(manifestPath, environment);
    assert.equal(first.status, 0, `${fixture.sourceId} ingestion failed:\n${first.stderr}\n${first.stdout}`);
    assert.match(first.stdout, /"status":"succeeded"/u);
    const second = runImporter(manifestPath, environment);
    assert.equal(second.status, 0, `${fixture.sourceId} idempotency check failed:\n${second.stderr}\n${second.stdout}`);
    assert.match(second.stdout, /"status":"already_succeeded"/u);
  }

  for (const source of ["epd", "pca"]) {
    const first = runMartBuilder(source, environment);
    assert.equal(first.status, 0, `${source} mart build failed:\n${first.stderr}\n${first.stdout}`);
    assert.match(first.stdout, /"status":"succeeded"/u);
    const firstResult = JSON.parse(first.stdout.trim());
    assert.equal(firstResult.evidenceStatus, "written");
    await rm(firstResult.evidence);
    const recovered = runMartBuilder(source, environment);
    assert.equal(recovered.status, 0, `${source} mart evidence recovery failed:\n${recovered.stderr}\n${recovered.stdout}`);
    assert.match(recovered.stdout, /"status":"already_succeeded"/u);
    assert.equal(JSON.parse(recovered.stdout.trim()).evidenceStatus, "written");
    const second = runMartBuilder(source, environment);
    assert.equal(second.status, 0, `${source} mart idempotency check failed:\n${second.stderr}\n${second.stdout}`);
    assert.match(second.stdout, /"status":"already_succeeded"/u);
    assert.equal(JSON.parse(second.stdout.trim()).evidenceStatus, "verified_existing");
  }

  const accepted = new SqliteProvider({ DATABASE_PATH: databasePath });
  await accepted.initialize();
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM fact_epd_prescribing_observations"))?.count), 3);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM fact_pca_community_dispensing_observations"))?.count), 1);
  const epdRunResult = JSON.parse((await accepted.one("SELECT result_json FROM ingestion_runs WHERE source_id = 'nhsbsa.epd' AND status = 'succeeded'"))?.result_json ?? "{}");
  assert.deepEqual(epdRunResult.semanticReconciliation, {
    fact_rows: 3,
    unidentified_rows: 2,
    unidentified_with_practice_dimension: 0,
    identified_without_practice_dimension: 0,
  });
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM intelligence_epd_facts"))?.count), 3);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM intelligence_pca_facts"))?.count), 1);
  const epdEvidence = await accepted.one("SELECT prescribed_quantity, quantity, total_quantity, icb_code, bnf_presentation_code FROM intelligence_epd_facts WHERE unidentified = 0");
  assert.equal(epdEvidence.prescribed_quantity, 2);
  assert.equal(epdEvidence.quantity, 20);
  assert.equal(epdEvidence.total_quantity, 20);
  assert.equal(epdEvidence.icb_code, "QWO");
  assert.equal(epdEvidence.bnf_presentation_code, "20030100181");
  assert.equal((await accepted.one("SELECT supplier_name FROM intelligence_pca_facts"))?.supplier_name, "GlaxoSmithKline UK Ltd");
  assert.equal((await accepted.one("SELECT actual_cost FROM intelligence_pca_facts"))?.actual_cost, null);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM medicine_aliases"))?.count), 10);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM intelligence_mart_medicine_source_month"))?.count), 2);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM intelligence_mart_medicine_source_geography_month"))?.count), 3);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM intelligence_mart_medicine_source_practice_month"))?.count), 1);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM intelligence_mart_medicine_source_presentation_month"))?.count), 2);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM intelligence_mart_medicine_source_supplier_month"))?.count), 1);
  assert.equal((await accepted.one("SELECT actual_cost FROM intelligence_mart_medicine_source_month WHERE dataset_scope = 'pca'"))?.actual_cost, null);
  assert.equal((await accepted.one("SELECT quantity FROM intelligence_mart_medicine_source_month WHERE dataset_scope = 'epd'"))?.quantity, 28);
  assert.equal((await accepted.one("SELECT actual_cost FROM intelligence_mart_medicine_source_geography_month WHERE dataset_scope = 'pca'"))?.actual_cost, null);
  assert.equal((await accepted.one("SELECT actual_cost FROM intelligence_mart_medicine_source_presentation_month WHERE dataset_scope = 'pca'"))?.actual_cost, null);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM dim_geography WHERE geography_type IN ('NHS_REGION', 'ICB', 'PCO_SICBL')"))?.count), 5);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM dim_geography WHERE geography_code = '-'"))?.count), 0);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM dim_practices WHERE practice_code = '-'"))?.count), 0);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM dim_practices WHERE upper(practice_name) LIKE 'UNIDENTIFIED%'"))?.count), 0);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM dim_nhs_organisations WHERE upper(organisation_name) LIKE 'UNIDENTIFIED%'"))?.count), 0);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM fact_epd_prescribing_observations WHERE unidentified = 1 AND practice_id IS NULL"))?.count), 2);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM fact_epd_prescribing_observations WHERE unidentified = 1 AND icb_code = 'QWO' AND practice_id IS NULL"))?.count), 1);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM intelligence_mart_medicine_source_geography_month WHERE dataset_scope = 'epd' AND geography_level = 'UNIDENTIFIED' AND geography_code IS NULL AND geography_id IS NULL"))?.count), 1);
  assert.equal(Number((await accepted.one("SELECT COUNT(*) AS count FROM medicine_mart_build_runs WHERE status = 'succeeded'"))?.count), 2);
  const acceptedMartRuns = await accepted.all("SELECT dataset_scope, builder_version, result_json FROM medicine_mart_build_runs WHERE status = 'succeeded' ORDER BY dataset_scope");
  assert.deepEqual(acceptedMartRuns.map((row) => row.builder_version), ["source-scoped-marts-v2-with-practice", "source-scoped-marts-v2-without-practice"]);
  for (const run of acceptedMartRuns) {
    const result = JSON.parse(run.result_json ?? "{}");
    assert.equal(result.reconciliation?.passed, true);
    assert.ok(result.reconciliation.aggregates.length >= 4);
    assert.ok(result.reconciliation.aggregates.every((entry) => entry.passed));
    assert.equal(result.sourceFactRows, result.sourceAcceptedRows);
    assert.equal(result.capacityPreflight?.sufficient, true);
    assert.ok(result.capacityPreflight.availableAfterReserveBytes >= result.capacityPreflight.requiredIncrementalBytes);
    if (run.dataset_scope === "epd") {
      assert.deepEqual(result.sourceSemanticReconciliation, {
        fact_rows: 3,
        unidentified_rows: 2,
        unidentified_with_practice_dimension: 0,
        identified_without_practice_dimension: 0,
      });
    }
  }
  await accepted.close();

  const profileChange = runMartBuilder("epd", environment, true);
  assert.equal(profileChange.status, 0, `EPD mart profile change failed:\n${profileChange.stderr}\n${profileChange.stdout}`);
  assert.match(profileChange.stdout, /"status":"succeeded"/u);
  const profileIdempotency = runMartBuilder("epd", environment, true);
  assert.equal(profileIdempotency.status, 0, `EPD mart profile idempotency failed:\n${profileIdempotency.stderr}\n${profileIdempotency.stdout}`);
  assert.match(profileIdempotency.stdout, /"status":"already_succeeded"/u);

  const profiled = new SqliteProvider({ DATABASE_PATH: databasePath });
  await profiled.initialize();
  assert.equal(Number((await profiled.one("SELECT COUNT(*) AS count FROM intelligence_mart_medicine_source_practice_month WHERE dataset_scope = 'epd'"))?.count), 0);
  assert.equal(Number((await profiled.one("SELECT COUNT(*) AS count FROM medicine_mart_build_runs WHERE status = 'succeeded'"))?.count), 2);
  assert.equal(Number((await profiled.one("SELECT COUNT(*) AS count FROM medicine_mart_build_runs WHERE status = 'blocked'"))?.count), 1);
  const activeEpdBuild = await profiled.one("SELECT builder_version, result_json FROM medicine_mart_build_runs WHERE dataset_scope = 'epd' AND status = 'succeeded'");
  assert.equal(activeEpdBuild?.builder_version, "source-scoped-marts-v2-without-practice");
  assert.equal(JSON.parse(activeEpdBuild?.result_json ?? "{}").practiceMartIncluded, false);
  await profiled.close();

  const probe = runAnalyticsProbe(environment);
  assert.equal(probe.status, 0, `Bulk analytics probe failed:\n${probe.stderr}\n${probe.stdout}`);
  const probeResult = JSON.parse(probe.stdout.trim());
  assert.equal(probeResult.epdSearch, 1);
  assert.equal(probeResult.pcaSearch, 1);
  assert.equal(probeResult.epd.dataState, "accepted_facts");
  assert.equal(probeResult.epd.summary.totalItems, 3);
  assert.equal(probeResult.epd.summary.totalQuantity, 28);
  assert.ok(Math.abs(probeResult.epd.summary.totalActualCost - 35.8132) < 1e-9);
  assert.equal(probeResult.epd.summary.practiceCount, 1);
  assert.ok(probeResult.epd.breakdowns.geographies.some((geography) => geography.code === "QWO"));
  assert.equal(probeResult.pca.dataState, "accepted_facts");
  assert.equal(probeResult.pca.summary.totalItems, 3);
  assert.equal(probeResult.pca.summary.totalActualCost, null);

  const drift = new SqliteProvider({ DATABASE_PATH: databasePath });
  await drift.initialize();
  await drift.run("UPDATE mart_medicine_source_month SET items = items + 1 WHERE dataset_scope = 'pca'");
  await drift.close();
  const driftCheck = runMartBuilder("pca", environment);
  assert.notEqual(driftCheck.status, 0, "A same-row-count metric drift must invalidate mart idempotency.");
  assert.match(`${driftCheck.stderr}\n${driftCheck.stdout}`, /drifted from its accepted source totals/u);
  const driftRepair = new SqliteProvider({ DATABASE_PATH: databasePath });
  await driftRepair.initialize();
  await driftRepair.run("UPDATE mart_medicine_source_month SET items = items - 1 WHERE dataset_scope = 'pca'");
  await driftRepair.close();

  const quarantine = new SqliteProvider({ DATABASE_PATH: databasePath });
  await quarantine.initialize();
  const epdRun = await quarantine.one("SELECT id FROM ingestion_runs WHERE source_id = 'nhsbsa.epd'");
  await quarantine.run("UPDATE ingestion_runs SET status = 'partial' WHERE id = ?", [epdRun.id]);
  assert.equal(Number((await quarantine.one("SELECT COUNT(*) AS count FROM intelligence_epd_facts"))?.count), 0, "Partial ingestion must never be queryable.");
  assert.equal(Number((await quarantine.one("SELECT COUNT(*) AS count FROM intelligence_mart_medicine_source_month WHERE dataset_scope = 'epd'"))?.count), 0, "Partial EPD mart evidence must never be queryable.");
  assert.equal(Number((await quarantine.one("SELECT COUNT(*) AS count FROM intelligence_mart_medicine_source_month WHERE dataset_scope = 'pca'"))?.count), 1, "A quarantined EPD run must not hide independent PCA evidence.");
  await quarantine.close();

  const partialManifest = join(dataRoot, "manifests", "test-epd-2026-06.json");
  const partial = runImporter(partialManifest, environment);
  assert.equal(partial.status, 2);
  assert.match(partial.stdout, /"status":"partial_requires_review"/u);
  console.log("Medicines bulk ingestion validated: EPD/PCA exact-source rows, immutable SHA checks, source-scoped marts, idempotency, PCA measure truth and partial-run isolation.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
