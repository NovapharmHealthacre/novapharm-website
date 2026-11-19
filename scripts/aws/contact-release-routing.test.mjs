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
