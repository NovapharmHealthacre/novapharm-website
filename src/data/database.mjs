import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { SqliteProvider } from "./providers/sqlite.mjs";

const configuredProvider = String(process.env.DATABASE_PROVIDER || (process.env.AZURE_SQL_SERVER ? "azure-sql" : "sqlite")).trim().toLowerCase();
const transactionContext = new AsyncLocalStorage();

async function createProvider() {
  if (configuredProvider === "sqlite") return new SqliteProvider(process.env);
  if (configuredProvider === "azure-sql") {
    const { AzureSqlProvider } = await import("./providers/azure-sql.mjs");
    return new AzureSqlProvider(process.env);
  }
  throw new Error(`Unsupported DATABASE_PROVIDER: ${configuredProvider}`);
}

const provider = await createProvider();
await provider.initialize();

export const databaseProvider = configuredProvider;
export const db = provider.raw;

function executor() {
  return transactionContext.getStore() || provider;
}

export function nowIso() {
  return new Date().toISOString();
}

export function stableHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function all(sql, ...params) {
  return executor().all(sql, params);
}

export async function one(sql, ...params) {
  return executor().one(sql, params);
}

export async function run(sql, ...params) {
  return executor().run(sql, params);
}

export async function upsert(table, values, conflictColumns, updateColumns = []) {
  return executor().upsert(table, values, conflictColumns, updateColumns);
}

export async function insertIgnore(table, values, conflictColumns) {
  return executor().insertIgnore(table, values, conflictColumns);
}

export async function transaction(work) {
  if (transactionContext.getStore()) return work();
  return provider.transaction((transactionExecutor) => transactionContext.run(transactionExecutor, work));
}

export async function allocateNumber(counterKey, prefix, width = 6) {
  return transaction(async () => {
    const current = await one("SELECT value FROM counters WHERE counter_key = ?", counterKey);
    const next = Number(current?.value || 0) + 1;
    await upsert("counters", { counter_key: counterKey, value: next }, ["counter_key"], ["value"]);
    return `${prefix}${String(next).padStart(width, "0")}`;
  });
}

export async function audit({ actor, action, entityType, entityId, correlationId = randomUUID(), before = null, after = null, details = {} }) {
  await run(`
    INSERT INTO audit_logs(id, actor, action, entity_type, entity_id, correlation_id, before_hash, after_hash, details_json, occurred_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  randomUUID(), actor, action, entityType, entityId, correlationId,
  before ? stableHash(before) : null,
  after ? stableHash(after) : null,
  JSON.stringify(details), nowIso());
  return correlationId;
}

export async function enqueue({ eventType, aggregateType, aggregateId, destinationSystem, payload, idempotencyKey }) {
  const id = randomUUID();
  const result = await insertIgnore("integration_events", {
    id,
    event_type: eventType,
    aggregate_type: aggregateType,
    aggregate_id: aggregateId,
    destination_system: destinationSystem,
    idempotency_key: idempotencyKey,
    payload_json: JSON.stringify(payload),
    status: "pending",
    next_attempt_at: nowIso(),
    created_at: nowIso()
  }, ["destination_system", "idempotency_key"]);
  return result.changes ? id : null;
}

export async function databaseReady() {
  return provider.ready();
}

export async function closeDatabase() {
  return provider.close();
}
