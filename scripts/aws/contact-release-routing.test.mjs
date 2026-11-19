import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

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
  assert.match(dispatcher, /if: steps\.owner_hold\.outputs\.hold == 'false' && steps\.private_release\.outputs\.skip != 'true'/);
  const guardedAwsSteps = dispatcher.match(/if: steps\.owner_hold\.outputs\.hold == 'false' && steps\.private_release\.outputs\.skip != 'true' && steps\.publisher\.outputs\.skip != 'true'/g) || [];
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

test("sparse-circuit PR #816 source-only merge skips public AWS contact dispatch and publisher", () => {
  // Pin the exact files changed by this nonclinical research release.
  // A missing path must fail CI before merging to main: the unconditional
  // main-push dispatcher would otherwise enter an AWS contact health/dispatch path.
  const privatePaths = [
    ".github/workflows/intelligence-sparse-circuit-assurance.yml",
    ".github/workflows/intelligence-sparse-transformer-experiment.yml",
    ".github/workflows/nova-ml-native-apple.yml",
    ".github/workflows/nova-sparse-circuit-android.yml",
    "apps/portal/components/nova-ml-workspaces.tsx",
    "apps/portal/data/nova-ml-modules.ts",
    "docs/ai-risk-register.md",
    "docs/architecture/nova-scientific-intelligence-programme.md",
    "docs/intelligence/SPARSE_CIRCUIT_RESEARCH_INTEGRATION_20261118.md",
    "docs/intelligence/SPARSE_CIRCUIT_UPSTREAM_SOURCE_REVIEW_20261118.md",
    "docs/intelligence/npi-sparse-circuit-summary-v1.schema.json",
    "native/novapharm-intelligence-android/README.md",
    "native/novapharm-intelligence-android/app/build.gradle.kts",
    "native/novapharm-intelligence-android/app/src/main/AndroidManifest.xml",
    "native/novapharm-intelligence-android/app/src/main/java/com/novapharm/intelligence/research/NovaResearchActivity.kt",
    "native/novapharm-intelligence-android/app/src/main/java/com/novapharm/intelligence/research/NovaSparseCircuitReader.kt",
    "native/novapharm-intelligence-android/app/src/main/java/com/novapharm/intelligence/research/NovaSparseCircuitResearchScreen.kt",
    "native/novapharm-intelligence-android/app/src/main/res/values/strings.xml",
    "native/novapharm-intelligence-android/app/src/test/java/com/novapharm/intelligence/research/NovaSparseCircuitReaderTest.kt",
    "native/novapharm-intelligence-android/build.gradle.kts",
    "native/novapharm-intelligence-android/gradle.properties",
    "native/novapharm-intelligence-android/settings.gradle.kts",
    "native/novapharm-intelligence-apple/NovaSparseCircuitReader.swift",
    "native/novapharm-intelligence-apple/NovaSparseCircuitResearchView.swift",
    "native/novapharm-intelligence-apple/Package.swift",
    "native/novapharm-intelligence-apple/README.md",
    "native/novapharm-intelligence-apple/Tests/NovaMLAppleTests.swift",
    "native/novapharm-intelligence-mobile/App.tsx",
    "native/novapharm-intelligence-mobile/README.md",
    "native/novapharm-intelligence-mobile/tests/sparse-circuit-research-contract.test.mjs",
    "scripts/research/fixtures/trained-sparse-transformer-observed-local-run.json",
    "scripts/research/tiny-sparse-transformer-experiment.py",
    "scripts/research/toy-sparse-circuit-intervention.mjs",
    "scripts/research/validate-trained-sparse-transformer-report.mjs",
    "scripts/test-intelligence-sparse-circuit-assurance.mjs",
    "scripts/test-intelligence-sparse-circuit-cross-platform.mjs",
    "scripts/test-intelligence-sparse-circuit-toy-intervention.mjs",
    "scripts/test-intelligence-sparse-circuit-upstream-governance.mjs",
    "scripts/test-intelligence-trained-sparse-transformer-report.mjs",
    "src/ai/model-registry.mjs",
    "src/core/ai/model-registry.mjs",
    "src/core/intelligence-sparse-circuit-assurance.mjs"
  ];
  const privateOnlyPublisherFiles = [
    ".github/workflows/dispatch-approved-aws-contact-release.yml",
    ".github/workflows/publish-aws-contact-production.yml",
    "scripts/aws/contact-release-routing.test.mjs"
  ];
  for (const filename of [
    "dispatch-approved-aws-contact-release.yml",
    "publish-aws-contact-production.yml"
  ]) {
    const source = get(filename);
    const firstCase = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(firstCase, filename + " must classify each exact changed path");
    const protectedPatterns = firstCase.trim().replace(/\)$/, "").split("|");
    const covers = (path) => protectedPatterns.some((p) =>
      p === path || (p.endsWith("/*") && path.startsWith(p.slice(0, -1)))
    );
    for (const path of privatePaths) {
      assert.ok(covers(path), filename + " would permit AWS contact verification on " + path);
    }
    for (const path of [
      "assets/js/contact-production.js",
      "products/nutraxin/index.html",
      "scripts/build-site.mjs",
      "assets/css/novapharm.bundle.css"
    ]) {
      assert.equal(covers(path), false, filename + " must preserve genuine public release for " + path);
    }
    for (const path of privateOnlyPublisherFiles) {
      assert.ok(source.includes(path), filename + " must account for its own release-control updates: " + path);
    }
    assert.match(source, /private_only=true/);
    assert.match(source, /found_ml=true/);
  }
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
      line.trim().startsWith("apps/portal/*|"));
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

test("HIG-only web and mobile merges never dispatch the unrelated AWS contact release", () => {
  const higPrivatePaths = [
    "docs/design/apple-hig-attachment-evidence-20261118.json",
    "docs/design/apple-hig-source-and-attachment-audit-20261118.md",
    "scripts/test-apple-hig-attachment-audit.mjs",
    "native/novapharm-intelligence-mobile/MapsResearchScreen.tsx",
    "native/novapharm-intelligence-mobile/appearance.ts",
    "native/novapharm-intelligence-mobile/app.json",
    "native/novapharm-intelligence-mobile/package.json",
    "native/novapharm-intelligence-mobile/tests/mobile-system-appearance.test.mjs",
    "docs/design/apple-hig-172-topic-acceptance-register.json",
    "docs/design/apple-hig-172-topic-adoption-20261118.md",
    "docs/design/apple-hig-three-platform-adoption-20261118.md",
    "native/novapharm-intelligence-mobile/MultimodalReviewScreen.tsx",
    "native/novapharm-intelligence-mobile/tests/apple-hig-navigation.test.mjs",
    "scripts/test-apple-hig-full-catalogue-and-cross-platform.mjs",
    ".github/workflows/apple-hig-cross-platform-detail.yml"
  ];
  const pr855Changes = [
    "apps/portal/app/globals.css",
    "native/novapharm-intelligence-mobile/MultimodalReviewScreen.tsx",
    "docs/design/apple-hig-172-topic-acceptance-register.json",
    "docs/design/apple-hig-172-topic-adoption-20261118.md",
    ".github/workflows/apple-hig-cross-platform-detail.yml",
    "scripts/test-apple-hig-full-catalogue-and-cross-platform.mjs"
  ];
  const pr854Changes = [
    "docs/design/apple-hig-three-platform-adoption-20261118.md",
    "native/novapharm-intelligence-mobile/App.tsx",
    "native/novapharm-intelligence-mobile/tests/apple-hig-navigation.test.mjs",
    "native/novapharm-intelligence-mobile/tests/mobile-nova-ml-contract.test.mjs",
    "native/novapharm-intelligence-mobile/tests/sparse-circuit-research-contract.test.mjs"
  ];
  const appearanceChangeSet = [
    "native/novapharm-intelligence-mobile/MapsResearchScreen.tsx",
    "native/novapharm-intelligence-mobile/App.tsx",
    "native/novapharm-intelligence-mobile/MultimodalReviewScreen.tsx",
    "native/novapharm-intelligence-mobile/appearance.ts",
    "native/novapharm-intelligence-mobile/app.json",
    "native/novapharm-intelligence-mobile/package.json",
    "native/novapharm-intelligence-mobile/tests/mobile-system-appearance.test.mjs",
    "native/novapharm-intelligence-mobile/README.md",
    "docs/design/apple-hig-three-platform-adoption-20261118.md",
    ".github/workflows/dispatch-approved-aws-contact-release.yml",
    ".github/workflows/publish-aws-contact-production.yml",
    "scripts/aws/contact-release-routing.test.mjs"
  ];
  const policyRepairChanges = [
    ".github/workflows/dispatch-approved-aws-contact-release.yml",
    ".github/workflows/publish-aws-contact-production.yml",
    "scripts/aws/contact-release-routing.test.mjs",
    "docs/design/apple-hig-172-topic-adoption-20261118.md"
  ];
  const publicChange = "assets/css/novapharm.bundle.css";
  for (const file of ["dispatch-approved-aws-contact-release.yml", "publish-aws-contact-production.yml"]) {
    const source = get(file);
    const firstCase = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(firstCase, file + " must inspect the first-parent private change-set");
    const patterns = firstCase.trim().replace(/\)$/, "").split("|");
    const covers = (path) => patterns.some((candidate) =>
      candidate === path || (candidate.endsWith("/*") && path.startsWith(candidate.slice(0, -1))));
    for (const path of higPrivatePaths) {
      assert.ok(patterns.includes(path), file + " missing exact HIG research path: " + path);
    }
    for (const [label, group] of [["PR855", pr855Changes], ["PR854", pr854Changes]]) {
      assert.ok(group.every(covers), file + " would incorrectly publish AWS contact for " + label);
    }
    // Release-control files live in a deliberately neutral case. They cannot
    // independently declare a private-only commit, but are safe when an
    // independently reviewed private source/document path also changed.
    const neutralLine = source.split("\n").find((line) =>
      line.includes("scripts/aws/contact-release-routing.test.mjs") && line.trim().endsWith(")"));
    assert.ok(neutralLine, file + " must retain the neutral publisher-guard clause");
    const neutralPatterns = neutralLine.trim().replace(/\)$/, "").split("|");
    for (const p of appearanceChangeSet) {
      assert.ok(covers(p) || neutralPatterns.includes(p),
        file + " cannot trigger unrelated AWS contact for appearance change " + p);
    }
    const policySource = "docs/design/apple-hig-172-topic-adoption-20261118.md";
    assert.ok(covers(policySource), file + " must classify the repair's private source evidence");
    for (const changed of policyRepairChanges.filter((value) => value !== policySource)) {
      assert.ok(neutralPatterns.includes(changed),
        file + " must keep publisher policy change neutral, not unclassified: " + changed);
    }
    assert.equal(covers(publicChange), false, file + " must not suppress genuine public CSS releases");
    assert.equal(covers("assets/js/contact-production.js"), false, file + " must not suppress real contact changes");
    assert.ok(!patterns.includes("docs/design/*"), "Do not hide arbitrary public documentation changes");
    assert.ok(!patterns.includes("native/novapharm-intelligence-mobile/*"), "Only specifically reviewed private mobile paths may skip");
  }
});

test("manual publisher dispatch checks the requested exact commit before allowing AWS or Pages", () => {
  const publisher = get("publish-aws-contact-production.yml");
  assert.ok(publisher.includes("ref: " + "$" + "{{ github.event_name == 'workflow_dispatch' && inputs.expected_sha || github.sha }}"));
  assert.ok(publisher.includes("EXPECTED_SHA: " + "$" + "{{ github.event_name == 'workflow_dispatch' && inputs.expected_sha || github.sha }}"));
  assert.match(publisher, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/);
  assert.match(publisher, /changed_paths=\$\(git diff --name-only "HEAD\^1" HEAD\)/);
  assert.doesNotMatch(publisher, /if \[ "\$GITHUB_EVENT_NAME" = "workflow_dispatch" \]; then\s*\n\s*echo "release_needed=true"/);
  assert.match(publisher, /release_needed=false/);
  assert.match(publisher, /release_needed=true/);
});

test("global secondary-source-only merges are excluded from AWS contact dispatch and public publisher", () => {
  // These exact files appeared in the source-only main merge f1546b7.
  // Both the ordinary dispatcher and the separately triggered publisher
  // must classify them as private BEFORE any live contact verification.
  const sourceOnlyPaths = [
    ".github/workflows/intelligence-global-secondary-source-contracts.yml",
    "docs/intelligence/global-secondary-source-api-contracts-20261118.md",
    "scripts/test-intelligence-global-secondary-source-gateway.mjs",
    "scripts/test-intelligence-singapore-hsa-bulk-candidate.mjs",
    "src/core/intelligence-global-secondary-source-gateway.mjs",
    "src/core/intelligence-singapore-hsa-bulk-candidate.mjs"
  ];
  const neutralReleaseGuards = [
    ".github/workflows/dispatch-approved-aws-contact-release.yml",
    ".github/workflows/publish-aws-contact-production.yml",
    "scripts/aws/contact-release-routing.test.mjs"
  ];
  const actualPublicChanges = [
    "assets/js/contact-production.js",
    "products/nutraxin/index.html",
    "scripts/build-site.mjs",
    "assets/css/novapharm.bundle.css"
  ];
  for (const workflow of [
    "dispatch-approved-aws-contact-release.yml",
    "publish-aws-contact-production.yml"
  ]) {
    const source = get(workflow);
    const caseLine = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(caseLine, workflow + ": release scope case must exist");
    const privatePatterns = caseLine.trim().replace(/\)$/, "").split("|");
    const protectedSource = path => privatePatterns.some(pattern =>
      pattern === path || (pattern.endsWith("/*") && path.startsWith(pattern.slice(0, -1)))
    );
    const privateRelease = paths => {
      const changed = paths.length > 0;
      const sawPrivate = paths.some(protectedSource);
      const onlyPrivateOrNeutral = paths.every(path =>
        protectedSource(path) || neutralReleaseGuards.includes(path)
      );
      return changed && sawPrivate && onlyPrivateOrNeutral;
    };
    for (const path of sourceOnlyPaths) {
      assert.equal(protectedSource(path), true, workflow + " must protect " + path);
    }
    assert.equal(privateRelease(sourceOnlyPaths), true, workflow + " must deny source-only AWS publish");
    assert.equal(privateRelease([...neutralReleaseGuards, sourceOnlyPaths[1], sourceOnlyPaths[0]]), true,
      workflow + " must deny AWS publish on this guard-repair merge");
    assert.equal(privateRelease(neutralReleaseGuards), false,
      workflow + " guard-only changes must not silently redefine real public release policy");
    for (const path of actualPublicChanges) {
      assert.equal(protectedSource(path), false, workflow + " must not quarantine a real public file " + path);
      assert.equal(privateRelease([sourceOnlyPaths[0], path]), false,
        workflow + " must not suppress mixed public and protected source releases");
    }
    assert.match(source, /private_only=true/);
    assert.match(source, /found_ml=true/);
  }
});


test("Official pharmaceutical publisher probe source-only changes do not dispatch AWS public contact", async () => {
  // A PR-publisher route must never turn on a different AWS contact release.
  // Source-only paths are exact, never broad "server.mjs" or web wildcards.
  const { createHash } = await import("node:crypto");
  const sourcePaths = [
    ".github/workflows/intelligence-official-live-pharma-probes.yml",
    "docs/intelligence/official-live-pharma-probes-20261118.md",
    "scripts/run-intelligence-official-live-pharma-probes.mjs",
    "scripts/test-intelligence-official-live-pharma-probes.mjs",
    "scripts/test-intelligence-official-live-pharma-quarantine.mjs",
    "scripts/test-intelligence-official-live-pharma-server-gate.mjs",
    "src/core/intelligence-official-live-pharma-probes.mjs",
    ".github/workflows/intelligence-es-cima-public-live-probe.yml",
    "docs/intelligence/spain-cima-official-live-probe-20261118.md",
    "scripts/run-intelligence-es-cima-public-live-probe.mjs",
    "scripts/test-intelligence-es-cima-live-quarantine.mjs",
    "scripts/test-intelligence-es-cima-public-live-probe.mjs",
    "src/core/intelligence-es-cima-public-live-probe.mjs",
    ".github/workflows/intelligence-canada-dpd-public-live-source.yml",
    "docs/intelligence/canada-dpd-public-live-source-20261118.md",
    "scripts/run-intelligence-canada-dpd-public-live-probe.mjs",
    "scripts/test-intelligence-canada-dpd-public-live-probe.mjs",
    "src/core/intelligence-canada-dpd-public-live-probe.mjs"
];
  const allowedPublicPaths = [
    "assets/js/contact-production.js",
    "products/nutraxin/index.html",
    "scripts/build-site.mjs",
    "assets/css/novapharm.bundle.css"
  ];
  const neutral = new Set([
    ".github/workflows/dispatch-approved-aws-contact-release.yml",
    ".github/workflows/publish-aws-contact-production.yml",
    "scripts/aws/contact-release-routing.test.mjs"
  ]);
  const exactServerRouteDelta = "+import { probeOfficialPublicPharmaSource, OFFICIAL_LIVE_PROBE_PLANS } from \"./src/core/intelligence-official-live-pharma-probes.mjs\";\n+    if (pathname === \"/api/v1/intelligence/sources/official/public-live-probe\" && request.method === \"GET\") {\n+      // Real official upstream HTTP is BOARD-ONLY, rate limited, and default-OFF.\n+      // The result contains only a hash/time/schema receipt, never medicine rows.\n+      // Reject unauthenticated/disabled requests BEFORE consuming the scarce\n+      // publisher-call quota; unauthenticated traffic must not throttle board review.\n+      const session = await scopedAuthentication(request, response, [\"board\"]);\n+      if (!session) return;\n+      if (process.env.NPI_OFFICIAL_PUBLIC_SOURCE_PROBE_ENABLED !== \"true\") {\n+        return json(response, 503, { error: \"Official source live review has not been activated.\" });\n+      }\n+      const sourceId = url.searchParams.get(\"sourceId\");\n+      if (!sourceId || !Object.hasOwn(OFFICIAL_LIVE_PROBE_PLANS, sourceId)) {\n+        return json(response, 400, { error: \"Unsupported official pharmaceutical source.\" });\n+      }\n+      // Authorised requests remain bounded BEFORE any publisher transport.\n+      if (!await rateLimit(request, \"official-public-live-source-probe\", 2, 60 * 1000)) {\n+        return json(response, 429, { error: \"Official source probe rate limit reached.\" });\n+      }\n+      try {\n+        const receipt = await probeOfficialPublicPharmaSource(sourceId);\n+        return json(response, 200, receipt);\n+      } catch {\n+        return json(response, 503, { error: \"Official publisher is not available for bounded live review.\" });\n+      }\n+    }\n+" + "\n";
  const sha = createHash("sha256").update(exactServerRouteDelta, "utf8").digest("hex");
  assert.equal(sha, "56617895bd590517223bbc08888c81c6d035209e34f4d1add574864109c39fa2", "reviewed board-only server change must be pinned");

  for (const workflow of [
    "dispatch-approved-aws-contact-release.yml",
    "publish-aws-contact-production.yml"
  ]) {
    const source = get(workflow);
    const caseLine = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(caseLine, workflow + " must have a release path classifier");
    const patterns = caseLine.trim().replace(/\)$/, "").split("|");
    const protectedPath = path => patterns.some(pattern =>
      pattern === path || (pattern.endsWith("/*") && path.startsWith(pattern.slice(0,-1)))
    );
    for (const path of sourcePaths) {
      assert.equal(protectedPath(path), true, workflow + " must protect " + path);
    }
    assert.equal(protectedPath("server.mjs"), false, "shared server must not be blanket-whitelisted");
    for (const path of allowedPublicPaths) {
      assert.equal(protectedPath(path), false, "public path must remain public: " + path);
    }
    const privateRelease = paths => paths.length > 0 &&
      paths.some(protectedPath) && paths.every(p => protectedPath(p) || neutral.has(p));
    assert.equal(privateRelease(sourcePaths), true);
    assert.equal(privateRelease([...neutral, ...sourcePaths.slice(0,2)]), true,
      "this guard-only repair must not dispatch a customer publication");
    for (const path of allowedPublicPaths) {
      assert.equal(privateRelease([...sourcePaths, path]), false,
        "mixed public changes must follow real publication acceptance");
    }

    const branch = source.match(/server\.mjs\)\s*\n([\s\S]*?)\n\s*;;/)?.[1];
    assert.ok(branch, workflow + " must include exact guarded server special-case");
    assert.ok(branch.includes("56617895bd590517223bbc08888c81c6d035209e34f4d1add574864109c39fa2"), "pinned reviewed server SHA-256 required");
    assert.match(branch, /git diff --unified=0/);
    assert.match(branch, /sha256sum/);
    assert.match(branch, /found_ml=true/);
    assert.match(branch, /private_only=false/);
    assert.ok(!/\bserver\.mjs\|/.test(caseLine),
      "shared server must not be in the main private-only path list");
  }
});

test("CLIP default-OFF source-only merge keeps AWS contact publisher isolated by exact Git blobs", () => {
  const privateChanged = [
    ".github/workflows/intelligence-clip-research-contract.yml",
    "apps/portal/app/gateway/[...path]/route.ts",
    "apps/portal/components/clip-visual-search.tsx",
    "docs/ai-model-register.json",
    "docs/ai-risk-register.md",
    "docs/intelligence/OPENAI_CLIP_CROSS_PLATFORM_RESEARCH_20261118.md",
    "docs/intelligence/visual-search-cross-platform-contract.json",
    "native/novapharm-intelligence-apple/NovaClipVisualSearch.swift",
    "native/novapharm-intelligence-android/clipResearch/build.gradle.kts",
    "scripts/test-intelligence-visual-search.mjs",
    "services/clip/serve.py",
    "src/core/intelligence-visual-search.mjs"
  ];
  const reviewed = {"serverOld":"4e8c233d1dbf085545763de4bd4de093ea95ec11","serverNew":"12dd72527ae561d6506d9573d418959d6f337189","packageOld":"733efc6571364754e46bfcadb8141d5d6c3481ba","packageNew":"c2ad27febc151c09e9629ed602ad989a01e90213"};
  const neutral = [
    ".github/workflows/dispatch-approved-aws-contact-release.yml",
    ".github/workflows/publish-aws-contact-production.yml",
    "scripts/aws/contact-release-routing.test.mjs"
  ];
  const publicChanges = [
    "assets/js/contact-production.js",
    "products/nutraxin/index.html",
    "scripts/build-site.mjs",
    "scripts/imdf/unreviewed-tool.mjs"
  ];
  for (const filename of ["dispatch-approved-aws-contact-release.yml", "publish-aws-contact-production.yml"]) {
    const src = get(filename);
    const first = src.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(first, filename + " must have source-only classifier");
    const patterns = first.trim().replace(/\)$/, "").split("|");
    const isPrivate = p => patterns.some(rule => p === rule ||
      (rule.endsWith("/*") && p.startsWith(rule.slice(0, -1))));
    for (const p of privateChanged) assert.ok(isPrivate(p), filename + " misses protected CLIP research source: " + p);
    for (const p of publicChanges) assert.equal(isPrivate(p), false, filename + " must not hide public changes: " + p);
    for (const hash of Object.values(reviewed)) assert.ok(src.includes(hash), filename + " must pin exact reviewed blob: " + hash);
    assert.ok(src.includes("git hash-object"), filename + " must inspect proposed exact blob");
    assert.ok(src.includes("git rev-parse"), filename + " must inspect original first-parent blob");
    assert.ok(src.includes("private_only=false"), filename + " must reject unreviewed changes");
    const isSafeSourceOnly = (changed, exactShared) => changed.some(isPrivate) &&
      changed.every(p => isPrivate(p) || neutral.includes(p) ||
        (exactShared && (p === "server.mjs" || p === "package.json")));
    assert.equal(isSafeSourceOnly([...privateChanged, ...neutral, "server.mjs", "package.json"], true), true);
    assert.equal(isSafeSourceOnly([...privateChanged, "server.mjs"], false), false);
    assert.equal(isSafeSourceOnly(["server.mjs", "package.json"], true), false);
    for (const p of publicChanges) assert.equal(isSafeSourceOnly([...privateChanged, "server.mjs", p], true), false);
  }
});

test("CLIP source-only merge permits only the exact reviewed shared syntax migration", () => {
  const syntaxPath = "scripts/check-syntax.mjs";
  const reviewedBaseBlob = "51c1abd00a10856395c3283a992f5c53e6de7cea";
  const reviewedCandidateBlob = "e186036b0f29d8c67d6e942311aa2585d41e37c0";
  const content = readFileSync(syntaxPath);
  // Git object hash, not a guessed filesystem checksum.
  const actualBlob = createHash("sha1").update("blob " + content.length + "\0").update(content).digest("hex");
  assert.equal(actualBlob, reviewedCandidateBlob, "reviewed Node24 syntax migration changed: re-approve before merge");

  const privateChanges = [
    "native/novapharm-intelligence-mobile/clip-research.ts",
    "native/novapharm-intelligence-mobile/package.json",
    "native/novapharm-intelligence-mobile/tests/clip-contract.test.mjs",
    "native/novapharm-intelligence-mobile/tests/mobile-contract.test.mjs",
    "native/novapharm-intelligence-mobile/App.tsx",
    "native/novapharm-intelligence-mobile/README.md",
    ".github/workflows/intelligence-global-mobile-contracts.yml"
  ];
  const neutral = [
    ".github/workflows/dispatch-approved-aws-contact-release.yml",
    ".github/workflows/publish-aws-contact-production.yml",
    "scripts/aws/contact-release-routing.test.mjs"
  ];
  const publicPaths = [
    "assets/js/contact-production.js",
    "products/nutraxin/index.html",
    "scripts/build-site.mjs",
    "assets/css/novapharm.bundle.css"
  ];
  for (const workflow of [
    "dispatch-approved-aws-contact-release.yml",
    "publish-aws-contact-production.yml"
  ]) {
    const source = get(workflow);
    const first = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(first, workflow + " must preserve private-only classifier");
    const privatePatterns = first.trim().replace(/\)$/, "").split("|");
    const isPrivate = path => privatePatterns.some(pattern =>
      path === pattern || (pattern.endsWith("/*") && path.startsWith(pattern.slice(0, -1)))
    );
    for (const path of privateChanges) {
      assert.equal(isPrivate(path), true, workflow + " missing source-only protection: " + path);
    }
    assert.equal(isPrivate(syntaxPath), false, "shared tooling must not be universally private");
    assert.ok(source.includes('scripts/check-syntax.mjs)'), workflow + " must inspect the exact shared-tool change");
    assert.ok(source.includes('git rev-parse "$GITHUB_SHA^1:$changed"'), workflow + " must verify previous blob");
    assert.ok(source.includes('git hash-object "$changed"'), workflow + " must verify candidate blob");
    assert.ok(source.includes(reviewedBaseBlob), workflow + " must pin the reviewed source");
    assert.ok(source.includes(reviewedCandidateBlob), workflow + " must pin the reviewed result");

    const isSafePrivateOnly = (changed, verifiedSyntaxMigration) => changed.some(isPrivate) &&
      changed.every(path => isPrivate(path) || neutral.includes(path) ||
        (path === syntaxPath && verifiedSyntaxMigration));
    assert.equal(isSafePrivateOnly([...privateChanges, ...neutral, syntaxPath], true), true,
      "this exact approved private CLIP + Node24 migration should skip AWS");
    assert.equal(isSafePrivateOnly([...privateChanges, syntaxPath], false), false,
      "changed or unreviewed syntax tooling must follow normal public release gates");
    assert.equal(isSafePrivateOnly([...neutral, syntaxPath], true), false,
      "shared tooling alone may never masquerade as a private ML release");
    for (const path of publicPaths) {
      assert.equal(isPrivate(path), false);
      assert.equal(isSafePrivateOnly([...privateChanges, syntaxPath, path], true), false,
        "real mixed public releases must never be suppressed");
    }
    assert.match(source, /private_only=true/);
    assert.match(source, /found_ml=true/);
  }
});

test("reviewed #856 breadcrumb CSS never silently exempts future public CSS or contact changes", () => {
  const oldBlob = "35a79b8b0051ac353d98e6f70ae9446d44955b5c";
  const newBlob = "85ca93d1f501de09e99f4114852daacb4d1b77f1";
  for (const file of ["dispatch-approved-aws-contact-release.yml", "publish-aws-contact-production.yml"]) {
    const source = get(file);
    const privateLine = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1]?.trim();
    assert.ok(privateLine && privateLine.endsWith(")"));
    assert.equal(privateLine.indexOf(")"), privateLine.length - 1);
    const paths = new Set(privateLine.slice(0, -1).split("|"));
    assert.equal(paths.has("apps/corporate/app/design-system.css"), false,
      "Future unreviewed CSS changes must use the ordinary public publisher");
    const cssCase = source.match(/apps\/corporate\/app\/design-system\.css\)\s*\n([\s\S]*?)\n\s*;;/m)?.[1] ?? "";
    assert.ok(cssCase.includes('HEAD^1:apps/corporate/app/design-system.css'));
    assert.ok(cssCase.includes('HEAD:apps/corporate/app/design-system.css'));
    assert.ok(cssCase.includes(oldBlob) && cssCase.includes(newBlob), "Only exact reviewed CSS may be exempt");
    assert.ok(cssCase.includes("private_only=false"), "CSS hash mismatch must not bypass release");
    const auditCase = source.match(/\.github\/workflows\/visual-refinement\.yml\|scripts\/audit-website-hig-source\.mjs\|scripts\/test-apple-hig-census\.mjs\)\s*\n([\s\S]*?)\n\s*;;/m)?.[1] ?? "";
    assert.ok(auditCase.includes("found_ml=true"));
    assert.equal(paths.has("assets/js/contact-production.js"), false);
    assert.equal(paths.has("scripts/build-site.mjs"), false);
  }
});

test("IMDF venue-rights source-only merges cannot dispatch the unrelated AWS contact publisher", () => {
  const protectedPaths = [
    ".github/workflows/imdf-venue-evidence-preflight.yml",
    "docs/maps/imdf-venue-preflight-20261119.md",
    "scripts/imdf/venue-preflight.mjs",
    "scripts/imdf/venue-preflight.test.mjs"
  ];
  const guardedPaths = [
    ".github/workflows/dispatch-approved-aws-contact-release.yml",
    ".github/workflows/publish-aws-contact-production.yml",
    "scripts/aws/contact-release-routing.test.mjs"
  ];
  const publicPaths = [
    "assets/js/contact-production.js",
    "products/nutraxin/index.html",
    "scripts/build-site.mjs",
    "server.mjs",
    "package.json"
  ];
  for (const filename of ["dispatch-approved-aws-contact-release.yml", "publish-aws-contact-production.yml"]) {
    const source = get(filename);
    const first = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(first, filename + " must retain source-only release classification");
    const patterns = first.trim().replace(/\)$/, "").split("|");
    const isPrivate = value => patterns.some(pattern =>
      value === pattern || (pattern.endsWith("/*") && value.startsWith(pattern.slice(0, -1)))
    );
    for (const value of protectedPaths) {
      assert.ok(isPrivate(value), filename + " cannot publish the IMDF-only source: " + value);
    }
    for (const value of publicPaths) {
      assert.equal(isPrivate(value), false, filename + " cannot suppress real public changes: " + value);
    }
    assert.equal(isPrivate("scripts/imdf/another-unreviewed-tool.mjs"), false, "Do not broadly quarantine IMDF directory");
    const isPrivateOnly = changed => changed.some(isPrivate) &&
      changed.every(value => isPrivate(value) || guardedPaths.includes(value));
    assert.equal(isPrivateOnly([...protectedPaths, ...guardedPaths]), true);
    assert.equal(isPrivateOnly(guardedPaths), false, "Policy edits alone cannot bypass release gates");
    for (const publicPath of publicPaths) {
      assert.equal(isPrivateOnly([...protectedPaths, publicPath]), false, "Mixed public releases must pass deployment gates");
    }
    assert.match(source, /found_ml=true/);
    assert.match(source, /private_only=false/);
  }
});

test("explicit owner production hold blocks AWS contact dispatch and publisher even if source classifier is public", () => {
  const owner = JSON.parse(readFileSync("config/intelligence/owner-production-constraints.json", "utf8"));
  const approval = payload => payload?.productionSignoff === "granted" &&
    payload?.productionPermissions?.activatePublicCustomerAccess === true;
  assert.equal(approval(owner), false, "current owner policy must not silently permit AWS");
  assert.equal(approval({ productionSignoff: "granted", productionPermissions: { activatePublicCustomerAccess: false } }), false);
  assert.equal(approval({ productionSignoff: "not_granted", productionPermissions: { activatePublicCustomerAccess: true } }), false);
  assert.equal(approval({ productionSignoff: "granted", productionPermissions: { activatePublicCustomerAccess: true } }), true);
  const query = '.productionSignoff == "granted" and .productionPermissions.activatePublicCustomerAccess == true';
  const dispatch = get("dispatch-approved-aws-contact-release.yml");
  const publish = get("publish-aws-contact-production.yml");
  for (const [name, source] of [["dispatcher", dispatch], ["publisher", publish]]) {
    assert.ok(source.includes(query), name + " must test both owner production permissions");
    assert.ok(source.includes("id: owner_hold"), name + " must hold before AWS calls");
    assert.ok(source.includes('echo "hold=true" >> "$GITHUB_OUTPUT"'), name + " must fail closed");
    assert.ok(source.includes('echo "hold=false" >> "$GITHUB_OUTPUT"'), name + " must record explicit grant");
    assert.ok(source.includes("config/intelligence/owner-production-constraints.json"), name + " must load the recorded policy");
  }
  const guarded = "steps.owner_hold.outputs.hold == 'false'";
  assert.ok(dispatch.includes(guarded), "dispatch must be held without explicit approval");
  const gatedAWS = dispatch.match(/- name: Verify AWS contact candidate is already activated\s*\n\s*if: ([^\n]+)/)?.[1] ?? "";
  const gatedDispatch = dispatch.match(/- name: Dispatch independently verified exact-SHA contact release\s*\n\s*if: ([^\n]+)/)?.[1] ?? "";
  assert.ok(gatedAWS.includes(guarded) && gatedDispatch.includes(guarded),
    "both AWS health and workflow dispatch must explicitly test the owner hold");
  assert.match(publish, /if \[ "\$\{\{ steps\.owner_hold\.outputs\.hold \}\}" != "false" \]; then\s*\n\s*echo "release_needed=false"/,
    "publisher must force a release-scope denial before build and deployment");
  assert.match(publish, /if: github\.ref == 'refs\/heads\/main' && needs\.release_scope\.outputs\.release_needed == 'true'/,
    "publisher still requires a positive release-scope decision");
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
  const protectedPaths = (source, name) => {
    const line = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(line?.trim().endsWith(")"), name + " must retain the private changed-file case arm");
    return new Set(line.trim().slice(0, -1).split("|"));
  };
  const dispatcherPaths = protectedPaths(dispatcher, "dispatcher");
  const publisherPaths = protectedPaths(publisher, "publisher");
  for (const path of files) {
    assert.ok(dispatcherPaths.has(path), "contact dispatcher must treat source-only audit as private: " + path);
    assert.ok(publisherPaths.has(path), "public publisher must treat source-only audit as private: " + path);
  }
  // A risk-register entry is a meaningful protected ML source change, so the
  // existing found_ml=true & private_only=true condition can safely deny publication.
  assert.ok(dispatcherPaths.has("docs/ai-risk-register.md"));
  assert.ok(publisherPaths.has("docs/ai-risk-register.md"));
  assert.match(dispatcher, /found_ml=true/);
  assert.match(publisher, /release_needed=false/);
  // Publisher policy-only changes remain neutral, not an automatic private exemption.
  assert.match(publisher, /A publisher policy-only update must not be silently skipped/);
});

test("country release-ledger is private-only and cannot dispatch the corporate AWS publisher", () => {
  const countryPaths = [
  ".github/workflows/intelligence-country-release-gates.yml",
  "docs/intelligence/77-country-101-source-complete-register-20261118.md",
  "docs/intelligence/country-101-release-gates-20261118.md",
  "scripts/render-intelligence-country-release-ledger.mjs",
  "scripts/test-intelligence-country-release-ledger.mjs",
  "src/core/intelligence-country-iso-identifiers.mjs",
  "src/core/intelligence-country-markdown-cell.mjs",
  "src/core/intelligence-country-release-ledger.mjs",
  "src/core/intelligence-country-source-baseline.mjs"
];
  for (const file of ["dispatch-approved-aws-contact-release.yml", "publish-aws-contact-production.yml"]) {
    const source = get(file);
    const classifier = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(classifier, file + " missing the changed-file classifier");
    assert.ok(classifier.trim().endsWith(")"), file + " must close its exact private Bash case arm");
    const protectedPaths = new Set(classifier.trim().slice(0, -1).split("|"));
    for(const path of countryPaths) {
      assert.ok(protectedPaths.has(path), file + " would publish country research-only file: " + path);
    }
    assert.ok(protectedPaths.has(".github/workflows/browser-acceptance.yml"));
    assert.match(source, /private_only=true/);
    assert.match(source, /found_ml=true/);
  }
});

test("all 101-country scope proposal paths remain private-only in both AWS/public selectors", () => {
  const scopePaths = [
    ".github/workflows/intelligence-country-101-scope-audit.yml",
    "docs/intelligence/country-101-scope-proposal-20261118.json",
    "docs/intelligence/country-101-scope-proposal-20261118.md",
    "scripts/test-intelligence-country-101-scope-proposal.mjs",
    "src/core/intelligence-country-101-proposed-ledger.mjs",
    "scripts/test-intelligence-country-101-proposed-ledger.mjs",
    "scripts/render-intelligence-country-101-proposed-ledger.mjs"
  ];
  for (const file of ["dispatch-approved-aws-contact-release.yml", "publish-aws-contact-production.yml"]) {
    const source = get(file);
    const classifier = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(classifier, file + " must have a real changed-file Bash case");
    assert.ok(classifier.trim().endsWith(")"), file + " must close the exact private Bash case arm");
    const privatePaths = new Set(classifier.trim().replace(/\)$/u, "").split("|"));
    for (const path of scopePaths) {
      assert.ok(privatePaths.has(path), file + " would publish scope-only research: " + path);
    }
    assert.ok(source.includes("found_ml=true"), file + " must mark the matched research paths private");
    assert.ok(source.includes("private_only=true"), file + " must preserve the restrictive default");
  }
});

test("country-specific source-only adapters cannot unintentionally dispatch public Pages or AWS", () => {
  // Exact paths from #838, #842, #846 and #847. Do NOT classify server.mjs
  // from #844 as private: that real API entry point has separate deploy review.
  const countrySourcePaths = [
    ".github/workflows/intelligence-global-secondary-source-contracts.yml",
    "docs/intelligence/global-secondary-source-api-contracts-20261118.md",
    "scripts/test-intelligence-global-secondary-source-gateway.mjs",
    "scripts/test-intelligence-singapore-hsa-bulk-candidate.mjs",
    "src/core/intelligence-global-secondary-source-gateway.mjs",
    "src/core/intelligence-singapore-hsa-bulk-candidate.mjs",
    ".github/workflows/intelligence-es-cima-public-live-probe.yml",
    "docs/intelligence/spain-cima-official-live-probe-20261118.md",
    "scripts/run-intelligence-es-cima-public-live-probe.mjs",
    "scripts/test-intelligence-es-cima-live-quarantine.mjs",
    "scripts/test-intelligence-es-cima-public-live-probe.mjs",
    "src/core/intelligence-es-cima-public-live-probe.mjs",
    ".github/workflows/intelligence-canada-dpd-public-live-source.yml",
    "docs/intelligence/canada-dpd-public-live-source-20261118.md",
    "scripts/run-intelligence-canada-dpd-public-live-probe.mjs",
    "scripts/test-intelligence-canada-dpd-public-live-probe.mjs",
    "src/core/intelligence-canada-dpd-public-live-probe.mjs",
    ".github/workflows/intelligence-enterprise-readiness.yml",
    "docs/intelligence/ENTERPRISE_RELEASE_READINESS_20261118.md",
    "scripts/audit-intelligence-enterprise-readiness.mjs",
    "scripts/test-intelligence-enterprise-readiness.mjs",
    "src/core/intelligence-enterprise-readiness.mjs"
  ];
  assert.equal(new Set(countrySourcePaths).size, 22);
  for (const workflow of ["dispatch-approved-aws-contact-release.yml","publish-aws-contact-production.yml"]) {
    const source = get(workflow);
    const classifier = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(classifier, workflow + " missing active source-only classifier");
    const allowed = new Set(classifier.trim().replace(/\)$/u, "").split("|"));
    for (const path of countrySourcePaths) {
      assert.ok(allowed.has(path), workflow + " would publish private pharmaceutical source-only file: " + path);
    }
    assert.ok(allowed.has(".github/workflows/browser-acceptance.yml"));
    assert.ok(allowed.has("docs/ai-risk-register.md"));
    assert.ok(!allowed.has("server.mjs"), "The protected server entry point must not bypass deployment acceptance");
    assert.match(source, /private_only=true/);
    assert.match(source, /found_ml=true/);
  }
});

test("inherited 2026-11-18 sparse-circuit research files stay private-only after country PR stack reconciliation", () => {
  const inherited = [
      ".github/workflows/nova-ml-native-apple.yml",
      ".github/workflows/intelligence-sparse-circuit-assurance.yml",
      ".github/workflows/intelligence-sparse-transformer-experiment.yml",
      ".github/workflows/nova-sparse-circuit-android.yml",
      "docs/architecture/nova-scientific-intelligence-programme.md",
      "docs/intelligence/SPARSE_CIRCUIT_RESEARCH_INTEGRATION_20261118.md",
      "docs/intelligence/SPARSE_CIRCUIT_UPSTREAM_SOURCE_REVIEW_20261118.md",
      "docs/intelligence/npi-sparse-circuit-summary-v1.schema.json",
      "native/novapharm-intelligence-mobile/App.tsx",
      "native/novapharm-intelligence-mobile/README.md",
      "native/novapharm-intelligence-mobile/tests/sparse-circuit-research-contract.test.mjs",
      "scripts/research/fixtures/trained-sparse-transformer-observed-local-run.json",
      "scripts/research/tiny-sparse-transformer-experiment.py",
      "scripts/research/toy-sparse-circuit-intervention.mjs",
      "scripts/research/validate-trained-sparse-transformer-report.mjs",
      "scripts/test-intelligence-sparse-circuit-assurance.mjs",
      "scripts/test-intelligence-sparse-circuit-cross-platform.mjs",
      "scripts/test-intelligence-sparse-circuit-toy-intervention.mjs",
      "scripts/test-intelligence-sparse-circuit-upstream-governance.mjs",
      "scripts/test-intelligence-trained-sparse-transformer-report.mjs",
      "src/ai/model-registry.mjs",
      "src/core/ai/model-registry.mjs",
      "src/core/intelligence-sparse-circuit-assurance.mjs"
  ];
  for (const name of ["dispatch-approved-aws-contact-release.yml","publish-aws-contact-production.yml"]) {
    const workflow = get(name);
    const line = workflow.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(line, name + " must retain real Bash case classifier");
    const patterns = line.trim().replace(/\)$/u, "").split("|");
    for (const file of inherited) {
      assert.ok(patterns.includes(file) ||
        (file.startsWith("native/novapharm-intelligence-mobile/") &&
          patterns.includes("native/novapharm-intelligence-mobile/*")),
        name + " would accidentally publish a private sparse-circuit file: " + file);
    }
    assert.ok(!patterns.includes("server.mjs"),
      "Actual protected backend runtime changes require independent release acceptance");
  }
});

test("101-country web and Expo catalogue paths are private-only; no backend server bypass", () => {
  const candidatePaths = [
    ".github/workflows/intelligence-country-web-mobile-parity.yml",
    "docs/intelligence/country-101-client-catalog-20261118.json",
    "scripts/generate-intelligence-country-client-catalog.mjs",
    "scripts/test-intelligence-country-client-catalog.mjs",
    "apps/portal/components/country-source-coverage.tsx",
    "apps/portal/components/medicines-intelligence.tsx",
    "native/novapharm-intelligence-mobile/CountryDirectoryScreen.tsx"
  ];
  for (const workflow of ["dispatch-approved-aws-contact-release.yml","publish-aws-contact-production.yml"]) {
    const source = get(workflow);
    const line = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(line, workflow+" missing active source classifier");
    const patterns = line.trim().replace(/\)$/u, "").split("|");
    for (const p of candidatePaths) {
      assert.ok(patterns.includes(p) ||
        (p.startsWith("apps/portal/") && patterns.includes("apps/portal/*")) ||
        (p.startsWith("native/novapharm-intelligence-mobile/") &&
          patterns.includes("native/novapharm-intelligence-mobile/*")),
        workflow+" could publish candidate-only country metadata: "+p);
    }
    assert.ok(!patterns.includes("server.mjs"),
      "Real protected server changes must retain independent production acceptance");
  }
});

test("all 24 official publisher research references remain private-only and cannot release AWS or Pages",()=>{
  const paths=[
    "docs/intelligence/country-101-new-24-publisher-research-20261118.json",
    "scripts/test-intelligence-24-publisher-research.mjs"
  ];
  for(const name of ["dispatch-approved-aws-contact-release.yml","publish-aws-contact-production.yml"]){
    const workflow=get(name);
    const entry=workflow.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(entry && entry.endsWith(")"),name+" must contain a closed Bash case arm");
    assert.ok(!entry.includes(")|"),name+" has an early Bash case terminator");
    const privateEntries=new Set(entry.replace(/\)$/u,"").split("|"));
    for(const p of paths){
      assert.ok(privateEntries.has(p),name+" could publish candidate-only official research metadata: "+p);
    }
    assert.ok(!privateEntries.has("server.mjs"),
      "protected backend production must not bypass independent deployment acceptance");
  }
});

test("Science research-only files must not trigger AWS or public Pages publication", () => {
  const sciencePaths = [
    ".github/workflows/intelligence-science-research-contracts.yml",
    "docs/intelligence/openai-science-integration-20261118.md",
    "docs/intelligence/openai-science-methods-20261118.json",
    "docs/intelligence/science-research-capabilities-20261118.json",
    "native/novapharm-intelligence-mobile/App.tsx",
    "native/novapharm-intelligence-mobile/ScienceResearchMobile.tsx",
    "native/novapharm-intelligence-mobile/tsconfig.json",
    "scripts/package-unified-estate.mjs",
    "scripts/test-intelligence-22-workspace-readiness.mjs",
    "scripts/test-intelligence-readiness.mjs",
    "scripts/test-intelligence-science-evidence-dossier.mjs",
    "scripts/test-intelligence-science-methodology.mjs",
    "scripts/test-intelligence-science-research.mjs",
    "scripts/test-unified-release-artifacts.mjs",
    "src/core/intelligence-22-workspace-readiness.mjs",
    "src/core/intelligence-release-readiness.mjs",
    "src/core/intelligence-science-evidence-dossier.mjs",
    "src/core/intelligence-science-methodology.mjs",
    "src/core/intelligence-science-research-contract.mjs",
    "src/core/intelligence-science-research-principles.mjs"
];
  for (const name of [
    "dispatch-approved-aws-contact-release.yml",
    "publish-aws-contact-production.yml"
  ]) {
    const source = get(name);
    const classifier = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1];
    assert.ok(classifier, name + " missing changed-file classifier");
    assert.ok(classifier.trim().endsWith(")"), name + " private Bash case must be closed");
    const allowlist = new Set(classifier.trim().slice(0, -1).split("|"));
    for (const path of sciencePaths) {
      assert.ok(allowlist.has(path), name + " missing private Science file: " + path);
    }
    assert.ok(allowlist.has("apps/portal/*"), name + " must classify Science app modules");
    assert.match(source, /found_ml=true/);
    assert.match(source, /private_only=true/);
  }
});


test("science and secondary-source Bash classifier arms are syntactically closed once", () => {
  const privatePaths = [
  ".github/workflows/intelligence-global-secondary-source-contracts.yml",
  "docs/intelligence/global-secondary-source-api-contracts-20261118.md",
  "scripts/test-intelligence-global-secondary-source-gateway.mjs",
  "scripts/test-intelligence-singapore-hsa-bulk-candidate.mjs",
  "src/core/intelligence-global-secondary-source-gateway.mjs",
  "src/core/intelligence-singapore-hsa-bulk-candidate.mjs",
  "src/core/intelligence-science-research-contract.mjs",
  ".github/workflows/intelligence-sparse-circuit-assurance.yml"
];
  for (const file of ["dispatch-approved-aws-contact-release.yml", "publish-aws-contact-production.yml"]) {
    const source = get(file);
    const arm = source.match(/case "\$changed" in\s*\n\s*([^\n]+)/)?.[1]?.trim();
    assert.ok(arm && arm.endsWith(")"), file + " must terminate private Bash case arm");
    assert.equal((arm.match(/\)/g) || []).length, 1, file + " cannot close the private case arm early");
    const allowed = new Set(arm.slice(0, -1).split("|"));
    for (const path of privatePaths) {
      assert.ok(allowed.has(path), file + " must protect source-only path inside Bash case: " + path);
    }
    for (const publicFile of ["assets/js/contact-production.js", "scripts/build-site.mjs"]) {
      assert.equal(allowed.has(publicFile), false);
    }
  }
});

test("source-only Model Microscope paths never trigger unrelated AWS contact or public Pages release", () => {
  const sourceOnly = [
    ".github/workflows/intelligence-model-microscope.yml",
    "docs/ai-model-licence-review.md",
    "docs/intelligence/model-microscope-inspection-v1.schema.json",
    "docs/intelligence/model-microscope-research-to-product-20261118.md",
    "native/novapharm-intelligence-mobile/metro.config.cjs",
    "native/novapharm-intelligence-mobile/tests/mobile-contract.test.mjs",
    "scripts/test-nova-model-microscope-end-to-end.mjs",
    "scripts/test-nova-model-microscope-signed-evidence.mjs",
    "scripts/test-nova-model-microscope-synthetic-reference.mjs",
    "scripts/test-nova-model-microscope.mjs",
    "src/core/ai/model-microscope-signed-evidence.mjs",
    "src/core/ai/model-microscope-synthetic-reference.d.mts",
    "src/core/ai/model-microscope-synthetic-reference.mjs",
    "src/core/ai/model-microscope.mjs"
];
  for (const workflow of ["dispatch-approved-aws-contact-release.yml", "publish-aws-contact-production.yml"]) {
    const contents = readFileSync(new URL("../../.github/workflows/" + workflow, import.meta.url), "utf8");
    const caseLine = contents.split("\n").find((line) =>
      line.trim().startsWith("apps/portal/*|"));
    assert.ok(caseLine, "Private release classifier missing from " + workflow);
    const cases = caseLine.trim().replace(/\)$/, "").split("|");
    for (const source of sourceOnly) {
      assert.ok(cases.includes(source), workflow + " would publish research-only source: " + source);
    }
    assert.ok(contents.includes("private_only=false"), "Unexpected source must remain fail-closed: " + workflow);
    assert.ok(contents.includes("found_ml=true"), "Private files must mark a protected-only change: " + workflow);
    for (const publicPath of ["assets/js/contact-production.js", "products/nutraxin/checkout.html", "scripts/build-site.mjs"]) {
      assert.equal(cases.includes(publicPath), false, "Public release must not be suppressed: " + publicPath);
    }
  }
});

test("offline country appearance validation and release classifiers cannot dispatch public AWS contact", () => {
  const privateOnly = [
    "native/novapharm-intelligence-mobile/tests/mobile-country-appearance.test.mjs",
    "native/novapharm-intelligence-mobile/tests/mobile-ci-reproducibility.test.mjs",
    "native/novapharm-intelligence-mobile/package-lock.json",
    ".github/workflows/dispatch-approved-aws-contact-release.yml",
    ".github/workflows/publish-aws-contact-production.yml"
  ];
  for (const workflow of ["dispatch-approved-aws-contact-release.yml", "publish-aws-contact-production.yml"]) {
    const source = get(workflow);
    const pattern = source.match(/case "\$changed" in\s*\n\s*(apps\/portal\/\*[^\n]+)/)?.[1]?.trim();
    assert.ok(pattern?.endsWith(")"), workflow + ": private classifier missing");
    const exactPaths = new Set(pattern.slice(0, -1).split("|"));
    for (const p of privateOnly) {
      assert.ok(exactPaths.has(p), workflow + ": source-only mobile path not private: " + p);
    }
    for (const publicAsset of ["assets/css/style.css", "scripts/build-site.mjs", "products/nutraxin/checkout.html"]) {
      assert.equal(exactPaths.has(publicAsset), false, workflow + ": public release incorrectly excluded");
    }
    assert.match(source, /found_ml=true/, "private-only path must set private mode");
    assert.match(source, /private_only=false/, "unknown paths must not silently bypass release routing");
  }
});
