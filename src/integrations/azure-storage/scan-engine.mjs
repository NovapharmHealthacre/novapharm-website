import { all, audit, enqueue, nowIso, one, run, transaction } from "../../data/database.mjs";
import { documentStore } from "../../storage/document-store.mjs";

async function defer(eventId, code, minutes = 2) {
  await run(`UPDATE integration_events
    SET status = 'retrying', last_error_code = ?, next_attempt_at = ?
    WHERE id = ?`, code, new Date(Date.now() + minutes * 60_000).toISOString(), eventId);
}

async function fail(eventId, code, attemptCount) {
  const delay = Math.min(60, 2 ** Math.min(attemptCount, 6));
  await run(`UPDATE integration_events
    SET status = ?, attempt_count = ?, last_error_code = ?, next_attempt_at = ?
    WHERE id = ?`, attemptCount >= 8 ? "blocked" : "retrying", attemptCount, code, new Date(Date.now() + delay * 60_000).toISOString(), eventId);
}

export async function processDocumentScanEvents({ limit = 20, store = documentStore } = {}) {
  const events = await all(`SELECT * FROM integration_events
    WHERE destination_system = 'azure_storage' AND status IN ('pending', 'retrying') AND next_attempt_at <= ?
    ORDER BY created_at LIMIT ?`, nowIso(), limit);
  const result = { processed: 0, clean: 0, pending: 0, malicious: 0, failed: 0 };

  for (const event of events) {
    result.processed += 1;
    const payload = JSON.parse(event.payload_json);
    try {
      const document = await one("SELECT * FROM documents WHERE id = ?", payload.documentId);
      if (!document) throw Object.assign(new Error("Document metadata no longer exists."), { code: "document_missing" });
      const scan = await store.scanStatus(document.storage_path);

      if (scan.state === "pending") {
        await defer(event.id, "malware_scan_pending");
        result.pending += 1;
        continue;
      }

      if (scan.state === "clean") {
        const quarantineStoragePath = document.storage_path;
        const cleanStoragePath = await store.promote(document.storage_path);
        await transaction(async () => {
          const now = nowIso();
          await run(`UPDATE documents SET storage_path = ?, lifecycle_status = 'draft', security_status = 'clean',
            malware_scan_result = ?, malware_scanned_at = ?, updated_at = ? WHERE id = ?`,
          cleanStoragePath, scan.result, scan.scannedAt || now, now, document.id);
          await run("UPDATE integration_events SET status = 'succeeded', processed_at = ?, last_error_code = NULL WHERE id = ?", now, event.id);
          await audit({
            actor: "azure_storage_scan",
            action: "document.malware_scan_clean",
            entityType: "document",
            entityId: document.id,
            details: { eventId: event.id, providerResult: scan.result }
          });
          if (process.env.LOCAL_PORTAL_MODE === "true") {
            await audit({
              actor: "local_validation_scan",
              action: "document.external_sync_suppressed",
              entityType: "document",
              entityId: document.id,
              details: { eventId: event.id, reason: "local_validation_environment" }
            });
          } else {
            await enqueue({
              eventType: "document.sharepoint_upload_requested",
              aggregateType: "document",
              aggregateId: document.id,
              destinationSystem: "sharepoint",
              idempotencyKey: `document:${document.id}:upload:v1`,
              payload: {
                operation: "upload_document",
                documentId: document.id,
                entityType: payload.entityType,
                entityId: payload.entityId,
                checksum: payload.checksum,
                folderPath: payload.folderPath
              }
            });
          }
        });
        try {
          await store.remove(quarantineStoragePath);
        } catch {
          await audit({
            actor: "azure_storage_scan",
            action: "document.quarantine_cleanup_failed",
            entityType: "document",
            entityId: document.id,
            details: { eventId: event.id }
          });
        }
        result.clean += 1;
        continue;
      }

      if (scan.state === "malicious") {
        await transaction(async () => {
          const now = nowIso();
          await run(`UPDATE documents SET lifecycle_status = 'quarantine', security_status = 'malicious',
            malware_scan_result = ?, malware_scanned_at = ?, updated_at = ? WHERE id = ?`,
          scan.result, scan.scannedAt || now, now, document.id);
          await run("UPDATE integration_events SET status = 'succeeded', processed_at = ?, last_error_code = 'malware_detected' WHERE id = ?", now, event.id);
          await audit({
            actor: "azure_storage_scan",
            action: "document.malware_detected",
            entityType: "document",
            entityId: document.id,
            details: { eventId: event.id, providerResult: scan.result }
          });
        });
        result.malicious += 1;
        continue;
      }

      const attempts = Number(event.attempt_count || 0) + 1;
      await fail(event.id, "malware_scan_error", attempts);
      await audit({
        actor: "azure_storage_scan",
        action: "document.malware_scan_failed",
        entityType: "document",
        entityId: document.id,
        details: { eventId: event.id, providerResult: scan.result || "unavailable", attempt: attempts }
      });
      result.failed += 1;
    } catch (error) {
      const attempts = Number(event.attempt_count || 0) + 1;
      await fail(event.id, error.code || "storage_scan_failed", attempts);
      result.failed += 1;
    }
  }

  return result;
}
