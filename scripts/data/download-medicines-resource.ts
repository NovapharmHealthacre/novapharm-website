import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, stat, statfs, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import {
  CkanActionError,
  CkanClient,
  decideCapacity,
  discoverResources,
  estimateBackfillStorage,
  gibibyte,
  pathIsInside,
  privateCloudLayout,
  registryEntry,
} from "../../packages/medicines-intelligence/src/index.ts";

interface Options {
  readonly sourceId: "nhsbsa.epd" | "nhsbsa.pca";
  readonly period: string;
  readonly execute: boolean;
}

function optionsFrom(values: readonly string[]): Options {
  let sourceId: Options["sourceId"] | null = null;
  let period = "";
  let execute = false;
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--source" && value) {
      sourceId = value === "epd" ? "nhsbsa.epd" : value === "pca" ? "nhsbsa.pca" : null;
      index += 1;
      continue;
    }
    if (name === "--period" && value) { period = value; index += 1; continue; }
    if (name === "--execute") { execute = true; continue; }
    throw new Error(`Unknown or incomplete resource-download argument: ${name}`);
  }
  if (!sourceId) throw new Error("--source must be epd or pca.");
  if (!/^\d{4}-\d{2}$/u.test(period)) throw new Error("--period must be YYYY-MM.");
  return Object.freeze({ sourceId, period, execute });
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

function bytesFrom(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error("Filesystem capacity exceeds safe integer precision.");
  return result;
}

async function pathExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function retryableDownloadError(error: unknown): boolean {
  if (error instanceof CkanActionError) return error.retryable;
  return error instanceof DOMException
    || (error instanceof Error && /abort|fetch|network|socket|timeout|terminated/iu.test(error.message));
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise((accept) => setTimeout(accept, milliseconds));
}

const options = optionsFrom(process.argv.slice(2));
const layout = privateCloudLayout(process.env);
if (pathIsInside(layout.dataRoot, process.cwd())) throw new Error("The governed data root must remain outside the Git repository.");
const entry = registryEntry(options.sourceId);
const client = new CkanClient({ baseUrl: entry.apiOrDownload, timeoutMs: 60_000, maxRetries: 3 });
const dataset = await client.packageShow(entry.datasetSlugOrIdentifier);
const resource = discoverResources(dataset.resources).find((item) => item.period.key === options.period)?.resource;
if (!resource) throw new Error(`${options.sourceId} has no active period-bearing resource for ${options.period}.`);
const declaredBytes = Number(resource.size ?? 0);
if (!Number.isSafeInteger(declaredBytes) || declaredBytes <= 0) throw new Error("The publisher resource has no trustworthy declared byte size.");
const estimate = estimateBackfillStorage([{ sourceId: options.sourceId, period: options.period, bytes: declaredBytes }]);
const filesystem = await statfs(await existingAncestor(layout.dataRoot), { bigint: true });
const availableBytes = bytesFrom(filesystem.bavail * filesystem.bsize);
const totalBytes = bytesFrom(filesystem.blocks * filesystem.bsize);
const capacity = decideCapacity(availableBytes, estimate.requiredBytes, Math.max(20 * gibibyte, Math.floor(totalBytes * 0.1)));
if (capacity.status !== "sufficient") throw new Error(`Bulk download blocked: the configured volume is short by ${capacity.shortfallBytes} bytes after governed reserve.`);

const [year, month] = options.period.split("-");
const extension = extname(new URL(resource.url).pathname).toLowerCase() === ".zip" ? ".zip" : ".csv";
const sourceFolder = options.sourceId.endsWith("epd") ? "epd" : "pca";
const destination = join(layout.directories.raw, "nhsbsa", sourceFolder, year as string, month as string, `${resource.id}${extension}`);
const manifestPath = join(layout.directories.manifests, `${options.sourceId.replaceAll(".", "-")}-${options.period}-${resource.id}.json`);
if (!options.execute) {
  console.log(JSON.stringify({
    execution: "dry_run",
    sourceId: options.sourceId,
    period: options.period,
    resourceId: resource.id,
    declaredBytes,
    destination,
    destinationExists: await pathExists(destination),
    manifestExists: await pathExists(manifestPath),
    capacity,
  }));
  process.exit(0);
}

await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
await mkdir(dirname(manifestPath), { recursive: true, mode: 0o700 });
if (await pathExists(manifestPath)) {
  const existing = JSON.parse(await readFile(manifestPath, "utf8")) as {
    sourceId?: unknown;
    reportingPeriod?: unknown;
    resourceId?: unknown;
    destination?: unknown;
    bytes?: unknown;
    sha256?: unknown;
    immutable?: unknown;
  };
  if (existing.immutable !== true
    || existing.sourceId !== options.sourceId
    || existing.reportingPeriod !== options.period
    || existing.resourceId !== resource.id
    || resolve(String(existing.destination ?? "")) !== resolve(destination)
    || Number(existing.bytes) !== declaredBytes
    || !/^[a-f0-9]{64}$/iu.test(String(existing.sha256 ?? ""))) {
    throw new Error("The existing immutable download manifest does not match the currently discovered source resource.");
  }
  if (!await pathExists(destination)) throw new Error("The immutable manifest exists but its governed source file is missing.");
  const existingStat = await stat(destination);
  if (existingStat.size !== declaredBytes || await sha256File(destination) !== existing.sha256) {
    throw new Error("The existing immutable source file failed its manifest size or SHA-256 check.");
  }
  console.log(JSON.stringify({ execution: "already_downloaded", manifest: manifestPath, sourceId: options.sourceId, period: options.period, bytes: declaredBytes, sha256: existing.sha256 }));
} else {
  if (await pathExists(destination)) throw new Error("A source file exists without its immutable manifest. Preserve it for investigation and reconcile it before retrying.");
  const timeoutMs = Number(process.env["NOVAPHARM_BULK_DOWNLOAD_TIMEOUT_MS"] ?? 6 * 60 * 60 * 1000);
  let download: Awaited<ReturnType<CkanClient["downloadResource"]>> | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      download = await client.downloadResource(resource, {
        destination,
        maxBytes: declaredBytes + 1024 * 1024,
        timeoutMs,
        preferZip: extension === ".zip",
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 3 || !retryableDownloadError(error)) throw error;
      await wait(1_000 * 2 ** attempt);
    }
  }
  if (!download) throw lastError instanceof Error ? lastError : new Error("The governed bulk download did not complete.");
  if (download.bytes !== declaredBytes) throw new Error(`Downloaded bytes ${download.bytes} do not reconcile with publisher metadata ${declaredBytes}.`);
  const manifest = Object.freeze({
    schemaVersion: "1.0.0",
    createdAt: new Date().toISOString(),
    sourceId: options.sourceId,
    datasetIdentifier: dataset.name,
    reportingPeriod: options.period,
    resourceId: resource.id,
    sourceUrl: download.sourceUrl,
    destination: download.path,
    bytes: download.bytes,
    sha256: download.sha256,
    expectedHashMatched: download.expectedHashMatched,
    resumed: download.resumed,
    immutable: true,
    ingestionStatus: "downloaded_not_ingested",
    productionClaim: false,
  });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ execution: "downloaded", manifest: manifestPath, sourceId: options.sourceId, period: options.period, bytes: download.bytes, sha256: download.sha256 }));
}
