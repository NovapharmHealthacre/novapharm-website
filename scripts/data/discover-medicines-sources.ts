import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
  CkanActionError,
  CkanClient,
  applyCkanDiscovery,
  discoverResources,
  extractCkanSchemaColumns,
  schemaContracts,
  sourceRegistry,
  validateSchema,
  type CkanResource,
  type SchemaContractResult,
  type SourceRegistryEntry,
} from "../../packages/medicines-intelligence/src/index.ts";

interface Arguments {
  readonly output: string;
  readonly database: string | null;
  readonly checkedAt: string;
}

interface DiscoveryResult {
  readonly registry: SourceRegistryEntry;
  readonly resources: readonly CkanResource[];
  readonly schema: SchemaContractResult | null;
  readonly datastoreState: "not_advertised" | "available" | "advertised_unavailable";
  readonly datastoreMessage: string | null;
  readonly error: string | null;
}

const contractBySource = new Map<string, (typeof schemaContracts)[keyof typeof schemaContracts]>([
  ["nhsbsa.epd", schemaContracts.epd],
  ["nhsbsa.pca", schemaContracts.pca],
  ["nhsbsa.bnf-current", schemaContracts.bnfCurrent],
  ["nhsbsa.bnf-historic", schemaContracts.bnfHistoric],
  ["nhsbsa.bnf-changes", schemaContracts.bnfChanges],
  ["nhsbsa.prescriber-details", schemaContracts.prescriber],
  ["nhsbsa.contractor-details", schemaContracts.contractor],
  ["nhsbsa.pharmacy-activity", schemaContracts.pharmacyActivity],
  ["nhsbsa.practice-dispensing", schemaContracts.practiceDispensing],
  ["phs.prescribed-dispensed", schemaContracts.phsPrescribedDispensed],
  ["bso.dispensing-contractor", schemaContracts.niDispensingByContractor],
]);

function argumentsFrom(values: readonly string[]): Arguments {
  let output = resolve("docs/data/evidence/source-discovery.json");
  let database: string | null = null;
  let checkedAt = process.env.SOURCE_DISCOVERY_CHECKED_AT || new Date().toISOString();
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--output" && value) { output = resolve(value); index += 1; continue; }
    if (name === "--database" && value) { database = resolve(value); index += 1; continue; }
    if (name === "--checked-at" && value) { checkedAt = value; index += 1; continue; }
    throw new Error(`Unknown or incomplete source-discovery argument: ${name}`);
  }
  if (!Number.isFinite(Date.parse(checkedAt))) throw new Error("--checked-at must be an ISO-8601 timestamp.");
  return Object.freeze({ output, database, checkedAt: new Date(checkedAt).toISOString() });
}

function stableId(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function safeError(error: unknown): string {
  if (error instanceof CkanActionError) return `${error.action}: HTTP ${error.statusCode}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unknown source-discovery error.";
}

async function discover(entry: SourceRegistryEntry, checkedAt: string): Promise<DiscoveryResult> {
  if (entry.accessMethod !== "ckan_action_api") {
    return Object.freeze({ registry: entry, resources: Object.freeze([]), schema: null, datastoreState: "not_advertised", datastoreMessage: null, error: null });
  }
  try {
    const client = new CkanClient({ baseUrl: entry.apiOrDownload });
    const dataset = await client.packageShow(entry.datasetSlugOrIdentifier);
    const registry = applyCkanDiscovery(entry, dataset, checkedAt);
    const resources = discoverResources(dataset.resources);
    const latest = resources.at(-1)?.resource;
    const contract = contractBySource.get(entry.sourceId);
    const observedColumns = extractCkanSchemaColumns(latest?.schema);
    const schema = contract && observedColumns.length ? validateSchema(contract, observedColumns) : null;
    const advertised = latest?.datastore_active === true || String(latest?.datastore_active).toLowerCase() === "true";
    let datastoreState: DiscoveryResult["datastoreState"] = advertised ? "available" : "not_advertised";
    let datastoreMessage: string | null = null;
    if (advertised && latest) {
      try {
        await client.datastoreSearch(latest.id, { limit: 1 });
      } catch (error) {
        datastoreState = "advertised_unavailable";
        datastoreMessage = safeError(error);
      }
    }
    return Object.freeze({ registry, resources: Object.freeze(resources.map((item) => item.resource)), schema, datastoreState, datastoreMessage, error: null });
  } catch (error) {
    return Object.freeze({
      registry: Object.freeze({ ...entry, lastCheckedAt: checkedAt, status: "source_review_required" }),
      resources: Object.freeze([]),
      schema: null,
      datastoreState: "not_advertised",
      datastoreMessage: null,
      error: safeError(error),
    });
  }
}

async function persist(databasePath: string, results: readonly DiscoveryResult[], checkedAt: string): Promise<void> {
  const { SqliteProvider } = await import("../../src/data/providers/sqlite.mjs");
  const database = new SqliteProvider({ DATABASE_PATH: databasePath });
  await database.initialize();
  try {
    await database.transaction(async (transaction: typeof database) => {
      for (const result of results) {
        const entry = result.registry;
        await transaction.upsert("data_source_registry", {
          source_id: entry.sourceId, publisher: entry.publisher, dataset_name: entry.datasetName,
          dataset_identifier: entry.datasetSlugOrIdentifier, jurisdiction: entry.jurisdiction,
          coverage: entry.coverage, purpose: entry.purpose, access_method: entry.accessMethod,
          discovery_endpoint: entry.apiOrDownload, licence: entry.licence,
          publication_frequency: entry.publicationFrequency, typical_reporting_lag: entry.typicalReportingLag,
          authority_rank: entry.authorityRank, status: entry.status,
          known_caveats_json: JSON.stringify(entry.knownCaveats), provenance_notes: entry.provenanceNotes,
          first_seen_at: entry.firstSeenAt, last_checked_at: entry.lastCheckedAt,
          last_successfully_ingested_at: entry.lastSuccessfullyIngestedAt,
          latest_expected_period: entry.latestExpectedPeriod ?? entry.latestDiscoveredPeriod,
          latest_discovered_period: entry.latestDiscoveredPeriod, period_state_evaluated_at: checkedAt,
          updated_at: checkedAt,
        }, ["source_id"], ["publisher", "dataset_name", "dataset_identifier", "jurisdiction", "coverage", "purpose", "access_method", "discovery_endpoint", "licence", "publication_frequency", "typical_reporting_lag", "authority_rank", "status", "known_caveats_json", "provenance_notes", "last_checked_at", "latest_expected_period", "latest_discovered_period", "period_state_evaluated_at", "updated_at"]);

        for (const resource of result.resources) {
          const discovered = discoverResources([resource])[0];
          if (!discovered) continue;
          const fingerprint = discovered.fingerprint;
          await transaction.upsert("source_resources", {
            id: stableId(entry.sourceId, resource.id, fingerprint), source_id: entry.sourceId,
            external_resource_id: resource.id, reporting_period: discovered.period.key,
            resource_name: resource.title || resource.name, resource_url: resource.url,
            format: String(resource.format || "unknown").toLowerCase(),
            byte_size: resource.size === null || resource.size === undefined || resource.size === "" ? null : Number(resource.size),
            resource_hash: resource.sha256 || resource.hash || null, resource_fingerprint: fingerprint,
            schema_fingerprint: resource.id === entry.latestResourceId ? result.schema?.fingerprint ?? entry.schemaFingerprint : null,
            datastore_state: resource.id === entry.latestResourceId ? result.datastoreState : "not_tested",
            first_seen_at: resource.created || checkedAt, last_seen_at: checkedAt,
            revised_at: resource.last_modified || resource.metadata_modified || null, supersedes_resource_id: null,
          }, ["source_id", "external_resource_id", "resource_fingerprint"], ["reporting_period", "resource_name", "resource_url", "format", "byte_size", "resource_hash", "schema_fingerprint", "datastore_state", "last_seen_at", "revised_at"]);
        }

        if (result.schema) {
          await transaction.upsert("source_schema_versions", {
            id: stableId(entry.sourceId, result.schema.fingerprint), source_id: entry.sourceId,
            variant_name: result.schema.variant, schema_fingerprint: result.schema.fingerprint,
            columns_json: JSON.stringify(result.schema.observedColumns), compatibility_status: result.schema.status,
            effective_from: entry.latestDiscoveredPeriod, effective_to: null, first_seen_at: checkedAt,
            reviewed_at: result.schema.status === "schema_review_required" ? null : checkedAt,
            reviewed_by: result.schema.status === "schema_review_required" ? null : "automated-contract-check",
          }, ["source_id", "schema_fingerprint"], ["variant_name", "columns_json", "compatibility_status", "effective_from", "reviewed_at", "reviewed_by"]);
        }
      }
    });
  } finally {
    await database.close();
  }
}

const options = argumentsFrom(process.argv.slice(2));
const results: DiscoveryResult[] = [];
for (const entry of sourceRegistry) results.push(await discover(entry, options.checkedAt));
if (options.database) await persist(options.database, results, options.checkedAt);

const evidence = Object.freeze({
  evidenceType: "governed-medicines-source-discovery",
  checkedAt: options.checkedAt,
  liveNetworkCheck: true,
  productionIngestionClaim: false,
  registryEntries: results.length,
  ckanSourcesChecked: results.filter((result) => result.registry.accessMethod === "ckan_action_api").length,
  successfulCkanDiscoveries: results.filter((result) => result.registry.accessMethod === "ckan_action_api" && !result.error).length,
  failedCkanDiscoveries: results.filter((result) => result.error).length,
  advertisedDatastoresUnavailable: results.filter((result) => result.datastoreState === "advertised_unavailable").length,
  sources: results.map((result) => ({
    sourceId: result.registry.sourceId,
    publisher: result.registry.publisher,
    datasetName: result.registry.datasetName,
    jurisdiction: result.registry.jurisdiction,
    accessMethod: result.registry.accessMethod,
    status: result.registry.status,
    latestExpectedPeriod: result.registry.latestExpectedPeriod ?? result.registry.latestDiscoveredPeriod,
    latestDiscoveredPeriod: result.registry.latestDiscoveredPeriod,
    latestResourceId: result.registry.latestResourceId,
    latestResourceUrl: result.registry.resourceUrl,
    latestResourceHash: result.registry.resourceHashOrChecksum,
    resourcesDiscovered: result.resources.length,
    schemaStatus: result.schema?.status ?? null,
    schemaFingerprint: result.schema?.fingerprint ?? null,
    missingColumns: result.schema?.missingColumns ?? [],
    datastoreState: result.datastoreState,
    datastoreMessage: result.datastoreMessage,
    knownCaveats: result.registry.knownCaveats,
    error: result.error,
  })),
  localPersistence: options.database ? { databaseFile: basename(options.database), productionDatabase: false } : null,
});

await mkdir(dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ output: options.output, registryEntries: evidence.registryEntries, ckanSourcesChecked: evidence.ckanSourcesChecked, successfulCkanDiscoveries: evidence.successfulCkanDiscoveries, advertisedDatastoresUnavailable: evidence.advertisedDatastoresUnavailable, failedCkanDiscoveries: evidence.failedCkanDiscoveries }));
