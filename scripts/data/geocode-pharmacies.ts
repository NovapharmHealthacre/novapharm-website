import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { normalisePostcode, OnsPostcodeClient, onsPostcodeEndpoint, onsPostcodeQuarterlyEndpoint, type OnsPostcodeRecord } from "../../packages/medicines-intelligence/src/index.ts";

interface Options {
  readonly database: string;
  readonly evidence: string;
  readonly checkedAt: string;
  readonly batchSize: number;
  readonly concurrency: number;
}

function parseOptions(values: readonly string[]): Options {
  let database = "";
  let evidence = resolve("docs/data/evidence/pharmacy-geography.json");
  let checkedAt = process.env.POSTCODE_GEOGRAPHY_CHECKED_AT || new Date().toISOString();
  let batchSize = 150;
  let concurrency = 4;
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--database" && value) { database = resolve(value); index += 1; continue; }
    if (name === "--evidence" && value) { evidence = resolve(value); index += 1; continue; }
    if (name === "--checked-at" && value) { checkedAt = value; index += 1; continue; }
    if (name === "--batch-size" && value) { batchSize = Number(value); index += 1; continue; }
    if (name === "--concurrency" && value) { concurrency = Number(value); index += 1; continue; }
    throw new Error(`Unknown or incomplete pharmacy-geography argument: ${name}`);
  }
  if (!database) throw new Error("--database is required and must identify an isolated SQLite validation database.");
  if (!Number.isFinite(Date.parse(checkedAt))) throw new Error("--checked-at must be an ISO-8601 timestamp.");
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 200) throw new Error("--batch-size must be between 1 and 200.");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) throw new Error("--concurrency must be between 1 and 6.");
  return Object.freeze({ database, evidence, checkedAt: new Date(checkedAt).toISOString(), batchSize, concurrency });
}

function stableId(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function chunks<T>(values: readonly T[], size: number): readonly (readonly T[])[] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function chooseRecord(records: readonly OnsPostcodeRecord[]): OnsPostcodeRecord {
  return [...records].toSorted((left, right) => {
    if (!left.terminated && right.terminated) return -1;
    if (left.terminated && !right.terminated) return 1;
    return String(right.terminated || right.introduced || "").localeCompare(String(left.terminated || left.introduced || ""));
  })[0] as OnsPostcodeRecord;
}

async function lookupBatches(client: OnsPostcodeClient, batches: readonly (readonly string[])[], concurrency: number): Promise<readonly OnsPostcodeRecord[]> {
  const results: OnsPostcodeRecord[][] = Array.from({ length: batches.length }, () => []);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, async () => {
    while (cursor < batches.length) {
      const index = cursor;
      cursor += 1;
      results[index] = [...await client.lookup(batches[index] ?? [])];
    }
  }));
  return Object.freeze(results.flat());
}

const options = parseOptions(process.argv.slice(2));
const { SqliteProvider } = await import("../../src/data/providers/sqlite.mjs");
const database = new SqliteProvider({ DATABASE_PATH: options.database });
await database.initialize();
try {
  const sources = await database.all("SELECT source_id FROM data_source_registry WHERE source_id IN (?, ?)", ["ons.onspd-live", "ons.onspd-quarterly"]);
  if (sources.length !== 2) throw new Error("Run governed source discovery into this database before postcode geography enrichment.");
  const pharmacyRows = await database.all("SELECT DISTINCT postcode_normalised FROM pharmacies ORDER BY postcode_normalised", []);
  const practiceRows = await database.all(`SELECT DISTINCT dp.postcode_normalised
    FROM dim_practices practice JOIN dim_postcode dp ON dp.postcode_id = practice.postcode_id
    WHERE practice.valid_to IS NULL ORDER BY dp.postcode_normalised`, []);
  const pharmacyPostcodes = new Set(pharmacyRows.map((row: { postcode_normalised: string }) => normalisePostcode(row.postcode_normalised)));
  const practicePostcodes = new Set<string>();
  const nonUkPracticePostcodes: string[] = [];
  for (const row of practiceRows as readonly { postcode_normalised: string }[]) {
    try {
      practicePostcodes.add(normalisePostcode(row.postcode_normalised));
    } catch {
      nonUkPracticePostcodes.push(row.postcode_normalised);
    }
  }
  const postcodes = [...new Set([...pharmacyPostcodes, ...practicePostcodes])].toSorted();
  if (!postcodes.length) throw new Error("No imported pharmacy or practice postcodes are available for geography enrichment.");
  const liveBatches = chunks(postcodes, options.batchSize);
  const liveRecords = await lookupBatches(new OnsPostcodeClient(), liveBatches, options.concurrency);
  const liveGrouped = new Map<string, OnsPostcodeRecord[]>();
  for (const record of liveRecords) {
    const values = liveGrouped.get(record.postcode) ?? [];
    values.push(record);
    liveGrouped.set(record.postcode, values);
  }
  const liveSelected = new Map([...liveGrouped].map(([postcode, records]) => [postcode, chooseRecord(records)]));
  const missingAfterLive = postcodes.filter((postcode) => !liveSelected.has(postcode));
  const quarterlyBatches = chunks(missingAfterLive, options.batchSize);
  const quarterlyRecords = quarterlyBatches.length
    ? await lookupBatches(new OnsPostcodeClient({ endpoint: onsPostcodeQuarterlyEndpoint }), quarterlyBatches, Math.min(options.concurrency, 2))
    : [];
  const quarterlyGrouped = new Map<string, OnsPostcodeRecord[]>();
  for (const record of quarterlyRecords) {
    const values = quarterlyGrouped.get(record.postcode) ?? [];
    values.push(record);
    quarterlyGrouped.set(record.postcode, values);
  }
  const quarterlySelected = new Map([...quarterlyGrouped].map(([postcode, records]) => [postcode, chooseRecord(records)]));
  const selected = new Map<string, Readonly<{ record: OnsPostcodeRecord; sourceId: "ons.onspd-live" | "ons.onspd-quarterly" }>>();
  for (const [postcode, record] of liveSelected) selected.set(postcode, Object.freeze({ record, sourceId: "ons.onspd-live" }));
  for (const [postcode, record] of quarterlySelected) selected.set(postcode, Object.freeze({ record, sourceId: "ons.onspd-quarterly" }));
  const missing = postcodes.filter((postcode) => !selected.has(postcode));
  const duplicateResponses = [...liveGrouped.values(), ...quarterlyGrouped.values()].filter((records) => records.length > 1).length;
  const liveRunId = `ons-live-geography-${stableId(options.checkedAt, String(postcodes.length), String(liveSelected.size))}`;
  const quarterlyRunId = `ons-quarterly-geography-${stableId(options.checkedAt, String(missingAfterLive.length), String(quarterlySelected.size))}`;

  await database.transaction(async (transaction: typeof database) => {
    await transaction.run(`INSERT INTO ingestion_runs(id, source_id, run_kind, status, started_at, completed_at, source_cutoff_at, input_rows, accepted_rows, rejected_rows, duplicate_rows, result_json, initiated_by)
      VALUES(?, ?, 'postcode_geography_enrichment', 'succeeded', ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      liveRunId, "ons.onspd-live", options.checkedAt, options.checkedAt, options.checkedAt,
      postcodes.length, liveSelected.size, missingAfterLive.length, [...liveGrouped.values()].filter((records) => records.length > 1).length,
      JSON.stringify({ endpoint: onsPostcodeEndpoint, batches: liveBatches.length, productionIngestionClaim: false }), "governed-postcode-enrichment",
    ]);
    if (quarterlyBatches.length) await transaction.run(`INSERT INTO ingestion_runs(id, source_id, run_kind, status, started_at, completed_at, source_cutoff_at, input_rows, accepted_rows, rejected_rows, duplicate_rows, result_json, initiated_by)
      VALUES(?, ?, 'postcode_geography_temporal_fallback', 'succeeded', ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      quarterlyRunId, "ons.onspd-quarterly", options.checkedAt, options.checkedAt, options.checkedAt,
      missingAfterLive.length, quarterlySelected.size, missing.length, [...quarterlyGrouped.values()].filter((records) => records.length > 1).length,
      JSON.stringify({ endpoint: onsPostcodeQuarterlyEndpoint, batches: quarterlyBatches.length, productionIngestionClaim: false }), "governed-postcode-enrichment",
    ]);
    for (const [postcode, selection] of selected) {
      const { record, sourceId } = selection;
      const validFrom = record.introduced || "1900-01-01";
      const postcodeId = `postcode-${stableId(postcode, validFrom)}`;
      const parts = postcode.split(" ");
      await transaction.upsert("dim_postcode", {
        postcode_id: postcodeId, postcode_raw: postcode, postcode_normalised: postcode,
        postcode_sector: `${parts[0]} ${parts[1]?.[0] ?? ""}`, postcode_district: parts[0],
        latitude: record.latitude, longitude: record.longitude, introduced_at: record.introduced,
        terminated_at: record.terminated, source_id: sourceId, source_last_seen_at: options.checkedAt,
      }, ["postcode_normalised", "introduced_at"], ["postcode_raw", "postcode_sector", "postcode_district", "latitude", "longitude", "terminated_at", "source_id", "source_last_seen_at"]);

      const geographyDefinitions = [
        ["country", record.countryCode, null],
        ["local_authority_2025", record.localAuthorityCode, record.countryCode ? `country:${record.countryCode}` : null],
        ["nhs_region_2024", record.nhsRegionCode, record.countryCode ? `country:${record.countryCode}` : null],
        ["icb_2026", record.icbCode, record.nhsRegionCode ? `nhs_region_2024:${record.nhsRegionCode}` : null],
        ["sub_icb_2026", record.subIcbCode, record.icbCode ? `icb_2026:${record.icbCode}` : null],
        ["lsoa_2021", record.lsoa2021Code, record.localAuthorityCode ? `local_authority_2025:${record.localAuthorityCode}` : null],
        ["msoa_2021", record.msoa2021Code, record.localAuthorityCode ? `local_authority_2025:${record.localAuthorityCode}` : null],
        ["rurality_2021", record.rurality2021Code, record.countryCode ? `country:${record.countryCode}` : null],
      ] as const;
      const idByKey = new Map<string, string>();
      for (const [type, code] of geographyDefinitions) if (code) idByKey.set(`${type}:${code}`, `geography-${stableId(type, code, validFrom)}`);
      for (const [type, code, parentKey] of geographyDefinitions) {
        if (!code) continue;
        const geographyId = idByKey.get(`${type}:${code}`) as string;
        const parentId = parentKey ? idByKey.get(parentKey) ?? null : null;
        await transaction.upsert("dim_geography", {
          geography_id: geographyId, geography_type: type, geography_code: code,
          geography_name: code, name_status: "code_only_pending_official_name_list", nation: record.countryCode || "unknown",
          parent_geography_id: parentId, valid_from: validFrom, valid_to: record.terminated,
          source_id: sourceId,
        }, ["geography_type", "geography_code", "valid_from"], ["geography_name", "name_status", "nation", "parent_geography_id", "valid_to", "source_id"]);
        await transaction.upsert("postcode_geography_history", {
          id: stableId(postcodeId, type, geographyId, validFrom), postcode_id: postcodeId,
          geography_id: geographyId, geography_type: type, valid_from: validFrom,
          valid_to: record.terminated, source_id: sourceId,
        }, ["postcode_id", "geography_type", "valid_from"], ["geography_id", "valid_to", "source_id"]);
      }
      await transaction.run("UPDATE pharmacies SET postcode_id = ?, latitude = ?, longitude = ?, geography_id = ? WHERE postcode_normalised = ?", [
        postcodeId, record.latitude, record.longitude,
        record.icbCode ? idByKey.get(`icb_2026:${record.icbCode}`) ?? null : record.localAuthorityCode ? idByKey.get(`local_authority_2025:${record.localAuthorityCode}`) ?? null : null,
        postcode,
      ]);
      await transaction.run(`UPDATE dim_practices SET postcode_id = ?, latitude = ?, longitude = ?
        WHERE postcode_id IN (SELECT postcode_id FROM dim_postcode WHERE postcode_normalised = ?)`, [
        postcodeId, record.latitude, record.longitude, postcode,
      ]);
    }
    await transaction.run("UPDATE data_source_registry SET last_checked_at = ?, last_successfully_ingested_at = ?, updated_at = ? WHERE source_id = ?", [options.checkedAt, options.checkedAt, options.checkedAt, "ons.onspd-live"]);
    if (quarterlyBatches.length) await transaction.run("UPDATE data_source_registry SET last_checked_at = ?, last_successfully_ingested_at = ?, updated_at = ? WHERE source_id = ?", [options.checkedAt, options.checkedAt, options.checkedAt, "ons.onspd-quarterly"]);
  });

  const updatedPharmacies = Number((await database.one("SELECT COUNT(*) AS value FROM pharmacies WHERE latitude IS NOT NULL AND longitude IS NOT NULL", []))?.value || 0);
  const updatedPractices = Number((await database.one("SELECT COUNT(*) AS value FROM dim_practices WHERE valid_to IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL", []))?.value || 0);
  const terminated = [...selected.values()].filter(({ record }) => record.terminated).length;
  const recognisedWithoutCoordinates = [...selected.values()].filter(({ record }) => record.latitude === null || record.longitude === null).length;
  const evidence = Object.freeze({
    evidenceType: "governed-pharmacy-practice-postcode-geography",
    checkedAt: options.checkedAt,
    sources: [
      { sourceId: "ons.onspd-live", endpoint: onsPostcodeEndpoint, matched: liveSelected.size, role: "current postcode authority" },
      { sourceId: "ons.onspd-quarterly", endpoint: onsPostcodeQuarterlyEndpoint, matched: quarterlySelected.size, role: "terminated postcode temporal fallback" },
    ],
    sourceAuthority: "Office for National Statistics Open Geography Portal",
    productionIngestionClaim: false, databaseType: "isolated-local-sqlite-validation",
    uniquePostcodesRequested: postcodes.length, uniquePharmacyPostcodesRequested: pharmacyPostcodes.size,
    uniquePracticePostcodesRequested: practicePostcodes.size, nonUkPracticePostcodesExcluded: nonUkPracticePostcodes.length,
    nonUkPracticePostcodesSha256: createHash("sha256").update(nonUkPracticePostcodes.toSorted().join("\n")).digest("hex"),
    uniquePostcodesMatched: selected.size,
    uniquePostcodesMissing: missing.length, duplicateSourceResponsesResolved: duplicateResponses,
    terminatedPostcodesRetained: terminated, recognisedPostcodesWithoutCoordinates: recognisedWithoutCoordinates,
    pharmaciesWithCoordinates: updatedPharmacies,
    practicesWithCoordinates: updatedPractices,
    importedPharmacies: Number((await database.one("SELECT COUNT(*) AS value FROM pharmacies", []))?.value || 0),
    importedCurrentPractices: Number((await database.one("SELECT COUNT(*) AS value FROM dim_practices WHERE valid_to IS NULL", []))?.value || 0),
    batches: { live: liveBatches.length, quarterlyFallback: quarterlyBatches.length }, batchSize: options.batchSize, concurrency: options.concurrency,
    missingPostcodesSha256: createHash("sha256").update(missing.join("\n")).digest("hex"),
    caveats: [
      "Coordinates are authoritative postcode centroids, not premises-level survey coordinates.",
      "A recognised postcode with no published coordinate remains matched but is never assigned an invented latitude or longitude.",
      "Terminated postcodes remain visible as data-quality evidence and do not automatically close a pharmacy.",
      "BFPO and other non-UK practice postcode identifiers are retained in the practice master but excluded from ONS UK-postcode lookup.",
      "Geography code names remain code-only until an official code-name list is ingested; no name was invented.",
      "Distance is an opportunity feature and never proves that a pharmacy dispensed a medicine.",
    ],
  });
  await mkdir(dirname(options.evidence), { recursive: true });
  await writeFile(options.evidence, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ evidence: options.evidence, uniquePostcodesRequested: postcodes.length, uniquePostcodesMatched: selected.size, uniquePostcodesMissing: missing.length, pharmaciesWithCoordinates: updatedPharmacies, practicesWithCoordinates: updatedPractices }));
} finally {
  await database.close();
}
