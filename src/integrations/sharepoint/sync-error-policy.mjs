/**
 * Safe-retry contract for NovaPharm SharePoint integration outbox.
 * A blocked state is terminal until a separately authorised operator requeues it.
 * No Graph calls or database writes are performed by this policy function.
 */
const BLOCKED = new Set([
  "sharepoint_credentials_missing",
  "sharepoint_invalid_event_payload",
  "sharepoint_upload_conflict_gate",
  "sharepoint_invalid_path",
  "sharepoint_pagination_invalid",
  "sharepoint_pagination_limit",
  "document_missing",
  "document_not_cleared",
  "unsupported_operation",
  "graph_credentials_missing",
  "graph_managed_identity_token"
]);

export function classifySharePointSyncFailure(errorCode) {
  const code = typeof errorCode === "string" && /^[a-z0-9_]{1,80}$/.test(errorCode)
    ? errorCode : "sharepoint_sync_failed";
  // GraphClient emits graph_AUTH_STATUS for token-endpoint failures and
  // graph_STATUS for resource requests. Both must apply the same stop gate.
  const graphHttpStatus = /^graph_(?:auth_)?(\d{3})$/.exec(code);
  const isPermanentGraphError = graphHttpStatus
    && Number(graphHttpStatus[1]) >= 400
    && Number(graphHttpStatus[1]) < 500
    && ![408, 429].includes(Number(graphHttpStatus[1]));
  return Object.freeze({
    code,
    action: BLOCKED.has(code) || isPermanentGraphError ? "block" : "retry"
  });
}

/**
 * Validate event authority before discovering any Graph site or drive.
 * Keeps legacy upload events terminal even when credentials are missing.
 * Only the legacy folder operation is eligible for the Graph worker.
 */
export function preflightSharePointSyncPayload(rawPayload) {
  let payload;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return { code: "sharepoint_invalid_event_payload" };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { code: "sharepoint_invalid_event_payload" };
  }
  if (payload.operation === "upload_document") {
    return { code: "sharepoint_upload_conflict_gate" };
  }
  if (payload.operation !== "ensure_entity_folder") {
    return { code: "unsupported_operation" };
  }
  return { payload };
}
