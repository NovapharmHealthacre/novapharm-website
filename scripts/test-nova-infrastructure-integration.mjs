import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
test("protected Nova ML web UI surfaces infrastructure architecture without a public scheduler", () => {
  const view = source("apps/portal/components/nova-ml-workspaces.tsx");
  const rows = source("apps/portal/data/nova-ml-infrastructure.ts");
  assert.match(view, /novaComputeInfrastructureRows\.map/);
  assert.match(view, /Deep-learning infrastructure architecture/);
  assert.match(view, /not an active cluster, AI model or job scheduler/);
  assert.match(rows, /Reproducible experiments/);
  assert.match(rows, /Data sovereignty/);
  assert.doesNotMatch(rows + view, /fetch\(|URLSession|axios|new WebSocket\(/);
});
test("the iOS Swift Package and Android Kotlin adapter are source-only and non-executing", () => {
  const manifest = source("native/novapharm-intelligence-apple/Package.swift");
  const swift = source("native/novapharm-intelligence-apple/NovaComputePlan.swift");
  const kotlin = source("native/novapharm-intelligence-android/NovaComputePlan.kt");
  const androidTest = source("native/novapharm-intelligence-android/NovaComputePlanTest.kt");
  assert.match(manifest, /"NovaComputePlan.swift"/);
  for (const content of [swift, kotlin]) {
    assert.match(content, /review-only/);
    assert.match(content, /budget-not-approved/);
    assert.match(content, /region-not-allowed/);
    assert.match(content, /personal-data-not-admitted/);
    assert.match(content, /executionEnabled/);
    assert.doesNotMatch(content, /URLSession|NSURLSession|java\.net|OkHttp|Retrofit|AWSClient|processBuilder|Runtime\.getRuntime/);
  }
  assert.match(androidTest, /check\(!denied\.executionEnabled\)/);
});
test("the implementation does not assert production deployment or require credentials", () => {
  const doc = source("docs/architecture/deep-learning-infrastructure-20261118.md");
  const worker = source("src/ai/compute-admission.mjs");
  assert.match(doc, /No job execution exists in this change/);
  assert.match(doc, /not a permit/);
  assert.match(doc, /No new billable AWS\/Azure resources/);
  assert.doesNotMatch(worker, /process\.env|fetch\(|http|child_process|exec\(/);
});

test("standing Intelligence governance registers bind future ML changes to fail-closed owner constraints", () => {
  const constraints = JSON.parse(source("config/intelligence/owner-production-constraints.json"));
  const systemCard = source("docs/ai-system-card.md");
  const riskRegister = source("docs/ai-risk-register.md");
  const designStandard = source("docs/architecture/deep-learning-infrastructure-20261118.md");
  assert.equal(constraints.productionSignoff, "not_granted");
  assert.equal(constraints.initialInfrastructureBudget.monthlyCapGbp, 0);
  assert.equal(constraints.initialInfrastructureBudget.newChargeableResourceProvisioning, false);
  assert.equal(constraints.productionPermissions.activatePublicCustomerAccess, false);
  assert.match(systemCard, /non-executing, review-only candidate/);
  assert.match(systemCard, /deep-learning-infrastructure-20261118\.md/);
  assert.match(riskRegister, /Unexpected GPU\/CPU spend/);
  assert.match(riskRegister, /Cross-border transfer through region failover/);
  assert.match(riskRegister, /three source-only adapters/i);
  assert.match(designStandard, /The server is authoritative/);
  for (const workflow of [
    ".github/workflows/dispatch-approved-aws-contact-release.yml",
    ".github/workflows/publish-aws-contact-production.yml"
  ]) {
    const text = source(workflow);
    for (const path of ["docs/ai-system-card.md", "docs/ai-risk-register.md", "src/ai/compute-admission.mjs"]) {
      assert.ok(text.includes(path), "Missing private-only guard: " + workflow + " " + path);
    }
  }
});
