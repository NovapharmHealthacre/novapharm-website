import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(".github/workflows/corporate-live-full-acceptance.yml", "utf8");

test("live source SHA acceptance is gated on a successful deploy job, not publisher workflow success alone", () => {
  assert.match(source, /name: Verify that upstream publisher actually deployed a public release/);
  assert.match(source, /actions\/runs\/\$UPSTREAM_RUN\/jobs\?per_page=100/);
  assert.match(source, /select\(\.name == "deploy"\)/);
  assert.match(source, /test "\$build" = "success"/);
  assert.match(source, /test "\$scope" = "success"/);
  assert.match(source, /needs\.publisher-deployment\.outputs\.deployed == 'true'/);
});

test("skipped publication produces no false live-SHA failure; unexpected upstream results fail closed", () => {
  assert.match(source, /test "\$build" = "skipped"/);
  assert.match(source, /echo "deployed=false"/);
  assert.match(source, /Unknown publisher deployment outcome/);
  assert.match(source, /exit 1/);
});

test("actual live release still checks exact SHA, Chromium WebKit Firefox and saves failure evidence", () => {
  assert.match(source, /EXPECTED_LIVE_SHA:/);
  assert.match(source, /github\.event\.workflow_run\.head_sha/);
  assert.match(source, /npx playwright install --with-deps chromium webkit firefox/);
  assert.match(source, /node scripts\/test-corporate-live-acceptance\.mjs/);
  assert.match(source, /continue-on-error: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  assert.match(source, /artifacts\/corporate-live-acceptance/);
});

test("a source-only CI policy repair is included in private publication denylists", () => {
  for (const file of [
    ".github/workflows/dispatch-approved-aws-contact-release.yml",
    ".github/workflows/publish-aws-contact-production.yml"
  ]) {
    const publisher = readFileSync(file, "utf8");
    assert.ok(publisher.includes(".github/workflows/corporate-live-full-acceptance.yml"));
    assert.ok(publisher.includes("scripts/test-corporate-live-publication-gate.mjs"));
  }
});
