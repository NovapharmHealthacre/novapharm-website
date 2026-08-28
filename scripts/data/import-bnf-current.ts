import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import {
  CkanClient,
  bnfHierarchy,
  normaliseMedicineSearchText,
  parseBnfCurrentRecord,
  parseCsvRows,
  schemaContracts,
  validateSchema,
  type BnfCurrentRecord,
  type BnfHierarchyNode,
  type CkanResource,
} from "../../packages/medicines-intelligence/src/index.ts";

interface Options {
  readonly database: string;
  readonly rawDirectory: string;
  readonly evidence: string;
  readonly ingestedAt: string;
  readonly maxBytes: number;
}

interface SourceResourceRow {
  readonly id: string;
  readonly external_resource_id: string;
  readonly reporting_period: string;
  readonly resource_name: string;
  readonly resource_url: string;
  readonly format: string;
  readonly byte_size: number;
  readonly resource_hash: string;
  readonly schema_fingerprint: string | null;
  readonly discovery_endpoint: string;
}

interface CatalogueMedicine {
  readonly medicineId: string;
  readonly presentationCode: string;
  readonly presentation: string;
  readonly productCode: string;
  readonly product: string;
  readonly chemicalCode: string;
  readonly chemical: string;
}

const sourceId = "nhsbsa.bnf-current";
const importerVersion = "bnf-current-catalogue-v1";

function parseOptions(values: readonly string[]): Options {
  let database = "";
  let rawDirectory = resolve("/tmp/novapharm-medicines-intelligence/raw");
  let evidence = resolve("docs/data/evidence/bnf-current-import.json");
  let ingestedAt = process.env.BNF_IMPORT_AT || new Date().toISOString();
  let maxBytes = 32 * 1024 * 1024;
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--database" && value) { database = resolve(value); index += 1; continue; }
    if (name === "--raw-directory" && value) { rawDirectory = resolve(value); index += 1; continue; }
    if (name === "--evidence" && value) { evidence = resolve(value); index += 1; continue; }
    if (name === "--ingested-at" && value) { ingestedAt = value; index += 1; continue; }
    if (name === "--max-bytes" && value) { maxBytes = Number(value); index += 1; continue; }
    throw new Error(`Unknown or incomplete BNF import argument: ${name}`);
  }
  if (!database) throw new Error("--database is required and must identify an isolated validation database.");
  if (!Number.isFinite(Date.parse(ingestedAt))) throw new Error("--ingested-at must be an ISO-8601 timestamp.");
  if (!Number.isInteger(maxBytes) || maxBytes < 1_000_000 || maxBytes > 128 * 1024 * 1024) throw new Error("--max-bytes is outside the approved BNF catalogue bounds.");
  const repositoryRelative = relative(resolve("."), rawDirectory);
  if (repositoryRelative === "" || (repositoryRelative !== ".." && !repositoryRelative.startsWith(`..${sep}`))) throw new Error("Raw national source data must be stored outside the Git working tree.");
  return Object.freeze({ database, rawDirectory, evidence, ingestedAt: new Date(ingestedAt).toISOString(), maxBytes });
}

function stableId(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message.replace(/(?:https?:\/\/)?[^\s/]+(?:\/[^\s]*)?/gu, (value) => value.startsWith("http") ? "[upstream URL]" : value).slice(0, 500) : "Unknown BNF ingestion error.";
}

function financialPeriod(yearMonth: string): Readonly<{ year: number; month: number; financialYear: string; financialQuarter: number; monthStart: string; monthEnd: string }> {
  const [yearText, monthText] = yearMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const financialStart = month >= 4 ? year : year - 1;
  const financialQuarter = Math.floor(((month + 8) % 12) / 3) + 1;
  const monthStart = `${yearMonth}-01`;
  const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return Object.freeze({ year, month, financialYear: `${financialStart}/${String(financialStart + 1).slice(-2)}`, financialQuarter, monthStart, monthEnd });
}

function sameMedicine(left: CatalogueMedicine, right: CatalogueMedicine): boolean {
  return left.presentation === right.presentation && left.productCode === right.productCode && left.product === right.product && left.chemicalCode === right.chemicalCode && left.chemical === right.chemical;
}

const options = parseOptions(process.argv.slice(2));
const { SqliteProvider } = await import("../../src/data/providers/sqlite.mjs");
const database = new SqliteProvider({ DATABASE_PATH: options.database });
await database.initialize();
let runId: string | null = null;
try {
  const resource = await database.one(`SELECT sr.id, sr.external_resource_id, sr.reporting_period, sr.resource_name, sr.resource_url,
      sr.format, sr.byte_size, sr.resource_hash, sr.schema_fingerprint, ds.discovery_endpoint
    FROM source_resources sr JOIN data_source_registry ds ON ds.source_id = sr.source_id
    WHERE sr.source_id = ? ORDER BY sr.reporting_period DESC, sr.last_seen_at DESC LIMIT 1`, [sourceId]) as SourceResourceRow | null;
  if (!resource) throw new Error("Run governed source discovery before importing the current BNF catalogue.");
  if (!/^[a-f0-9]{64}$/iu.test(resource.resource_hash || "")) throw new Error("The discovered BNF resource does not provide the required SHA-256 evidence.");
  if (!/^\d{4}-\d{2}$/u.test(resource.reporting_period)) throw new Error("The discovered BNF resource has no valid reporting month.");
  runId = `bnf-current-${stableId(importerVersion, resource.external_resource_id, resource.resource_hash)}`;

  const completed = await database.one("SELECT status, exact_source_sha, result_json FROM ingestion_runs WHERE id = ?", [runId]) as { status: string; exact_source_sha: string | null; result_json: string | null } | null;
  if (completed?.status === "succeeded" && completed.exact_source_sha === resource.resource_hash && completed.result_json) {
    await database.run("DELETE FROM ingestion_errors WHERE ingestion_run_id = ?", [runId]);
    const prior = JSON.parse(completed.result_json) as Readonly<Record<string, unknown>>;
    console.log(JSON.stringify({ runId, idempotentReplay: true, ...prior }));
    process.exitCode = 0;
  } else {
    await database.run("DELETE FROM ingestion_errors WHERE ingestion_run_id = ?", [runId]);
    await database.upsert("ingestion_runs", {
      id: runId, source_id: sourceId, source_resource_id: resource.id, run_kind: "bnf_current_catalogue",
      status: "running", started_at: options.ingestedAt, completed_at: null, source_cutoff_at: `${resource.reporting_period}-01`,
      input_rows: null, accepted_rows: null, rejected_rows: null, duplicate_rows: null,
      checkpoint_json: null, result_json: null, exact_source_sha: resource.resource_hash, initiated_by: importerVersion,
    }, ["id"], ["source_resource_id", "status", "started_at", "completed_at", "source_cutoff_at", "input_rows", "accepted_rows", "rejected_rows", "duplicate_rows", "checkpoint_json", "result_json", "exact_source_sha", "initiated_by"]);

    try {
      const safeName = `${resource.external_resource_id}.csv`;
      const destination = resolve(options.rawDirectory, sourceId, resource.reporting_period, safeName);
      const client = new CkanClient({ baseUrl: resource.discovery_endpoint, timeoutMs: 30_000, maxRetries: 3 });
      const download = await client.downloadResource({
        id: resource.external_resource_id, name: resource.resource_name, title: resource.resource_name,
        url: resource.resource_url, format: resource.format, size: resource.byte_size, sha256: resource.resource_hash,
      } satisfies CkanResource, { destination, maxBytes: options.maxBytes });
      await chmod(destination, 0o600);
      if (download.expectedHashMatched !== true || download.sha256 !== resource.resource_hash.toLowerCase()) throw new Error("The BNF download did not match the governed source checksum.");

      let headers: readonly string[] | null = null;
      let schema = null as ReturnType<typeof validateSchema> | null;
      let sourceRows = 0;
      let duplicateRows = 0;
      let reportingPeriod: string | null = null;
      const hierarchy = new Map<string, BnfHierarchyNode>();
      const medicines = new Map<string, CatalogueMedicine>();

      for await (const cells of parseCsvRows(createReadStream(destination), { maximumColumns: 64, maximumFieldLength: 4_000 })) {
        if (cells.every((cell) => !cell.trim())) continue;
        if (!headers) {
          headers = Object.freeze(cells.map((cell) => cell.trim()));
          schema = validateSchema(schemaContracts.bnfCurrent, headers);
          if (schema.status === "schema_review_required") throw new Error(`The BNF CSV schema is missing required columns: ${schema.missingColumns.join(", ")}.`);
          if (resource.schema_fingerprint && schema.fingerprint !== resource.schema_fingerprint) throw new Error("The BNF CSV header differs from the schema fingerprint discovered through CKAN metadata.");
          continue;
        }
        sourceRows += 1;
        const record: BnfCurrentRecord = parseBnfCurrentRecord(headers, cells, sourceRows + 1);
        reportingPeriod ??= record.yearMonth;
        if (record.yearMonth !== reportingPeriod || record.yearMonth !== resource.reporting_period) throw new Error(`BNF row ${sourceRows + 1} does not match the governed resource period.`);
        for (const node of bnfHierarchy(record)) {
          const current = hierarchy.get(node.code);
          if (current && (current.name !== node.name || current.parentCode !== node.parentCode || current.level !== node.level)) throw new Error(`BNF code ${node.code} has conflicting hierarchy definitions.`);
          hierarchy.set(node.code, node);
        }
        const medicineId = `medicine-${stableId("BNF_PRESENTATION", record.presentationCode)}`;
        const medicine = Object.freeze({
          medicineId, presentationCode: record.presentationCode, presentation: record.presentation,
          productCode: record.productCode, product: record.product,
          chemicalCode: record.chemicalSubstanceCode, chemical: record.chemicalSubstance,
        });
        const current = medicines.get(record.presentationCode);
        if (current) {
          if (!sameMedicine(current, medicine)) throw new Error(`BNF presentation ${record.presentationCode} has conflicting identity definitions.`);
          duplicateRows += 1;
        } else medicines.set(record.presentationCode, medicine);
      }
      if (!headers || !schema || !reportingPeriod || !sourceRows || !medicines.size) throw new Error("The BNF source file contained no usable catalogue records.");

      const validFrom = `${reportingPeriod}-01`;
      const time = financialPeriod(reportingPeriod);
      const aliasesPerMedicine = 6;
      await database.transaction(async (transaction: typeof database) => {
        const raw = transaction.raw;
        const upsertTime = raw.prepare(`INSERT INTO dim_time(month_key, calendar_year, calendar_month, financial_year, financial_quarter, month_start, month_end, is_complete)
          VALUES(?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT(month_key) DO UPDATE SET calendar_year = excluded.calendar_year, calendar_month = excluded.calendar_month,
          financial_year = excluded.financial_year, financial_quarter = excluded.financial_quarter, month_start = excluded.month_start, month_end = excluded.month_end, is_complete = 1`);
        const upsertBnf = raw.prepare(`INSERT INTO dim_bnf(bnf_id, bnf_code, bnf_name, bnf_level, parent_bnf_id, valid_from, valid_to, source_id)
          VALUES(?, ?, ?, ?, ?, ?, NULL, ?) ON CONFLICT(bnf_code, valid_from) DO UPDATE SET bnf_name = excluded.bnf_name, bnf_level = excluded.bnf_level,
          parent_bnf_id = excluded.parent_bnf_id, valid_to = NULL, source_id = excluded.source_id`);
        const upsertHierarchy = raw.prepare(`INSERT INTO bnf_hierarchy_history(id, child_bnf_id, parent_bnf_id, valid_from, valid_to, source_id)
          VALUES(?, ?, ?, ?, NULL, ?) ON CONFLICT(child_bnf_id, valid_from) DO UPDATE SET parent_bnf_id = excluded.parent_bnf_id, valid_to = NULL, source_id = excluded.source_id`);
        const upsertMedicine = raw.prepare(`INSERT INTO dim_medicine(medicine_id, canonical_name, medicine_level, snomed_code, dm_d_status, supplier_name, formulation, route, strength, unit_of_measure, valid_from, valid_to, source_id, source_last_seen_at)
          VALUES(?, ?, 'BNF_PRESENTATION', NULL, 'unverified', NULL, NULL, NULL, NULL, NULL, ?, NULL, ?, ?)
          ON CONFLICT(medicine_id) DO UPDATE SET canonical_name = excluded.canonical_name, valid_to = NULL, source_id = excluded.source_id, source_last_seen_at = excluded.source_last_seen_at`);
        const upsertAlias = raw.prepare(`INSERT INTO medicine_aliases(id, medicine_id, alias_text, alias_type, normalised_alias, source_id, valid_from, valid_to)
          VALUES(?, ?, ?, ?, ?, ?, ?, NULL) ON CONFLICT(medicine_id, alias_type, normalised_alias, valid_from)
          DO UPDATE SET alias_text = excluded.alias_text, source_id = excluded.source_id, valid_to = NULL`);
        const upsertCode = raw.prepare(`INSERT INTO medicine_code_history(id, medicine_id, code_system, code_value, code_level, valid_from, valid_to, change_reason, source_id)
          VALUES(?, ?, 'BNF', ?, 'BNF_PRESENTATION', ?, NULL, 'current-year-catalogue-observation', ?)
          ON CONFLICT(code_system, code_value, valid_from) DO UPDATE SET medicine_id = excluded.medicine_id, code_level = excluded.code_level, valid_to = NULL, change_reason = excluded.change_reason, source_id = excluded.source_id`);

        upsertTime.run(reportingPeriod, time.year, time.month, time.financialYear, time.financialQuarter, time.monthStart, time.monthEnd);
        for (const node of [...hierarchy.values()].toSorted((left, right) => left.level - right.level || left.code.localeCompare(right.code))) {
          const bnfId = `bnf-${stableId(node.code, validFrom)}`;
          const parentId = node.parentCode ? `bnf-${stableId(node.parentCode, validFrom)}` : null;
          upsertBnf.run(bnfId, node.code, node.name, node.level, parentId, validFrom, sourceId);
          upsertHierarchy.run(`bnf-history-${stableId(node.code, validFrom)}`, bnfId, parentId, validFrom, sourceId);
        }
        for (const medicine of medicines.values()) {
          upsertMedicine.run(medicine.medicineId, medicine.presentation, validFrom, sourceId, options.ingestedAt);
          const aliases = [
            ["BNF_PRESENTATION_NAME", medicine.presentation], ["BNF_PRESENTATION_CODE", medicine.presentationCode],
            ["BNF_PRODUCT", medicine.product], ["BNF_PRODUCT_CODE", medicine.productCode],
            ["BNF_CHEMICAL_SUBSTANCE", medicine.chemical], ["BNF_CHEMICAL_SUBSTANCE_CODE", medicine.chemicalCode],
          ] as const;
          for (const [type, value] of aliases) {
            const normalised = normaliseMedicineSearchText(value);
            upsertAlias.run(`medicine-alias-${stableId(medicine.medicineId, type, normalised, validFrom)}`, medicine.medicineId, value, type, normalised, sourceId, validFrom);
          }
          upsertCode.run(`medicine-code-${stableId(medicine.presentationCode, validFrom)}`, medicine.medicineId, medicine.presentationCode, validFrom, sourceId);
        }

        await transaction.upsert("source_schema_versions", {
          id: stableId(sourceId, schema.fingerprint), source_id: sourceId, variant_name: schemaContracts.bnfCurrent.variant,
          schema_fingerprint: schema.fingerprint, columns_json: JSON.stringify(schema.observedColumns), compatibility_status: schema.status,
          effective_from: reportingPeriod, effective_to: null, first_seen_at: options.ingestedAt,
          reviewed_at: options.ingestedAt, reviewed_by: importerVersion,
        }, ["source_id", "schema_fingerprint"], ["variant_name", "columns_json", "compatibility_status", "effective_from", "reviewed_at", "reviewed_by"]);
        await transaction.upsert("analytical_dataset_manifests", {
          id: `dataset-${stableId(sourceId, reportingPeriod, download.sha256)}`, dataset_name: "bnf_current_catalogue",
          storage_zone: "raw_immutable", source_id: sourceId, reporting_period: reportingPeriod,
          partition_key: `source=${sourceId}/year=${time.year}/month=${String(time.month).padStart(2, "0")}`,
          storage_uri: `local-validation://raw/${sourceId}/${reportingPeriod}/${basename(destination)}`,
          format: "csv", content_sha256: download.sha256, row_count: sourceRows, byte_size: download.bytes,
          schema_fingerprint: schema.fingerprint, ingestion_run_id: runId, immutability_status: "immutable", created_at: options.ingestedAt,
        }, ["dataset_name", "storage_zone", "partition_key", "content_sha256"], ["source_id", "reporting_period", "storage_uri", "row_count", "byte_size", "schema_fingerprint", "ingestion_run_id", "immutability_status"]);
        const result = {
          sourceRows, acceptedRows: sourceRows, duplicateRows, medicines: medicines.size,
          bnfHierarchyNodes: hierarchy.size, aliases: medicines.size * aliasesPerMedicine,
          reportingPeriod, schemaStatus: schema.status, schemaFingerprint: schema.fingerprint,
        };
        await transaction.run(`UPDATE ingestion_runs SET status = 'succeeded', completed_at = ?, input_rows = ?, accepted_rows = ?, rejected_rows = 0,
          duplicate_rows = ?, checkpoint_json = NULL, result_json = ?, exact_source_sha = ? WHERE id = ?`, [
          options.ingestedAt, sourceRows, sourceRows, duplicateRows, JSON.stringify(result), download.sha256, runId,
        ]);
        await transaction.run("UPDATE data_source_registry SET last_successfully_ingested_at = ?, updated_at = ? WHERE source_id = ?", [options.ingestedAt, options.ingestedAt, sourceId]);
      });

      const evidence = Object.freeze({
        evidenceType: "governed-bnf-current-catalogue-ingestion", ingestedAt: options.ingestedAt,
        productionIngestionClaim: false, databaseType: "isolated-local-sqlite-validation", importerVersion,
        source: { sourceId, publisher: "NHS Business Services Authority", resourceId: resource.external_resource_id,
          reportingPeriod, resourceName: resource.resource_name, resourceUrl: resource.resource_url,
          contentSha256: download.sha256, bytes: download.bytes, checksumMatched: download.expectedHashMatched },
        schema: { status: schema.status, variant: schema.variant, fingerprint: schema.fingerprint, columns: schema.observedColumns },
        rows: { source: sourceRows, accepted: sourceRows, rejected: 0, exactDuplicates: duplicateRows },
        catalogue: { medicines: medicines.size, hierarchyNodes: hierarchy.size, aliases: medicines.size * aliasesPerMedicine, codeHistoryRows: medicines.size },
        rawStorage: { committedToGit: false, zone: "raw_immutable", partitioned: true, localValidationOnly: true },
        identityBoundaries: [
          "BNF presentation code is the current catalogue identity; display names are never database keys.",
          "This source does not contain SNOMED or dm+d identity, so those fields remain unverified rather than inferred.",
          "The current-year catalogue does not rewrite historical BNF facts; historic and monthly-change adapters remain separate.",
          "No medicine volume, cost, sales, stock, demand or forecast value is produced by this catalogue import.",
        ],
      });
      await mkdir(dirname(options.evidence), { recursive: true });
      await writeFile(options.evidence, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
      console.log(JSON.stringify({ runId, evidence: options.evidence, sourceRows, medicines: medicines.size, bnfHierarchyNodes: hierarchy.size, aliases: medicines.size * aliasesPerMedicine }));
    } catch (error) {
      const message = safeError(error);
      await database.run(`UPDATE ingestion_runs SET status = 'failed', completed_at = ?, result_json = ? WHERE id = ?`, [options.ingestedAt, JSON.stringify({ safeError: message }), runId]);
      await database.insertIgnore("ingestion_errors", {
        id: `ingestion-error-${stableId(runId, message)}`, ingestion_run_id: runId, source_row_reference: null,
        error_code: "BNF_CURRENT_IMPORT_FAILED", safe_message: message, field_name: null,
        source_value_digest: null, occurred_at: options.ingestedAt,
      }, ["id"]);
      throw error;
    }
  }
} finally {
  await database.close();
}
