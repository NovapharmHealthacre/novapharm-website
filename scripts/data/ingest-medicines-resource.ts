import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import {
  parseCsvRows,
  parseEpdRecord,
  parsePcaRecord,
  pathIsInside,
  postcodeParts,
  privateCloudLayout,
  schemaContracts,
  validateSchema,
  type EpdRecord,
  type PcaRecord,
} from "../../packages/medicines-intelligence/src/index.ts";

interface DownloadManifest {
  readonly sourceId: "nhsbsa.epd" | "nhsbsa.pca";
  readonly reportingPeriod: string;
  readonly resourceId: string;
  readonly sourceUrl: string;
  readonly destination: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly immutable: true;
}

interface Options {
  readonly manifest: string;
  readonly evidence: string | null;
  readonly batchSize: number;
  readonly maximumRejectedRows: number;
}

const sqliteBulkSettings = Object.freeze({
  cacheKiB: 131_072,
  memoryMapBytes: 268_435_456,
  walAutocheckpointPages: 16_384,
});

class ExistingRunBoundary extends Error {
  readonly boundaryStatus: "already_succeeded" | "partial_requires_review";

  constructor(boundaryStatus: ExistingRunBoundary["boundaryStatus"]) {
    super(boundaryStatus);
    this.boundaryStatus = boundaryStatus;
  }
}

function optionsFrom(values: readonly string[]): Options {
  let manifest = "";
  let evidence: string | null = null;
  let batchSize = 25_000;
  let maximumRejectedRows = 0;
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--manifest" && value) { manifest = resolve(value); index += 1; continue; }
    if (name === "--evidence" && value) { evidence = resolve(value); index += 1; continue; }
    if (name === "--batch-size" && value) { batchSize = Number(value); index += 1; continue; }
    if (name === "--maximum-rejected-rows" && value) { maximumRejectedRows = Number(value); index += 1; continue; }
    throw new Error(`Unknown or incomplete ingestion argument: ${name}`);
  }
  if (!manifest) throw new Error("--manifest is required.");
  if (!Number.isInteger(batchSize) || batchSize < 1_000 || batchSize > 100_000) throw new Error("--batch-size must be between 1,000 and 100,000.");
  if (!Number.isInteger(maximumRejectedRows) || maximumRejectedRows < 0 || maximumRejectedRows > 10_000) throw new Error("--maximum-rejected-rows is invalid.");
  return Object.freeze({ manifest, evidence, batchSize, maximumRejectedRows });
}

function stableId(...parts: readonly (string | number)[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function timeValues(monthKey: string): readonly [string, number, number, string, number, string, string] {
  const match = /^(\d{4})-(\d{2})$/u.exec(monthKey);
  if (!match) throw new Error("The reporting period must use YYYY-MM.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new Error("The reporting period is outside the valid calendar range.");
  const financialYearStart = month >= 4 ? year : year - 1;
  const financialQuarter = Math.floor(((month + 8) % 12) / 3) + 1;
  const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return [monthKey, year, month, `${financialYearStart}-${String(financialYearStart + 1).slice(-2)}`, financialQuarter, `${monthKey}-01`, monthEnd];
}

function rawRowDigest(rowNumber: number, cells: readonly string[]): string {
  return createHash("sha256").update(String(rowNumber)).update("\u001e").update(cells.join("\u001f")).digest("hex");
}

function normaliseAlias(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/gu, " ").trim();
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown row-ingestion failure.";
  return message.replace(/[\r\n\t]+/gu, " ").slice(0, 480);
}

const options = optionsFrom(process.argv.slice(2));
const layout = privateCloudLayout(process.env);
const manifest = JSON.parse(await readFile(options.manifest, "utf8")) as DownloadManifest;
if (!manifest.immutable || !["nhsbsa.epd", "nhsbsa.pca"].includes(manifest.sourceId)) throw new Error("The download manifest is not a governed EPD/PCA immutable manifest.");
if (!/^\d{4}-\d{2}$/u.test(manifest.reportingPeriod)) throw new Error("The download manifest reporting period is invalid.");
const sourcePath = resolve(manifest.destination);
if (!pathIsInside(sourcePath, layout.dataRoot)) throw new Error("The immutable source file must be inside NOVAPHARM_DATA_ROOT.");
if (extname(sourcePath).toLowerCase() !== ".csv") throw new Error("Bulk observation ingestion currently accepts only publisher CSV resources; ZIP extraction requires a separately governed manifest.");
const sourceStat = await stat(sourcePath);
if (sourceStat.size !== manifest.bytes) throw new Error("The immutable source file size does not match its download manifest.");
if (await sha256File(sourcePath) !== manifest.sha256) throw new Error("The immutable source file failed manifest SHA-256 verification.");

const { SqliteProvider } = await import("../../src/data/providers/sqlite.mjs");
const database = new SqliteProvider({ DATABASE_PATH: layout.databasePath });
await database.initialize();
const runId = `bulk-${stableId("bulk-observation-v1", manifest.sourceId, manifest.resourceId, manifest.sha256)}`;
const observationTable = manifest.sourceId === "nhsbsa.epd"
  ? "fact_epd_prescribing_observations"
  : "fact_pca_community_dispensing_observations";
const startedAt = new Date().toISOString();
let inputRows = 0;
let acceptedRows = 0;
let rejectedRows = 0;
let duplicateRows = 0;
let transactionOpen = false;
let headers: readonly string[] | null = null;
let schemaFingerprint: string | null = null;
let resumeCommittedRow = 0;

try {
  const sourceResource = await database.one(`SELECT id, resource_url, byte_size FROM source_resources
    WHERE source_id = ? AND external_resource_id = ? AND reporting_period = ? ORDER BY last_seen_at DESC LIMIT 1`,
  [manifest.sourceId, manifest.resourceId, manifest.reportingPeriod]) as { id: string; resource_url: string; byte_size: number | null } | null;
  if (!sourceResource) throw new Error("The exact source resource is not registered. Run governed source discovery against this database first.");
  if (sourceResource.byte_size !== null && Number(sourceResource.byte_size) !== manifest.bytes) throw new Error("The registered source-resource byte size does not match the immutable download.");
  const priorRun = await database.one("SELECT status, checkpoint_json, duplicate_rows FROM ingestion_runs WHERE id = ?", [runId]) as {
    status: string;
    checkpoint_json: string | null;
    duplicate_rows: number | null;
  } | null;
  if (priorRun?.status === "succeeded") throw new ExistingRunBoundary("already_succeeded");
  if (priorRun?.status === "partial") throw new ExistingRunBoundary("partial_requires_review");
  if (priorRun?.checkpoint_json) {
    try {
      const checkpoint = JSON.parse(priorRun.checkpoint_json) as { lastCommittedRow?: unknown };
      if (Number.isSafeInteger(checkpoint.lastCommittedRow) && Number(checkpoint.lastCommittedRow) > 1) {
        resumeCommittedRow = Number(checkpoint.lastCommittedRow);
      }
    } catch {
      resumeCommittedRow = 0;
    }
  }
  acceptedRows = Number((await database.one(`SELECT COUNT(*) AS count FROM ${observationTable} WHERE ingestion_run_id = ?`, [runId]) as { count: number } | null)?.count ?? 0);
  rejectedRows = Number((await database.one("SELECT COUNT(*) AS count FROM ingestion_errors WHERE ingestion_run_id = ?", [runId]) as { count: number } | null)?.count ?? 0);
  duplicateRows = Number(priorRun?.duplicate_rows ?? 0);
  await database.upsert("ingestion_runs", {
    id: runId, source_id: manifest.sourceId, source_resource_id: sourceResource.id,
    run_kind: "authoritative_bulk_observation_v1", status: "running", started_at: startedAt,
    completed_at: null, source_cutoff_at: timeValues(manifest.reportingPeriod)[6],
    input_rows: null, accepted_rows: null, rejected_rows: null, duplicate_rows: null,
    checkpoint_json: JSON.stringify({ sourcePath, manifest: options.manifest, batchSize: options.batchSize, lastCommittedRow: resumeCommittedRow }),
    result_json: null, exact_source_sha: manifest.sha256, initiated_by: "pharmascope-bulk-ingestion-v1",
  }, ["id"], ["status", "started_at", "completed_at", "input_rows", "accepted_rows", "rejected_rows", "duplicate_rows", "checkpoint_json", "result_json", "exact_source_sha", "initiated_by"]);

  const raw = database.raw;
  if (!raw) throw new Error("The governed SQLite provider did not initialise its database handle.");
  // Keep national imports durable while avoiding a full WAL checkpoint every ~4 MiB.
  raw.exec(`
    PRAGMA cache_size = -${sqliteBulkSettings.cacheKiB};
    PRAGMA mmap_size = ${sqliteBulkSettings.memoryMapBytes};
    PRAGMA temp_store = MEMORY;
    PRAGMA wal_autocheckpoint = ${sqliteBulkSettings.walAutocheckpointPages};
  `);
  const [monthKey, year, month, financialYear, financialQuarter, monthStart, monthEnd] = timeValues(manifest.reportingPeriod);
  raw.prepare(`INSERT INTO dim_time(month_key, calendar_year, calendar_month, financial_year, financial_quarter, month_start, month_end, is_complete)
    VALUES(?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT(month_key) DO UPDATE SET is_complete = 1`)
    .run(monthKey, year, month, financialYear, financialQuarter, monthStart, monthEnd);

  const medicineByBnf = new Map<string, string>();
  for (const row of raw.prepare(`SELECT code_value, medicine_id FROM medicine_code_history WHERE code_system = 'BNF'
    AND valid_from <= ? AND (valid_to IS NULL OR valid_to >= ?) ORDER BY valid_from DESC`).all(monthEnd, monthStart) as { code_value: string; medicine_id: string }[]) {
    if (!medicineByBnf.has(row.code_value)) medicineByBnf.set(row.code_value, row.medicine_id);
  }
  const medicineBySnomed = new Map<string, string>();
  for (const row of raw.prepare("SELECT snomed_code, medicine_id FROM dim_medicine WHERE snomed_code IS NOT NULL").all() as { snomed_code: string; medicine_id: string }[]) {
    medicineBySnomed.set(row.snomed_code, row.medicine_id);
  }
  const practiceByCode = new Map<string, string>();
  for (const row of raw.prepare(`SELECT practice_code, practice_id FROM dim_practices WHERE valid_from <= ?
    AND (valid_to IS NULL OR valid_to >= ?) ORDER BY valid_from DESC`).all(monthEnd, monthStart) as { practice_code: string; practice_id: string }[]) {
    if (!practiceByCode.has(row.practice_code)) practiceByCode.set(row.practice_code, row.practice_id);
  }
  const geographyByCode = new Map<string, string>();
  for (const row of raw.prepare(`SELECT geography_type, geography_code, geography_id FROM dim_geography WHERE valid_from <= ?
    AND (valid_to IS NULL OR valid_to >= ?) ORDER BY valid_from DESC`).all(monthEnd, monthStart) as { geography_type: string; geography_code: string; geography_id: string }[]) {
    const key = `${row.geography_type}:${row.geography_code}`;
    if (!geographyByCode.has(key)) geographyByCode.set(key, row.geography_id);
  }

  const upsertMedicine = raw.prepare(`INSERT INTO dim_medicine(medicine_id, canonical_name, medicine_level, snomed_code, dm_d_status, valid_from, source_id, source_last_seen_at)
    VALUES(?, ?, 'BNF_PRESENTATION', ?, 'unverified', ?, ?, ?)
    ON CONFLICT(medicine_id) DO UPDATE SET canonical_name = excluded.canonical_name, source_last_seen_at = excluded.source_last_seen_at`);
  const upsertMedicineCode = raw.prepare(`INSERT INTO medicine_code_history(id, medicine_id, code_system, code_value, code_level, valid_from, change_reason, source_id)
    VALUES(?, ?, 'BNF', ?, 'BNF_PRESENTATION', ?, 'authoritative-bulk-observation', ?)
    ON CONFLICT(code_system, code_value, valid_from) DO UPDATE SET medicine_id = excluded.medicine_id`);
  const insertMedicineAlias = raw.prepare(`INSERT OR IGNORE INTO medicine_aliases(
    id, medicine_id, alias_text, alias_type, normalised_alias, source_id, valid_from, valid_to)
    VALUES(?, ?, ?, ?, ?, ?, ?, NULL)`);
  const findPostcode = raw.prepare("SELECT postcode_id FROM dim_postcode WHERE postcode_normalised = ? ORDER BY CASE WHEN terminated_at IS NULL THEN 0 ELSE 1 END, introduced_at DESC LIMIT 1");
  const upsertPostcode = raw.prepare(`INSERT INTO dim_postcode(postcode_id, postcode_raw, postcode_normalised, postcode_sector, postcode_district, introduced_at, source_id, source_last_seen_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(postcode_normalised, introduced_at) DO UPDATE SET source_last_seen_at = excluded.source_last_seen_at`);
  const upsertOrganisation = raw.prepare(`INSERT INTO dim_nhs_organisations(organisation_id, organisation_code, organisation_name, organisation_type, status, postcode_id, nation, valid_from, source_id)
    VALUES(?, ?, ?, 'PRACTICE', 'source_observed', ?, 'England', ?, ?)
    ON CONFLICT(organisation_code, valid_from) DO UPDATE SET organisation_name = excluded.organisation_name, postcode_id = excluded.postcode_id`);
  const upsertPractice = raw.prepare(`INSERT INTO dim_practices(practice_id, organisation_id, practice_code, practice_name, address_json, postcode_id, status, source_id, valid_from)
    VALUES(?, ?, ?, ?, ?, ?, 'source_observed', ?, ?)
    ON CONFLICT(practice_code, valid_from) DO UPDATE SET practice_name = excluded.practice_name, address_json = excluded.address_json, postcode_id = excluded.postcode_id`);
  const upsertGeography = raw.prepare(`INSERT INTO dim_geography(geography_id, geography_type, geography_code, geography_name, nation, parent_geography_id, valid_from, source_id)
    VALUES(?, ?, ?, ?, 'England', ?, ?, ?)
    ON CONFLICT(geography_type, geography_code, valid_from) DO UPDATE SET geography_name = excluded.geography_name, parent_geography_id = excluded.parent_geography_id`);
  const insertEpd = raw.prepare(`INSERT OR IGNORE INTO fact_epd_prescribing_observations(
    id, month_key, medicine_id, practice_id, regional_office_code, regional_office_name, icb_code, icb_name, pco_code, pco_name,
    practice_code, practice_name, practice_postcode, bnf_chemical_substance_code, bnf_chemical_substance_name, bnf_presentation_code,
    bnf_presentation_name, snomed_code, items, quantity, total_quantity, adq_usage, nic, actual_cost, unidentified,
    ingestion_run_id, source_row_number, source_row_digest) VALUES(${Array.from({ length: 28 }, () => "?").join(", ")})`);
  const insertPca = raw.prepare(`INSERT OR IGNORE INTO fact_pca_community_dispensing_observations(
    id, month_key, medicine_id, geography_id, region_code, region_name, icb_code, icb_name, dispenser_account_type,
    bnf_presentation_code, bnf_presentation_name, snomed_code, supplier_name, unit_of_measure, generic_bnf_equivalent_code,
    generic_bnf_equivalent_name, bnf_chemical_substance_code, bnf_chemical_substance_name, bnf_paragraph_code, bnf_paragraph_name,
    bnf_section_code, bnf_section_name, bnf_chapter_code, bnf_chapter_name, preparation_class, prescribed_preparation_class,
    items, total_quantity, nic, pharmacy_advanced_service, ingestion_run_id, source_row_number, source_row_digest)
    VALUES(${Array.from({ length: 33 }, () => "?").join(", ")})`);
  const insertError = raw.prepare(`INSERT OR IGNORE INTO ingestion_errors(id, ingestion_run_id, source_row_reference, error_code, safe_message, source_value_digest, occurred_at)
    VALUES(?, ?, ?, 'ROW_REJECTED', ?, ?, ?)`);
  const checkpoint = raw.prepare("UPDATE ingestion_runs SET checkpoint_json = ? WHERE id = ?");
  const aliasesSeen = new Set<string>();

  function ensureMedicineAliases(medicineId: string, record: EpdRecord | PcaRecord): void {
    const candidates = [
      ["BNF_PRESENTATION_NAME", record.bnfPresentationName],
      ["BNF_PRESENTATION_CODE", record.bnfPresentationCode],
      ["BNF_CHEMICAL_SUBSTANCE", record.bnfChemicalSubstance],
      ["BNF_CHEMICAL_SUBSTANCE_CODE", record.bnfChemicalSubstanceCode],
      ["SNOMED_CODE", record.snomedCode],
    ] as const;
    for (const [aliasType, sourceValue] of candidates) {
      const aliasText = sourceValue?.trim();
      if (!aliasText) continue;
      const normalised = normaliseAlias(aliasText);
      if (!normalised) continue;
      const cacheKey = `${medicineId}\u001f${aliasType}\u001f${normalised}`;
      if (aliasesSeen.has(cacheKey)) continue;
      insertMedicineAlias.run(`medicine-alias-${stableId(medicineId, aliasType, normalised, monthStart)}`, medicineId, aliasText, aliasType, normalised, manifest.sourceId, monthStart);
      aliasesSeen.add(cacheKey);
    }
  }

  function resolveMedicine(record: EpdRecord | PcaRecord): string {
    const bnfCode = record.bnfPresentationCode;
    const snomed = record.snomedCode;
    const existing = (bnfCode ? medicineByBnf.get(bnfCode) : undefined) ?? (snomed ? medicineBySnomed.get(snomed) : undefined);
    if (existing) {
      ensureMedicineAliases(existing, record);
      return existing;
    }
    if (!bnfCode || !record.bnfPresentationName) throw new Error("The row has no resolvable BNF presentation identity.");
    const medicineId = `medicine-${stableId("BNF_PRESENTATION", bnfCode)}`;
    upsertMedicine.run(medicineId, record.bnfPresentationName, snomed, monthStart, manifest.sourceId, startedAt);
    upsertMedicineCode.run(`medicine-code-${stableId(bnfCode, monthStart)}`, medicineId, bnfCode, monthStart, manifest.sourceId);
    medicineByBnf.set(bnfCode, medicineId);
    if (snomed) medicineBySnomed.set(snomed, medicineId);
    ensureMedicineAliases(medicineId, record);
    return medicineId;
  }

  function resolvePractice(record: EpdRecord): string | null {
    if (record.unidentified) return null;
    if (!record.practiceCode) throw new Error("A non-unidentified EPD row has no practice code.");
    const existing = practiceByCode.get(record.practiceCode);
    if (existing) return existing;
    const practiceId = `practice-${stableId(record.practiceCode, monthStart)}`;
    const organisationId = `nhs-organisation-${stableId("PRACTICE", record.practiceCode, monthStart)}`;
    let postcodeId: string | null = null;
    if (record.postcode) {
      postcodeId = (findPostcode.get(record.postcode) as { postcode_id: string } | undefined)?.postcode_id ?? null;
      if (!postcodeId) {
        const parts = postcodeParts(record.postcode);
        postcodeId = `postcode-${stableId(record.postcode, monthStart)}`;
        upsertPostcode.run(postcodeId, record.postcodeRaw, record.postcode, parts.sector, parts.district, monthStart, manifest.sourceId, startedAt);
      }
    }
    upsertOrganisation.run(organisationId, record.practiceCode, record.practiceName ?? record.practiceCode, postcodeId, monthStart, manifest.sourceId);
    upsertPractice.run(practiceId, organisationId, record.practiceCode, record.practiceName ?? record.practiceCode, JSON.stringify(record.address.filter(Boolean)), postcodeId, manifest.sourceId, monthStart);
    practiceByCode.set(record.practiceCode, practiceId);
    return practiceId;
  }

  function ensureGeography(type: string, code: string | null, name: string | null, parentId: string | null): string | null {
    if (!code || !name) return parentId;
    const key = `${type}:${code}`;
    const existing = geographyByCode.get(key);
    if (existing) return existing;
    const geographyId = `geography-${stableId(type, code, monthStart)}`;
    upsertGeography.run(geographyId, type, code, name, parentId, monthStart, manifest.sourceId);
    geographyByCode.set(key, geographyId);
    return geographyId;
  }

  function resolveEpdGeography(record: EpdRecord): string | null {
    const regionId = ensureGeography("NHS_REGION", record.regionalOfficeCode, record.regionalOfficeName, null);
    const icbId = ensureGeography("ICB", record.icbCode, record.icbName, regionId);
    return ensureGeography("PCO_SICBL", record.pcoCode, record.pcoName, icbId);
  }

  function resolvePcaGeography(record: PcaRecord): string | null {
    let regionId: string | null = null;
    if (record.regionCode && record.regionName) {
      regionId = ensureGeography("NHS_REGION", record.regionCode, record.regionName, null);
    }
    if (!record.icbCode || !record.icbName) return regionId;
    return ensureGeography("ICB", record.icbCode, record.icbName, regionId);
  }

  raw.exec("BEGIN IMMEDIATE");
  transactionOpen = true;
  for await (const cells of parseCsvRows(createReadStream(sourcePath), { maximumColumns: 128, maximumFieldLength: 8_000 })) {
    if (!headers) {
      headers = Object.freeze(cells.map((cell) => cell.trim()));
      const contract = manifest.sourceId === "nhsbsa.epd" ? schemaContracts.epd : schemaContracts.pca;
      const schema = validateSchema(contract, headers);
      if (schema.status === "schema_review_required") throw new Error(`Source schema requires review: ${schema.missingColumns.join(", ")}.`);
      schemaFingerprint = schema.fingerprint;
      continue;
    }
    inputRows += 1;
    const rowNumber = inputRows + 1;
    if (rowNumber <= resumeCommittedRow) continue;
    const digest = rawRowDigest(rowNumber, cells);
    try {
      if (manifest.sourceId === "nhsbsa.epd") {
        const record = parseEpdRecord(headers, cells, rowNumber);
        if (record.monthKey !== manifest.reportingPeriod) throw new Error("EPD row period differs from the immutable resource manifest.");
        const medicineId = resolveMedicine(record);
        const practiceId = resolvePractice(record);
        resolveEpdGeography(record);
        const result = insertEpd.run(
          `epd-observation-${stableId(runId, digest)}`, record.monthKey, medicineId, practiceId,
          record.regionalOfficeCode, record.regionalOfficeName, record.icbCode, record.icbName, record.pcoCode, record.pcoName,
          record.practiceCode, record.practiceName, record.postcode, record.bnfChemicalSubstanceCode, record.bnfChemicalSubstance,
          record.bnfPresentationCode, record.bnfPresentationName, record.snomedCode, record.items, record.quantity, record.totalQuantity,
          record.adqUsage, record.nic, record.actualCost, record.unidentified ? 1 : 0, runId, rowNumber, digest,
        );
        if (Number(result.changes) === 0) duplicateRows += 1;
        else acceptedRows += 1;
      } else {
        const record = parsePcaRecord(headers, cells, rowNumber);
        if (record.monthKey !== manifest.reportingPeriod) throw new Error("PCA row period differs from the immutable resource manifest.");
        const medicineId = resolveMedicine(record);
        const geographyId = resolvePcaGeography(record);
        const result = insertPca.run(
          `pca-observation-${stableId(runId, digest)}`, record.monthKey, medicineId, geographyId,
          record.regionCode, record.regionName, record.icbCode, record.icbName, record.dispenserAccountType,
          record.bnfPresentationCode, record.bnfPresentationName, record.snomedCode, record.supplierName, record.unitOfMeasure,
          record.genericBnfEquivalentCode, record.genericBnfEquivalentName, record.bnfChemicalSubstanceCode, record.bnfChemicalSubstance,
          record.bnfParagraphCode, record.bnfParagraph, record.bnfSectionCode, record.bnfSection, record.bnfChapterCode, record.bnfChapter,
          record.prepClass, record.prescribedPrepClass, record.items, record.totalQuantity, record.nic, record.pharmacyAdvancedService,
          runId, rowNumber, digest,
        );
        if (Number(result.changes) === 0) duplicateRows += 1;
        else acceptedRows += 1;
      }
    } catch (error) {
      rejectedRows += 1;
      insertError.run(`ingestion-error-${stableId(runId, rowNumber, digest)}`, runId, String(rowNumber), safeError(error), digest, new Date().toISOString());
      if (rejectedRows > options.maximumRejectedRows) throw new Error(`Rejected row limit exceeded at source row ${rowNumber}: ${safeError(error)}`);
    }
    if (inputRows % options.batchSize === 0) {
      checkpoint.run(JSON.stringify({ sourcePath, manifest: options.manifest, batchSize: options.batchSize, lastCommittedRow: rowNumber }), runId);
      raw.exec("COMMIT");
      raw.exec("BEGIN IMMEDIATE");
    }
  }
  if (!headers || !schemaFingerprint || inputRows === 0) throw new Error("The immutable source contained no complete observation rows.");
  raw.exec("COMMIT");
  transactionOpen = false;
  acceptedRows = Number((raw.prepare(`SELECT COUNT(*) AS count FROM ${observationTable} WHERE ingestion_run_id = ?`).get(runId) as { count: number }).count);
  rejectedRows = Number((raw.prepare("SELECT COUNT(*) AS count FROM ingestion_errors WHERE ingestion_run_id = ?").get(runId) as { count: number }).count);
  const semanticReconciliation = manifest.sourceId === "nhsbsa.epd"
    ? raw.prepare(`SELECT COUNT(*) AS fact_rows,
        SUM(CASE WHEN unidentified = 1 THEN 1 ELSE 0 END) AS unidentified_rows,
        SUM(CASE WHEN unidentified = 1 AND practice_id IS NOT NULL THEN 1 ELSE 0 END) AS unidentified_with_practice_dimension,
        SUM(CASE WHEN unidentified = 0 AND practice_id IS NULL THEN 1 ELSE 0 END) AS identified_without_practice_dimension
      FROM fact_epd_prescribing_observations WHERE ingestion_run_id = ?`).get(runId) as Record<string, number>
    : raw.prepare("SELECT COUNT(*) AS fact_rows FROM fact_pca_community_dispensing_observations WHERE ingestion_run_id = ?").get(runId) as Record<string, number>;
  if (Number(semanticReconciliation["fact_rows"]) !== acceptedRows) throw new Error("Accepted-row reconciliation failed against the source-specific fact table.");
  if (acceptedRows + rejectedRows + duplicateRows !== inputRows) throw new Error("Input, accepted, rejected and duplicate row counts do not reconcile.");
  if (manifest.sourceId === "nhsbsa.epd" && (
    Number(semanticReconciliation["unidentified_with_practice_dimension"]) !== 0
    || Number(semanticReconciliation["identified_without_practice_dimension"]) !== 0
  )) throw new Error("EPD unidentified/practice identity semantics did not reconcile.");

  const completedAt = new Date().toISOString();
  const status = rejectedRows === 0 ? "succeeded" : "partial";
  const result = Object.freeze({
    sourceId: manifest.sourceId,
    reportingPeriod: manifest.reportingPeriod,
    resourceId: manifest.resourceId,
    sourceSha256: manifest.sha256,
    sourceBytes: manifest.bytes,
    schemaFingerprint,
    inputRows,
    acceptedRows,
    rejectedRows,
    duplicateRows,
    semanticReconciliation,
    status,
    sqliteBulkSettings,
    nationalResourceFullyRead: true,
    analyticsEligible: status === "succeeded",
    productionOperationalClaim: false,
  });
  await database.run(`UPDATE ingestion_runs SET status = ?, completed_at = ?, input_rows = ?, accepted_rows = ?, rejected_rows = ?, duplicate_rows = ?,
    checkpoint_json = ?, result_json = ? WHERE id = ?`, [status, completedAt, inputRows, acceptedRows, rejectedRows, duplicateRows,
    JSON.stringify({ sourcePath, manifest: options.manifest, batchSize: options.batchSize, lastCommittedRow: inputRows + 1, complete: true }), JSON.stringify(result), runId]);
  if (status === "succeeded") {
    await database.run("UPDATE data_source_registry SET last_successfully_ingested_at = ?, status = 'ingested_local_private_cloud', updated_at = ? WHERE source_id = ?", [completedAt, completedAt, manifest.sourceId]);
  }
  await database.upsert("analytical_dataset_manifests", {
    id: `dataset-manifest-${stableId(runId, manifest.sha256)}`, dataset_name: manifest.sourceId,
    storage_zone: "raw_immutable", source_id: manifest.sourceId, reporting_period: manifest.reportingPeriod,
    partition_key: `${manifest.sourceId}/${manifest.reportingPeriod}`, storage_uri: sourcePath, format: "csv",
    content_sha256: manifest.sha256, row_count: inputRows, byte_size: manifest.bytes,
    schema_fingerprint: schemaFingerprint, ingestion_run_id: runId, immutability_status: "immutable", created_at: completedAt,
  }, ["dataset_name", "storage_zone", "partition_key", "content_sha256"], ["row_count", "byte_size", "schema_fingerprint", "ingestion_run_id"]);
  const evidencePath = options.evidence ?? join(layout.directories.manifests, `${runId}.json`);
  await mkdir(dirname(evidencePath), { recursive: true, mode: 0o700 });
  await writeFile(evidencePath, `${JSON.stringify({ evidenceType: "authoritative-bulk-observation-ingestion", runId, completedAt, ...result }, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ runId, evidence: evidencePath, status, inputRows, acceptedRows, rejectedRows, duplicateRows }));
} catch (error) {
  if (error instanceof ExistingRunBoundary) {
    console.log(JSON.stringify({ runId, status: error.boundaryStatus, sourceId: manifest.sourceId, period: manifest.reportingPeriod }));
    if (error.boundaryStatus === "partial_requires_review") process.exitCode = 2;
  } else {
    if (transactionOpen && database.raw) database.raw.exec("ROLLBACK");
    acceptedRows = Number((await database.one(`SELECT COUNT(*) AS count FROM ${observationTable} WHERE ingestion_run_id = ?`, [runId]) as { count: number } | null)?.count ?? acceptedRows);
    rejectedRows = Number((await database.one("SELECT COUNT(*) AS count FROM ingestion_errors WHERE ingestion_run_id = ?", [runId]) as { count: number } | null)?.count ?? rejectedRows);
    await database.run(`UPDATE ingestion_runs SET status = 'failed', completed_at = ?, input_rows = ?, accepted_rows = ?, rejected_rows = ?, duplicate_rows = ?, result_json = ? WHERE id = ?`,
      [new Date().toISOString(), inputRows, acceptedRows, rejectedRows, duplicateRows, JSON.stringify({ safeError: safeError(error), productionOperationalClaim: false }), runId]).catch(() => undefined);
    throw error;
  }
} finally {
  await database.close();
}
