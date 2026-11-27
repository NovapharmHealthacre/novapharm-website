import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const paths = [
  ".github/workflows/public-pages-browser-acceptance.yml",
  ".github/workflows/supply-chain.yml",
  ".github/workflows/intelligence-nova-egress-contract.yml",
  ".github/workflows/intelligence-subscription-boundary.yml",
  ".github/workflows/intelligence-clip-research-contract.yml",
  ".github/workflows/nova-ml-infrastructure-contract.yml",
  ".github/workflows/esco-checkout-contract.yml",
  ".github/workflows/apple-privacy-contract.yml",
  ".github/workflows/customer-account-request.yml",
  ".github/workflows/nutraxin-google-merchant.yml",
  ".github/workflows/nutraxin-seo-pages-preflight.yml",
];

test("PR-only cancellation preserves distinct manual and protected-main runs", () => {
  for (const path of paths) {
    const source = readFileSync(new URL(path, root), "utf8");
    assert.match(source, /^on:\s*\n\s+pull_request:/m, path + " must still respond to PRs");
    assert.match(source, /^concurrency:\s*\n/m, path + " must declare concurrency");
    assert.match(source, /^\s+group: \$\{\{ github\.workflow \}\}-\$\{\{ github\.event_name == 'pull_request' && github\.event\.pull_request\.number \|\| github\.run_id \}\}\s*$/m,
      path + " concurrency must be scoped by PR or unique run ID");
    assert.match(source, /^\s+cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}\s*$/m,
      path + " must never cancel main push or manual dispatch runs");
    assert.match(source, /^permissions:\s*\n\s+contents: read\s*$/m,
      path + " must retain contents:read permission");
    assert.doesNotMatch(source, /(?:^|\n)\s+pull_request:\s*\n\s+paths-ignore:/,
      path + " may not introduce blind exclusions");
  }
});

test("protected comprehensive CI remains independently required and unconditional", () => {
  const body = readFileSync(new URL(".github/workflows/novapharm-unified-ci-gate.yml", root), "utf8");
  assert.match(body, /on:\s*\n\s+pull_request:\s*\n\s+push:/);
  assert.match(body, /name: Policy coverage and invariant verification/);
  assert.match(body, /name: Cross-estate regulated, AI, Google, Apple and native contracts/);
  assert.doesNotMatch(body, /pull_request:\s*\n\s+paths:/);
});

test("supply-chain audits still run on main pushes and PRs", () => {
  const source = readFileSync(new URL(".github/workflows/supply-chain.yml", root), "utf8");
  assert.match(source, /pull_request:\s*\n\s+push:\s*\n\s+branches:\s*\n\s+- main/);
  assert.match(source, /dependency-review:/);
  assert.match(source, /sbom:/);
});
