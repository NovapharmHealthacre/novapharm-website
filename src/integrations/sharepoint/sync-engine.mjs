import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { all, audit, db, nowIso, one, run, transaction } from "../../data/database.mjs";
import { sharePointFolderPath, sharePointFolderPlan as mappedSharePointFolderPlan } from "../../core/sharepoint-mapping.mjs";
import { GraphClient, hasSharePointCredentials, sharePointConfigFromEnv } from "./graph-client.mjs";

function markBlocked(eventId, code) {
  run("UPDATE integration_events SET status = 'blocked', last_error_code = ?, next_attempt_at = ? WHERE id = ?", code, new Date(Date.now() + 15 * 60_000).toISOString(), eventId);
}

function markRetry(eventId, code, attemptCount) {
  const delay = Math.min(60, 2 ** Math.min(attemptCount, 6));
  run("UPDATE integration_events SET status = 'retrying', attempt_count = ?, last_error_code = ?, next_attempt_at = ? WHERE id = ?", attemptCount, code, new Date(Date.now() + delay * 60_000).toISOString(), eventId);
}

export async function processSharePointEvents({ limit = 20 } = {}) {
  const config = sharePointConfigFromEnv();
  const events = all(`SELECT * FROM integration_events
    WHERE destination_system = 'sharepoint' AND status IN ('pending', 'retrying', 'blocked') AND next_attempt_at <= ?
    ORDER BY created_at LIMIT ?`, nowIso(), limit);

  if (!events.length) return { processed: 0, succeeded: 0, blocked: 0, failed: 0 };
  if (!hasSharePointCredentials(config)) {
    for (const event of events) markBlocked(event.id, "sharepoint_credentials_missing");
    return { processed: events.length, succeeded: 0, blocked: events.length, failed: 0 };
  }

  const graph = new GraphClient(config);
  const site = await graph.site();
  const drive = await graph.drive(site.id);
  const result = { processed: 0, succeeded: 0, blocked: 0, failed: 0 };

  for (const event of events) {
    result.processed += 1;
    const payload = JSON.parse(event.payload_json);
    try {
      let item;
      if (payload.operation === "ensure_entity_folder") {
        item = await graph.ensureFolder(drive.id, sharePointFolderPath(payload));
      } else if (payload.operation === "upload_document") {
        await graph.ensureFolder(drive.id, payload.folderPath);
        const document = one("SELECT * FROM documents WHERE id = ?", payload.documentId);
        if (!document) throw Object.assign(new Error("Document metadata no longer exists."), { code: "document_missing" });
        item = await graph.uploadSmallFile(drive.id, payload.folderPath, document.file_name, readFileSync(document.storage_path), document.content_type);
        await graph.updateListItemFields(drive.id, item.id, {
          NovaPharmDocumentNumber: document.document_number,
          NovaPharmDocumentClass: document.document_class,
          NovaPharmLifecycleStatus: document.lifecycle_status,
          NovaPharmEntityType: payload.entityType,
          NovaPharmEntityId: payload.entityId,
          NovaPharmChecksum: document.checksum_sha256,
          NovaPharmRetentionClass: document.retention_class
        });
      } else {
        throw Object.assign(new Error("Unsupported SharePoint operation."), { code: "unsupported_operation" });
      }

      transaction(() => {
        run(`INSERT OR REPLACE INTO sharepoint_links(
          id, document_id, entity_type, entity_id, site_id, drive_id, item_id, web_url,
          checksum_sha256, sync_status, last_verified_at, created_at, updated_at
        ) VALUES(COALESCE((SELECT id FROM sharepoint_links WHERE site_id = ? AND drive_id = ? AND item_id = ?), ?), ?, ?, ?, ?, ?, ?, ?, ?, 'synchronized', ?,
          COALESCE((SELECT created_at FROM sharepoint_links WHERE site_id = ? AND drive_id = ? AND item_id = ?), ?), ?)`,
        site.id, drive.id, item.id, randomUUID(), payload.documentId || null, payload.entityType || null, payload.entityId || null,
        site.id, drive.id, item.id, item.webUrl || null, payload.checksum || null, nowIso(), site.id, drive.id, item.id, nowIso(), nowIso());
        run("UPDATE integration_events SET status = 'succeeded', processed_at = ?, last_error_code = NULL WHERE id = ?", nowIso(), event.id);
        audit({ actor: "sharepoint_sync", action: event.event_type, entityType: event.aggregate_type, entityId: event.aggregate_id, details: { eventId: event.id, itemId: item.id, driveId: drive.id } });
      });
      result.succeeded += 1;
    } catch (error) {
      const attempts = event.attempt_count + 1;
      markRetry(event.id, error.code || "sharepoint_sync_failed", attempts);
      audit({ actor: "sharepoint_sync", action: "integration.failed", entityType: event.aggregate_type, entityId: event.aggregate_id, details: { eventId: event.id, errorCode: error.code || "sharepoint_sync_failed", attempt: attempts } });
      result.failed += 1;
    }
  }
  return result;
}

export function sharePointFolderPlan() {
  return mappedSharePointFolderPlan();
}
