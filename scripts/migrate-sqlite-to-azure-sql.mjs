import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { AzureSqlProvider } from "../src/data/providers/azure-sql.mjs";
import { AzureBlobDocumentStore } from "../src/storage/providers/azure-blob-document-store.mjs";

const migrationTarget = String(process.env.ALLOW_AZURE_DATA_MIGRATION || "").toLowerCase();
if (!["staging", "production"].includes(migrationTarget)) {
  throw new Error("Set ALLOW_AZURE_DATA_MIGRATION to staging or production only after the corresponding migration is approved.");
}
if (migrationTarget === "production" && process.env.PRODUCTION_MIGRATION_APPROVED !== "true") {
  throw new Error("Production migration requires PRODUCTION_MIGRATION_APPROVED=true after the owner approves the cutover window.");
}

const sourceValue = String(process.env.SQLITE_MIGRATION_SOURCE || "").trim();
const backupValue = String(process.env.MIGRATION_VERIFIED_BACKUP_PATH || "").trim();
if (!sourceValue || !backupValue) throw new Error("SQLITE_MIGRATION_SOURCE and MIGRATION_VERIFIED_BACKUP_PATH are required.");
const sourcePath = resolve(sourceValue);
const verifiedBackupPath = resolve(backupValue);
if (!existsSync(sourcePath)) throw new Error("SQLITE_MIGRATION_SOURCE must point to the source SQLite database.");
if (!existsSync(verifiedBackupPath) || verifiedBackupPath === sourcePath) {
  throw new Error("MIGRATION_VERIFIED_BACKUP_PATH must point to a separate, verified pre-migration backup.");
}

const source = new DatabaseSync(sourcePath, { readOnly: true });
const integrity = source.prepare("PRAGMA integrity_check").get()?.integrity_check;
if (integrity !== "ok") throw new Error("The source SQLite integrity check did not pass.");
const verifiedBackup = new DatabaseSync(verifiedBackupPath, { readOnly: true });
if (verifiedBackup.prepare("PRAGMA integrity_check").get()?.integrity_check !== "ok") {
  throw new Error("The pre-migration backup integrity check did not pass.");
}

const tables = [
  "organizations", "customers", "suppliers", "products", "batches", "orders", "order_lines", "invoices", "invoice_lines",
  "purchase_orders", "purchase_order_lines", "users", "auth_user_scopes", "customer_contacts", "employees", "documents", "document_links",
  "sharepoint_links", "approvals", "regulatory_records", "quality_records", "stock_transactions", "warehouse_transactions",
  "crm_activities", "leads", "lead_details", "support_tickets", "notifications", "account_applications",
  "application_status_history", "application_upload_grants", "training_records",
  "integration_events", "audit_logs", "security_events", "counters"
];
const conflictColumns = {
  auth_user_scopes: ["username", "scope"],
  lead_details: ["lead_id"],
  counters: ["counter_key"]
};

function tableExists(name) {
  return Boolean(source.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

function tableRows(name) {
  return tableExists(name) ? source.prepare(`SELECT * FROM ${name}`).all() : [];
}

const sourceUsers = tableRows("users");
let approvedUsernames = new Set();
if (sourceUsers.length) {
  const manifestPath = resolve(process.env.APPROVED_IDENTITY_MANIFEST || "");
  if (!manifestPath || !existsSync(manifestPath)) {
    throw new Error("Source users exist. APPROVED_IDENTITY_MANIFEST must point to an owner-approved JSON array of production usernames; local credentials are never migrated.");
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest) || manifest.some((username) => typeof username !== "string")) {
    throw new Error("APPROVED_IDENTITY_MANIFEST must be a JSON array of usernames.");
  }
  approvedUsernames = new Set(manifest.map((username) => username.toLowerCase()));
  const sourceNames = new Set(sourceUsers.map((user) => String(user.username).toLowerCase()));
  for (const username of approvedUsernames) {
    if (!sourceNames.has(username)) throw new Error("The approved identity manifest includes a username not present in the source database.");
  }
}

const approvedUserIds = new Set(sourceUsers.filter((user) => approvedUsernames.has(String(user.username).toLowerCase())).map((user) => user.id));
const selectedRows = Object.fromEntries(tables.map((table) => [table, tableRows(table)]));
for (const table of tables) {
  if (!tableExists(table)) continue;
  const sourceCount = Number(source.prepare(`SELECT COUNT(*) AS value FROM ${table}`).get().value);
  const backupHasTable = Boolean(verifiedBackup.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
  const backupCount = backupHasTable ? Number(verifiedBackup.prepare(`SELECT COUNT(*) AS value FROM ${table}`).get().value) : -1;
  if (sourceCount !== backupCount) throw new Error(`The verified backup does not reconcile with source table ${table}.`);
}
selectedRows.users = selectedRows.users
  .filter((user) => approvedUsernames.has(String(user.username).toLowerCase()))
  .map((user) => ({ ...user, status: "invited", identity_provider: user.identity_provider || "local" }));
selectedRows.auth_user_scopes = selectedRows.auth_user_scopes.filter((scope) => approvedUsernames.has(String(scope.username).toLowerCase()));
selectedRows.employees = selectedRows.employees.filter((employee) => !employee.user_id || approvedUserIds.has(employee.user_id));
selectedRows.approvals = selectedRows.approvals.map((row) => ({ ...row, actor_user_id: approvedUserIds.has(row.actor_user_id) ? row.actor_user_id : null }));
selectedRows.quality_records = selectedRows.quality_records.map((row) => ({ ...row, owner_user_id: approvedUserIds.has(row.owner_user_id) ? row.owner_user_id : null }));
selectedRows.crm_activities = selectedRows.crm_activities.map((row) => ({ ...row, owner_user_id: approvedUserIds.has(row.owner_user_id) ? row.owner_user_id : null }));
selectedRows.support_tickets = selectedRows.support_tickets.map((row) => ({ ...row, requester_user_id: approvedUserIds.has(row.requester_user_id) ? row.requester_user_id : null }));

const documents = selectedRows.documents;
let blobStore = null;
const stagedDocumentEvents = [];
if (documents.length) {
  if (process.env.MIGRATE_DOCUMENT_BINARIES !== "true") {
    throw new Error("Documents exist. Set MIGRATE_DOCUMENT_BINARIES=true only after private Blob Storage and malware scanning are approved and configured.");
  }
  blobStore = new AzureBlobDocumentStore(process.env);
  await blobStore.initialize();
  for (const document of documents) {
    if (!existsSync(document.storage_path)) throw new Error(`A source document file is missing for document ${document.document_number}.`);
    const bytes = await readFile(document.storage_path);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    if (checksum !== document.checksum_sha256) throw new Error(`Checksum verification failed for document ${document.document_number}.`);
    const stored = await blobStore.putQuarantine({
      bytes,
      objectName: `migration/${document.id}/${document.id}-${document.file_name}`,
      contentType: document.content_type,
      metadata: { documentid: document.id, checksum }
    });
    document.storage_path = stored.storagePath;
    document.lifecycle_status = "quarantine";
    document.security_status = "pending_scan";
    document.malware_scan_result = null;
    document.malware_scanned_at = null;
    stagedDocumentEvents.push({
      id: randomUUID(),
      event_type: "document.malware_scan_requested",
      aggregate_type: "document",
      aggregate_id: document.id,
      source_system: "novapharm",
      destination_system: "azure_storage",
      idempotency_key: `document:${document.id}:malware-scan:v1`,
      payload_json: JSON.stringify({
        operation: "verify_malware_scan",
        documentId: document.id,
        entityType: "migration_review",
        entityId: document.id,
        checksum,
        folderPath: `Migration Review/${document.document_number}`
      }),
      status: "pending",
      attempt_count: 0,
      next_attempt_at: new Date().toISOString(),
      last_error_code: null,
      created_at: new Date().toISOString(),
      processed_at: null
    });
  }
}

selectedRows.integration_events = selectedRows.integration_events.filter((event) => {
  if (event.destination_system !== "sharepoint") return true;
  try {
    return !JSON.parse(event.payload_json)?.documentId;
  } catch {
    return false;
  }
});
selectedRows.integration_events.push(...stagedDocumentEvents);

const maximumRows = Number(process.env.MIGRATION_MAX_ROWS || 100000);
const totalRows = Object.values(selectedRows).reduce((sum, rows) => sum + rows.length, 0);
if (!Number.isSafeInteger(maximumRows) || maximumRows < 1 || totalRows > maximumRows) {
  throw new Error("Migration row count exceeds MIGRATION_MAX_ROWS; review capacity and run a controlled batch migration.");
}

const target = new AzureSqlProvider(process.env);
await target.initialize();
const populated = await target.one(`SELECT
  (SELECT COUNT(*) FROM organizations) +
  (SELECT COUNT(*) FROM leads) +
  (SELECT COUNT(*) FROM documents) +
  (SELECT COUNT(*) FROM users) AS value`);
if (Number(populated?.value || 0) > 0) throw new Error("Azure SQL target is not empty. Create a fresh staging database or restore the approved pre-migration target before retrying.");

const importedCounts = {};
await target.transaction(async (transaction) => {
  for (const table of tables) {
    const rows = selectedRows[table];
    for (const row of rows) {
      const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === undefined ? null : value]));
      await transaction.insertIgnore(table, values, conflictColumns[table] || ["id"]);
    }
    importedCounts[table] = rows.length;
  }
});

const reconciledCounts = {};
for (const table of tables) {
  const count = Number((await target.one(`SELECT COUNT(*) AS value FROM ${table}`))?.value || 0);
  reconciledCounts[table] = count;
  if (count !== importedCounts[table]) throw new Error(`Record-count reconciliation failed for ${table}.`);
}

const report = {
  status: "completed",
  target: migrationTarget,
  completedAt: new Date().toISOString(),
  sourceIntegrity: integrity,
  sourceBackupVerified: true,
  localCredentialsMigrated: false,
  localSessionsMigrated: false,
  approvedIdentityProfiles: selectedRows.users.length,
  unapprovedIdentityProfilesExcluded: sourceUsers.length - selectedRows.users.length,
  documentsQuarantinedForScanning: documents.length,
  importedCounts,
  reconciledCounts
};
const reportPath = resolve(process.env.MIGRATION_REPORT_PATH || `/tmp/novapharm-azure-migration-${Date.now()}.json`);
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });

source.close();
verifiedBackup.close();
await target.close();
console.log(`Azure SQL migration completed and reconciled. Non-sensitive report: ${reportPath}`);
