import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const get = path => readFileSync(".github/workflows/" + path, "utf8");
test("public-only Pages release jobs must never auto-overwrite live AWS contact", () => {
  for (const file of ["pages-live-publish.yml","pages-public-release-recovery.yml","release-contact-only.yml"]) {
    const workflow = get(file);
    assert.doesNotMatch(workflow, /\non:\n  push:\n/, file + " must be manual or PR only");
    assert.match(workflow, /workflow_dispatch:/, file + " requires manual recovery option");
  }
});
test("approved public main pushes retain immutable AWS contact release while private Nova ML-only merges are excluded", () => {
  const dispatcher = get("dispatch-approved-aws-contact-release.yml");
  assert.match(dispatcher, /\non:\n  push:\n    branches: \[main\]/);
  assert.doesNotMatch(dispatcher, /\n    paths:/);
  assert.match(dispatcher, /id: private_release/);
  assert.match(dispatcher, /private_only=true/);
  assert.match(dispatcher, /changed_any=true/);
  assert.match(dispatcher, /apps\/portal\/\*/);
  assert.match(dispatcher, /native\/novapharm-intelligence-apple\/\*/);
  for (const path of [
    "src/ai/compute-admission.mjs",
    "scripts/test-nova-compute-admission.mjs",
    "scripts/test-nova-infrastructure-integration.mjs",
    "native/novapharm-intelligence-android/*",
    "docs/architecture/deep-learning-infrastructure-20261118.md",
    "docs/ai-system-card.md",
    "docs/ai-risk-register.md",
    ".github/workflows/nova-ml-infrastructure-contract.yml"
  ]) {
    assert.ok(dispatcher.includes(path), "dispatcher must exclude protected ML-only change: " + path);
    assert.ok(get("publish-aws-contact-production.yml").includes(path), "publisher must exclude protected ML-only change: " + path);
  }

  assert.match(dispatcher, /scripts\/aws\/contact-release-routing\.test\.mjs/);
  for (const path of ["scripts/nova-ml-private-ingress.mjs", "scripts/test-nova-ml-private-ingress.mjs", ".github/workflows/nova-ml-private-ingress-acceptance.yml"]) {
    assert.ok(dispatcher.includes(path), path + " must skip unrelated AWS contact dispatch");
  }
  assert.match(dispatcher, /if: steps\.private_release\.outputs\.skip != 'true'/);
  const guardedAwsSteps = dispatcher.match(/if: steps\.private_release\.outputs\.skip != 'true' && steps\.publisher\.outputs\.skip != 'true'/g) || [];
  assert.equal(guardedAwsSteps.length, 2, "both the AWS health check and contact dispatch must skip for private-only merges");
  assert.match(dispatcher, /gh workflow run publish-aws-contact-production\.yml/);
  assert.match(dispatcher, /expected_sha="\$EXPECTED_SHA"/);
  assert.match(dispatcher, /\.ready == true and \.acceptingPublicSubmissions == true/);
});
test("public publisher skips AWS and Pages for private Nova ML-only pushes but preserves real public releases", () => {
  const publisher = get("publish-aws-contact-production.yml");
  const dispatcher = get("dispatch-approved-aws-contact-release.yml");
  assert.match(publisher, /release_scope:/);
  assert.match(publisher, /needs: release_scope/);
  assert.match(publisher, /needs\.release_scope\.outputs\.release_needed == 'true'/);
  assert.match(publisher, /found_ml=false/);
  assert.ok(dispatcher.includes(".github/workflows/browser-acceptance.yml"), "private dispatcher must classify .github/workflows/browser-acceptance.yml");
  assert.ok(publisher.includes(".github/workflows/browser-acceptance.yml"), "private publisher must classify .github/workflows/browser-acceptance.yml");
  assert.match(publisher, /private_only=true/);
  assert.match(publisher, /changed_paths=\$\(git diff --name-only/);
  assert.match(publisher, /release_needed=false/);
  assert.match(publisher, /release_needed=true/);
  assert.match(publisher, /workflow_dispatch/);
  assert.match(dispatcher, /found_ml=false/);
  assert.match(dispatcher, /found_ml=true/);
  assert.match(dispatcher, /\[ "\$found_ml" = true \]/);
  for (const path of [".github/workflows/publish-aws-contact-production.yml", ".github/workflows/dispatch-approved-aws-contact-release.yml", ".github/workflows/nova-ml-private-ingress-acceptance.yml"]) {
    assert.ok(dispatcher.includes(path));
    assert.ok(publisher.includes(path));
  }
});

test("canonical contact publication verifies health and rejected anonymous access without sending email", () => {
  const canonical = get("publish-aws-contact-production.yml");
  assert.match(canonical, /expected_sha:/);
  assert.match(canonical, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/);
  assert.match(canonical, /node --test scripts\/test-no-email-release-guard\.mjs/);
  assert.match(canonical, /\.service == "novapharm-contact-intake" and \.ready == true and \.environment == "production"/);
  assert.ok(canonical.includes('-X POST "$CONTACT_ORIGIN/contact"'));
  assert.ok(canonical.includes("-H 'Content-Type: application/json' -d '{}'"));
  assert.ok(canonical.includes('test "$rejected" = "403"'));
  assert.doesNotMatch(canonical, /\.persisted == true and \.notificationAccepted == true/);
  assert.match(canonical, /data-live-b2b-enquiry-form/);
  assert.ok(canonical.includes("! grep -Fq 'data-email-enquiry-form'"));
});


test("all 101-source onboarding and rights-only files are private and cannot dispatch AWS or Pages", () => {
  const protectedSourceFiles = [
    ".github/workflows/browser-acceptance.yml",
    ".github/workflows/intelligence-global-101-onboarding.yml",
    "docs/intelligence/global-101-source-integration-matrix-20261118.md",
    "scripts/test-intelligence-global-intake-workflow.mjs",
    "scripts/test-intelligence-global-source-gateway.mjs",
    "scripts/test-intelligence-global-source-onboarding.mjs",
    "src/core/intelligence-global-evidence-contract.mjs",
    "src/core/intelligence-global-intake-quality.mjs",
    "src/core/intelligence-global-intake-workflow.mjs",
    "src/core/intelligence-global-source-gateway.mjs",
    "src/core/intelligence-global-source-onboarding.mjs"
  ];
  for (const workflow of [
    "dispatch-approved-aws-contact-release.yml",
    "publish-aws-contact-production.yml"
  ]) {
    const source = get(workflow);
    // Check the actual source classification case, not a comment or a test name.
    const caseLine = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(caseLine, workflow + " must classify individual changed paths");
    for (const path of protectedSourceFiles) {
      assert.ok(caseLine.split("|").includes(path),
        workflow + " missing private source protection: " + path);
    }
    assert.match(source, /private_only=true/);
    assert.match(source, /found_ml=true/);
  }
  const dispatch = get("dispatch-approved-aws-contact-release.yml");
  const publish = get("publish-aws-contact-production.yml");
  assert.ok(dispatch.includes("scripts/aws/contact-release-routing.test.mjs"));
  assert.ok(publish.includes("scripts/aws/contact-release-routing.test.mjs"));
  assert.match(dispatch, /skip=true/);
  assert.match(publish, /release_needed=false/);
});

test("private-only corporate live CI trigger repairs cannot dispatch public AWS releases", () => {
  const dispatch = get("dispatch-approved-aws-contact-release.yml");
  const publish = get("publish-aws-contact-production.yml");
  for (const path of [
    ".github/workflows/corporate-live-full-acceptance.yml",
    "scripts/test-corporate-live-publication-gate.mjs"
  ]) {
    assert.ok(dispatch.includes(path), "dispatcher guard missing " + path);
    assert.ok(publish.includes(path), "publisher guard missing " + path);
  }
  assert.match(dispatch, /private_only=true/);
  assert.match(publish, /release_needed=false/);
});

test("private enterprise readiness artifacts cannot dispatch the unrelated public contact publisher", () => {
  const files = [
    "src/core/intelligence-enterprise-readiness.mjs",
    "scripts/audit-intelligence-enterprise-readiness.mjs",
    "scripts/test-intelligence-enterprise-readiness.mjs",
    "docs/intelligence/ENTERPRISE_RELEASE_READINESS_20261118.md",
    ".github/workflows/intelligence-enterprise-readiness.yml"
  ];
  const dispatcher = get("dispatch-approved-aws-contact-release.yml");
  const publisher = get("publish-aws-contact-production.yml");
  for (const path of files) {
    assert.ok(dispatcher.includes("|" + path + "|"), "contact dispatcher must treat source-only audit as private: " + path);
    assert.ok(publisher.includes("|" + path + "|"), "public publisher must treat source-only audit as private: " + path);
  }
  // A risk-register entry is a meaningful protected ML source change, so the
  // existing found_ml=true & private_only=true condition can safely deny publication.
  assert.ok(dispatcher.includes("|docs/ai-risk-register.md|"));
  assert.ok(publisher.includes("|docs/ai-risk-register.md|"));
  assert.match(dispatcher, /found_ml=true/);
  assert.match(publisher, /release_needed=false/);
  // Publisher policy-only changes remain neutral, not an automatic private exemption.
  assert.match(publisher, /A publisher policy-only update must not be silently skipped/);
});

test("L0 and alignment research-only source merges cannot accidentally publish AWS or Pages", () => {
  const researchSources = [
    ".github/workflows/intelligence-global-mobile-contracts.yml",
    ".github/workflows/nova-ml-alignment-research.yml",
    ".github/workflows/nova-ml-l0-sparsity.yml",
    "docs/ai-dependency-and-model-sbom.json",
    "docs/ai-model-register.json",
    "docs/ai-use-case-register.json",
    "docs/intelligence/L0_SPARSE_ML_CROSS_PLATFORM_20261118.md",
    "docs/intelligence/NOVA_AI_ALIGNMENT_RESEARCH_20261118.md",
    "native/novapharm-intelligence-mobile/App.tsx",
    "native/novapharm-intelligence-mobile/README.md",
    "native/novapharm-intelligence-mobile/tests/mobile-nova-ml-contract.test.mjs",
    "native/novapharm-intelligence-mobile/tsconfig.json",
    "packages/medicines-intelligence/src/l0-sparsity.ts",
    "packages/medicines-intelligence/test/l0-sparsity.test.ts",
    "scripts/test-nova-alignment-governance.mjs",
    "scripts/test-nova-alignment-research.mjs",
    "scripts/test-nova-l0-governance.mjs",
    "src/core/ai/nova-alignment-research.mjs",
    "tooling/python/nova_l0_sparsity.py",
    "tooling/python/test_nova_l0_sparsity.py",
  ];
  for (const workflow of ["dispatch-approved-aws-contact-release.yml", "publish-aws-contact-production.yml"]) {
    const source = get(workflow);
    const caseLine = source.split("\n").find((line) =>
      line.includes("apps/portal/*|.github/workflows/browser-acceptance.yml|"));
    assert.ok(caseLine, "no private classifier in " + workflow);
    const cases = caseLine.trim().replace(/\)$/, "").split("|");
    for (const path of researchSources) {
      assert.ok(cases.includes(path), workflow + " would publish research-only change " + path);
    }
    // A future change to the shared exports barrel must fail closed to the public-publisher path.
    assert.ok(source.includes("packages/medicines-intelligence/src/index.ts)"));
    assert.ok(source.includes('export_diff=$(git diff --unified=0 "$GITHUB_SHA^1" "$GITHUB_SHA"'));
    assert.ok(source.includes("if [ \"$export_diff\" = '+export * from \"./l0-sparsity.ts\";' ]; then"));
    assert.ok(source.includes("private_only=false"));
    assert.ok(source.includes("found_ml=true"));
    assert.ok(!cases.includes("packages/medicines-intelligence/src/index.ts"));
    assert.ok(!cases.includes("packages/medicines-intelligence/*"));
  }
});
