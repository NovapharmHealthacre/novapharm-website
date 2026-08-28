import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { CkanPackage, CkanResource } from "./types.ts";

interface CkanActionEnvelope<T> {
  readonly success: boolean;
  readonly result?: T;
  readonly error?: Readonly<{ message?: string; __type?: string }>;
}

export interface CkanPackageSearchResult {
  readonly count: number;
  readonly results: readonly CkanPackage[];
}

export interface CkanDatastoreResult {
  readonly total: number;
  readonly fields: readonly Readonly<{ id: string; type: string }>[];
  readonly records: readonly Readonly<Record<string, unknown>>[];
}

export interface CkanClientOptions {
  readonly baseUrl: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly fetchImplementation?: typeof fetch;
  readonly userAgent?: string;
}

export interface ResourceDownloadOptions {
  readonly destination: string;
  readonly maxBytes: number;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  readonly preferZip?: boolean;
}

export interface ResourceDownloadResult {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly resumed: boolean;
  readonly sourceUrl: string;
  readonly expectedHashMatched: boolean | null;
}

export class CkanActionError extends Error {
  readonly statusCode: number;
  readonly action: string;
  readonly retryable: boolean;
  readonly retryAfter: string | null;

  constructor(message: string, statusCode: number, action: string, retryable = false, retryAfter: string | null = null) {
    super(message);
    this.name = "CkanActionError";
    this.statusCode = statusCode;
    this.action = action;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }
}

function assertHttpsOrLoopback(value: string): URL {
  const url = new URL(value);
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) throw new Error("CKAN endpoints must use HTTPS outside loopback tests.");
  return url;
}

function retryDelay(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 30_000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.min(Math.max(0, date - Date.now()), 30_000);
  }
  return Math.min(500 * (2 ** attempt), 8_000);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
}

function safeSql(value: string): string {
  const sql = value.trim();
  if (sql.length < 8 || sql.length > 4_000 || !/^select\b/iu.test(sql)) throw new Error("CKAN DataStore SQL must be one bounded SELECT statement.");
  if (/;|--|\/\*|\b(?:insert|update|delete|drop|alter|create|grant|revoke|copy)\b/iu.test(sql)) throw new Error("CKAN DataStore SQL contains a prohibited token.");
  return sql;
}

function validResourceId(value: string): string {
  if (!/^[a-z0-9][a-z0-9._-]{2,127}$/iu.test(value)) throw new Error("CKAN resource identifier is invalid.");
  return value;
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function fileSize(path: string): Promise<number> {
  try { return (await stat(path)).size; } catch { return 0; }
}

function contentTypeAllowed(response: Response, extension: string): boolean {
  const type = String(response.headers.get("content-type") ?? "").toLowerCase();
  if (!type) return true;
  if (extension === "zip") return type.includes("zip") || type.includes("octet-stream");
  return type.includes("csv") || type.includes("text/plain") || type.includes("octet-stream");
}

export class CkanClient {
  readonly baseUrl: URL;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly fetchImplementation: typeof fetch;
  readonly userAgent: string;

  constructor(options: CkanClientOptions) {
    const baseUrl = assertHttpsOrLoopback(options.baseUrl);
    this.baseUrl = new URL(baseUrl.href.endsWith("/") ? baseUrl.href : `${baseUrl.href}/`);
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.maxRetries = options.maxRetries ?? 3;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.userAgent = options.userAgent ?? "NovaPharm-Medicines-Intelligence/0.1 (+https://novapharmhealthcare.com)";
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 250 || this.timeoutMs > 120_000) throw new Error("CKAN timeout must be between 250 ms and 120 seconds.");
    if (!Number.isInteger(this.maxRetries) || this.maxRetries < 0 || this.maxRetries > 5) throw new Error("CKAN retry count must be between zero and five.");
  }

  private async action<T>(action: string, parameters: Readonly<Record<string, string>>, signal?: AbortSignal): Promise<T> {
    const endpoint = new URL(action, this.baseUrl);
    for (const [key, value] of Object.entries(parameters)) endpoint.searchParams.set(key, value);
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
      const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
      try {
        const response = await this.fetchImplementation(endpoint, { headers: { Accept: "application/json", "User-Agent": this.userAgent }, signal: requestSignal });
        const retryable = response.status === 429 || response.status >= 500;
        const retryAfter = response.headers.get("retry-after");
        const type = String(response.headers.get("content-type") ?? "").toLowerCase();
        if (!type.includes("json")) throw new CkanActionError(`CKAN ${action} returned an unexpected content type.`, response.status, action, retryable, retryAfter);
        const envelope = await response.json() as CkanActionEnvelope<T>;
        if (!response.ok || envelope.success !== true || envelope.result === undefined) {
          const message = envelope.error?.message || envelope.error?.__type || `CKAN ${action} failed.`;
          throw new CkanActionError(message, response.status, action, retryable, retryAfter);
        }
        return envelope.result;
      } catch (error) {
        if (signal?.aborted) throw signal.reason;
        lastError = error;
        const retryable = error instanceof CkanActionError ? error.retryable : !(error instanceof TypeError && /invalid|parse/iu.test(error.message));
        if (!retryable || attempt >= this.maxRetries) throw error;
        await delay(retryDelay(attempt, error instanceof CkanActionError ? error.retryAfter : null), signal);
      }
    }
    throw lastError;
  }

  packageSearch(query: string, options: Readonly<{ rows?: number; start?: number; signal?: AbortSignal }> = {}): Promise<CkanPackageSearchResult> {
    const rows = options.rows ?? 50;
    const start = options.start ?? 0;
    if (!Number.isInteger(rows) || rows < 1 || rows > 100 || !Number.isInteger(start) || start < 0) throw new Error("CKAN package search bounds are invalid.");
    return this.action("package_search", { q: query.trim(), rows: String(rows), start: String(start) }, options.signal);
  }

  packageShow(identifier: string, signal?: AbortSignal): Promise<CkanPackage> {
    if (!/^[a-z0-9][a-z0-9._-]{2,159}$/iu.test(identifier)) throw new Error("CKAN package identifier is invalid.");
    return this.action("package_show", { id: identifier }, signal);
  }

  datastoreSearch(resourceId: string, options: Readonly<{ limit?: number; offset?: number; filters?: Readonly<Record<string, string | number | boolean>>; signal?: AbortSignal }> = {}): Promise<CkanDatastoreResult> {
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 0 || limit > 1_000 || !Number.isInteger(offset) || offset < 0) throw new Error("CKAN DataStore query bounds are invalid.");
    const parameters: Record<string, string> = { resource_id: validResourceId(resourceId), limit: String(limit), offset: String(offset) };
    if (options.filters) parameters["filters"] = JSON.stringify(options.filters);
    return this.action("datastore_search", parameters, options.signal);
  }

  datastoreSearchSql(sql: string, signal?: AbortSignal): Promise<CkanDatastoreResult> {
    return this.action("datastore_search_sql", { sql: safeSql(sql) }, signal);
  }

  async downloadResource(resource: CkanResource, options: ResourceDownloadOptions): Promise<ResourceDownloadResult> {
    if (!Number.isFinite(options.maxBytes) || options.maxBytes <= 0) throw new Error("A positive bulk-download byte limit is required.");
    const downloadTimeoutMs = options.timeoutMs ?? 4 * 60 * 60 * 1000;
    if (!Number.isInteger(downloadTimeoutMs) || downloadTimeoutMs < 120_000 || downloadTimeoutMs > 24 * 60 * 60 * 1000) {
      throw new Error("Bulk-download timeout must be between two minutes and 24 hours.");
    }
    const declaredSize = Number(resource.size ?? 0);
    if (declaredSize > options.maxBytes) throw new Error(`Resource ${resource.id} exceeds the approved download limit.`);
    const useZip = options.preferZip === true && Boolean(resource.zip_url);
    const sourceUrl = useZip ? String(resource.zip_url) : resource.url;
    assertHttpsOrLoopback(sourceUrl);
    await mkdir(dirname(options.destination), { recursive: true });
    const partial = `${options.destination}.part`;
    const checkpoint = `${options.destination}.checkpoint.json`;
    const existing = await fileSize(partial);
    const headers: Record<string, string> = { Accept: useZip ? "application/zip, application/octet-stream" : "text/csv, text/plain, application/octet-stream", "User-Agent": this.userAgent };
    if (existing > 0) headers["Range"] = `bytes=${existing}-`;
    const timeoutSignal = AbortSignal.timeout(downloadTimeoutMs);
    const requestSignal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
    const response = await this.fetchImplementation(sourceUrl, { headers, signal: requestSignal });
    if (!response.ok || !response.body) throw new CkanActionError(`Resource download failed with HTTP ${response.status}.`, response.status, "resource_download", response.status === 429 || response.status >= 500);
    const extension = useZip ? "zip" : "csv";
    if (!contentTypeAllowed(response, extension)) throw new CkanActionError("Resource download returned an unexpected content type.", response.status, "resource_download");
    const resumed = existing > 0 && response.status === 206;
    const start = resumed ? existing : 0;
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > 0 && start + contentLength > options.maxBytes) throw new Error(`Resource ${resource.id} exceeds the approved download limit.`);
    try {
      await pipeline(Readable.fromWeb(response.body as never), createWriteStream(partial, { flags: resumed ? "a" : "w" }));
    } catch (error) {
      await writeFile(checkpoint, `${JSON.stringify({ resourceId: resource.id, sourceUrl, bytes: await fileSize(partial), interruptedAt: new Date().toISOString() }, null, 2)}\n`, { mode: 0o600 });
      throw error;
    }
    const bytes = await fileSize(partial);
    if (bytes > options.maxBytes) { await unlink(partial).catch(() => undefined); throw new Error(`Resource ${resource.id} exceeded the approved download limit while streaming.`); }
    const sha256 = await sha256File(partial);
    const expected = useZip ? null : (resource.sha256 || resource.hash || null);
    const expectedHashMatched = expected && /^[a-f0-9]{64}$/iu.test(expected) ? sha256.toLowerCase() === expected.toLowerCase() : null;
    if (expectedHashMatched === false) throw new Error(`Resource ${resource.id} failed SHA-256 verification.`);
    await rename(partial, options.destination);
    await unlink(checkpoint).catch(() => undefined);
    return Object.freeze({ path: options.destination, bytes, sha256, resumed, sourceUrl, expectedHashMatched });
  }
}

export async function readDownloadCheckpoint(destination: string): Promise<unknown | null> {
  try { return JSON.parse(await readFile(`${destination}.checkpoint.json`, "utf8")); } catch { return null; }
}
