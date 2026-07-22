import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const inputRoot = resolve(process.env.VISUAL_SHARD_ROOT || "artifacts/shards");
const outputRoot = resolve(process.env.VISUAL_GATE_OUTPUT || "artifacts/visual-acceptance-gate");
const expectedCommit = process.env.VISUAL_EXPECTED_COMMIT || "";

const expectedShards = new Map([
  ["chromium-desktop", ["chromium", ["desktop-1440x900", "desktop-1920x1080", "desktop-1366x768", "desktop-1280x800", "desktop-1280x720"]]],
  ["chromium-tablet", ["chromium", ["tablet-1024x1366", "tablet-768x1024"]]],
  ["chromium-mobile", ["chromium", ["mobile-390x844", "mobile-430x932", "mobile-375x667", "mobile-360x800", "mobile-320x568"]]],
  ["webkit-desktop", ["webkit", ["desktop-1440x900", "desktop-1920x1080", "desktop-1366x768", "desktop-1280x800", "desktop-1280x720"]]],
  ["webkit-tablet", ["webkit", ["tablet-1024x1366", "tablet-768x1024"]]],
  ["webkit-mobile", ["webkit", ["mobile-390x844", "mobile-430x932", "mobile-375x667", "mobile-360x800", "mobile-320x568"]]]
]);
const expectedPublicRouteCount = 40;
const expectedProtectedRouteCount = 56;
const expectedRoutesPerViewport = expectedPublicRouteCount + expectedProtectedRouteCount;
const expectedViewportExecutions = [...expectedShards.values()].reduce((total, [, viewports]) => total + viewports.length, 0);
const expectedPageInspections = expectedViewportExecutions * expectedRoutesPerViewport;

function walk(directory, filename, matches = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, filename, matches);
    else if (entry.name === filename) matches.push(path);
  }
  return matches;
}

if (!statSync(inputRoot).isDirectory()) throw new Error(`Shard root is not a directory: ${inputRoot}`);
const reportPaths = walk(inputRoot, "visual-acceptance.json");
assert.equal(reportPaths.length, expectedShards.size, `Expected ${expectedShards.size} shard reports; found ${reportPaths.length}`);

const reports = reportPaths.map((path) => ({ path, raw: readFileSync(path, "utf8") }))
  .map(({ path, raw }) => ({ path, raw, report: JSON.parse(raw) }));
const reportByShard = new Map(reports.map((entry) => [entry.report.shardId, entry]));
assert.equal(reportByShard.size, expectedShards.size, "Shard identifiers must be unique");

const commits = new Set();
let totalPages = 0;
let totalAxeScans = 0;
let totalScreenshots = 0;

for (const [shardId, [engine, viewportNames]] of expectedShards) {
  const entry = reportByShard.get(shardId);
  assert.ok(entry, `Missing report for ${shardId}`);
  const { report, raw, path } = entry;
  assert.equal(report.status, "passed", `${shardId} did not pass`);
  assert.equal(report.worktreeDirty, false, `${shardId} did not test a clean checkout`);
  assert.deepEqual(report.engines, [engine], `${shardId} engine mismatch`);
  assert.deepEqual(report.viewports.map(({ name }) => name), viewportNames, `${shardId} viewport mismatch`);
  assert.equal(report.publicRouteCount, expectedPublicRouteCount, `${shardId} public route count changed`);
  assert.equal(report.protectedRouteCount, expectedProtectedRouteCount, `${shardId} protected route count changed`);
  const expectedPages = viewportNames.length * (report.publicRouteCount + report.protectedRouteCount);
  assert.equal(report.expectedPages, expectedPages, `${shardId} expected-page calculation mismatch`);
  assert.equal(report.pagesInspected, expectedPages, `${shardId} inspection count mismatch`);
  assert.equal(report.axeScans, expectedPages, `${shardId} Axe count mismatch`);
  assert.deepEqual(report.issues, [], `${shardId} contains material issues`);
  assert.ok(report.screenshotCount > 0, `${shardId} did not capture curated evidence`);
  assert.doesNotMatch(raw, /"(?:username|password|sessionSecret|csrfToken|credentialsPath)"\s*:/i, `${shardId} report contains credential material`);
  const cleanupPath = join(dirname(path), "runtime-cleanup.json");
  const cleanup = JSON.parse(readFileSync(cleanupPath, "utf8"));
  assert.equal(cleanup.status, "passed", `${shardId} synthetic runtime cleanup failed`);
  commits.add(report.commit);
  totalPages += report.pagesInspected;
  totalAxeScans += report.axeScans;
  totalScreenshots += report.screenshotCount;
}

assert.equal(commits.size, 1, "All shards must test the same commit");
const [commit] = commits;
if (expectedCommit) assert.equal(commit, expectedCommit, "Shards did not test the expected pull-request head");
assert.equal(totalPages, expectedPageInspections, `The complete six-shard matrix must reconcile ${expectedPageInspections.toLocaleString("en-GB")} page inspections`);
assert.equal(totalAxeScans, expectedPageInspections, "Every inspected page must receive an Axe scan");
assert.equal(process.env.BACKEND_WORKFLOWS_RESULT || "success", "success", "Backend browser workflows did not pass");
assert.equal(process.env.SHARD_JOBS_RESULT || "success", "success", "One or more browser shards did not pass");

const aggregate = {
  status: "passed",
  commit,
  shards: [...expectedShards.keys()],
  engines: ["chromium", "webkit"],
  viewportCount: 12,
  routesPerViewport: expectedRoutesPerViewport,
  pagesInspected: totalPages,
  axeScans: totalAxeScans,
  screenshots: totalScreenshots,
  issues: 0,
  runtimeCleanup: "passed",
  credentialMaterialIncluded: false
};

mkdirSync(outputRoot, { recursive: true });
writeFileSync(join(outputRoot, "browser-acceptance-gate.json"), `${JSON.stringify(aggregate, null, 2)}\n`);
writeFileSync(join(outputRoot, "browser-acceptance-gate.md"), `# Browser Acceptance Aggregate Gate\n\n- Status: **PASSED**\n- Commit: \`${commit}\`\n- Shards: 6\n- Engines: Chromium and WebKit\n- Viewports: 12\n- Public and protected routes per viewport: ${expectedRoutesPerViewport}\n- Pages inspected: ${totalPages}\n- Axe scans: ${totalAxeScans}\n- Curated screenshots: ${totalScreenshots}\n- Issues: 0\n- Synthetic runtime cleanup: passed for all shards\n- Credential material in reports: none\n`);

console.log(`Browser acceptance aggregate passed: ${totalPages} pages, ${totalAxeScans} Axe scans, ${totalScreenshots} curated screenshots.`);
console.log(`Aggregate evidence written to ${relative(process.cwd(), outputRoot)}.`);
