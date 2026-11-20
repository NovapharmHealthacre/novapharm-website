import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifySharePointSyncFailure, preflightSharePointSyncPayload } from "../src/integrations/sharepoint/sync-error-policy.mjs";

test("authority, conflict, version and data safety failures are terminal", () => {
  for (const code of ["graph_400", "graph_401", "graph_403", "graph_404",
    "graph_409", "graph_410", "graph_412", "graph_422",
    "graph_auth_400", "graph_auth_401", "graph_auth_403", "graph_auth_404",
    "sharepoint_credentials_missing", "sharepoint_upload_conflict_gate",
    "sharepoint_invalid_path", "sharepoint_invalid_event_payload",
    "sharepoint_pagination_invalid", "sharepoint_pagination_limit",
    "document_missing", "document_not_cleared", "unsupported_operation"]) {
    assert.deepEqual(classifySharePointSyncFailure(code), { code, action: "block" }, code);
  }
});

test("transient network and provider failures are retryable", () => {
  for (const code of ["graph_408", "graph_429", "graph_500", "graph_502", "graph_503",
    "graph_504", "graph_auth_408", "graph_auth_429",
    "graph_auth_500", "graph_auth_503", "sharepoint_sync_failed", "graph_retry_exhausted"]) {
    assert.deepEqual(classifySharePointSyncFailure(code), { code, action: "retry" }, code);
  }
});

test("unknown and unsafe error messages are normalised, not persisted verbatim", () => {
  for (const code of [null, undefined, 7, {}, "my secret: bearer abc", "x".repeat(300)]) {
    assert.deepEqual(classifySharePointSyncFailure(code),
      { code: "sharepoint_sync_failed", action: "retry" });
  }
});

test("blocked integration events are never automatically selected for retries", () => {
  const source = readFileSync(new URL("../src/integrations/sharepoint/sync-engine.mjs", import.meta.url), "utf8");
  assert.match(source, /status IN \('pending', 'retrying'\)/);
  assert.doesNotMatch(source, /status IN \('pending', 'retrying', 'blocked'\)/);
  assert.match(source, /await recordFailure\(event, error, result\)/);
});

test("document upload remains fail-closed even when Graph credentials exist", () => {
  const source = readFileSync(new URL("../src/integrations/sharepoint/sync-engine.mjs", import.meta.url), "utf8");
  assert.match(source, /preflightSharePointSyncPayload\(event\.payload_json\)/);
  assert.doesNotMatch(source, /graph\.uploadSmallFile\(/);
  assert.doesNotMatch(source, /graph\.updateListItemFields\(/);
  const verdict = preflightSharePointSyncPayload('{"operation":"upload_document","documentId":"test-only"}');
  assert.deepEqual(verdict, { code: "sharepoint_upload_conflict_gate" });
});

test("separate folder-creation operation remains present", () => {
  const source = readFileSync(new URL("../src/integrations/sharepoint/sync-engine.mjs", import.meta.url), "utf8");
  assert.match(source, /for \(const \{ event, payload \} of candidates\)/);
  assert.match(source, /graph\.ensureFolder\(/);
});

test("credential denials use the audited terminal-failure path and record attempt counts", () => {
  const source = readFileSync(new URL("../src/integrations/sharepoint/sync-engine.mjs", import.meta.url), "utf8");
  assert.match(source,
    /if \(!hasSharePointCredentials\(config\)\) \{[\s\S]*?recordFailure\(event, \{ code: "sharepoint_credentials_missing" \}, result\)/);
  assert.match(source,
    /async function markBlocked\(eventId, code, attemptCount\)/);
  assert.match(source,
    /status = 'blocked', attempt_count = \?, last_error_code/);
  assert.match(source, /await audit\(\{/);
});

test("preflight rejects document upload, malformed payload and unknown actions without Graph", () => {
  for (const raw of ['{"operation":"upload_document"}',
    '{"operation":"upload_document","documentId":"synthetic"}']) {
    assert.deepEqual(preflightSharePointSyncPayload(raw),
      { code: "sharepoint_upload_conflict_gate" });
  }
  for (const raw of ["{", "null", "42", "[]", "false", "not-json"]) {
    assert.deepEqual(preflightSharePointSyncPayload(raw),
      { code: "sharepoint_invalid_event_payload" });
  }
  assert.deepEqual(preflightSharePointSyncPayload('{"operation":"unapproved"}'),
    { code: "unsupported_operation" });
  const payload = { operation: "ensure_entity_folder", entityType: "product", entityId: "test" };
  assert.deepEqual(preflightSharePointSyncPayload(JSON.stringify(payload)), { payload });
});

test("preflight is completed before Graph client construction, including upload-only batches", () => {
  const source = readFileSync(new URL("../src/integrations/sharepoint/sync-engine.mjs", import.meta.url), "utf8");
  const preflight = source.indexOf("const verdict = preflightSharePointSyncPayload(event.payload_json)");
  const shortcut = source.indexOf("if (!candidates.length) return result;");
  const graph = source.indexOf("new GraphClient(config)");
  assert.ok(preflight > 0 && shortcut > preflight && graph > shortcut);
  assert.match(source, /for \(const \{ event, payload \} of candidates\)/);
  assert.doesNotMatch(source, /graph\.uploadSmallFile\(/);
});
