import { mkdir, stat, statfs, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve, sep } from "node:path";
import {
  CkanClient,
  decideCapacity,
  discoverResources,
  estimateBackfillStorage,
  gibibyte,
  pathIsInside,
  privateCloudLayout,
  registryEntry,
  type BackfillResourceEstimate,
} from "../../packages/medicines-intelligence/src/index.ts";

interface Options {
  readonly sourceIds: readonly string[];
  readonly from: string | null;
  readonly to: string | null;
  readonly output: string;
  readonly repositoryRoot: string;
  readonly initialise: boolean;
}

const sourceAlias = Object.freeze({ epd: "nhsbsa.epd", pca: "nhsbsa.pca" } as const);

function parsePeriod(value: string, name: string): string {
  if (!/^\d{4}-\d{2}$/u.test(value)) throw new Error(`${name} must be YYYY-MM.`);
  return value;
}

function optionsFrom(values: readonly string[]): Options {
  let sourceIds = ["nhsbsa.epd", "nhsbsa.pca"];
  let from: string | null = null;
  let to: string | null = null;
  let output = resolve("docs/data/evidence/backfill-storage-preflight.json");
  let repositoryRoot = resolve(".");
  let initialise = false;
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--sources" && value) {
      sourceIds = value.split(",").map((item) => sourceAlias[item.trim() as keyof typeof sourceAlias] ?? item.trim()).filter(Boolean);
      index += 1;
      continue;
    }
    if (name === "--from" && value) { from = parsePeriod(value, "--from"); index += 1; continue; }
    if (name === "--to" && value) { to = parsePeriod(value, "--to"); index += 1; continue; }
    if (name === "--output" && value) { output = resolve(value); index += 1; continue; }
    if (name === "--repository-root" && value) { repositoryRoot = resolve(value); index += 1; continue; }
    if (name === "--initialise") { initialise = true; continue; }
    throw new Error(`Unknown or incomplete backfill-planning argument: ${name}`);
  }
  if (!sourceIds.length || sourceIds.some((value) => !["nhsbsa.epd", "nhsbsa.pca"].includes(value))) throw new Error("--sources may contain only epd and pca.");
  if (from && to && from > to) throw new Error("--from must not be after --to.");
  return Object.freeze({ sourceIds: Object.freeze([...new Set(sourceIds)]), from, to, output, repositoryRoot, initialise });
}

async function existingAncestor(value: string): Promise<string> {
  let candidate = resolve(value);
  while (true) {
    try { await stat(candidate); return candidate; } catch {
      const parent = dirname(candidate);
      if (parent === candidate) throw new Error(`No existing filesystem ancestor is available for ${value}.`);
      candidate = parent;
    }
  }
}

function safeNumber(value: bigint, label: string): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted)) throw new Error(`${label} exceeds JavaScript safe integer capacity.`);
  return converted;
}

function evidencePath(value: string): string {
  const home = homedir();
  return value === home || value.startsWith(`${home}${sep}`)
    ? `$HOME${value.slice(home.length)}`
    : value;
}

const options = optionsFrom(process.argv.slice(2));
const layout = privateCloudLayout(process.env);
if (pathIsInside(layout.dataRoot, options.repositoryRoot)) throw new Error("NOVAPHARM_DATA_ROOT must remain outside the Git repository.");

const resources: BackfillResourceEstimate[] = [];
const sourceEvidence: Record<string, unknown>[] = [];
const unknownSizeResources: Record<string, string>[] = [];
for (const sourceId of options.sourceIds) {
  const entry = registryEntry(sourceId);
  const client = new CkanClient({ baseUrl: entry.apiOrDownload });
  const dataset = await client.packageShow(entry.datasetSlugOrIdentifier);
  const discovered = discoverResources(dataset.resources).filter((item) => (!options.from || item.period.key >= options.from) && (!options.to || item.period.key <= options.to));
  for (const item of discovered) {
    const bytes = Number(item.resource.size ?? 0);
    if (!Number.isSafeInteger(bytes) || bytes <= 0) unknownSizeResources.push({ sourceId, period: item.period.key, resourceId: item.resource.id });
    else resources.push(Object.freeze({ sourceId, period: item.period.key, bytes }));
  }
  sourceEvidence.push({
    sourceId,
    datasetIdentifier: dataset.name,
    resourcesSelected: discovered.length,
    earliestPeriod: discovered[0]?.period.key ?? null,
    latestPeriod: discovered.at(-1)?.period.key ?? null,
    declaredBytes: discovered.reduce((total, item) => total + Number(item.resource.size ?? 0), 0),
  });
}
if (!resources.length) throw new Error("No period-bearing EPD or PCA resources were discovered for the requested range.");

const estimate = estimateBackfillStorage(resources);
const filesystemRoot = await existingAncestor(layout.dataRoot);
const filesystem = await statfs(filesystemRoot, { bigint: true });
const availableBytes = safeNumber(filesystem.bavail * filesystem.bsize, "Available filesystem bytes");
const reserveBytes = Math.max(20 * gibibyte, Math.floor(safeNumber(filesystem.blocks * filesystem.bsize, "Filesystem capacity") * 0.1));
const capacity = decideCapacity(availableBytes, estimate.requiredBytes, reserveBytes);
const executionStatus = unknownSizeResources.length
  ? "blocked_unknown_resource_size"
  : capacity.status;

if (options.initialise) {
  const directories = [
    layout.dataRoot,
    layout.objectStoreRoot,
    dirname(layout.databasePath),
    ...Object.values(layout.directories),
    `${layout.directories.raw}/nhsbsa/epd`,
    `${layout.directories.raw}/nhsbsa/pca`,
    `${layout.directories.raw}/nhsbsa/scmd`,
    `${layout.directories.raw}/nhsbsa/bnf`,
    `${layout.directories.raw}/ons`,
    `${layout.directories.raw}/ods`,
    `${layout.directories.raw}/scotland`,
    `${layout.directories.raw}/wales`,
    `${layout.directories.raw}/northern-ireland`,
  ];
  for (const directory of new Set(directories)) await mkdir(directory, { recursive: true, mode: 0o700 });
}

const evidence = Object.freeze({
  evidenceType: "pharmascope-backfill-storage-preflight",
  checkedAt: new Date().toISOString(),
  livePublisherMetadataCheck: true,
  downloadExecuted: false,
  ingestionExecuted: false,
  productionClaim: false,
  environment: layout.environment,
  configuredPaths: {
    dataRoot: evidencePath(layout.dataRoot),
    databasePath: evidencePath(layout.databasePath),
    objectStoreRoot: evidencePath(layout.objectStoreRoot),
    repositoryExternal: true,
  },
  requestedRange: { from: options.from, to: options.to },
  sources: sourceEvidence,
  resourceCount: resources.length,
  unknownSizeResources,
  estimate,
  filesystem: { inspectedAt: evidencePath(filesystemRoot), availableBytes, reserveBytes },
  capacity,
  executionStatus,
  initialised: options.initialise,
  exactBlocker: executionStatus === "blocked_insufficient_capacity"
    ? "The configured volume does not have enough capacity for immutable source files, governed facts, marts, working space and one recovery copy. Mount an adequately sized encrypted external volume or NAS and update NOVAPHARM_DATA_ROOT before execution."
    : executionStatus === "blocked_unknown_resource_size"
      ? "One or more publisher resources has no trustworthy declared size. Resolve its authoritative byte size before any bulk download."
      : null,
});
await mkdir(dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ output: options.output, executionStatus, resourceCount: resources.length, rawBytes: estimate.rawBytes, requiredBytes: estimate.requiredBytes, availableBytes, shortfallBytes: capacity.shortfallBytes }));
