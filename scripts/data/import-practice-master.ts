import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import {
  CkanClient,
  parseCsvRows,
  parsePrescriberPracticeRecord,
  postcodeParts,
  schemaContracts,
  validateSchema,
  type CkanResource,
  type PrescriberPracticeRecord,
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

interface PracticeVariant {
  readonly record: PrescriberPracticeRecord;
  readonly digest: string;
  readonly firstSourceRow: number;
  observations: number;
}

interface PracticeGroup {
  readonly practiceCode: string;
  readonly providerCode: string;
  readonly providerNameKey: string;
  readonly practiceNameKey: string;
  readonly variants: Map<string, PracticeVariant>;
  sourceRows: number;
}

interface ProviderIdentity {
  readonly name: string;
  readonly nameKey: string;
  readonly nation: string;
}

interface RejectedSourceRow {
  readonly sourceRow: number;
  readonly errorCode: "MISSING_PRACTICE_IDENTITY" | "MISSING_PRACTICE_POSTCODE";
  readonly fieldName: "PRACTICE_CODE" | "PRACTICE_NAME" | "POSTCODE";
  readonly safeMessage: string;
  readonly sourceValueDigest: string;
}

const sourceId = "nhsbsa.prescriber-details";
const importerVersion = "prescriber-practice-master-v2";

function parseOptions(values: readonly string[]): Options {
  let database = "";
  let rawDirectory = resolve("/tmp/novapharm-medicines-intelligence/raw");
  let evidence = resolve("docs/data/evidence/practice-master-import.json");
  let ingestedAt = process.env.PRACTICE_IMPORT_AT || new Date().toISOString();
  let maxBytes = 64 * 1024 * 1024;
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--database" && value) { database = resolve(value); index += 1; continue; }
    if (name === "--raw-directory" && value) { rawDirectory = resolve(value); index += 1; continue; }
    if (name === "--evidence" && value) { evidence = resolve(value); index += 1; continue; }
    if (name === "--ingested-at" && value) { ingestedAt = value; index += 1; continue; }
    if (name === "--max-bytes" && value) { maxBytes = Number(value); index += 1; continue; }
    throw new Error(`Unknown or incomplete practice-master argument: ${name}`);
  }
  if (!database) throw new Error("--database is required and must identify an isolated validation database.");
  if (!Number.isFinite(Date.parse(ingestedAt))) throw new Error("--ingested-at must be an ISO-8601 timestamp.");
  if (!Number.isInteger(maxBytes) || maxBytes < 32 * 1024 * 1024 || maxBytes > 256 * 1024 * 1024) throw new Error("--max-bytes is outside the approved practice-master bounds.");
  const repositoryRelative = relative(resolve("."), rawDirectory);
  if (repositoryRelative === "" || (repositoryRelative !== ".." && !repositoryRelative.startsWith(`..${sep}`))) throw new Error("Raw national source data must remain outside the Git working tree.");
  return Object.freeze({ database, rawDirectory, evidence, ingestedAt: new Date(ingestedAt).toISOString(), maxBytes });
}

function stableId(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function identityKey(value: string): string {
  return value.normalize("NFKC").toLocaleUpperCase("en-GB");
}

function sourceNation(providerName: string): string {
  const key = identityKey(providerName);
  if (key.includes("GUERNSEY")) return "Guernsey";
  if (key.includes("JERSEY")) return "Jersey";
  if (key.includes("ISLE OF MAN")) return "Isle of Man";
  if (key.includes("OVERSEAS")) return "Overseas";
  return "England";
}

function practiceVariantDigest(record: PrescriberPracticeRecord): string {
  return createHash("sha256").update(JSON.stringify([
    record.providerSicblCode, identityKey(record.providerSicblName), identityKey(record.practiceName),
    record.practiceType, record.address.map((value) => value ? identityKey(value) : null), record.postcode, record.postcodeKind,
  ])).digest("hex");
}

function selectPracticeVariant(group: PracticeGroup): PracticeVariant {
  return [...group.variants.values()].toSorted((left, right) => {
    if (left.observations !== right.observations) return right.observations - left.observations;
    const leftCompleteness = left.record.address.filter(Boolean).length;
    const rightCompleteness = right.record.address.filter(Boolean).length;
    if (leftCompleteness !== rightCompleteness) return rightCompleteness - leftCompleteness;
    return left.digest.localeCompare(right.digest);
  })[0] as PracticeVariant;
}

function governedRowRejection(error: unknown, sourceRowNumber: number, cells: readonly string[]): RejectedSourceRow | null {
  const message = error instanceof Error ? error.message : String(error);
  const missing = /missing (PRACTICE_CODE|PRACTICE_NAME|POSTCODE)\./u.exec(message);
  if (!missing) return null;
  const fieldName = missing[1] as RejectedSourceRow["fieldName"];
  return Object.freeze({
    sourceRow: sourceRowNumber,
    errorCode: fieldName === "POSTCODE" ? "MISSING_PRACTICE_POSTCODE" : "MISSING_PRACTICE_IDENTITY",
    fieldName,
    safeMessage: fieldName === "POSTCODE"
      ? "The source row has no practice postcode and was excluded from canonical-location selection."
      : "The source row has no complete practice identity and was excluded from the practice master.",
    sourceValueDigest: createHash("sha256").update(cells.join("\u001f")).digest("hex"),
  });
}

const options = parseOptions(process.argv.slice(2));
const { SqliteProvider } = await import("../../src/data/providers/sqlite.mjs");
const database = new SqliteProvider({ DATABASE_PATH: options.database });
await database.initialize();
try {
  const resource = await database.one(`SELECT sr.id, sr.external_resource_id, sr.reporting_period, sr.resource_name, sr.resource_url,
      sr.format, sr.byte_size, sr.resource_hash, sr.schema_fingerprint, ds.discovery_endpoint
    FROM source_resources sr JOIN data_source_registry ds ON ds.source_id = sr.source_id
    WHERE sr.source_id = ? ORDER BY sr.reporting_period DESC, sr.last_seen_at DESC LIMIT 1`, [sourceId]) as ResourceRow | null;
  if (!resource) throw new Error("Run governed source discovery before importing the practice master.");
  if (!/^[a-f0-9]{64}$/iu.test(resource.resource_hash || "")) throw new Error("The Prescriber Details resource has no governed SHA-256 evidence.");
  if (!/^\d{4}-\d{2}$/u.test(resource.reporting_period)) throw new Error("The Prescriber Details resource has no valid reporting month.");
  const destination = resolve(options.rawDirectory, sourceId, resource.reporting_period, `${resource.external_resource_id}.csv`);
  const client = new CkanClient({ baseUrl: resource.discovery_endpoint, timeoutMs: 30_000, maxRetries: 3 });
  const download = await client.downloadResource({
    id: resource.external_resource_id, name: resource.resource_name, title: resource.resource_name,
    url: resource.resource_url, format: resource.format, size: resource.byte_size, sha256: resource.resource_hash,
  } satisfies CkanResource, { destination, maxBytes: options.maxBytes });
  await chmod(destination, 0o600);
  if (download.expectedHashMatched !== true || download.sha256 !== resource.resource_hash.toLowerCase()) throw new Error("The Prescriber Details download did not match governed checksum evidence.");

  let headers: readonly string[] | null = null;
  let schema: ReturnType<typeof validateSchema> | null = null;
  let sourceRows = 0;
  let acceptedSourceRows = 0;
  const practices = new Map<string, PracticeGroup>();
  const providers = new Map<string, ProviderIdentity>();
  const rejectedRows: RejectedSourceRow[] = [];
  for await (const cells of parseCsvRows(createReadStream(destination), { maximumColumns: 64, maximumFieldLength: 4_000 })) {
    if (cells.every((cell) => !cell.trim())) continue;
    if (!headers) {
      headers = Object.freeze(cells.map((cell) => cell.trim()));
      schema = validateSchema(schemaContracts.prescriber, headers);
      if (schema.status === "schema_review_required") throw new Error(`Prescriber Details schema is missing: ${schema.missingColumns.join(", ")}.`);
      if (resource.schema_fingerprint && resource.schema_fingerprint !== schema.fingerprint) throw new Error("Prescriber Details CSV header differs from the discovered CKAN schema fingerprint.");
      continue;
    }
    sourceRows += 1;
    let record: PrescriberPracticeRecord;
    try {
      record = parsePrescriberPracticeRecord(headers, cells, sourceRows + 1);
    } catch (error) {
      const rejection = governedRowRejection(error, sourceRows + 1, cells);
      if (!rejection) throw error;
      rejectedRows.push(rejection);
      continue;
    }
    acceptedSourceRows += 1;
    const providerNameKey = identityKey(record.providerSicblName);
    const provider = providers.get(record.providerSicblCode);
    if (provider && provider.nameKey !== providerNameKey) throw new Error(`Provider ${record.providerSicblCode} has conflicting names in the source snapshot.`);
    providers.set(record.providerSicblCode, Object.freeze({ name: record.providerSicblName, nameKey: providerNameKey, nation: sourceNation(record.providerSicblName) }));
    const practiceNameKey = identityKey(record.practiceName);
    let group = practices.get(record.practiceCode);
    if (!group) {
      group = { practiceCode: record.practiceCode, providerCode: record.providerSicblCode, providerNameKey, practiceNameKey, variants: new Map(), sourceRows: 0 };
      practices.set(record.practiceCode, group);
    }
    if (group.providerCode !== record.providerSicblCode || group.providerNameKey !== providerNameKey || group.practiceNameKey !== practiceNameKey) {
      throw new Error(`Practice ${record.practiceCode} has a material provider or name identity conflict in the source snapshot.`);
    }
    group.sourceRows += 1;
    const digest = practiceVariantDigest(record);
    const variant = group.variants.get(digest);
    if (variant) variant.observations += 1;
    else group.variants.set(digest, { record, digest, firstSourceRow: sourceRows + 1, observations: 1 });
  }
  if (!headers || !schema || !sourceRows || !practices.size) throw new Error("The Prescriber Details source contained no usable practice records.");
  const selectedPractices = [...practices.values()].map((group) => Object.freeze({ group, selection: selectPracticeVariant(group) }));
  const duplicateRows = acceptedSourceRows - practices.size;
  const practiceCodesWithMultipleSourceVariants = selectedPractices.filter(({ group }) => group.variants.size > 1).length;
  const practiceCodesWithMultiplePostcodes = selectedPractices.filter(({ group }) => new Set([...group.variants.values()].map(({ record }) => record.postcode)).size > 1).length;
  const distinctPracticeSourceVariants = selectedPractices.reduce((sum, { group }) => sum + group.variants.size, 0);

  const validFrom = `${resource.reporting_period}-01`;
  const runId = `practice-master-${stableId(importerVersion, resource.external_resource_id, download.sha256)}`;
  await database.transaction(async (transaction: typeof database) => {
    const raw = transaction.raw;
    const findPostcode = raw.prepare(`SELECT postcode_id, latitude, longitude FROM dim_postcode
      WHERE postcode_normalised = ? ORDER BY CASE WHEN terminated_at IS NULL THEN 0 ELSE 1 END, introduced_at DESC LIMIT 1`);
    const upsertOrganisation = raw.prepare(`INSERT INTO dim_nhs_organisations(organisation_id, organisation_code, organisation_name, organisation_type, status, postcode_id, nation, valid_from, valid_to, source_id)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
      ON CONFLICT(organisation_code, valid_from) DO UPDATE SET organisation_name = excluded.organisation_name, organisation_type = excluded.organisation_type,
      status = excluded.status, postcode_id = excluded.postcode_id, nation = excluded.nation, valid_to = NULL, source_id = excluded.source_id`);
    const upsertPractice = raw.prepare(`INSERT INTO dim_practices(practice_id, organisation_id, practice_code, practice_name, practice_type, address_json, postcode_id, latitude, longitude, status, open_date, close_date, registered_population, population_period, source_id, valid_from, valid_to)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, NULL)
      ON CONFLICT(practice_code, valid_from) DO UPDATE SET organisation_id = excluded.organisation_id, practice_name = excluded.practice_name,
      practice_type = excluded.practice_type, address_json = excluded.address_json, postcode_id = excluded.postcode_id,
      latitude = excluded.latitude, longitude = excluded.longitude, status = excluded.status, source_id = excluded.source_id, valid_to = NULL`);
    const upsertOrgRelationship = raw.prepare(`INSERT INTO organisation_relationship_history(id, child_organisation_id, parent_organisation_id, relationship_type, valid_from, valid_to, source_id)
      VALUES(?, ?, ?, 'commissioned_by_sicbl_source_observation', ?, NULL, ?) ON CONFLICT(child_organisation_id, parent_organisation_id, relationship_type, valid_from)
      DO UPDATE SET valid_to = NULL, source_id = excluded.source_id`);
    const upsertPracticeRelationship = raw.prepare(`INSERT INTO practice_relationship_history(id, practice_id, organisation_id, relationship_type, valid_from, valid_to, source_id)
      VALUES(?, ?, ?, 'provider_sicbl_source_observation', ?, NULL, ?) ON CONFLICT(practice_id, organisation_id, relationship_type, valid_from)
      DO UPDATE SET valid_to = NULL, source_id = excluded.source_id`);

    for (const [code, provider] of providers) {
      const organisationId = `nhs-organisation-${stableId("SICBL", code, validFrom)}`;
      upsertOrganisation.run(organisationId, code, provider.name, "SICBL_PCO", "source_observed", null, provider.nation, validFrom, sourceId);
    }
    for (const { group, selection } of selectedPractices) {
      const record = selection.record;
      const parts = record.postcodeKind === "uk" ? postcodeParts(record.postcode) : { sector: "BFPO", district: "BFPO" };
      let postcode = findPostcode.get(record.postcode) as { postcode_id: string; latitude: number | null; longitude: number | null } | undefined;
      if (!postcode) {
        const postcodeId = `postcode-${stableId(record.postcode, validFrom)}`;
        await transaction.upsert("dim_postcode", {
          postcode_id: postcodeId, postcode_raw: record.postcodeRaw, postcode_normalised: record.postcode,
          postcode_sector: parts.sector, postcode_district: parts.district, latitude: null, longitude: null,
          introduced_at: validFrom, terminated_at: null, source_id: sourceId, source_last_seen_at: options.ingestedAt,
        }, ["postcode_normalised", "introduced_at"], ["postcode_raw", "postcode_sector", "postcode_district", "source_last_seen_at"]);
        postcode = { postcode_id: postcodeId, latitude: null, longitude: null };
      }
      const practiceOrganisationId = `nhs-organisation-${stableId("PRACTICE", record.practiceCode, validFrom)}`;
      const providerOrganisationId = `nhs-organisation-${stableId("SICBL", record.providerSicblCode, validFrom)}`;
      const practiceId = `practice-${stableId(record.practiceCode, validFrom)}`;
      const nation = providers.get(record.providerSicblCode)?.nation ?? "Unknown";
      const status = group.variants.size > 1 ? "source_observed_modal_location" : "source_observed";
      upsertOrganisation.run(practiceOrganisationId, record.practiceCode, record.practiceName, "PRACTICE", status, postcode.postcode_id, nation, validFrom, sourceId);
      upsertPractice.run(practiceId, practiceOrganisationId, record.practiceCode, record.practiceName, record.practiceType, JSON.stringify(record.address), postcode.postcode_id, postcode.latitude, postcode.longitude, status, sourceId, validFrom);
      upsertOrgRelationship.run(`nhs-org-relationship-${stableId(practiceOrganisationId, providerOrganisationId, validFrom)}`, practiceOrganisationId, providerOrganisationId, validFrom, sourceId);
      upsertPracticeRelationship.run(`practice-relationship-${stableId(practiceId, providerOrganisationId, validFrom)}`, practiceId, providerOrganisationId, validFrom, sourceId);
    }

    const result = { sourceRows, acceptedSourceRows, rejectedSourceRows: rejectedRows.length, uniquePractices: practices.size,
      duplicatePrescriberRows: duplicateRows, materialIdentityConflicts: 0, practiceCodesWithMultipleSourceVariants,
      practiceCodesWithMultiplePostcodes, distinctPracticeSourceVariants, providers: providers.size,
      reportingPeriod: resource.reporting_period, schemaStatus: schema.status, schemaFingerprint: schema.fingerprint };
    await transaction.upsert("ingestion_runs", {
      id: runId, source_id: sourceId, source_resource_id: resource.id, run_kind: "practice_master_snapshot",
      status: rejectedRows.length ? "partial" : "succeeded", started_at: options.ingestedAt, completed_at: options.ingestedAt, source_cutoff_at: validFrom,
      input_rows: sourceRows, accepted_rows: acceptedSourceRows, rejected_rows: rejectedRows.length, duplicate_rows: duplicateRows,
      checkpoint_json: null, result_json: JSON.stringify(result), exact_source_sha: download.sha256, initiated_by: importerVersion,
    }, ["id"], ["status", "completed_at", "input_rows", "accepted_rows", "rejected_rows", "duplicate_rows", "result_json", "exact_source_sha", "initiated_by"]);
    for (const rejection of rejectedRows) await transaction.upsert("ingestion_errors", {
      id: `practice-import-error-${stableId(runId, String(rejection.sourceRow), rejection.errorCode)}`,
      ingestion_run_id: runId, source_row_reference: `csv-row:${rejection.sourceRow}`, error_code: rejection.errorCode,
      safe_message: rejection.safeMessage, field_name: rejection.fieldName, source_value_digest: rejection.sourceValueDigest,
      occurred_at: options.ingestedAt,
    }, ["id"], ["safe_message", "field_name", "source_value_digest", "occurred_at"]);
    await transaction.upsert("source_schema_versions", {
      id: stableId(sourceId, schema.fingerprint), source_id: sourceId, variant_name: schemaContracts.prescriber.variant,
      schema_fingerprint: schema.fingerprint, columns_json: JSON.stringify(schema.observedColumns), compatibility_status: schema.status,
      effective_from: resource.reporting_period, effective_to: null, first_seen_at: options.ingestedAt,
      reviewed_at: options.ingestedAt, reviewed_by: importerVersion,
    }, ["source_id", "schema_fingerprint"], ["variant_name", "columns_json", "compatibility_status", "effective_from", "reviewed_at", "reviewed_by"]);
    await transaction.upsert("analytical_dataset_manifests", {
      id: `dataset-${stableId(sourceId, resource.reporting_period, download.sha256)}`, dataset_name: "prescriber_details_practice_master",
      storage_zone: "raw_immutable", source_id: sourceId, reporting_period: resource.reporting_period,
      partition_key: `source=${sourceId}/period=${resource.reporting_period}`,
      storage_uri: `local-validation://raw/${sourceId}/${resource.reporting_period}/${basename(destination)}`,
      format: "csv", content_sha256: download.sha256, row_count: sourceRows, byte_size: download.bytes,
      schema_fingerprint: schema.fingerprint, ingestion_run_id: runId, immutability_status: "immutable", created_at: options.ingestedAt,
    }, ["dataset_name", "storage_zone", "partition_key", "content_sha256"], ["source_id", "reporting_period", "storage_uri", "row_count", "byte_size", "schema_fingerprint", "ingestion_run_id", "immutability_status"]);
    await transaction.run("UPDATE data_source_registry SET last_successfully_ingested_at = ?, updated_at = ? WHERE source_id = ?", [options.ingestedAt, options.ingestedAt, sourceId]);
  });

  const counts = await database.one(`SELECT COUNT(*) AS practices,
    SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS geocoded_practices,
    SUM(CASE WHEN registered_population IS NOT NULL THEN 1 ELSE 0 END) AS population_linked_practices
    FROM dim_practices WHERE valid_from = ?`, [validFrom]);
  const evidence = Object.freeze({
    evidenceType: "governed-prescriber-details-practice-master", ingestedAt: options.ingestedAt, importerVersion,
    productionIngestionClaim: false, databaseType: "isolated-local-sqlite-validation",
    source: { sourceId, publisher: "NHS Business Services Authority", resourceId: resource.external_resource_id,
      reportingPeriod: resource.reporting_period, resourceName: resource.resource_name, resourceUrl: resource.resource_url,
      contentSha256: download.sha256, bytes: download.bytes, checksumMatched: true },
    schema: { status: schema.status, variant: schema.variant, fingerprint: schema.fingerprint, columns: schema.observedColumns },
    rows: { source: sourceRows, accepted: acceptedSourceRows, rejected: rejectedRows.length, uniquePractices: practices.size,
      repeatedPrescriberRows: duplicateRows, materialIdentityConflicts: 0, practiceCodesWithMultipleSourceVariants,
      practiceCodesWithMultiplePostcodes, distinctPracticeSourceVariants, providers: providers.size },
    governedRejections: {
      counts: Object.fromEntries([...new Set(rejectedRows.map(({ errorCode }) => errorCode))].map((errorCode) => [errorCode, rejectedRows.filter((row) => row.errorCode === errorCode).length])),
      sourceRowReferences: rejectedRows.map(({ sourceRow, errorCode, fieldName, sourceValueDigest }) => ({ sourceRow, errorCode, fieldName, sourceValueDigest })),
      rawValuesCommitted: false,
    },
    canonicalLocationSelection: {
      method: "Most frequently observed complete source location per practice code; ties use address completeness then a stable variant digest.",
      sourceVariantsPreservedBy: "Immutable raw source checksum and aggregate evidence; no alternative address is recast as a separate practice identity.",
      ambiguousPracticesStatus: "source_observed_modal_location",
    },
    practiceMaster: counts,
    privacyBoundary: [
      "The raw immutable source contains public prescriber records, but the curated practice master deliberately excludes prescriber names, titles and codes.",
      "No practice email, telephone or website is inferred from this source; DoHS and public-contact enrichment remain separately governed.",
      "The provider SICBL relationship is preserved as a source-period observation and is not silently recast as a current ICB hierarchy.",
      "Practice postcode is an organisation address and never patient residence.",
      "Overseas BFPO practice identifiers are retained without assigning UK ONS geography or coordinates.",
    ],
    rawStorage: { committedToGit: false, localValidationOnly: true, immutableChecksumVerified: true },
  });
  await mkdir(dirname(options.evidence), { recursive: true });
  await writeFile(options.evidence, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ evidence: options.evidence, sourceRows, acceptedSourceRows, rejectedSourceRows: rejectedRows.length,
    uniquePractices: practices.size, repeatedPrescriberRows: duplicateRows, practiceCodesWithMultipleSourceVariants,
    practiceCodesWithMultiplePostcodes, providers: providers.size, practiceMaster: counts }));
} finally {
  await database.close();
}
