import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  downloadCsvResourceSample,
  parseCsvRows,
  parseEpdRecord,
  parsePcaRecord,
  schemaContracts,
  validateSchema,
  type EpdRecord,
  type PcaRecord,
  type SchemaContract,
} from "../../packages/medicines-intelligence/src/index.ts";

interface Options {
  readonly database: string;
  readonly evidence: string;
  readonly checkedAt: string;
  readonly sampleBytes: number;
  readonly rowLimit: number;
}

interface ResourceRow {
  readonly id: string;
  readonly source_id: string;
  readonly external_resource_id: string;
  readonly reporting_period: string;
  readonly resource_name: string;
  readonly resource_url: string;
  readonly byte_size: number;
  readonly resource_hash: string | null;
}

type ParsedRecord = EpdRecord | PcaRecord;

const adapterVersion = "authoritative-range-validation-v1";
const adapters = Object.freeze([
  Object.freeze({ sourceId: "nhsbsa.epd", label: "English Prescribing Dataset", contract: schemaContracts.epd, parse: parseEpdRecord }),
  Object.freeze({ sourceId: "nhsbsa.pca", label: "Prescription Cost Analysis Monthly Administrative Data", contract: schemaContracts.pca, parse: parsePcaRecord }),
]);

function optionsFrom(values: readonly string[]): Options {
  let database = "";
  let evidence = resolve("docs/data/evidence/authoritative-source-samples.json");
  let checkedAt = process.env.SOURCE_SAMPLE_CHECKED_AT || new Date().toISOString();
  let sampleBytes = 2 * 1024 * 1024;
  let rowLimit = 1_000;
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--database" && value) { database = resolve(value); index += 1; continue; }
    if (name === "--evidence" && value) { evidence = resolve(value); index += 1; continue; }
    if (name === "--checked-at" && value) { checkedAt = value; index += 1; continue; }
    if (name === "--sample-bytes" && value) { sampleBytes = Number(value); index += 1; continue; }
    if (name === "--rows" && value) { rowLimit = Number(value); index += 1; continue; }
    throw new Error(`Unknown or incomplete authoritative-sample argument: ${name}`);
  }
  if (!database) throw new Error("--database is required and must identify an isolated validation database populated by source discovery.");
  if (!Number.isFinite(Date.parse(checkedAt))) throw new Error("--checked-at must be an ISO-8601 timestamp.");
  if (!Number.isInteger(sampleBytes) || sampleBytes < 65_536 || sampleBytes > 16 * 1024 * 1024) throw new Error("--sample-bytes is outside the approved validation bounds.");
  if (!Number.isInteger(rowLimit) || rowLimit < 10 || rowLimit > 25_000) throw new Error("--rows is outside the approved validation bounds.");
  return Object.freeze({ database, evidence, checkedAt: new Date(checkedAt).toISOString(), sampleBytes, rowLimit });
}

function stableId(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function recordSummary(record: ParsedRecord): Readonly<{ month: string; medicine: string | null; snomed: string | null; organisation: string | null; items: number; quantity: number; nic: number }> {
  if ("practiceCode" in record) return Object.freeze({
    month: record.monthKey, medicine: record.bnfPresentationCode, snomed: record.snomedCode,
    organisation: record.practiceCode, items: record.items, quantity: record.totalQuantity, nic: record.nic,
  });
  return Object.freeze({
    month: record.monthKey, medicine: record.bnfPresentationCode, snomed: record.snomedCode,
    organisation: record.icbCode, items: record.items, quantity: record.totalQuantity, nic: record.nic,
  });
}

const options = optionsFrom(process.argv.slice(2));
const { SqliteProvider } = await import("../../src/data/providers/sqlite.mjs");
const database = new SqliteProvider({ DATABASE_PATH: options.database });
await database.initialize();
const results: Record<string, unknown>[] = [];
try {
  for (const adapter of adapters) {
    const resource = await database.one(`SELECT id, source_id, external_resource_id, reporting_period, resource_name, resource_url, byte_size, resource_hash
      FROM source_resources WHERE source_id = ? ORDER BY reporting_period DESC, last_seen_at DESC LIMIT 1`, [adapter.sourceId]) as ResourceRow | null;
    if (!resource) throw new Error(`No governed resource is available for ${adapter.sourceId}; run source discovery first.`);
    const sample = await downloadCsvResourceSample(resource.resource_url, options.sampleBytes);
    if (Number(resource.byte_size) !== sample.totalResourceBytes) throw new Error(`${adapter.sourceId} range evidence does not reconcile with CKAN resource size.`);
    let headers: readonly string[] | null = null;
    let schema: ReturnType<typeof validateSchema> | null = null;
    let acceptedRows = 0;
    let unidentifiedRows = 0;
    let snomedStringRows = 0;
    let items = 0;
    let totalQuantity = 0;
    let nic = 0;
    const months = new Set<string>();
    const medicines = new Set<string>();
    const organisations = new Set<string>();

    for await (const cells of parseCsvRows([sample.bytes], { maximumColumns: 128, maximumFieldLength: 8_000 })) {
      if (!headers) {
        headers = Object.freeze(cells.map((cell) => cell.trim()));
        schema = validateSchema(adapter.contract as SchemaContract, headers);
        if (schema.status === "schema_review_required") throw new Error(`${adapter.sourceId} sample schema is missing: ${schema.missingColumns.join(", ")}.`);
        continue;
      }
      const record = adapter.parse(headers, cells, acceptedRows + 2) as ParsedRecord;
      const summary = recordSummary(record);
      if (summary.month !== resource.reporting_period) throw new Error(`${adapter.sourceId} sample row does not match the discovered resource period.`);
      acceptedRows += 1;
      months.add(summary.month);
      if (summary.medicine) medicines.add(summary.medicine);
      if (summary.organisation) organisations.add(summary.organisation);
      if (summary.snomed !== null) snomedStringRows += typeof summary.snomed === "string" ? 1 : 0;
      if ("unidentified" in record && record.unidentified) unidentifiedRows += 1;
      items += summary.items;
      totalQuantity += summary.quantity;
      nic += summary.nic;
      if (acceptedRows >= options.rowLimit) break;
    }
    if (!headers || !schema || acceptedRows !== options.rowLimit) throw new Error(`${adapter.sourceId} did not provide the requested complete validation rows within the bounded sample.`);
    const runId = `source-sample-${stableId(adapterVersion, adapter.sourceId, resource.external_resource_id, sample.sha256, String(options.rowLimit))}`;
    const result = Object.freeze({
      sourceId: adapter.sourceId,
      datasetName: adapter.label,
      reportingPeriod: resource.reporting_period,
      resourceId: resource.external_resource_id,
      resourceUrl: resource.resource_url,
      resourceMetadataHash: resource.resource_hash,
      resourceBytes: sample.totalResourceBytes,
      range: sample.contentRange,
      sampleBytes: sample.byteCount,
      sampleSha256: sample.sha256,
      schemaStatus: schema.status,
      schemaFingerprint: schema.fingerprint,
      observedColumns: schema.observedColumns,
      acceptedRows,
      rejectedRows: 0,
      distinctMedicineIdentifiers: medicines.size,
      distinctOrganisationIdentifiers: organisations.size,
      rowsWithSnomedString: snomedStringRows,
      unidentifiedRows,
      sampleMeasures: { items, totalQuantity, nic },
      coverage: "bounded_authoritative_validation_sample",
      nationalBackfillComplete: false,
      queryableProductionFactClaim: false,
    });
    await database.upsert("ingestion_runs", {
      id: runId, source_id: adapter.sourceId, source_resource_id: resource.id,
      run_kind: `${adapter.sourceId.replaceAll(".", "_")}_validation_sample`, status: "succeeded",
      started_at: options.checkedAt, completed_at: options.checkedAt, source_cutoff_at: `${resource.reporting_period}-01`,
      input_rows: acceptedRows, accepted_rows: acceptedRows, rejected_rows: 0, duplicate_rows: 0,
      checkpoint_json: JSON.stringify({ range: sample.contentRange, sampleBytes: sample.byteCount, totalResourceBytes: sample.totalResourceBytes }),
      result_json: JSON.stringify(result), exact_source_sha: sample.sha256, initiated_by: adapterVersion,
    }, ["id"], ["status", "completed_at", "input_rows", "accepted_rows", "rejected_rows", "duplicate_rows", "checkpoint_json", "result_json", "exact_source_sha", "initiated_by"]);
    results.push(result);
  }
} finally {
  await database.close();
}

const evidence = Object.freeze({
  evidenceType: "authoritative-nhsbsa-bounded-source-sample-validation",
  checkedAt: options.checkedAt,
  adapterVersion,
  liveNetworkCheck: true,
  productionIngestionClaim: false,
  historicalBackfillClaim: false,
  rawNationalFilesStoredInRepository: false,
  requestedRowsPerSource: options.rowLimit,
  maximumBytesPerSource: options.sampleBytes,
  sources: results,
  interpretation: [
    "These are real bounded byte-range samples from the latest governed NHSBSA resources, not fixtures and not national totals.",
    "Passing sample validation proves current schema and row parsing only; it does not make EPD or PCA analytics available in production.",
    "No sampled row is exposed through the Portal, and no sample measure is used as a forecast, opportunity or market-size value.",
  ],
});
await mkdir(dirname(options.evidence), { recursive: true });
await writeFile(options.evidence, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ evidence: options.evidence, sources: results.map((entry) => ({ sourceId: entry["sourceId"], reportingPeriod: entry["reportingPeriod"], acceptedRows: entry["acceptedRows"], schemaStatus: entry["schemaStatus"] })) }));
