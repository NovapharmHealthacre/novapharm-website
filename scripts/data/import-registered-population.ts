import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import {
  parseCsvRows,
  parseRegisteredPopulationBandRecord,
  parseRegisteredPracticeMappingRecord,
  parseRegisteredPracticeTotalRecord,
  registryEntry,
  schemaContracts,
  validateSchema,
  type SchemaContractResult,
} from "../../packages/medicines-intelligence/src/index.ts";

interface ArchiveOptions {
  readonly path: string;
  readonly url: string;
  readonly entryName: string;
  readonly resourceName: string;
  readonly resourceId: string;
}

interface Options {
  readonly database: string;
  readonly period: string;
  readonly totals: ArchiveOptions;
  readonly ageSex: ArchiveOptions;
  readonly mapping: ArchiveOptions;
  readonly evidence: string;
  readonly ingestedAt: string;
  readonly codeSha: string | null;
}

interface ArchiveEvidence extends ArchiveOptions {
  readonly bytes: number;
  readonly sha256: string;
  readonly databaseResourceId: string;
  readonly fingerprint: string;
}

interface PracticeReference {
  readonly practiceId: string;
  readonly current: boolean;
}

interface ImportCounts {
  totals: number;
  ageSex: number;
  mappings: number;
  registeredPopulation: number;
  matchedTotalPractices: number;
  unmatchedTotalPractices: number;
  matchedAgeSexRows: number;
  unmatchedAgeSexRows: number;
  matchedMappings: number;
  unmatchedMappings: number;
  mappingWithoutTotal: number;
  mappingPostcodeDifferences: number;
  gpAllPersonAgeRows: number;
  gpAllPersonPopulationDifferences: number;
}

const sourceId = "nhse.registered-patients";
const importerVersion = "registered-population-v1";

function parseOptions(values: readonly string[]): Options {
  const parsed = new Map<string, string>();
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index];
    const value = values[index + 1];
    if (!name?.startsWith("--") || !value) throw new Error(`Unknown or incomplete registered-population argument: ${name ?? "(missing)"}`);
    if (parsed.has(name)) throw new Error(`Duplicate registered-population argument: ${name}`);
    parsed.set(name, value);
  }
  const required = (name: string): string => {
    const value = parsed.get(name);
    if (!value) throw new Error(`${name} is required.`);
    return value;
  };
  const permitted = new Set([
    "--database", "--period", "--totals-zip", "--totals-url", "--age-sex-zip", "--age-sex-url",
    "--mapping-zip", "--mapping-url", "--evidence", "--ingested-at", "--code-sha",
  ]);
  for (const name of parsed.keys()) if (!permitted.has(name)) throw new Error(`Unknown registered-population argument: ${name}`);
  const period = required("--period");
  if (!/^20\d{2}-(?:0[1-9]|1[0-2])$/u.test(period)) throw new Error("--period must be a YYYY-MM reporting month.");
  const ingestedAt = parsed.get("--ingested-at") ?? process.env.REGISTERED_POPULATION_IMPORT_AT ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(ingestedAt))) throw new Error("--ingested-at must be an ISO-8601 timestamp.");
  const codeSha = parsed.get("--code-sha") ?? process.env.SOURCE_CODE_SHA ?? null;
  if (codeSha !== null && !/^[a-f0-9]{40}$/iu.test(codeSha)) throw new Error("--code-sha must be a 40-character Git commit SHA.");
  const archive = (prefix: "totals" | "age-sex" | "mapping", entryName: string, resourceName: string): ArchiveOptions => Object.freeze({
    path: resolve(required(`--${prefix}-zip`)),
    url: officialHttpsUrl(required(`--${prefix}-url`), `--${prefix}-url`),
    entryName,
    resourceName,
    resourceId: `${entryName.replace(/\.csv$/u, "")}-${period}`,
  });
  return Object.freeze({
    database: resolve(required("--database")), period,
    totals: archive("totals", "gp-reg-pat-prac-all.csv", "All registered patients by GP practice"),
    ageSex: archive("age-sex", "gp-reg-pat-prac-quin-age.csv", "Registered patients by five-year age band and sex"),
    mapping: archive("mapping", "gp-reg-pat-prac-map.csv", "Monthly GP practice organisation mapping"),
    evidence: resolve(parsed.get("--evidence") ?? "docs/data/evidence/registered-population-import.json"),
    ingestedAt: new Date(ingestedAt).toISOString(), codeSha: codeSha?.toLowerCase() ?? null,
  });
}

function officialHttpsUrl(value: string, label: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "files.digital.nhs.uk") throw new Error(`${label} must be an official files.digital.nhs.uk HTTPS resource.`);
  if (!url.pathname.toLowerCase().endsWith(".zip")) throw new Error(`${label} must identify a ZIP resource.`);
  url.hash = "";
  return url.href;
}

function stableId(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function fullDigest(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex");
}

async function sha256(path: string): Promise<string> {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest("hex");
}

async function archiveEvidence(options: ArchiveOptions, period: string): Promise<ArchiveEvidence> {
  const repositoryRoot = await realpath(resolve("."));
  const path = await realpath(options.path);
  const repositoryRelative = relative(repositoryRoot, path);
  if (repositoryRelative === "" || (repositoryRelative !== ".." && !repositoryRelative.startsWith(`..${sep}`))) {
    throw new Error("Raw national source archives must remain outside the Git working tree.");
  }
  const details = await stat(path);
  if (!details.isFile() || details.size <= 0) throw new Error(`${options.entryName} source archive is not a non-empty regular file.`);
  const listed = spawnSync("unzip", ["-Z1", path], { encoding: "utf8", maxBuffer: 64 * 1024 });
  if (listed.error) throw new Error(`The governed unzip utility is unavailable: ${listed.error.message}`);
  if (listed.status !== 0) throw new Error(`${options.entryName} source archive could not be inspected.`);
  const entries = listed.stdout.split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean);
  if (entries.length !== 1 || entries[0] !== options.entryName) throw new Error(`${options.entryName} source archive does not contain exactly the approved CSV entry.`);
  const contentSha256 = await sha256(path);
  return Object.freeze({ ...options, path, bytes: details.size, sha256: contentSha256,
    databaseResourceId: stableId(sourceId, options.resourceId, contentSha256),
    fingerprint: fullDigest(sourceId, options.resourceId, period, contentSha256) });
}

async function* archiveRows(archive: ArchiveEvidence): AsyncGenerator<readonly string[]> {
  const child = spawn("unzip", ["-p", archive.path, archive.entryName], { stdio: ["ignore", "pipe", "pipe"] });
  if (!child.stdout || !child.stderr) throw new Error(`Unable to stream ${archive.entryName}.`);
  child.stderr.setEncoding("utf8");
  let standardError = "";
  child.stderr.on("data", (chunk: string) => { if (standardError.length < 4_000) standardError += chunk; });
  const completion = new Promise<void>((resolveCompletion, rejectCompletion) => {
    child.once("error", rejectCompletion);
    child.once("close", (code) => code === 0 ? resolveCompletion() : rejectCompletion(new Error(`${archive.entryName} extraction failed with exit ${code ?? "unknown"}: ${standardError.trim().slice(0, 500)}`)));
  });
  try {
    for await (const cells of parseCsvRows(child.stdout, { maximumColumns: 64, maximumFieldLength: 4_000 })) yield cells;
    await completion;
  } catch (error) {
    if (child.exitCode === null) child.kill("SIGTERM");
    await completion.catch(() => undefined);
    throw error;
  }
}

function requireSchema(contract: (typeof schemaContracts)[keyof typeof schemaContracts], headers: readonly string[]): SchemaContractResult {
  const result = validateSchema(contract, headers);
  if (result.status === "schema_review_required") throw new Error(`${contract.source} schema is missing: ${result.missingColumns.join(", ")}.`);
  return result;
}

function monthDimension(monthKey: string): Readonly<Record<string, string | number>> {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const next = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(next.getTime() - 86_400_000).toISOString().slice(0, 10);
  const financialYearStart = month >= 4 ? year : year - 1;
  const financialQuarter = month >= 4 ? Math.floor((month - 4) / 3) + 1 : 4;
  return Object.freeze({
    month_key: monthKey, calendar_year: year, calendar_month: month,
    financial_year: `${financialYearStart}-${String(financialYearStart + 1).slice(-2)}`,
    financial_quarter: financialQuarter, month_start: `${monthKey}-01`, month_end: monthEnd, is_complete: 1,
  });
}

function safeFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown registered-population import failure.";
  return message.replace(/[\u0000-\u001F\u007F]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 1_000);
}

const options = parseOptions(process.argv.slice(2));
const gitState = spawnSync("git", ["status", "--porcelain"], { cwd: resolve("."), encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
const workingTreeClean = gitState.status === 0 && gitState.stdout.trim().length === 0;
const exactCandidateSha = workingTreeClean ? options.codeSha : null;
const [totalsArchive, ageSexArchive, mappingArchive] = await Promise.all([
  archiveEvidence(options.totals, options.period),
  archiveEvidence(options.ageSex, options.period),
  archiveEvidence(options.mapping, options.period),
]);
const archives = Object.freeze([totalsArchive, ageSexArchive, mappingArchive]);
const runId = `registered-population-${stableId(importerVersion, options.period, ...archives.map(({ sha256: digest }) => digest))}`;
const source = registryEntry(sourceId);
const { SqliteProvider } = await import("../../src/data/providers/sqlite.mjs");
const database = new SqliteProvider({ DATABASE_PATH: options.database });
await database.initialize();

const seedRegistryAndRun = async (): Promise<void> => database.transaction(async (transaction: typeof database) => {
  await transaction.upsert("data_source_registry", {
    source_id: source.sourceId, publisher: source.publisher, dataset_name: source.datasetName,
    dataset_identifier: source.datasetSlugOrIdentifier, jurisdiction: source.jurisdiction, coverage: source.coverage,
    purpose: source.purpose, access_method: source.accessMethod, discovery_endpoint: source.apiOrDownload,
    licence: source.licence, publication_frequency: source.publicationFrequency,
    typical_reporting_lag: source.typicalReportingLag, authority_rank: source.authorityRank, status: source.status,
    known_caveats_json: JSON.stringify(source.knownCaveats), provenance_notes: source.provenanceNotes,
    first_seen_at: source.firstSeenAt, last_checked_at: options.ingestedAt,
    last_successfully_ingested_at: null, latest_expected_period: options.period,
    latest_discovered_period: options.period, period_state_evaluated_at: options.ingestedAt,
    updated_at: options.ingestedAt,
  }, ["source_id"], ["publisher", "dataset_name", "dataset_identifier", "jurisdiction", "coverage", "purpose", "access_method", "discovery_endpoint", "licence", "publication_frequency", "typical_reporting_lag", "authority_rank", "status", "known_caveats_json", "provenance_notes", "last_checked_at", "latest_expected_period", "latest_discovered_period", "period_state_evaluated_at", "updated_at"]);
  for (const archive of archives) await transaction.upsert("source_resources", {
    id: archive.databaseResourceId, source_id: sourceId, external_resource_id: archive.resourceId,
    reporting_period: options.period, resource_name: archive.resourceName, resource_url: archive.url,
    format: "zip", byte_size: archive.bytes, resource_hash: archive.sha256, resource_fingerprint: archive.fingerprint,
    schema_fingerprint: null, datastore_state: "not_applicable", first_seen_at: options.ingestedAt,
    last_seen_at: options.ingestedAt, revised_at: null, supersedes_resource_id: null,
  }, ["source_id", "external_resource_id", "resource_fingerprint"], ["reporting_period", "resource_name", "resource_url", "format", "byte_size", "resource_hash", "last_seen_at"]);
  await transaction.upsert("ingestion_runs", {
    id: runId, source_id: sourceId, source_resource_id: totalsArchive.databaseResourceId,
    run_kind: "registered_population_monthly_snapshot", status: "running", started_at: options.ingestedAt,
    completed_at: null, source_cutoff_at: `${options.period}-01`, input_rows: null, accepted_rows: null,
    rejected_rows: null, duplicate_rows: null, checkpoint_json: JSON.stringify({ stage: "validated_archives" }),
    result_json: null, exact_source_sha: exactCandidateSha, initiated_by: importerVersion,
  }, ["id"], ["status", "started_at", "completed_at", "source_cutoff_at", "input_rows", "accepted_rows", "rejected_rows", "duplicate_rows", "checkpoint_json", "result_json", "exact_source_sha", "initiated_by"]);
});

await seedRegistryAndRun();
const counts: ImportCounts = {
  totals: 0, ageSex: 0, mappings: 0, registeredPopulation: 0,
  matchedTotalPractices: 0, unmatchedTotalPractices: 0, matchedAgeSexRows: 0, unmatchedAgeSexRows: 0,
  matchedMappings: 0, unmatchedMappings: 0, mappingWithoutTotal: 0, mappingPostcodeDifferences: 0,
  gpAllPersonAgeRows: 0, gpAllPersonPopulationDifferences: 0,
};
const schemas = new Map<string, SchemaContractResult>();

try {
  await database.transaction(async (transaction: typeof database) => {
    await transaction.upsert("dim_time", monthDimension(options.period), ["month_key"], ["calendar_year", "calendar_month", "financial_year", "financial_quarter", "month_start", "month_end", "is_complete"]);
    const practiceRows = transaction.raw.prepare(`SELECT practice_id, practice_code, valid_to FROM dim_practices
      ORDER BY practice_code, CASE WHEN valid_to IS NULL THEN 0 ELSE 1 END, valid_from DESC`).all() as readonly Readonly<{ practice_id: string; practice_code: string; valid_to: string | null }>[];
    const practices = new Map<string, PracticeReference>();
    for (const row of practiceRows) if (!practices.has(row.practice_code)) practices.set(row.practice_code, Object.freeze({ practiceId: row.practice_id, current: row.valid_to === null }));
    const totalsByPractice = new Map<string, Readonly<{ population: number; postcode: string }>>();
    const totalKeys = new Set<string>();
    const ageKeys = new Set<string>();
    const mappingKeys = new Set<string>();
    const updatePractice = transaction.raw.prepare(`UPDATE dim_practices SET registered_population = ?, population_period = ? WHERE practice_id = ? AND valid_to IS NULL`);
    const upsertTotal = transaction.raw.prepare(`INSERT INTO practice_population_history(
      id, practice_id, practice_code, month_key, extract_date, registered_population, practice_postcode,
      sub_icb_location_code, ons_sub_icb_location_code, source_id, source_resource_id, ingestion_run_id,
      source_row_number, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(practice_code, month_key) DO UPDATE SET practice_id = excluded.practice_id, extract_date = excluded.extract_date,
      registered_population = excluded.registered_population, practice_postcode = excluded.practice_postcode,
      sub_icb_location_code = excluded.sub_icb_location_code, ons_sub_icb_location_code = excluded.ons_sub_icb_location_code,
      source_id = excluded.source_id, source_resource_id = excluded.source_resource_id, ingestion_run_id = excluded.ingestion_run_id,
      source_row_number = excluded.source_row_number, created_at = excluded.created_at`);
    const upsertAgeSex = transaction.raw.prepare(`INSERT INTO population_age_sex_history(
      id, practice_id, month_key, extract_date, organisation_type, organisation_code, ons_code, postcode,
      sex, age_band, registered_population, source_id, source_resource_id, ingestion_run_id, source_row_number, created_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(month_key, organisation_type, organisation_code, sex, age_band) DO UPDATE SET
      practice_id = excluded.practice_id, extract_date = excluded.extract_date, ons_code = excluded.ons_code,
      postcode = excluded.postcode, registered_population = excluded.registered_population, source_id = excluded.source_id,
      source_resource_id = excluded.source_resource_id, ingestion_run_id = excluded.ingestion_run_id,
      source_row_number = excluded.source_row_number, created_at = excluded.created_at`);
    const upsertMapping = transaction.raw.prepare(`INSERT INTO practice_monthly_mapping(
      id, practice_id, practice_code, practice_name, practice_postcode, month_key, extract_date, pcn_code, pcn_name,
      ons_sub_icb_location_code, sub_icb_location_code, sub_icb_location_name, ons_icb_code, icb_code, icb_name,
      ons_commissioning_region_code, commissioning_region_code, commissioning_region_name, gp_system_supplier,
      source_id, source_resource_id, ingestion_run_id, source_row_number, created_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(practice_code, month_key) DO UPDATE SET practice_id = excluded.practice_id,
      practice_name = excluded.practice_name, practice_postcode = excluded.practice_postcode, extract_date = excluded.extract_date,
      pcn_code = excluded.pcn_code, pcn_name = excluded.pcn_name, ons_sub_icb_location_code = excluded.ons_sub_icb_location_code,
      sub_icb_location_code = excluded.sub_icb_location_code, sub_icb_location_name = excluded.sub_icb_location_name,
      ons_icb_code = excluded.ons_icb_code, icb_code = excluded.icb_code, icb_name = excluded.icb_name,
      ons_commissioning_region_code = excluded.ons_commissioning_region_code,
      commissioning_region_code = excluded.commissioning_region_code,
      commissioning_region_name = excluded.commissioning_region_name, gp_system_supplier = excluded.gp_system_supplier,
      source_id = excluded.source_id, source_resource_id = excluded.source_resource_id,
      ingestion_run_id = excluded.ingestion_run_id, source_row_number = excluded.source_row_number, created_at = excluded.created_at`);

    let headers: readonly string[] | null = null;
    for await (const cells of archiveRows(totalsArchive)) {
      if (cells.every((cell) => !cell.trim())) continue;
      if (!headers) { headers = Object.freeze(cells.map((cell) => cell.trim())); schemas.set(totalsArchive.resourceId, requireSchema(schemaContracts.registeredPracticeTotals, headers)); continue; }
      const sourceRow = counts.totals + 2;
      const record = parseRegisteredPracticeTotalRecord(headers, cells, sourceRow);
      if (record.monthKey !== options.period) throw new Error(`Totals row ${sourceRow} is outside the governed reporting month.`);
      if (totalKeys.has(record.practiceCode)) throw new Error(`Totals row ${sourceRow} duplicates practice ${record.practiceCode}.`);
      totalKeys.add(record.practiceCode);
      totalsByPractice.set(record.practiceCode, Object.freeze({ population: record.population, postcode: record.postcode }));
      const practice = practices.get(record.practiceCode) ?? null;
      if (practice) counts.matchedTotalPractices += 1; else counts.unmatchedTotalPractices += 1;
      counts.registeredPopulation += record.population;
      upsertTotal.run(`practice-population-${stableId(record.practiceCode, record.monthKey)}`, practice?.practiceId ?? null,
        record.practiceCode, record.monthKey, record.extractDate, record.population, record.postcode,
        record.subIcbLocationCode, record.onsSubIcbLocationCode, sourceId, totalsArchive.databaseResourceId,
        runId, sourceRow, options.ingestedAt);
      if (practice?.current) updatePractice.run(record.population, record.monthKey, practice.practiceId);
      counts.totals += 1;
    }
    if (!headers || counts.totals === 0) throw new Error("The registered-population totals archive contained no data rows.");

    headers = null;
    for await (const cells of archiveRows(ageSexArchive)) {
      if (cells.every((cell) => !cell.trim())) continue;
      if (!headers) { headers = Object.freeze(cells.map((cell) => cell.trim())); schemas.set(ageSexArchive.resourceId, requireSchema(schemaContracts.registeredPopulationBands, headers)); continue; }
      const sourceRow = counts.ageSex + 2;
      const record = parseRegisteredPopulationBandRecord(headers, cells, sourceRow);
      if (record.monthKey !== options.period) throw new Error(`Age/sex row ${sourceRow} is outside the governed reporting month.`);
      const key = [record.organisationType, record.organisationCode, record.sex, record.ageBand].join("\u001f");
      if (ageKeys.has(key)) throw new Error(`Age/sex row ${sourceRow} duplicates an organisation, sex and age-band identity.`);
      ageKeys.add(key);
      const practice = record.organisationType === "GP" ? practices.get(record.organisationCode) ?? null : null;
      if (record.organisationType === "GP") {
        if (practice) counts.matchedAgeSexRows += 1; else counts.unmatchedAgeSexRows += 1;
        if (record.sex === "ALL" && record.ageBand === "ALL") {
          counts.gpAllPersonAgeRows += 1;
          if (totalsByPractice.get(record.organisationCode)?.population !== record.population) counts.gpAllPersonPopulationDifferences += 1;
        }
      }
      upsertAgeSex.run(`population-age-sex-${stableId(record.monthKey, record.organisationType, record.organisationCode, record.sex, record.ageBand)}`,
        practice?.practiceId ?? null, record.monthKey, record.extractDate, record.organisationType, record.organisationCode,
        record.onsCode, record.postcode, record.sex, record.ageBand, record.population, sourceId,
        ageSexArchive.databaseResourceId, runId, sourceRow, options.ingestedAt);
      counts.ageSex += 1;
    }
    if (!headers || counts.ageSex === 0) throw new Error("The registered-population age/sex archive contained no data rows.");

    headers = null;
    for await (const cells of archiveRows(mappingArchive)) {
      if (cells.every((cell) => !cell.trim())) continue;
      if (!headers) { headers = Object.freeze(cells.map((cell) => cell.trim())); schemas.set(mappingArchive.resourceId, requireSchema(schemaContracts.registeredPracticeMapping, headers)); continue; }
      const sourceRow = counts.mappings + 2;
      const record = parseRegisteredPracticeMappingRecord(headers, cells, sourceRow);
      if (record.monthKey !== options.period) throw new Error(`Mapping row ${sourceRow} is outside the governed reporting month.`);
      if (mappingKeys.has(record.practiceCode)) throw new Error(`Mapping row ${sourceRow} duplicates practice ${record.practiceCode}.`);
      mappingKeys.add(record.practiceCode);
      const total = totalsByPractice.get(record.practiceCode);
      if (!total) counts.mappingWithoutTotal += 1;
      else if (total.postcode !== record.practicePostcode) counts.mappingPostcodeDifferences += 1;
      const practice = practices.get(record.practiceCode) ?? null;
      if (practice) counts.matchedMappings += 1; else counts.unmatchedMappings += 1;
      upsertMapping.run(`practice-mapping-${stableId(record.practiceCode, record.monthKey)}`, practice?.practiceId ?? null,
        record.practiceCode, record.practiceName, record.practicePostcode, record.monthKey, record.extractDate,
        record.pcnCode, record.pcnName, record.onsSubIcbLocationCode, record.subIcbLocationCode, record.subIcbLocationName,
        record.onsIcbCode, record.icbCode, record.icbName, record.onsCommissioningRegionCode,
        record.commissioningRegionCode, record.commissioningRegionName, record.gpSystemSupplier, sourceId,
        mappingArchive.databaseResourceId, runId, sourceRow, options.ingestedAt);
      counts.mappings += 1;
    }
    if (!headers || counts.mappings === 0) throw new Error("The registered-population mapping archive contained no data rows.");
    if (counts.gpAllPersonPopulationDifferences > 0) throw new Error("The age/sex all-person practice totals do not reconcile with the totals resource.");
    if (counts.mappingWithoutTotal > 0) throw new Error("The monthly mapping contains practices absent from the totals resource.");
    if (counts.totals !== counts.mappings || counts.totals !== counts.gpAllPersonAgeRows) throw new Error("The three registered-population resources have different practice identity counts.");

    for (const archive of archives) {
      const schema = schemas.get(archive.resourceId);
      if (!schema) throw new Error(`${archive.resourceName} has no validated schema evidence.`);
      transaction.raw.prepare("UPDATE source_resources SET schema_fingerprint = ?, last_seen_at = ? WHERE id = ?")
        .run(schema.fingerprint, options.ingestedAt, archive.databaseResourceId);
      await transaction.upsert("source_schema_versions", {
        id: stableId(sourceId, schema.fingerprint), source_id: sourceId, variant_name: schema.variant,
        schema_fingerprint: schema.fingerprint, columns_json: JSON.stringify(schema.observedColumns),
        compatibility_status: schema.status, effective_from: options.period, effective_to: null,
        first_seen_at: options.ingestedAt, reviewed_at: options.ingestedAt, reviewed_by: importerVersion,
      }, ["source_id", "schema_fingerprint"], ["variant_name", "columns_json", "compatibility_status", "effective_from", "reviewed_at", "reviewed_by"]);
      const rowCount = archive === totalsArchive ? counts.totals : archive === ageSexArchive ? counts.ageSex : counts.mappings;
      await transaction.upsert("analytical_dataset_manifests", {
        id: `dataset-${stableId(sourceId, archive.resourceId, archive.sha256)}`,
        dataset_name: archive.resourceId, storage_zone: "raw_immutable", source_id: sourceId,
        reporting_period: options.period, partition_key: `source=${sourceId}/period=${options.period}/resource=${archive.resourceId}`,
        storage_uri: `local-validation://raw/${sourceId}/${options.period}/${basename(archive.path)}`,
        format: "zip", content_sha256: archive.sha256, row_count: rowCount, byte_size: archive.bytes,
        schema_fingerprint: schema.fingerprint, ingestion_run_id: runId, immutability_status: "immutable", created_at: options.ingestedAt,
      }, ["dataset_name", "storage_zone", "partition_key", "content_sha256"], ["source_id", "reporting_period", "storage_uri", "row_count", "byte_size", "schema_fingerprint", "ingestion_run_id", "immutability_status"]);
    }
    const result = Object.freeze({ ...counts, reportingPeriod: options.period,
      schemas: Object.fromEntries([...schemas].map(([resourceId, schema]) => [resourceId, { status: schema.status, fingerprint: schema.fingerprint }])) });
    await transaction.run(`UPDATE ingestion_runs SET status = 'succeeded', completed_at = ?, input_rows = ?, accepted_rows = ?,
      rejected_rows = 0, duplicate_rows = 0, checkpoint_json = ?, result_json = ? WHERE id = ?`, [
      options.ingestedAt, counts.totals + counts.ageSex + counts.mappings, counts.totals + counts.ageSex + counts.mappings,
      JSON.stringify({ stage: "published", period: options.period }), JSON.stringify(result), runId,
    ]);
    await transaction.run("UPDATE data_source_registry SET last_checked_at = ?, last_successfully_ingested_at = ?, updated_at = ? WHERE source_id = ?", [options.ingestedAt, options.ingestedAt, options.ingestedAt, sourceId]);
  });

  const databaseCounts = await database.one(`SELECT
    (SELECT COUNT(*) FROM practice_population_history WHERE month_key = ?) AS practice_population_rows,
    (SELECT COUNT(*) FROM population_age_sex_history WHERE month_key = ?) AS age_sex_rows,
    (SELECT COUNT(*) FROM practice_monthly_mapping WHERE month_key = ?) AS mapping_rows,
    (SELECT COUNT(*) FROM dim_practices WHERE population_period = ? AND registered_population IS NOT NULL) AS current_practices_updated`,
    [options.period, options.period, options.period, options.period]);
  const evidence = Object.freeze({
    evidenceType: "governed-registered-population-import", importerVersion, importedAt: options.ingestedAt,
    repository: { baseSha: options.codeSha, workingTreeClean, exactCandidateSha },
    productionIngestionClaim: false, databaseType: "isolated-local-sqlite-validation",
    source: { sourceId, publisher: source.publisher, reportingPeriod: options.period,
      archives: archives.map((archive) => ({ resourceId: archive.resourceId, resourceName: archive.resourceName,
        resourceUrl: archive.url, fileName: basename(archive.path), bytes: archive.bytes,
        locallyComputedSha256: archive.sha256, publisherSuppliedChecksum: false,
        schemaStatus: schemas.get(archive.resourceId)?.status ?? null,
        schemaFingerprint: schemas.get(archive.resourceId)?.fingerprint ?? null })) },
    rows: { ...counts, database: databaseCounts },
    reconciliation: {
      practiceIdentityCountsAgree: counts.totals === counts.mappings && counts.totals === counts.gpAllPersonAgeRows,
      allPersonPopulationDifferences: counts.gpAllPersonPopulationDifferences,
      mappingsWithoutTotal: counts.mappingWithoutTotal,
      postcodeDifferencesPreserved: counts.mappingPostcodeDifferences,
    },
    privacyBoundary: [
      "All records are published aggregate organisation or geography counts; no patient-level data is ingested.",
      "Practice postcode is an organisation address and is never presented as patient residence.",
      "The monthly mapping is retained as-of the publication month rather than overwritten by current ODS relationships.",
      "Raw national archives remain outside Git and are represented in repository evidence only by governed metadata and SHA-256 digests.",
    ],
    productionState: "Repository importer and isolated local validation only; no Azure or production ingestion is claimed.",
  });
  await mkdir(dirname(options.evidence), { recursive: true });
  await writeFile(options.evidence, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ evidence: options.evidence, runId, period: options.period, counts, database: databaseCounts }));
} catch (error) {
  const message = safeFailure(error);
  await database.transaction(async (transaction: typeof database) => {
    await transaction.run(`UPDATE ingestion_runs SET status = 'failed', completed_at = ?, rejected_rows = 0,
      checkpoint_json = ?, result_json = ? WHERE id = ?`, [options.ingestedAt, JSON.stringify({ stage: "failed" }), JSON.stringify({ safeMessage: message }), runId]);
    await transaction.upsert("ingestion_errors", {
      id: `registered-population-error-${stableId(runId, message)}`, ingestion_run_id: runId,
      source_row_reference: null, error_code: "REGISTERED_POPULATION_IMPORT_FAILED", safe_message: message,
      field_name: null, source_value_digest: fullDigest(message), occurred_at: options.ingestedAt,
    }, ["id"], ["safe_message", "source_value_digest", "occurred_at"]);
  });
  throw error;
} finally {
  await database.close();
}
