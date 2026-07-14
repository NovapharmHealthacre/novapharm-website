import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = mkdtempSync(join(tmpdir(), "novapharm-scan-engine-"));
process.env.DATABASE_PATH = join(root, "scan.sqlite");
process.env.DOCUMENT_STORAGE_ROOT = join(root, "documents");

const { all, closeDatabase, nowIso, one, run } = await import("../src/data/database.mjs");
const { processDocumentScanEvents } = await import("../src/integrations/azure-storage/scan-engine.mjs");

async function seed(documentId, eventId, scanState) {
  const now = nowIso();
  await run(`INSERT INTO documents(
    id, document_number, title, file_name, content_type, size_bytes, checksum_sha256,
    storage_path, document_class, lifecycle_status, security_status, created_at, created_by, updated_at, updated_by
  ) VALUES(?, ?, 'Test document', 'test.pdf', 'application/pdf', 5, ?, ?, 'test', 'quarantine', 'pending_scan', ?, 'test', ?, 'test')`,
  documentId, `DOC-${documentId}`, "a".repeat(64), `azblob://uploads-quarantine/${documentId}.pdf`, now, now);
  await run(`INSERT INTO integration_events(
    id, event_type, aggregate_type, aggregate_id, destination_system, idempotency_key,
    payload_json, status, attempt_count, next_attempt_at, created_at
  ) VALUES(?, 'document.malware_scan_requested', 'document', ?, 'azure_storage', ?, ?, 'pending', 0, ?, ?)`,
  eventId, documentId, `scan:${documentId}`, JSON.stringify({ documentId, entityType: "customer", entityId: "customer-1", checksum: "a".repeat(64), folderPath: "Customers/CUST-1" }), now, now);
  return scanState;
}

try {
  await seed("clean-document", "clean-event", "clean");
  const calls = { promote: 0, remove: 0 };
  const cleanStore = {
    scanStatus: async () => ({ state: "clean", result: "No threats found", scannedAt: nowIso() }),
    promote: async () => {
      calls.promote += 1;
      return "azblob://documents-private/clean-document.pdf";
    },
    remove: async () => { calls.remove += 1; }
  };
  assert.deepEqual(await processDocumentScanEvents({ store: cleanStore }), { processed: 1, clean: 1, pending: 0, malicious: 0, failed: 0 });
  assert.equal((await one("SELECT security_status FROM documents WHERE id = ?", "clean-document")).security_status, "clean");
  assert.equal((await one("SELECT status FROM integration_events WHERE id = ?", "clean-event")).status, "succeeded");
  assert.equal((await one("SELECT COUNT(*) AS value FROM integration_events WHERE destination_system = 'sharepoint' AND aggregate_id = ?", "clean-document")).value, 1);
  assert.deepEqual(calls, { promote: 1, remove: 1 });
  assert.deepEqual(await processDocumentScanEvents({ store: cleanStore }), { processed: 0, clean: 0, pending: 0, malicious: 0, failed: 0 });

  await seed("malicious-document", "malicious-event", "malicious");
  const maliciousStore = {
    scanStatus: async () => ({ state: "malicious", result: "Malicious", scannedAt: nowIso() }),
    promote: async () => { throw new Error("Malicious documents must never be promoted."); },
    remove: async () => {}
  };
  const maliciousResult = await processDocumentScanEvents({ store: maliciousStore });
  assert.equal(maliciousResult.malicious, 1);
  assert.equal((await one("SELECT security_status FROM documents WHERE id = ?", "malicious-document")).security_status, "malicious");
  assert.equal((await one("SELECT COUNT(*) AS value FROM integration_events WHERE destination_system = 'sharepoint' AND aggregate_id = ?", "malicious-document")).value, 0);

  const auditActions = (await all("SELECT action FROM audit_logs ORDER BY occurred_at")).map((row) => row.action);
  assert.ok(auditActions.includes("document.malware_scan_clean"));
  assert.ok(auditActions.includes("document.malware_detected"));
  console.log("Document scan tests passed: clean files promote once, malicious files stay quarantined, and SharePoint receives only clean documents.");
} finally {
  await closeDatabase();
  delete process.env.DATABASE_PATH;
  delete process.env.DOCUMENT_STORAGE_ROOT;
  rmSync(root, { recursive: true, force: true });
}
