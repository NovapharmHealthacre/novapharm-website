import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// This guards GitHub Actions artifact visibility; not production HIG acceptance.
const workflow = readFileSync(".github/workflows/browser-acceptance.yml", "utf8");
const portalBlock = workflow.split("\n  secure-portal:")[1]?.split("\n  backend-workflows:")[0];
const publicBlock = workflow.split("\n  public-applications:")[1]?.split("\n  secure-portal:")[0];

test("protected Portal role traces are never uploaded from public repositories", () => {
  assert.ok(portalBlock, "The protected Portal job must remain present");
  assert.match(portalBlock, /- name: Upload protected-portal acceptance evidence \(private repositories only\)\n\s+if: \$\{\{ always\(\) && github\.event\.repository\.private \}\}/);
  assert.match(portalBlock, /- name: Protect role-boundary traces in public repositories\n\s+if: \$\{\{ always\(\) && !github\.event\.repository\.private \}\}/);
  assert.match(portalBlock, /artifacts\/portal-browser/);
  assert.match(portalBlock, /artifacts\/portal-lighthouse/);
});

test("privacy gating does not silently skip required browser acceptance", () => {
  assert.match(portalBlock, /run: npm run portal:test:browser/);
  assert.match(portalBlock, /run: npm run portal:test:lighthouse/);
  assert.match(portalBlock, /run: npm run api:check && npm run portal:check/);
  assert.match(workflow, /name: Unified browser acceptance gate/);
  assert.match(workflow, /test "\$\{\{ needs\.secure-portal\.result \}\}" = success/);
});

test("public corporate screenshot acceptance stays independent of protected portal traces", () => {
  assert.ok(publicBlock);
  assert.match(publicBlock, /- name: Upload rendered acceptance evidence/);
  assert.match(publicBlock, /artifacts\/\$\{\{ matrix\.application \}\}-browser/);
});
