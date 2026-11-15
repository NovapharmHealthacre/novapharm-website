import { randomUUID } from "node:crypto";
import { all, audit, nowIso, transaction, upsert } from "../data/database.mjs";

/**
 * Explicit testing results only; never QMS deviations, safety complaints,
 * warehouse stock events or regulated supply authorisations.
 */
export const WMS_PILOT_WORKSPACE_CODES = Object.freeze([
  "control-tower",
  "exceptions-decisions",
  "performance-analytics",
  "product-master",
  "inbound-asn",
  "batch-lot-control",
  "quality-recalls",
  "inventory-slotting",
  "orders-allocation",
  "waves-execution",
  "yard-delivery",
  "ai-planning-studio",
  "labour-automation",
  "3pl-billing",
  "integration-monitor",
  "audit-data-export",
]);
const workspaceCodes = new Set(WMS_PILOT_WORKSPACE_CODES);
const results = new Set(["working", "broken", "needs_improvement"]);
const error = (code, message) => Object.assign(new Error(message), { statusCode: code });
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function wmsPilotAccess(context, env = process.env) {
  if (env.WMS_PILOT_FEEDBACK_ENABLED !== "true" ||
      env.WMS_PILOT_DATA_MODE !== "synthetic" ||
      typeof env.WMS_PILOT_ALLOWLIST !== "string" || !env.WMS_PILOT_ALLOWLIST.trim()) {
    return Object.freeze({ allowed: false, reason: "pilot_environment_not_activated" });
  }
  const user = String(context?.username ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._@-]{2,159}$/.test(user) ||
      !["employee", "admin"].includes(context?.accessType) ||
      !Array.isArray(context?.accessScopes) ||
      !context.accessScopes.some((scope) => scope === "employee" || scope === "admin")) {
    return Object.freeze({ allowed: false, reason: "employee_pilot_identity_required" });
  }
  const allowed = env.WMS_PILOT_ALLOWLIST.split(",")
    .map((name) => name.trim().toLowerCase()).filter(Boolean);
  return Object.freeze({
    allowed: allowed.includes(user),
    reason: allowed.includes(user) ? "approved_private_pilot_user" : "user_not_on_pilot_allowlist",
  });
}

function requirePilot(context, env) {
  const access = wmsPilotAccess(context, env);
  if (!access.allowed) {
    // Do not advertise this pilot through an unconfigured production backend.
    throw error(access.reason === "pilot_environment_not_activated" ? 404 : 403,
      "The private Distribution pilot is not enabled for this account.");
  }
}

const suspectContent = /(?:https?:\/\/|<[^>]+>|\b(?:password|private key|api key|access token|nhs number|patient name|date of birth|adverse event|side effect|prescription number)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,})/iu;
function validatedFeedback(input) {
  if (!isObject(input)) throw error(400, "A structured pilot feedback report is required.");
  const workspaceCode = String(input.workspaceCode ?? "");
  const result = String(input.result ?? "");
  const note = String(input.note ?? "").replace(/[\x00-\x1f\x7f]/g, " ").trim();
  if (!workspaceCodes.has(workspaceCode)) throw error(400, "Choose a valid WMS workspace.");
  if (!results.has(result)) throw error(400, "Choose working, broken or needs improvement.");
  if (note.length > 600 || (result !== "working" && note.length < 8) || suspectContent.test(note)) {
    throw error(400, "Write a short technical observation without personal data, secrets, links or patient details.");
  }
  return { workspaceCode, result, note };
}

/** A single tester sees only their own most recent submission per workspace. */
export async function listWmsPilotFeedback(context, { env = process.env } = {}) {
  requirePilot(context, env);
  const rows = await all(`SELECT workspace_code, result, feedback_note, updated_at
    FROM wms_pilot_feedback WHERE tester_username = ?
    ORDER BY updated_at DESC, workspace_code ASC LIMIT 16`, context.username);
  return {
    pilot: "novapharm-distribution-private-uat",
    dataMode: "synthetic_only",
    warehouseExecutionEnabled: false,
    entries: rows.map((row) => ({
      workspaceCode: row.workspace_code,
      result: row.result,
      note: row.feedback_note,
      updatedAt: row.updated_at,
    })),
  };
}

/**
 * CSRF, rate limiting and server-authenticated employee session are enforced
 * by the route. This function additionally enforces explicit staging
 * activation and exact username allowlisting. No data rights are inherited.
 */
export async function submitWmsPilotFeedback(input, context, { env = process.env } = {}) {
  requirePilot(context, env);
  const report = validatedFeedback(input);
  const timestamp = nowIso();
  const id = randomUUID();
  await transaction(async () => {
    await upsert("wms_pilot_feedback", {
      id,
      tester_username: context.username,
      workspace_code: report.workspaceCode,
      result: report.result,
      feedback_note: report.note,
      created_at: timestamp,
      updated_at: timestamp,
    }, ["tester_username", "workspace_code"], ["result", "feedback_note", "updated_at"]);
    await audit({
      actor: context.username,
      action: "wms.pilot_feedback.updated",
      entityType: "wms_pilot_feedback",
      entityId: report.workspaceCode,
      after: { workspaceCode: report.workspaceCode, result: report.result },
      // Deliberately do not duplicate free-text notes in audit history.
      details: { dataMode: "synthetic_only", environment: "private_pilot" },
    });
  });
  return {
    workspaceCode: report.workspaceCode,
    result: report.result,
    updatedAt: timestamp,
    status: "recorded_for_review",
    warehouseCommandIssued: false,
    qualityDispositionIssued: false,
    stockReserved: false,
    shipmentAuthorised: false,
  };
}
