import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import {
  CkanClient,
  bnfHierarchy,
  normaliseMedicineSearchText,
  parseBnfChangeRecord,
  parseBnfCurrentRecord,
  parseCsvRows,
  schemaContracts,
  validateSchema,
  type BnfChangeRecord,
  type BnfCurrentRecord,
  type BnfHierarchyNode,
  type CkanResource,
  type SchemaContract,
} from "../../packages/medicines-intelligence/src/index.ts";

interface Options {
  readonly database: string;
  readonly rawDirectory: string;
  readonly evidence: string;
  readonly ingestedAt: string;
  readonly maxBytes: number;
}

interface ResourceRow {
  readonly id: string;
  readonly source_id: string;
  readonly external_resource_id: string;
  readonly reporting_period: string;
  readonly resource_name: string;
  readonly resource_url: string;
  readonly format: string;
  readonly byte_size: number;
  readonly resource_hash: string;
  readonly discovery_endpoint: string;
}

interface ParsedSource<T> {
  readonly resource: ResourceRow;
  readonly destination: string;
  readonly downloadSha: string;
  readonly downloadBytes: number;
  readonly headers: readonly string[];
  readonly schema: ReturnType<typeof validateSchema>;
  readonly records: readonly T[];
  readonly duplicates: number;
  readonly sourceRows: number;
  readonly rejections: readonly Readonly<{ rowNumber: number; code: "EMPTY_CATALOGUE_PAYLOAD"; digest: string }>[];
}

const importerVersion = "bnf-temporal-catalogue-v1";

function parseOptions(values: readonly string[]): Options {
  let database = "";
  let rawDirectory = resolve("/tmp/novapharm-medicines-intelligence/raw");
  let evidence = resolve("docs/data/evidence/bnf-temporal-import.json");
  let ingestedAt = process.env.BNF_TEMPORAL_IMPORT_AT || new Date().toISOString();
  let maxBytes = 64 * 1024 * 1024;
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--database" && value) { database = resolve(value); index += 1; continue; }
    if (name === "--raw-directory" && value) { rawDirectory = resolve(value); index += 1; continue; }
    if (name === "--evidence" && value) { evidence = resolve(value); index += 1; continue; }
    if (name === "--ingested-at" && value) { ingestedAt = value; index += 1; continue; }
    if (name === "--max-bytes" && value) { maxBytes = Number(value); index += 1; continue; }
    throw new Error(`Unknown or incomplete BNF temporal argument: ${name}`);
  }
  if (!database) throw new Error("--database is required and must identify an isolated validation database.");
  if (!Number.isFinite(Date.parse(ingestedAt))) throw new Error("--ingested-at must be an ISO-8601 timestamp.");
  if (!Number.isInteger(maxBytes) || maxBytes < 16 * 1024 * 1024 || maxBytes > 256 * 1024 * 1024) throw new Error("--max-bytes is outside the approved BNF temporal bounds.");
  const repositoryRelative = relative(resolve("."), rawDirectory);
  if (repositoryRelative === "" || (repositoryRelative !== ".." && !repositoryRelative.startsWith(`..${sep}`))) throw new Error("Raw national source data must remain outside the Git working tree.");
  return Object.freeze({ database, rawDirectory, evidence, ingestedAt: new Date(ingestedAt).toISOString(), maxBytes });
}

function stableId(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function previousDay(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
}

function timeValues(monthKey: string): readonly [string, number, number, string, number, string, string] {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const financialStart = month >= 4 ? year : year - 1;
  const financialQuarter = Math.floor(((month + 8) % 12) / 3) + 1;
  return [monthKey, year, month, `${financialStart}/${String(financialStart + 1).slice(-2)}`, financialQuarter, `${monthKey}-01`, new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)];
}

async function latestResource(database: { one: (sql: string, parameters?: readonly unknown[]) => Promise<unknown> }, sourceId: string): Promise<ResourceRow> {
  const resource = await database.one(`SELECT sr.id, sr.source_id, sr.external_resource_id, sr.reporting_period, sr.resource_name, sr.resource_url,
      sr.format, sr.byte_size, sr.resource_hash, ds.discovery_endpoint
    FROM source_resources sr JOIN data_source_registry ds ON ds.source_id = sr.source_id
    WHERE sr.source_id = ? ORDER BY sr.reporting_period DESC, sr.last_seen_at DESC LIMIT 1`, [sourceId]) as ResourceRow | null;
  if (!resource) throw new Error(`Run governed source discovery before importing ${sourceId}.`);
  if (!/^[a-f0-9]{64}$/iu.test(resource.resource_hash || "")) throw new Error(`${sourceId} has no governed SHA-256 resource evidence.`);
  if (!Number.isFinite(Number(resource.byte_size)) || Number(resource.byte_size) <= 0) throw new Error(`${sourceId} has no governed resource size.`);
  return resource;
}

async function downloadAndParse<T>(
  resource: ResourceRow,
  contract: SchemaContract,
  parse: (headers: readonly string[], cells: readonly string[], rowNumber: number) => T,
  recordKey: (record: T) => string,
  options: Options,
): Promise<ParsedSource<T>> {
  const destination = resolve(options.rawDirectory, resource.source_id, resource.reporting_period, `${resource.external_resource_id}.csv`);
  const client = new CkanClient({ baseUrl: resource.discovery_endpoint, timeoutMs: 30_000, maxRetries: 3 });
  const download = await client.downloadResource({
    id: resource.external_resource_id, name: resource.resource_name, title: resource.resource_name,
    url: resource.resource_url, format: resource.format, size: resource.byte_size, sha256: resource.resource_hash,
  } satisfies CkanResource, { destination, maxBytes: options.maxBytes });
  await chmod(destination, 0o600);
  if (download.expectedHashMatched !== true || download.sha256 !== resource.resource_hash.toLowerCase()) throw new Error(`${resource.source_id} download did not match governed checksum evidence.`);
  let headers: readonly string[] | null = null;
  let schema: ReturnType<typeof validateSchema> | null = null;
  let sourceRows = 0;
  let duplicates = 0;
  const records = new Map<string, T>();
  const rejections: { rowNumber: number; code: "EMPTY_CATALOGUE_PAYLOAD"; digest: string }[] = [];
  for await (const cells of parseCsvRows(createReadStream(destination), { maximumColumns: 64, maximumFieldLength: 4_000 })) {
    if (cells.every((cell) => !cell.trim())) continue;
    if (!headers) {
      headers = Object.freeze(cells.map((cell) => cell.trim()));
      schema = validateSchema(contract, headers);
      if (schema.status === "schema_review_required") throw new Error(`${resource.source_id} schema is missing: ${schema.missingColumns.join(", ")}.`);
      continue;
    }
    sourceRows += 1;
    if (cells.slice(1).every((cell) => !cell.trim())) {
      rejections.push({ rowNumber: sourceRows + 1, code: "EMPTY_CATALOGUE_PAYLOAD", digest: createHash("sha256").update(cells.join("\u001f")).digest("hex") });
      continue;
    }
    const record = parse(headers, cells, sourceRows + 1);
    const key = recordKey(record);
    if (records.has(key)) duplicates += 1;
    else records.set(key, record);
  }
  if (!headers || !schema || !sourceRows || !records.size) throw new Error(`${resource.source_id} contained no usable temporal catalogue records.`);
  return Object.freeze({ resource, destination, downloadSha: download.sha256, downloadBytes: download.bytes, headers, schema, records: Object.freeze([...records.values()]), duplicates, sourceRows, rejections: Object.freeze(rejections) });
}

function aliases(record: BnfCurrentRecord): readonly (readonly [string, string])[] {
  return Object.freeze([
    ["BNF_PRESENTATION_NAME", record.presentation], ["BNF_PRESENTATION_CODE", record.presentationCode],
    ["BNF_PRODUCT", record.product], ["BNF_PRODUCT_CODE", record.productCode],
    ["BNF_CHEMICAL_SUBSTANCE", record.chemicalSubstance], ["BNF_CHEMICAL_SUBSTANCE_CODE", record.chemicalSubstanceCode],
  ]);
}

const options = parseOptions(process.argv.slice(2));
const { SqliteProvider } = await import("../../src/data/providers/sqlite.mjs");
const database = new SqliteProvider({ DATABASE_PATH: options.database });
await database.initialize();
try {
  const historicResource = await latestResource(database, "nhsbsa.bnf-historic");
  const changesResource = await latestResource(database, "nhsbsa.bnf-changes");
  const historic = await downloadAndParse(historicResource, schemaContracts.bnfHistoric, parseBnfCurrentRecord, (record) => (record as BnfCurrentRecord).presentationCode, options);
  const changes = await downloadAndParse(changesResource, schemaContracts.bnfChanges, parseBnfChangeRecord, (record) => {
    const change = record as BnfChangeRecord;
    return `${change.yearMonth}|${change.presentationCode}|${change.changeType}`;
  }, options);
  const historicRecords = historic.records as readonly BnfCurrentRecord[];
  const changeRecords = changes.records as readonly BnfChangeRecord[];
  const historicMonth = historicRecords[0]?.yearMonth;
  if (!historicMonth || !historicRecords.every((record) => record.yearMonth === historicMonth)) throw new Error("Historic BNF catalogue does not contain one controlled source month.");
  if (!historicMonth.startsWith(historic.resource.reporting_period)) throw new Error("Historic BNF source month does not reconcile with the discovered resource period.");
  const changeMonths = [...new Set(changeRecords.map((record) => record.yearMonth))].toSorted();
  if (!changeMonths.length || changeMonths.at(-1) !== changes.resource.reporting_period) throw new Error("BNF monthly-change cutoff does not reconcile with its discovered resource period.");

  const currentCodeRows = await database.all(`SELECT alias_text FROM medicine_aliases WHERE source_id = 'nhsbsa.bnf-current' AND alias_type = 'BNF_PRESENTATION_CODE'`) as readonly { readonly alias_text: string }[];
  const currentCodes = new Set(currentCodeRows.map((row) => row.alias_text));
  const sourceRunIds = Object.freeze({
    historic: `bnf-temporal-${stableId(importerVersion, historic.resource.external_resource_id, historic.downloadSha)}`,
    changes: `bnf-temporal-${stableId(importerVersion, changes.resource.external_resource_id, changes.downloadSha)}`,
  });

  await database.transaction(async (transaction: typeof database) => {
    const raw = transaction.raw;
    const upsertTime = raw.prepare(`INSERT INTO dim_time(month_key, calendar_year, calendar_month, financial_year, financial_quarter, month_start, month_end, is_complete)
      VALUES(?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT(month_key) DO UPDATE SET is_complete = 1`);
    const upsertMedicine = raw.prepare(`INSERT INTO dim_medicine(medicine_id, canonical_name, medicine_level, snomed_code, dm_d_status, supplier_name, formulation, route, strength, unit_of_measure, valid_from, valid_to, source_id, source_last_seen_at)
      VALUES(?, ?, 'BNF_PRESENTATION', NULL, 'unverified', NULL, NULL, NULL, NULL, NULL, ?, ?, ?, ?)
      ON CONFLICT(medicine_id) DO UPDATE SET valid_from = CASE WHEN dim_medicine.valid_from IS NULL OR excluded.valid_from < dim_medicine.valid_from THEN excluded.valid_from ELSE dim_medicine.valid_from END,
      valid_to = CASE WHEN dim_medicine.valid_to IS NULL THEN excluded.valid_to ELSE dim_medicine.valid_to END,
      source_last_seen_at = CASE WHEN dim_medicine.source_last_seen_at IS NULL OR excluded.source_last_seen_at > dim_medicine.source_last_seen_at THEN excluded.source_last_seen_at ELSE dim_medicine.source_last_seen_at END`);
    const upsertAlias = raw.prepare(`INSERT INTO medicine_aliases(id, medicine_id, alias_text, alias_type, normalised_alias, source_id, valid_from, valid_to)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(medicine_id, alias_type, normalised_alias, valid_from)
      DO UPDATE SET alias_text = excluded.alias_text, source_id = excluded.source_id, valid_to = excluded.valid_to`);
    const upsertCode = raw.prepare(`INSERT INTO medicine_code_history(id, medicine_id, code_system, code_value, code_level, valid_from, valid_to, change_reason, source_id)
      VALUES(?, ?, 'BNF', ?, 'BNF_PRESENTATION', ?, ?, ?, ?) ON CONFLICT(code_system, code_value, valid_from)
      DO UPDATE SET medicine_id = excluded.medicine_id, valid_to = excluded.valid_to, change_reason = excluded.change_reason, source_id = excluded.source_id`);
    const upsertBnf = raw.prepare(`INSERT INTO dim_bnf(bnf_id, bnf_code, bnf_name, bnf_level, parent_bnf_id, valid_from, valid_to, source_id)
      VALUES(?, ?, ?, ?, ?, ?, NULL, ?) ON CONFLICT(bnf_code, valid_from) DO UPDATE SET bnf_name = excluded.bnf_name, bnf_level = excluded.bnf_level,
      parent_bnf_id = excluded.parent_bnf_id, source_id = excluded.source_id`);
    const upsertHierarchy = raw.prepare(`INSERT INTO bnf_hierarchy_history(id, child_bnf_id, parent_bnf_id, valid_from, valid_to, source_id)
      VALUES(?, ?, ?, ?, NULL, ?) ON CONFLICT(child_bnf_id, valid_from) DO UPDATE SET parent_bnf_id = excluded.parent_bnf_id, source_id = excluded.source_id`);

    for (const month of [historicMonth, ...changeMonths]) upsertTime.run(...timeValues(month));

    const hierarchyByMonth = new Map<string, Map<string, BnfHierarchyNode>>();
    const addHierarchy = (record: BnfCurrentRecord): void => {
      const nodes = hierarchyByMonth.get(record.yearMonth) ?? new Map<string, BnfHierarchyNode>();
      hierarchyByMonth.set(record.yearMonth, nodes);
      for (const node of bnfHierarchy(record)) {
        const existing = nodes.get(node.code);
        if (existing && (existing.name !== node.name || existing.parentCode !== node.parentCode || existing.level !== node.level)) throw new Error(`BNF temporal code ${node.code} conflicts in ${record.yearMonth}.`);
        nodes.set(node.code, node);
      }
    };
    for (const record of historicRecords) addHierarchy(record);
    for (const record of changeRecords.filter((record) => record.changeType !== "REMOVE")) addHierarchy(record);
    for (const [month, nodes] of hierarchyByMonth) {
      const validFrom = `${month}-01`;
      for (const node of [...nodes.values()].toSorted((left, right) => left.level - right.level || left.code.localeCompare(right.code))) {
        const bnfId = `bnf-${stableId(node.code, validFrom)}`;
        const parentId = node.parentCode ? `bnf-${stableId(node.parentCode, validFrom)}` : null;
        const sourceId = month === historicMonth ? "nhsbsa.bnf-historic" : "nhsbsa.bnf-changes";
        upsertBnf.run(bnfId, node.code, node.name, node.level, parentId, validFrom, sourceId);
        upsertHierarchy.run(`bnf-history-${stableId(node.code, validFrom)}`, bnfId, parentId, validFrom, sourceId);
      }
    }

    const persistIdentity = (record: BnfCurrentRecord, sourceId: string, reason: string, validTo: string | null): void => {
      const validFrom = `${record.yearMonth}-01`;
      const medicineId = `medicine-${stableId("BNF_PRESENTATION", record.presentationCode)}`;
      upsertMedicine.run(medicineId, record.presentation, validFrom, validTo, sourceId, options.ingestedAt);
      for (const [type, value] of aliases(record)) {
        const normalised = normaliseMedicineSearchText(value);
        upsertAlias.run(`medicine-alias-${stableId(medicineId, type, normalised, validFrom)}`, medicineId, value, type, normalised, sourceId, validFrom, validTo);
      }
      upsertCode.run(`medicine-code-${stableId(record.presentationCode, validFrom)}`, medicineId, record.presentationCode, validFrom, validTo, reason, sourceId);
    };
    for (const record of historicRecords) persistIdentity(record, "nhsbsa.bnf-historic", "historic-catalogue-observation", null);
    for (const record of changeRecords) {
      const removed = record.changeType === "REMOVE";
      const validTo = removed ? `${record.yearMonth}-01` : null;
      persistIdentity(record, "nhsbsa.bnf-changes", `monthly-change-${record.changeType.toLowerCase()}`, validTo);
      if (removed && !currentCodes.has(record.presentationCode)) {
        const medicineId = `medicine-${stableId("BNF_PRESENTATION", record.presentationCode)}`;
        await transaction.run("UPDATE dim_medicine SET valid_to = ? WHERE medicine_id = ?", [previousDay(record.yearMonth), medicineId]);
        await transaction.run("UPDATE medicine_aliases SET valid_to = ? WHERE medicine_id = ? AND valid_from < ? AND valid_to IS NULL", [previousDay(record.yearMonth), medicineId, `${record.yearMonth}-01`]);
        await transaction.run("UPDATE medicine_code_history SET valid_to = ? WHERE medicine_id = ? AND valid_from < ? AND valid_to IS NULL", [previousDay(record.yearMonth), medicineId, `${record.yearMonth}-01`]);
      }
    }

    for (const parsed of [historic, changes]) {
      const runId = parsed.resource.source_id === "nhsbsa.bnf-historic" ? sourceRunIds.historic : sourceRunIds.changes;
      const applicableMonths = parsed.resource.source_id === "nhsbsa.bnf-historic" ? [historicMonth] : changeMonths;
      const result = { sourceRows: parsed.sourceRows, acceptedRows: parsed.records.length, rejectedRows: parsed.rejections.length, duplicateRows: parsed.duplicates, applicableMonths, schemaStatus: parsed.schema.status, schemaFingerprint: parsed.schema.fingerprint, rejectionCodes: Object.fromEntries(parsed.rejections.map((entry) => entry.code).filter((value, index, values) => values.indexOf(value) === index).map((code) => [code, parsed.rejections.filter((entry) => entry.code === code).length])) };
      await transaction.upsert("ingestion_runs", {
        id: runId, source_id: parsed.resource.source_id, source_resource_id: parsed.resource.id, run_kind: "bnf_temporal_catalogue",
        status: "succeeded", started_at: options.ingestedAt, completed_at: options.ingestedAt,
        source_cutoff_at: `${applicableMonths.at(-1)}-01`, input_rows: result.sourceRows, accepted_rows: result.acceptedRows,
        rejected_rows: result.rejectedRows, duplicate_rows: result.duplicateRows, checkpoint_json: null, result_json: JSON.stringify(result),
        exact_source_sha: parsed.downloadSha, initiated_by: importerVersion,
      }, ["id"], ["status", "completed_at", "input_rows", "accepted_rows", "rejected_rows", "duplicate_rows", "result_json", "exact_source_sha", "initiated_by"]);
      await transaction.run("DELETE FROM ingestion_errors WHERE ingestion_run_id = ?", [runId]);
      for (const rejection of parsed.rejections) {
        await transaction.upsert("ingestion_errors", {
          id: `ingestion-error-${stableId(runId, String(rejection.rowNumber), rejection.code, rejection.digest)}`,
          ingestion_run_id: runId, source_row_reference: String(rejection.rowNumber), error_code: rejection.code,
          safe_message: "The official source row contained a reporting month but no catalogue identity payload and was retained as a controlled reject.",
          field_name: null, source_value_digest: rejection.digest, occurred_at: options.ingestedAt,
        }, ["id"]);
      }
      await transaction.upsert("source_schema_versions", {
        id: stableId(parsed.resource.source_id, parsed.schema.fingerprint), source_id: parsed.resource.source_id,
        variant_name: parsed.resource.source_id === "nhsbsa.bnf-historic" ? schemaContracts.bnfHistoric.variant : schemaContracts.bnfChanges.variant,
        schema_fingerprint: parsed.schema.fingerprint, columns_json: JSON.stringify(parsed.schema.observedColumns), compatibility_status: parsed.schema.status,
        effective_from: applicableMonths[0], effective_to: null, first_seen_at: options.ingestedAt, reviewed_at: options.ingestedAt, reviewed_by: importerVersion,
      }, ["source_id", "schema_fingerprint"], ["variant_name", "columns_json", "compatibility_status", "effective_from", "reviewed_at", "reviewed_by"]);
      await transaction.upsert("analytical_dataset_manifests", {
        id: `dataset-${stableId(parsed.resource.source_id, parsed.resource.reporting_period, parsed.downloadSha)}`,
        dataset_name: parsed.resource.source_id === "nhsbsa.bnf-historic" ? "bnf_historic_catalogue" : "bnf_monthly_changes",
        storage_zone: "raw_immutable", source_id: parsed.resource.source_id, reporting_period: parsed.resource.reporting_period,
        partition_key: `source=${parsed.resource.source_id}/period=${parsed.resource.reporting_period}`,
        storage_uri: `local-validation://raw/${parsed.resource.source_id}/${parsed.resource.reporting_period}/${basename(parsed.destination)}`,
        format: "csv", content_sha256: parsed.downloadSha, row_count: result.sourceRows, byte_size: parsed.downloadBytes,
        schema_fingerprint: parsed.schema.fingerprint, ingestion_run_id: runId, immutability_status: "immutable", created_at: options.ingestedAt,
      }, ["dataset_name", "storage_zone", "partition_key", "content_sha256"], ["source_id", "reporting_period", "storage_uri", "row_count", "byte_size", "schema_fingerprint", "ingestion_run_id", "immutability_status"]);
      await transaction.run("UPDATE data_source_registry SET last_successfully_ingested_at = ?, updated_at = ? WHERE source_id = ?", [options.ingestedAt, options.ingestedAt, parsed.resource.source_id]);
    }
  });

  const counts = await database.one(`SELECT
    (SELECT COUNT(*) FROM dim_medicine) AS medicines,
    (SELECT COUNT(*) FROM medicine_code_history WHERE source_id IN ('nhsbsa.bnf-historic','nhsbsa.bnf-changes')) AS temporal_code_observations,
    (SELECT COUNT(*) FROM medicine_aliases WHERE source_id IN ('nhsbsa.bnf-historic','nhsbsa.bnf-changes')) AS temporal_aliases,
    (SELECT COUNT(*) FROM dim_bnf WHERE source_id IN ('nhsbsa.bnf-historic','nhsbsa.bnf-changes')) AS temporal_bnf_nodes,
    (SELECT COUNT(*) FROM dim_medicine WHERE valid_to IS NOT NULL) AS ended_medicines`);
  const changeTypeCounts = Object.fromEntries(["ADD", "CHANGE", "REMOVE"].map((type) => [type.toLowerCase(), changeRecords.filter((record) => record.changeType === type).length]));
  const evidence = Object.freeze({
    evidenceType: "governed-bnf-temporal-catalogue-ingestion", ingestedAt: options.ingestedAt, importerVersion,
    productionIngestionClaim: false, databaseType: "isolated-local-sqlite-validation",
    historic: { sourceId: historic.resource.source_id, resourceId: historic.resource.external_resource_id, reportingPeriod: historic.resource.reporting_period,
      applicableMonth: historicMonth, resourceUrl: historic.resource.resource_url, contentSha256: historic.downloadSha, bytes: historic.downloadBytes,
      checksumMatched: true, sourceRows: historic.sourceRows, acceptedRows: historic.records.length, rejectedRows: historic.rejections.length, duplicateRows: historic.duplicates,
      schemaStatus: historic.schema.status, schemaFingerprint: historic.schema.fingerprint },
    monthlyChanges: { sourceId: changes.resource.source_id, resourceId: changes.resource.external_resource_id, reportingPeriod: changes.resource.reporting_period,
      applicableMonths: changeMonths, resourceUrl: changes.resource.resource_url, contentSha256: changes.downloadSha, bytes: changes.downloadBytes,
      checksumMatched: true, sourceRows: changes.sourceRows, acceptedRows: changes.records.length, rejectedRows: changes.rejections.length, duplicateRows: changes.duplicates,
      changeTypes: changeTypeCounts, schemaStatus: changes.schema.status, schemaFingerprint: changes.schema.fingerprint },
    temporalIdentity: counts,
    boundaries: [
      "Historic and monthly-change observations are versioned separately from the July 2026 current catalogue.",
      "Display names remain aliases with source-effective dates; they are never used as primary keys.",
      "Removal events close earlier identity observations only when the code is absent from the current catalogue.",
      "BNF history does not provide SNOMED or dm+d identity and does not create prescribing, dispensing, sales or forecast facts.",
    ],
    rawStorage: { committedToGit: false, localValidationOnly: true, immutableChecksumsVerified: true },
  });
  await mkdir(dirname(options.evidence), { recursive: true });
  await writeFile(options.evidence, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ evidence: options.evidence, historicRows: historic.records.length, changeRows: changes.records.length, changeTypeCounts, temporalIdentity: counts }));
} finally {
  await database.close();
}
