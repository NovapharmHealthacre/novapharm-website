import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const root = mkdtempSync(join(tmpdir(), "novapharm-distribution-uat-"));
process.env.DATABASE_PROVIDER = "sqlite";
process.env.DATABASE_PATH = join(root, "pilot.sqlite");
const { listWmsPilotFeedback, submitWmsPilotFeedback,
  WMS_PILOT_WORKSPACE_CODES, wmsPilotAccess, summariseWmsPilotFeedback } =
  await import("../src/core/wms-pilot-feedback.mjs");
const { all } = await import("../src/data/database.mjs");
after(() => rmSync(root, { recursive: true, force: true }));

const env = Object.freeze({
  WMS_PILOT_FEEDBACK_ENABLED: "true",
  WMS_PILOT_DEPLOYMENT_SCOPE: "isolated-staging",
  WMS_PILOT_DATA_MODE: "synthetic",
  WMS_PILOT_ALLOWLIST: "tester.alpha,operator.owner",
});
const tester = Object.freeze({
  username: "tester.alpha", accessType: "employee", accessScopes: ["employee"],
});
const another = Object.freeze({
  username: "operator.owner", accessType: "employee", accessScopes: ["employee"],
});
const defaults = (workspaceCode = "control-tower") => ({
  workspaceCode, result: "broken", note: "Dashboard fails when opening the stock tab.",
});

test("exact 16 workspaces match the approved v4.1 pilot map", () => {
  assert.equal(WMS_PILOT_WORKSPACE_CODES.length, 16);
  assert.equal(new Set(WMS_PILOT_WORKSPACE_CODES).size, 16);
  assert.ok(WMS_PILOT_WORKSPACE_CODES.includes("control-tower"));
  assert.ok(WMS_PILOT_WORKSPACE_CODES.includes("3pl-billing"));
  assert.ok(WMS_PILOT_WORKSPACE_CODES.includes("audit-data-export"));
});

test("pilot defaults OFF; unknown users, missing scope and non-synthetic mode are denied", () => {
  assert.equal(wmsPilotAccess(tester, {}).allowed, false);
  assert.equal(wmsPilotAccess(tester, { ...env, WMS_PILOT_DATA_MODE: "live" }).allowed, false);
  assert.equal(wmsPilotAccess({ ...tester, username: "unknown" }, env).allowed, false);
  assert.equal(wmsPilotAccess({ ...tester, accessType: "customer" }, env).allowed, false);
  assert.equal(wmsPilotAccess({ ...tester, accessScopes: ["customer"] }, env).allowed, false);
  assert.equal(wmsPilotAccess(tester, env).allowed, true);
});

test("only allowlisted synthetic employee can record feedback with an audit entry", async () => {
  const before = (await all("SELECT id FROM audit_logs WHERE action = 'wms.pilot_feedback.updated'")).length;
  const result = await submitWmsPilotFeedback(defaults(), tester, { env });
  assert.equal(result.status, "recorded_for_review");
  assert.equal(result.stockReserved, false);
  assert.equal(result.warehouseCommandIssued, false);
  assert.equal(result.shipmentAuthorised, false);
  const listed = await listWmsPilotFeedback(tester, { env });
  assert.equal(listed.dataMode, "synthetic_only");
  assert.equal(listed.warehouseExecutionEnabled, false);
  assert.equal(listed.entries.length, 1);
  assert.equal(listed.entries[0].workspaceCode, "control-tower");
  assert.equal(listed.entries[0].result, "broken");
  const audit = await all("SELECT action, details_json FROM audit_logs WHERE action = 'wms.pilot_feedback.updated'");
  assert.equal(audit.length, before + 1);
  assert.doesNotMatch(audit.at(-1).details_json, /Dashboard fails/);
});

test("retest overwrites the current result without creating duplicate workspace entries", async () => {
  await submitWmsPilotFeedback({ workspaceCode: "control-tower", result: "working", note: "" }, tester, { env });
  const rows = await listWmsPilotFeedback(tester, { env });
  assert.equal(rows.entries.length, 1);
  assert.equal(rows.entries[0].result, "working");
  assert.equal(rows.entries[0].note, "");
});

test("each tester's observations are isolated from other allowlisted accounts", async () => {
  await submitWmsPilotFeedback(defaults("inbound-asn"), another, { env });
  const owner = await listWmsPilotFeedback(another, { env });
  const user = await listWmsPilotFeedback(tester, { env });
  assert.deepEqual(owner.entries.map(x => x.workspaceCode), ["inbound-asn"]);
  assert.deepEqual(user.entries.map(x => x.workspaceCode), ["control-tower"]);
});

test("sensitive, invalid and unbounded inputs fail closed", async () => {
  const cases = [
    { ...defaults(), workspaceCode: "unapproved-module" },
    { ...defaults(), result: "approved_for_shipping" },
    { ...defaults(), note: "short" },
    { ...defaults(), note: "mypassword: private key foo" },
    { ...defaults(), note: "Patient name and adverse event test data." },
    { ...defaults(), note: "See https://secret.example/item" },
    { ...defaults(), note: "X".repeat(601) },
  ];
  for (const input of cases)
    await assert.rejects(submitWmsPilotFeedback(input, tester, { env }), (err) => err.statusCode === 400);
  await assert.rejects(submitWmsPilotFeedback(defaults(), tester, { env: {} }), (err) => err.statusCode === 404);
  await assert.rejects(submitWmsPilotFeedback(defaults(), { ...tester, username: "foreign" }, { env }), (err) => err.statusCode === 403);
});

test("routes require employee session, CSRF and pilot allowlist", () => {
  const api = readFileSync("server.mjs", "utf8");
  const gateway = readFileSync("apps/portal/app/gateway/[...path]/route.ts", "utf8");
  assert.match(api, /pathname === "\/api\/enterprise\/wms\/pilot-feedback"/);
  assert.match(api, /requireCsrf\(request\)/);
  assert.match(api, /rateLimit\(request, "wms-pilot-feedback"/);
  assert.match(api, /scopedAuthentication\(request, response, \["employee"\]\)/);
  assert.match(gateway, /enterprise\\\/wms\\\/pilot-feedback/);
});

test("only a signed administrator on the private allowlist may review others", async () => {
  const admin = { username: "operator.owner", accessType: "admin", accessScopes: ["admin"] };
  const report = await summariseWmsPilotFeedback(admin, { env });
  assert.equal(report.dataMode, "synthetic_only");
  assert.equal(report.warehouseExecutionEnabled, false);
  assert.equal(report.sampleLimited, true);
  assert.equal(report.sampledReports, 2);
  assert.equal(report.counts.working, 1);
  assert.equal(report.counts.broken, 1);
  assert.deepEqual(new Set(report.reports.map(x => x.testerUsername)),
    new Set(["tester.alpha", "operator.owner"]));
  await assert.rejects(summariseWmsPilotFeedback(tester, { env }), err => err.statusCode === 403);
  await assert.rejects(summariseWmsPilotFeedback({ ...admin, username: "unknown.admin" }, { env }), err => err.statusCode === 403);
});

test("migration is append-only on private feedback table and never touches stock", () => {
  const sql = readFileSync("database/sqlite/011_distribution_pilot_feedback.sql", "utf8");
  const azure = readFileSync("database/azure/011_distribution_pilot_feedback.sql", "utf8");
  for (const item of [sql, azure]) {
    assert.match(item, /wms_pilot_feedback/);
    assert.match(item, /tester_username/);
    assert.doesNotMatch(item, /\b(?:UPDATE|DELETE|DROP)\b\s+(?:inventory|orders|shipments|quality_)/i);
  }
});
