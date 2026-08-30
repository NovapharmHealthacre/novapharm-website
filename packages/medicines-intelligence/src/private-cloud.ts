import { isAbsolute, join, normalize, relative, resolve, sep } from "node:path";

export const gibibyte = 1024 ** 3;

export type PrivateCloudEnvironment = "local_private_cloud" | "managed_staging" | "production";

export interface PrivateCloudLayout {
  readonly environment: PrivateCloudEnvironment;
  readonly dataRoot: string;
  readonly databasePath: string;
  readonly objectStoreRoot: string;
  readonly directories: Readonly<{
    raw: string;
    rawImmutable: string;
    curated: string;
    parquet: string;
    marts: string;
    warehouse: string;
    forecasts: string;
    manifests: string;
    exports: string;
    backups: string;
    logs: string;
    checkpoints: string;
  }>;
}

export interface BackfillResourceEstimate {
  readonly sourceId: string;
  readonly period: string;
  readonly bytes: number;
}

export interface BackfillStorageEstimate {
  readonly resourceCount: number;
  readonly rawBytes: number;
  readonly curatedAndFactBytes: number;
  readonly martAndIndexBytes: number;
  readonly workingBytes: number;
  readonly backupBytes: number;
  readonly requiredBytes: number;
  readonly assumptions: readonly string[];
}

export interface CapacityDecision {
  readonly status: "sufficient" | "blocked_insufficient_capacity";
  readonly availableBytes: number;
  readonly reserveBytes: number;
  readonly usableBytes: number;
  readonly requiredBytes: number;
  readonly shortfallBytes: number;
}

function requiredAbsolute(value: string, name: string): string {
  const candidate = value.trim();
  if (!candidate || !isAbsolute(candidate)) throw new Error(`${name} must be an absolute path.`);
  return normalize(resolve(candidate));
}

function governedEnvironment(value: string): PrivateCloudEnvironment {
  if (value === "local_private_cloud" || value === "managed_staging" || value === "production") return value;
  throw new Error("NOVAPHARM_ENVIRONMENT must be local_private_cloud, managed_staging or production.");
}

export function privateCloudLayout(environment: Readonly<Record<string, string | undefined>>): PrivateCloudLayout {
  const dataRoot = requiredAbsolute(environment["NOVAPHARM_DATA_ROOT"] ?? "", "NOVAPHARM_DATA_ROOT");
  const objectStoreRoot = requiredAbsolute(environment["NOVAPHARM_OBJECT_STORE"] ?? join(dataRoot, "objects"), "NOVAPHARM_OBJECT_STORE");
  const databaseValue = environment["NOVAPHARM_DATABASE_URL"] ?? join(dataRoot, "database", "novapharm.sqlite");
  const databasePath = databaseValue.startsWith("sqlite:") ? requiredAbsolute(databaseValue.slice("sqlite:".length), "NOVAPHARM_DATABASE_URL") : requiredAbsolute(databaseValue, "NOVAPHARM_DATABASE_URL");
  return Object.freeze({
    environment: governedEnvironment(environment["NOVAPHARM_ENVIRONMENT"] ?? "local_private_cloud"),
    dataRoot,
    databasePath,
    objectStoreRoot,
    directories: Object.freeze({
      raw: join(dataRoot, "raw"),
      rawImmutable: join(dataRoot, "raw"),
      curated: join(dataRoot, "curated"),
      parquet: join(dataRoot, "curated", "parquet"),
      marts: join(dataRoot, "marts"),
      warehouse: join(dataRoot, "warehouse"),
      forecasts: join(dataRoot, "forecasts"),
      manifests: join(dataRoot, "manifests"),
      exports: join(dataRoot, "exports"),
      backups: join(dataRoot, "backups"),
      logs: join(dataRoot, "logs"),
      checkpoints: join(dataRoot, "checkpoints"),
    }),
  });
}

export function pathIsInside(candidate: string, parent: string): boolean {
  const relationship = relative(normalize(resolve(parent)), normalize(resolve(candidate)));
  return relationship === "" || (!relationship.startsWith(`..${sep}`) && relationship !== ".." && !isAbsolute(relationship));
}

export function estimateBackfillStorage(resources: readonly BackfillResourceEstimate[]): BackfillStorageEstimate {
  if (!resources.length) throw new Error("At least one governed source resource is required for a storage estimate.");
  for (const resource of resources) {
    if (!resource.sourceId || !/^\d{4}-\d{2}$/u.test(resource.period)) throw new Error("Every backfill resource requires a source identifier and YYYY-MM period.");
    if (!Number.isSafeInteger(resource.bytes) || resource.bytes <= 0) throw new Error("Every backfill resource requires a positive safe byte size.");
  }
  const rawBytes = resources.reduce((total, resource) => total + resource.bytes, 0);
  const curatedAndFactBytes = Math.ceil(rawBytes * 1.5);
  const martAndIndexBytes = Math.ceil(rawBytes * 0.5);
  const workingBytes = Math.ceil(rawBytes * 0.25);
  const backupBytes = Math.ceil(rawBytes);
  const requiredBytes = rawBytes + curatedAndFactBytes + martAndIndexBytes + workingBytes + backupBytes;
  return Object.freeze({
    resourceCount: resources.length,
    rawBytes,
    curatedAndFactBytes,
    martAndIndexBytes,
    workingBytes,
    backupBytes,
    requiredBytes,
    assumptions: Object.freeze([
      "Raw source files are retained immutably at their declared publisher size.",
      "Curated facts and database overhead are conservatively estimated at 1.5 times raw bytes.",
      "Marts and indexes are estimated at 0.5 times raw bytes.",
      "Resumable-download and transformation working space is estimated at 0.25 times raw bytes.",
      "One full source-sized recovery copy is reserved; real measurements must replace these planning ratios after the first accepted period.",
    ]),
  });
}

export function decideCapacity(availableBytes: number, requiredBytes: number, reserveBytes = 20 * gibibyte): CapacityDecision {
  for (const [name, value] of [["availableBytes", availableBytes], ["requiredBytes", requiredBytes], ["reserveBytes", reserveBytes]] as const) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative safe integer.`);
  }
  const usableBytes = Math.max(0, availableBytes - reserveBytes);
  const shortfallBytes = Math.max(0, requiredBytes - usableBytes);
  return Object.freeze({
    status: shortfallBytes === 0 ? "sufficient" : "blocked_insufficient_capacity",
    availableBytes,
    reserveBytes,
    usableBytes,
    requiredBytes,
    shortfallBytes,
  });
}
