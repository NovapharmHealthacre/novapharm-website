import { createHash } from "node:crypto";
import { mkdir, readFile, statfs, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { gibibyte, privateCloudLayout } from "../../packages/medicines-intelligence/src/index.ts";

const BUILDER_VERSION = "source-scoped-marts-v2";
const sqliteBuildSettings = Object.freeze({
  cacheKiB: 131_072,
  memoryMapBytes: 268_435_456,
  walAutocheckpointPages: 16_384,
});

interface Options {
  readonly source: "epd" | "pca";
  readonly period: string;
  readonly evidence: string | null;
  readonly includePracticeMart: boolean;
}

interface SourceRun {
  readonly id: string;
  readonly source_id: string;
  readonly source_resource_id: string;
  readonly external_resource_id: string;
  readonly source_resource_sha: string;
  readonly source_bytes: number;
  readonly schema_fingerprint: string | null;
  readonly source_cutoff_at: string;
  readonly exact_source_sha: string;
  readonly input_rows: number;
  readonly accepted_rows: number;
  readonly rejected_rows: number;
  readonly duplicate_rows: number;
  readonly completed_at: string;
}

interface MartCounts {
  readonly medicineMonth: number;
  readonly geographyMonth: number;
  readonly practiceMonth: number;
  readonly presentationMonth: number;
  readonly supplierMonth: number;
}

interface MetricTotals {
  readonly items: number;
  readonly quantity: number;
  readonly nic: number;
  readonly actualCost: number | null;
}

interface ReconciliationResult {
  readonly scope: string;
  readonly expected: MetricTotals;
  readonly actual: MetricTotals;
  readonly differences: MetricTotals;
  readonly passed: boolean;
}

interface CapacityPreflight {
  readonly availableBytes: number;
  readonly filesystemBytes: number;
  readonly reserveBytes: number;
  readonly estimatedMartAndIndexBytes: number;
  readonly estimatedWorkingBytes: number;
  readonly requiredIncrementalBytes: number;
  readonly availableAfterReserveBytes: number;
  readonly sufficient: boolean;
}

function optionsFrom(values: readonly string[]): Options {
  let source: Options["source"] | null = null;
  let period = "";
  let evidence: string | null = null;
  let includePracticeMart = true;
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--source" && (value === "epd" || value === "pca")) { source = value; index += 1; continue; }
    if (name === "--period" && value) { period = value; index += 1; continue; }
    if (name === "--evidence" && value) { evidence = resolve(value); index += 1; continue; }
    if (name === "--omit-practice-mart") { includePracticeMart = false; continue; }
    throw new Error(`Unknown or incomplete mart-build argument: ${name}`);
  }
  if (!source) throw new Error("--source must be epd or pca.");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(period)) throw new Error("--period must use YYYY-MM.");
  if (source === "pca") includePracticeMart = false;
  return Object.freeze({ source, period, evidence, includePracticeMart });
}

function stableId(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown mart-build failure.";
  return message.replace(/[\r\n\t]+/gu, " ").slice(0, 480);
}

function safeFileSystemNumber(value: bigint, label: string): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted)) throw new Error(`${label} exceeds JavaScript safe integer capacity.`);
  return converted;
}

async function persistEvidence(path: string, payload: Readonly<Record<string, unknown>>): Promise<"written" | "verified_existing"> {
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    await writeFile(path, body, { mode: 0o600, flag: "wx" });
    return "written";
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
    if (code !== "EEXIST") throw error;
  }
  const existing = await readFile(path, "utf8");
  if (existing !== body) {
    throw new Error(`Mart evidence path already exists with different content: ${path}`);
  }
  return "verified_existing";
}

function countsFor(raw: import("node:sqlite").DatabaseSync, source: Options["source"], period: string): MartCounts {
  const value = (table: string): number => Number((raw.prepare(
    `SELECT COUNT(*) AS count FROM ${table} WHERE dataset_scope = ? AND month_key = ?`,
  ).get(source, period) as { count: number }).count);
  return Object.freeze({
    medicineMonth: value("mart_medicine_source_month"),
    geographyMonth: value("mart_medicine_source_geography_month"),
    practiceMonth: value("mart_medicine_source_practice_month"),
    presentationMonth: value("mart_medicine_source_presentation_month"),
    supplierMonth: value("mart_medicine_source_supplier_month"),
  });
}

function sameCounts(left: MartCounts, right: MartCounts): boolean {
  return Object.keys(left).every((key) => left[key as keyof MartCounts] === right[key as keyof MartCounts]);
}

function metricTotals(row: Record<string, unknown> | undefined): MetricTotals {
  const value = (name: string): number => Number(row?.[name] ?? 0);
  return Object.freeze({
    items: value("items"),
    quantity: value("quantity"),
    nic: value("nic"),
    actualCost: row?.["actual_cost"] === null || row?.["actual_cost"] === undefined
      ? null
      : Number(row["actual_cost"]),
  });
}

function totalsFor(
  raw: import("node:sqlite").DatabaseSync,
  table: string,
  where: string,
  parameters: readonly (string | number)[],
  quantityExpression = "SUM(quantity)",
  actualCostExpression = "SUM(actual_cost)",
): MetricTotals {
  return metricTotals(raw.prepare(`SELECT SUM(items) AS items, ${quantityExpression} AS quantity, SUM(nic) AS nic,
    ${actualCostExpression} AS actual_cost FROM ${table} WHERE ${where}`).get(...parameters) as Record<string, unknown> | undefined);
}

function difference(expected: number | null, actual: number | null): number | null {
  return expected === null || actual === null ? null : actual - expected;
}

function withinFloatingPointTolerance(expected: number | null, actual: number | null): boolean {
  if (expected === null || actual === null) return expected === actual;
  return Math.abs(actual - expected) <= Math.max(0.000001, Math.abs(expected) * 0.0000000001);
}

function reconcile(scope: string, expected: MetricTotals, actual: MetricTotals): ReconciliationResult {
  const differences = Object.freeze({
    items: difference(expected.items, actual.items) ?? 0,
    quantity: difference(expected.quantity, actual.quantity) ?? 0,
    nic: difference(expected.nic, actual.nic) ?? 0,
    actualCost: difference(expected.actualCost, actual.actualCost),
  });
  return Object.freeze({
    scope,
    expected,
    actual,
    differences,
    passed: withinFloatingPointTolerance(expected.items, actual.items)
      && withinFloatingPointTolerance(expected.quantity, actual.quantity)
      && withinFloatingPointTolerance(expected.nic, actual.nic)
      && withinFloatingPointTolerance(expected.actualCost, actual.actualCost),
  });
}

function reconciliationsFor(
  raw: import("node:sqlite").DatabaseSync,
  source: Options["source"],
  period: string,
  sourceRunId: string,
  includePracticeMart: boolean,
): readonly ReconciliationResult[] {
  const sourceTable = source === "epd"
    ? "fact_epd_prescribing_observations NOT INDEXED"
    : "fact_pca_community_dispensing_observations NOT INDEXED";
  const sourceActualCost = source === "epd" ? "SUM(actual_cost)" : "NULL";
  const sourceTotals = (predicate = "1 = 1") => totalsFor(
    raw,
    sourceTable,
    `ingestion_run_id = ? AND ${predicate}`,
    [sourceRunId],
    "SUM(total_quantity)",
    sourceActualCost,
  );
  const martTotals = (table: string, actualCostExpression = "SUM(actual_cost)") => totalsFor(
    raw,
    table,
    "dataset_scope = ? AND month_key = ?",
    [source, period],
    "SUM(quantity)",
    actualCostExpression,
  );
  const acceptedSourceTotals = sourceTotals();
  const results: ReconciliationResult[] = [
    reconcile("medicine_month", acceptedSourceTotals, martTotals("mart_medicine_source_month")),
    reconcile("geography_month", acceptedSourceTotals, martTotals("mart_medicine_source_geography_month")),
    reconcile("presentation_month", acceptedSourceTotals, martTotals("mart_medicine_source_presentation_month")),
  ];
  if (source === "epd" && includePracticeMart) {
    results.push(reconcile("practice_month_identified_facts", sourceTotals("practice_id IS NOT NULL"), martTotals("mart_medicine_source_practice_month")));
  }
  if (source === "pca") {
    results.push(reconcile("supplier_month_named_supplier_facts", sourceTotals("supplier_name IS NOT NULL AND TRIM(supplier_name) <> ''"), martTotals("mart_medicine_source_supplier_month", "NULL")));
  }
  return Object.freeze(results);
}

const options = optionsFrom(process.argv.slice(2));
const builderVersion = `${BUILDER_VERSION}-${options.includePracticeMart ? "with-practice" : "without-practice"}`;
const layout = privateCloudLayout(process.env);
const sourceId = `nhsbsa.${options.source}`;
const { SqliteProvider } = await import("../../src/data/providers/sqlite.mjs");
const database = new SqliteProvider({ DATABASE_PATH: layout.databasePath });
await database.initialize();
const raw = database.raw;
if (!raw) throw new Error("The governed SQLite provider did not initialise its database handle.");
// National aggregations can require large temporary B-trees. Keep memory bounded and
// checkpoint less frequently without weakening the atomic build transaction.
raw.exec(`
  PRAGMA cache_size = -${sqliteBuildSettings.cacheKiB};
  PRAGMA mmap_size = ${sqliteBuildSettings.memoryMapBytes};
  PRAGMA temp_store = FILE;
  PRAGMA wal_autocheckpoint = ${sqliteBuildSettings.walAutocheckpointPages};
`);

const sourceRun = await database.one(`SELECT run.id, run.source_id, run.source_resource_id, resource.external_resource_id,
  resource.resource_hash AS source_resource_sha, resource.byte_size AS source_bytes, resource.schema_fingerprint,
  run.source_cutoff_at, run.exact_source_sha, run.input_rows, run.accepted_rows, run.rejected_rows, run.duplicate_rows, run.completed_at
  FROM ingestion_runs run
  JOIN source_resources resource ON resource.id = run.source_resource_id
  WHERE run.source_id = ? AND resource.reporting_period = ? AND run.run_kind = 'authoritative_bulk_observation_v1'
    AND run.status = 'succeeded'
  ORDER BY run.completed_at DESC, run.started_at DESC LIMIT 1`, [sourceId, options.period]) as SourceRun | null;

if (!sourceRun) {
  await database.close();
  throw new Error("No successful authoritative bulk-observation run exists for this source and period.");
}
if (!sourceRun.source_resource_id || !sourceRun.source_cutoff_at || !sourceRun.completed_at
  || !/^[a-f0-9]{64}$/u.test(sourceRun.exact_source_sha) || !/^[a-f0-9]{64}$/u.test(sourceRun.source_resource_sha)) {
  await database.close();
  throw new Error("The selected source run lacks exact immutable-source lineage.");
}
if (sourceRun.exact_source_sha !== sourceRun.source_resource_sha) {
  await database.close();
  throw new Error("The selected source run SHA does not match its registered immutable resource SHA.");
}
if (Number(sourceRun.rejected_rows) !== 0 || Number(sourceRun.accepted_rows) <= 0) {
  await database.close();
  throw new Error("The selected source run is not zero-rejection analytical evidence.");
}
if (Number(sourceRun.input_rows) !== Number(sourceRun.accepted_rows) + Number(sourceRun.rejected_rows) + Number(sourceRun.duplicate_rows)) {
  await database.close();
  throw new Error("The selected source run row accounting does not reconcile.");
}
if (!Number.isSafeInteger(Number(sourceRun.source_bytes)) || Number(sourceRun.source_bytes) <= 0) {
  await database.close();
  throw new Error("The selected source resource lacks a trustworthy positive byte size.");
}
const filesystem = await statfs(dirname(layout.databasePath), { bigint: true });
const availableBytes = safeFileSystemNumber(filesystem.bavail * filesystem.bsize, "Available filesystem bytes");
const filesystemBytes = safeFileSystemNumber(filesystem.blocks * filesystem.bsize, "Filesystem capacity");
const reserveBytes = Math.max(20 * gibibyte, Math.floor(filesystemBytes * 0.1));
const estimatedMartAndIndexBytes = Math.ceil(Number(sourceRun.source_bytes) * 0.5);
const estimatedWorkingBytes = Math.ceil(Number(sourceRun.source_bytes) * 0.25);
const requiredIncrementalBytes = estimatedMartAndIndexBytes + estimatedWorkingBytes;
const capacityPreflight: CapacityPreflight = Object.freeze({
  availableBytes,
  filesystemBytes,
  reserveBytes,
  estimatedMartAndIndexBytes,
  estimatedWorkingBytes,
  requiredIncrementalBytes,
  availableAfterReserveBytes: Math.max(0, availableBytes - reserveBytes),
  sufficient: availableBytes - reserveBytes >= requiredIncrementalBytes,
});
if (!capacityPreflight.sufficient) {
  await database.close();
  throw new Error("The mart build would breach the governed filesystem reserve. Free space or move the private-cloud root before retrying.");
}
const sourceFactTable = options.source === "epd"
  ? "fact_epd_prescribing_observations"
  : "fact_pca_community_dispensing_observations";
const sourceFactReconciliation = raw.prepare(options.source === "epd"
  ? `SELECT COUNT(*) AS fact_rows,
      SUM(CASE WHEN unidentified = 1 THEN 1 ELSE 0 END) AS unidentified_rows,
      SUM(CASE WHEN unidentified = 1 AND practice_id IS NOT NULL THEN 1 ELSE 0 END) AS unidentified_with_practice_dimension,
      SUM(CASE WHEN unidentified = 0 AND practice_id IS NULL THEN 1 ELSE 0 END) AS identified_without_practice_dimension
    FROM ${sourceFactTable} NOT INDEXED WHERE ingestion_run_id = ?`
  : `SELECT COUNT(*) AS fact_rows FROM ${sourceFactTable} NOT INDEXED WHERE ingestion_run_id = ?`)
  .get(sourceRun.id) as Record<string, number>;
const sourceFactCount = Number(sourceFactReconciliation["fact_rows"]);
if (sourceFactCount !== Number(sourceRun.accepted_rows)) {
  await database.close();
  throw new Error("The selected source run fact rows do not reconcile to its accepted-row count.");
}
if (options.source === "epd" && (
  Number(sourceFactReconciliation["unidentified_with_practice_dimension"]) !== 0
  || Number(sourceFactReconciliation["identified_without_practice_dimension"]) !== 0
)) {
  await database.close();
  throw new Error("The selected EPD source run does not satisfy unidentified/practice identity semantics.");
}

const buildId = `mart-${stableId(builderVersion, options.source, options.period, sourceRun.id, sourceRun.exact_source_sha)}`;
const prior = await database.one("SELECT status, completed_at, result_json FROM medicine_mart_build_runs WHERE id = ?", [buildId]) as {
  status: string;
  completed_at: string | null;
  result_json: string | null;
} | null;
if (prior?.status === "succeeded" && prior.result_json) {
  const result = JSON.parse(prior.result_json) as Record<string, unknown> & {
    counts?: MartCounts;
    reconciliation?: { passed?: boolean };
  };
  const actual = countsFor(raw, options.source, options.period);
  if (!result.counts || !sameCounts(result.counts, actual)) {
    await database.close();
    throw new Error("A previously successful mart build has drifted from its recorded row counts.");
  }
  const reconciliations = reconciliationsFor(raw, options.source, options.period, sourceRun.id, options.includePracticeMart);
  if (result.reconciliation?.passed !== true || reconciliations.some((entry) => !entry.passed)) {
    await database.close();
    throw new Error("A previously successful mart build has drifted from its accepted source totals.");
  }
  if (!prior.completed_at) {
    await database.close();
    throw new Error("A previously successful mart build lacks its completion timestamp.");
  }
  const evidencePath = options.evidence ?? join(layout.directories.manifests, `${buildId}.json`);
  let evidenceStatus: "written" | "verified_existing";
  try {
    evidenceStatus = await persistEvidence(evidencePath, {
      evidenceType: "source-scoped-medicine-mart-build",
      buildId,
      completedAt: prior.completed_at,
      ...result,
    });
  } catch (error) {
    await database.close();
    throw error;
  }
  console.log(JSON.stringify({
    buildId,
    status: "already_succeeded",
    source: options.source,
    period: options.period,
    evidence: evidencePath,
    evidenceStatus,
    counts: actual,
  }));
  await database.close();
  process.exit(0);
}

const startedAt = new Date().toISOString();
const lineage = JSON.stringify({
  builderVersion,
  datasetScope: options.source,
  sourceId,
  sourceResourceId: sourceRun.source_resource_id,
  externalResourceId: sourceRun.external_resource_id,
  sourceIngestionRunId: sourceRun.id,
  exactSourceSha256: sourceRun.exact_source_sha,
  reportingPeriod: options.period,
  evidenceState: "local_private_cloud_validation",
  productionOperationalClaim: false,
});

await database.upsert("medicine_mart_build_runs", {
  id: buildId,
  dataset_scope: options.source,
  month_key: options.period,
  source_id: sourceId,
  source_resource_id: sourceRun.source_resource_id,
  source_ingestion_run_id: sourceRun.id,
  exact_source_sha: sourceRun.exact_source_sha,
  builder_version: builderVersion,
  status: "running",
  started_at: startedAt,
  completed_at: null,
  result_json: null,
}, ["id"], ["status", "started_at", "completed_at", "result_json"]);

try {
  raw.exec("BEGIN IMMEDIATE");
  const supersededBuilds = raw.prepare(`SELECT id, result_json FROM medicine_mart_build_runs
    WHERE dataset_scope = ? AND month_key = ? AND source_ingestion_run_id = ? AND id <> ? AND status = 'succeeded'`)
    .all(options.source, options.period, sourceRun.id, buildId) as unknown as readonly { id: string; result_json: string | null }[];
  for (const superseded of supersededBuilds) {
    const priorResult = superseded.result_json ? JSON.parse(superseded.result_json) as Record<string, unknown> : {};
    raw.prepare("UPDATE medicine_mart_build_runs SET status = 'blocked', result_json = ? WHERE id = ?")
      .run(JSON.stringify({ ...priorResult, supersededByBuildId: buildId, supersededAt: startedAt }), superseded.id);
  }
  for (const table of [
    "mart_medicine_source_month",
    "mart_medicine_source_geography_month",
    "mart_medicine_source_practice_month",
    "mart_medicine_source_presentation_month",
    "mart_medicine_source_supplier_month",
  ]) {
    raw.prepare(`DELETE FROM ${table} WHERE dataset_scope = ? AND month_key = ?`).run(options.source, options.period);
  }

  if (options.source === "epd") {
    raw.prepare(`INSERT INTO mart_medicine_source_month(
      dataset_scope, month_key, medicine_id, items, quantity, nic, actual_cost, source_cutoff_at,
      source_ingestion_run_id, lineage_json, built_at)
      SELECT 'epd', month_key, medicine_id, SUM(items), SUM(total_quantity), SUM(nic), SUM(actual_cost), ?, ?, ?, ?
      FROM fact_epd_prescribing_observations NOT INDEXED WHERE ingestion_run_id = ?
      GROUP BY month_key, medicine_id`).run(sourceRun.source_cutoff_at, sourceRun.id, lineage, startedAt, sourceRun.id);

    raw.prepare(`INSERT INTO mart_medicine_source_geography_month(
      dataset_scope, month_key, medicine_id, geography_level, geography_key, geography_id, geography_code, geography_name,
      items, quantity, nic, actual_cost, registered_population, items_per_1000, quantity_per_1000,
      source_cutoff_at, source_ingestion_run_id, lineage_json, built_at)
      WITH demand AS (
        SELECT month_key, medicine_id, icb_code, MAX(icb_name) AS icb_name,
          SUM(items) AS items, SUM(total_quantity) AS quantity, SUM(nic) AS nic, SUM(actual_cost) AS actual_cost
        FROM fact_epd_prescribing_observations NOT INDEXED WHERE ingestion_run_id = ?
        GROUP BY month_key, medicine_id, icb_code
      ), population AS (
        SELECT mapping.month_key, mapping.icb_code, SUM(pop.registered_population) AS registered_population
        FROM practice_monthly_mapping mapping
        JOIN practice_population_history pop ON pop.practice_code = mapping.practice_code AND pop.month_key = mapping.month_key
        WHERE mapping.month_key = ? AND mapping.icb_code IS NOT NULL
        GROUP BY mapping.month_key, mapping.icb_code
      )
      SELECT 'epd', demand.month_key, demand.medicine_id,
        CASE WHEN demand.icb_code IS NULL OR TRIM(demand.icb_code) = '' THEN 'UNIDENTIFIED' ELSE 'ICB' END,
        COALESCE(NULLIF(TRIM(demand.icb_code), ''), 'unidentified'), geography.geography_id,
        NULLIF(TRIM(demand.icb_code), ''), NULLIF(TRIM(demand.icb_name), ''), demand.items, demand.quantity, demand.nic,
        demand.actual_cost, population.registered_population,
        CASE WHEN population.registered_population > 0 THEN demand.items * 1000.0 / population.registered_population END,
        CASE WHEN population.registered_population > 0 THEN demand.quantity * 1000.0 / population.registered_population END,
        ?, ?, ?, ?
      FROM demand
      LEFT JOIN population ON population.month_key = demand.month_key AND population.icb_code = demand.icb_code
      LEFT JOIN dim_geography geography ON geography.geography_type = 'ICB' AND geography.geography_code = demand.icb_code
        AND (geography.valid_from IS NULL OR geography.valid_from <= demand.month_key || '-01')
        AND (geography.valid_to IS NULL OR geography.valid_to >= demand.month_key || '-01')`).run(
      sourceRun.id, options.period, sourceRun.source_cutoff_at, sourceRun.id, lineage, startedAt,
    );

    if (options.includePracticeMart) {
      raw.prepare(`INSERT INTO mart_medicine_source_practice_month(
        dataset_scope, month_key, medicine_id, practice_id, practice_code, practice_name, items, quantity, nic, actual_cost,
        registered_population, items_per_1000, quantity_per_1000, source_cutoff_at, source_ingestion_run_id, lineage_json, built_at)
        SELECT 'epd', fact.month_key, fact.medicine_id, fact.practice_id, MAX(fact.practice_code), MAX(fact.practice_name),
          SUM(fact.items), SUM(fact.total_quantity), SUM(fact.nic), SUM(fact.actual_cost), MAX(pop.registered_population),
          CASE WHEN MAX(pop.registered_population) > 0 THEN SUM(fact.items) * 1000.0 / MAX(pop.registered_population) END,
          CASE WHEN MAX(pop.registered_population) > 0 THEN SUM(fact.total_quantity) * 1000.0 / MAX(pop.registered_population) END,
          ?, ?, ?, ?
        FROM fact_epd_prescribing_observations fact NOT INDEXED
        LEFT JOIN practice_population_history pop ON pop.practice_code = fact.practice_code AND pop.month_key = fact.month_key
        WHERE fact.ingestion_run_id = ? AND fact.practice_id IS NOT NULL
        GROUP BY fact.month_key, fact.medicine_id, fact.practice_id`).run(sourceRun.source_cutoff_at, sourceRun.id, lineage, startedAt, sourceRun.id);
    }

    raw.prepare(`INSERT INTO mart_medicine_source_presentation_month(
      dataset_scope, month_key, medicine_id, presentation_key, presentation_code, presentation_name,
      items, quantity, nic, actual_cost, source_cutoff_at, source_ingestion_run_id, lineage_json, built_at)
      SELECT 'epd', month_key, medicine_id,
        COALESCE(NULLIF(TRIM(bnf_presentation_code), ''), NULLIF(TRIM(bnf_presentation_name), ''), medicine_id),
        NULLIF(TRIM(bnf_presentation_code), ''), COALESCE(NULLIF(TRIM(MAX(bnf_presentation_name)), ''), medicine_id),
        SUM(items), SUM(total_quantity), SUM(nic), SUM(actual_cost), ?, ?, ?, ?
      FROM fact_epd_prescribing_observations NOT INDEXED WHERE ingestion_run_id = ?
      GROUP BY month_key, medicine_id, COALESCE(NULLIF(TRIM(bnf_presentation_code), ''), NULLIF(TRIM(bnf_presentation_name), ''), medicine_id)`).run(
      sourceRun.source_cutoff_at, sourceRun.id, lineage, startedAt, sourceRun.id,
    );
  } else {
    raw.prepare(`INSERT INTO mart_medicine_source_month(
      dataset_scope, month_key, medicine_id, items, quantity, nic, actual_cost, source_cutoff_at,
      source_ingestion_run_id, lineage_json, built_at)
      SELECT 'pca', month_key, medicine_id, SUM(items), SUM(total_quantity), SUM(nic), NULL, ?, ?, ?, ?
      FROM fact_pca_community_dispensing_observations NOT INDEXED WHERE ingestion_run_id = ?
      GROUP BY month_key, medicine_id`).run(sourceRun.source_cutoff_at, sourceRun.id, lineage, startedAt, sourceRun.id);

    raw.prepare(`INSERT INTO mart_medicine_source_geography_month(
      dataset_scope, month_key, medicine_id, geography_level, geography_key, geography_id, geography_code, geography_name,
      items, quantity, nic, actual_cost, registered_population, items_per_1000, quantity_per_1000,
      source_cutoff_at, source_ingestion_run_id, lineage_json, built_at)
      SELECT 'pca', month_key, medicine_id,
        CASE WHEN icb_code IS NOT NULL AND TRIM(icb_code) <> '' THEN 'ICB'
          WHEN region_code IS NOT NULL AND TRIM(region_code) <> '' THEN 'NHS_REGION' ELSE 'UNIDENTIFIED' END,
        COALESCE(NULLIF(TRIM(icb_code), ''), NULLIF(TRIM(region_code), ''), 'unidentified'), MAX(geography_id),
        COALESCE(NULLIF(TRIM(icb_code), ''), NULLIF(TRIM(region_code), '')),
        COALESCE(NULLIF(TRIM(MAX(icb_name)), ''), NULLIF(TRIM(MAX(region_name)), '')),
        SUM(items), SUM(total_quantity), SUM(nic), NULL, NULL, NULL, NULL, ?, ?, ?, ?
      FROM fact_pca_community_dispensing_observations NOT INDEXED WHERE ingestion_run_id = ?
      GROUP BY month_key, medicine_id,
        CASE WHEN icb_code IS NOT NULL AND TRIM(icb_code) <> '' THEN 'ICB'
          WHEN region_code IS NOT NULL AND TRIM(region_code) <> '' THEN 'NHS_REGION' ELSE 'UNIDENTIFIED' END,
        COALESCE(NULLIF(TRIM(icb_code), ''), NULLIF(TRIM(region_code), ''), 'unidentified')`).run(
      sourceRun.source_cutoff_at, sourceRun.id, lineage, startedAt, sourceRun.id,
    );

    raw.prepare(`INSERT INTO mart_medicine_source_presentation_month(
      dataset_scope, month_key, medicine_id, presentation_key, presentation_code, presentation_name,
      items, quantity, nic, actual_cost, source_cutoff_at, source_ingestion_run_id, lineage_json, built_at)
      SELECT 'pca', month_key, medicine_id,
        COALESCE(NULLIF(TRIM(bnf_presentation_code), ''), NULLIF(TRIM(bnf_presentation_name), ''), medicine_id),
        NULLIF(TRIM(bnf_presentation_code), ''), COALESCE(NULLIF(TRIM(MAX(bnf_presentation_name)), ''), medicine_id),
        SUM(items), SUM(total_quantity), SUM(nic), NULL, ?, ?, ?, ?
      FROM fact_pca_community_dispensing_observations NOT INDEXED WHERE ingestion_run_id = ?
      GROUP BY month_key, medicine_id, COALESCE(NULLIF(TRIM(bnf_presentation_code), ''), NULLIF(TRIM(bnf_presentation_name), ''), medicine_id)`).run(
      sourceRun.source_cutoff_at, sourceRun.id, lineage, startedAt, sourceRun.id,
    );

    raw.prepare(`INSERT INTO mart_medicine_source_supplier_month(
      dataset_scope, month_key, medicine_id, supplier_name, items, quantity, nic,
      source_cutoff_at, source_ingestion_run_id, lineage_json, built_at)
      SELECT 'pca', month_key, medicine_id, TRIM(supplier_name), SUM(items), SUM(total_quantity), SUM(nic), ?, ?, ?, ?
      FROM fact_pca_community_dispensing_observations NOT INDEXED
      WHERE ingestion_run_id = ? AND supplier_name IS NOT NULL AND TRIM(supplier_name) <> ''
      GROUP BY month_key, medicine_id, TRIM(supplier_name)`).run(sourceRun.source_cutoff_at, sourceRun.id, lineage, startedAt, sourceRun.id);
  }

  const counts = countsFor(raw, options.source, options.period);
  if (counts.medicineMonth === 0 || counts.presentationMonth === 0) throw new Error("The mart build produced no medicine or presentation aggregates.");
  if (options.source === "epd" && options.includePracticeMart && counts.practiceMonth === 0) throw new Error("The EPD mart build produced no practice aggregates.");
  if (options.source === "pca" && counts.practiceMonth !== 0) throw new Error("PCA evidence must not populate the EPD practice mart.");
  const reconciliations = reconciliationsFor(raw, options.source, options.period, sourceRun.id, options.includePracticeMart);
  if (reconciliations.some((entry) => !entry.passed)) {
    throw new Error("Source-to-mart metric totals did not reconcile within the recorded floating-point tolerance.");
  }

  const completedAt = new Date().toISOString();
  const result = Object.freeze({
    builderVersion,
    source: options.source,
    sourceId,
    reportingPeriod: options.period,
    sourceResourceId: sourceRun.source_resource_id,
    externalResourceId: sourceRun.external_resource_id,
    sourceResourceBytes: Number(sourceRun.source_bytes),
    sourceSchemaFingerprint: sourceRun.schema_fingerprint,
    sourceIngestionRunId: sourceRun.id,
    exactSourceSha256: sourceRun.exact_source_sha,
    sourceInputRows: Number(sourceRun.input_rows),
    sourceAcceptedRows: Number(sourceRun.accepted_rows),
    sourceFactRows: sourceFactCount,
    sourceSemanticReconciliation: sourceFactReconciliation,
    sourceDuplicateRows: Number(sourceRun.duplicate_rows),
    sourceRejectedRows: Number(sourceRun.rejected_rows),
    practiceMartIncluded: options.includePracticeMart,
    capacityPreflight,
    sqliteBuildSettings,
    counts,
    reconciliation: {
      passed: true,
      tolerance: "absolute 0.000001 or relative 0.0000000001, whichever is greater",
      aggregates: reconciliations,
    },
    startedAt,
    durationMs: Date.parse(completedAt) - Date.parse(startedAt),
    populationNormalisationAvailable: Number((raw.prepare(
      "SELECT COUNT(*) AS count FROM practice_population_history WHERE month_key = ?",
    ).get(options.period) as { count: number }).count) > 0,
    evidenceState: "local_private_cloud_validation",
    nationalHistoryComplete: false,
    forecastEligible: false,
    productionOperationalClaim: false,
  });
  raw.prepare("UPDATE medicine_mart_build_runs SET status = 'succeeded', completed_at = ?, result_json = ? WHERE id = ?")
    .run(completedAt, JSON.stringify(result), buildId);
  raw.exec("COMMIT");

  const evidencePath = options.evidence ?? join(layout.directories.manifests, `${buildId}.json`);
  const evidenceStatus = await persistEvidence(evidencePath, {
    evidenceType: "source-scoped-medicine-mart-build",
    buildId,
    completedAt,
    ...result,
  });
  console.log(JSON.stringify({ buildId, status: "succeeded", evidence: evidencePath, evidenceStatus, counts }));
} catch (error) {
  try { raw.exec("ROLLBACK"); } catch { /* transaction was already closed */ }
  await database.run("UPDATE medicine_mart_build_runs SET status = 'failed', completed_at = ?, result_json = ? WHERE id = ?", [
    new Date().toISOString(), JSON.stringify({ safeError: safeError(error), productionOperationalClaim: false }), buildId,
  ]).catch(() => undefined);
  throw error;
} finally {
  await database.close();
}
