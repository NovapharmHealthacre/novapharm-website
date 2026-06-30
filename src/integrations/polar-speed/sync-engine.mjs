import { all, audit, nowIso, run, transaction } from "../../data/database.mjs";
import { hasPolarSpeedCredentials, PolarSpeedClient, polarSpeedConfigFromEnv } from "./client.mjs";

function markBlocked(eventId, code) {
  run("UPDATE integration_events SET status = 'blocked', last_error_code = ?, next_attempt_at = ? WHERE id = ?", code, new Date(Date.now() + 30 * 60_000).toISOString(), eventId);
}

function markRetry(eventId, code, attemptCount) {
  const delayMinutes = Math.min(120, 2 ** Math.min(attemptCount, 6));
  run("UPDATE integration_events SET status = 'retrying', attempt_count = ?, last_error_code = ?, next_attempt_at = ? WHERE id = ?", attemptCount, code, new Date(Date.now() + delayMinutes * 60_000).toISOString(), eventId);
}

export async function processPolarSpeedEvents({ limit = 20 } = {}) {
  const config = polarSpeedConfigFromEnv();
  const events = all(`SELECT * FROM integration_events
    WHERE destination_system = 'polar_speed' AND status IN ('pending', 'retrying', 'blocked') AND next_attempt_at <= ?
    ORDER BY created_at LIMIT ?`, nowIso(), limit);

  if (!events.length) return { processed: 0, succeeded: 0, blocked: 0, failed: 0 };
  if (!hasPolarSpeedCredentials(config)) {
    for (const event of events) markBlocked(event.id, "polar_speed_api_contract_required");
    return { processed: events.length, succeeded: 0, blocked: events.length, failed: 0 };
  }

  const client = new PolarSpeedClient(config);
  const result = { processed: 0, succeeded: 0, blocked: 0, failed: 0 };

  for (const event of events) {
    result.processed += 1;
    const payload = JSON.parse(event.payload_json);
    try {
      if (payload.operation === "reserve_stock") {
        await client.reserveStock(payload);
      } else if (payload.operation === "create_dispatch") {
        await client.createDispatch(payload);
      } else {
        throw Object.assign(new Error("Unsupported Polar Speed operation."), { code: "unsupported_operation" });
      }
      transaction(() => {
        run("UPDATE integration_events SET status = 'succeeded', processed_at = ?, last_error_code = NULL WHERE id = ?", nowIso(), event.id);
        audit({ actor: "polar_speed_sync", action: event.event_type, entityType: event.aggregate_type, entityId: event.aggregate_id, details: { eventId: event.id, operation: payload.operation } });
      });
      result.succeeded += 1;
    } catch (error) {
      if (error.code === "polar_speed_endpoint_missing") {
        markBlocked(event.id, error.code);
        result.blocked += 1;
      } else {
        const attempts = event.attempt_count + 1;
        markRetry(event.id, error.code || "polar_speed_sync_failed", attempts);
        result.failed += 1;
      }
      audit({ actor: "polar_speed_sync", action: "integration.failed", entityType: event.aggregate_type, entityId: event.aggregate_id, details: { eventId: event.id, errorCode: error.code || "polar_speed_sync_failed" } });
    }
  }

  return result;
}
