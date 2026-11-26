import { randomUUID } from "node:crypto";
import { all, audit, nowIso, one, run, transaction, upsert } from "../../data/database.mjs";
import { sharePointFolderPath, sharePointFolderPlan as mappedSharePointFolderPlan } from "../../core/sharepoint-mapping.mjs";
import { GraphClient, hasSharePointCredentials, sharePointConfigFromEnv } from "./graph-client.mjs";
import { classifySharePointSyncFailure, preflightSharePointSyncPayload } from "./sync-error-policy.mjs";

async function markBlocked(eventId, code, attemptCount) {
  await run("UPDATE integration_events SET status = 'blocked', attempt_count = ?, last_error_code = ?, next_attempt_at = ? WHERE id = ?", attemptCount, code, new Date(Date.now() + 15 * 60_000).toISOString(), eventId);
}

async function markRetry(eventId, code, attemptCount) {
  const delay = Math.min(60, 2 ** Math.min(attemptCount, 6));
  await run("UPDATE integration_events SET status = 'retrying', attempt_count = ?, last_error_code = ?, next_attempt_at = ? WHERE id = ?", attemptCount, code, new Date(Date.now() + delay * 60_000).toISOString(), eventId);
}

/** Block is terminal until an explicitly authorised operator requeues an event. */
async function recordFailure(event, error, result) {
  const disposition = classifySharePointSyncFailure(error?.code);
  const attempts = (event.attempt_count || 0) + 1;
  if (disposition.action === "block") {
    await markBlocked(event.id, disposition.code, attempts);
    result.blocked += 1;
  } else {
    await markRetry(event.id, disposition.code, attempts);
    result.failed += 1;
  }
  await audit({
    actor: "sharepoint_sync", action: "integration.failed",
    entityType: event.aggregate_type, entityId: event.aggregate_id,
    details: { eventId: event.id, errorCode: disposition.code, attempt: attempts, disposition: disposition.action }
  });
}

export async function processSharePointEvents({ limit = 20 } = {}) {
  const config = sharePointConfigFromEnv();
  const events = await all(`SELECT * FROM integration_events
    WHERE destination_system = 'sharepoint' AND status IN ('pending', 'retrying') AND next_attempt_at <= ?
    ORDER BY created_at LIMIT ?`, nowIso(), limit);

  if (!events.length) return { processed: 0, succeeded: 0, blocked: 0, failed: 0 };

  const result = { processed: 0, succeeded: 0, blocked: 0, failed: 0 };
  const candidates = [];
  for (const event of events) {
    const verdict = preflightSharePointSyncPayload(event.payload_json);
    if (verdict.code) {
      result.processed += 1;
      await recordFailure(event, { code: verdict.code }, result);
    } else {
      candidates.push({ event, payload: verdict.payload });
    }
  }

  // A batch consisting only of denied uploads or malformed events never
  // authenticates to Microsoft Graph, discovers the site or reads files.
  if (!candidates.length) return result;
  if (!hasSharePointCredentials(config)) {
    for (const { event } of candidates) {
      result.processed += 1;
      await recordFailure(event, { code: "sharepoint_credentials_missing" }, result);
    }
    return result;
  }

  const graph = new GraphClient(config);
  let site;
  let drive;
  try {
    site = await graph.site();
    drive = await graph.drive(site.id);
  } catch (error) {
    for (const { event } of candidates) {
      result.processed += 1;
      await recordFailure(event, error, result);
    }
    return result;
  }

  for (const { event, payload } of candidates) {
    result.processed += 1;
    try {
      const item = await graph.ensureFolder(drive.id, sharePointFolderPath(payload));

      await transaction(async () => {
        const existing = await one("SELECT id, created_at FROM sharepoint_links WHERE site_id = ? AND drive_id = ? AND item_id = ?", site.id, drive.id, item.id);
        const now = nowIso();
        await upsert("sharepoint_links", {
          id: existing?.id || randomUUID(),
          document_id: payload.documentId || null,
          entity_type: payload.entityType || null,
          entity_id: payload.entityId || null,
          site_id: site.id,
          drive_id: drive.id,
          item_id: item.id,
          web_url: item.webUrl || null,
          checksum_sha256: payload.checksum || null,
          sync_status: "synchronized",
          last_verified_at: now,
          created_at: existing?.created_at || now,
          updated_at: now
        }, ["site_id", "drive_id", "item_id"], ["document_id", "entity_type", "entity_id", "web_url", "checksum_sha256", "sync_status", "last_verified_at", "updated_at"]);
        await run("UPDATE integration_events SET status = 'succeeded', processed_at = ?, last_error_code = NULL WHERE id = ?", now, event.id);
        await audit({ actor: "sharepoint_sync", action: event.event_type, entityType: event.aggregate_type, entityId: event.aggregate_id, details: { eventId: event.id, itemId: item.id, driveId: drive.id } });
      });
      result.succeeded += 1;
    } catch (error) {
      await recordFailure(event, error, result);
    }
  }
  return result;
}

export function sharePointFolderPlan() {
  return mappedSharePointFolderPlan();
}
