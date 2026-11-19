import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const workflow = read(".github/workflows/intelligence-global-mobile-contracts.yml");
const candidate = workflow.split("  mobile-bundle-preflight:\n")[1];
const pkg = JSON.parse(read("native/novapharm-intelligence-mobile/package.json"));

test("mobile CI prepares a reviewable dependency lockfile without claiming store readiness", () => {
  assert.ok(candidate, "Isolated Expo mobile preflight job must exist");
  assert.match(candidate, /working-directory: native\/novapharm-intelligence-mobile/);
  assert.match(candidate, /npm install --package-lock-only --ignore-scripts --no-audit --no-fund/);
  assert.match(candidate, /npm ci --ignore-scripts --no-audit --no-fund/);
  assert.doesNotMatch(candidate, /--no-package-lock|npm install --ignore-scripts --no-package-lock/);
  assert.match(candidate, /l\.lockfileVersion !== 3/);
  assert.match(candidate, /l\.packages\?\.\[""\]\?\.name !== p\.name/);
  assert.match(candidate, /actions\/upload-artifact@[a-f0-9]{40}/);
  assert.match(candidate, /if-no-files-found: error/);
  assert.match(candidate, /retention-days: 7/);
  assert.match(candidate, /path: native\/novapharm-intelligence-mobile\/package-lock\.json/);
  const stages = [
    "npm install --package-lock-only",
    "actions/upload-artifact@",
    "npm ci --ignore-scripts",
    "npm run typecheck",
    "npx expo export --platform ios",
    "npx expo export --platform android"
  ];
  const indices = stages.map((stage) => candidate.indexOf(stage));
  assert.ok(indices.every((index) => index >= 0), "Every preflight and artifact handoff stage is required");
  assert.deepEqual([...indices].sort((a, b) => a - b), indices, "Source stages must execute in the defined order");
});

test("lockfile handoff cannot manufacture credentials or production mobile builds", () => {
  const app = JSON.parse(read("native/novapharm-intelligence-mobile/app.json")).expo;
  assert.equal(pkg.private, true);
  assert.equal(app.ios.bundleIdentifier, undefined);
  assert.equal(app.android.package, undefined);
  assert.doesNotMatch(candidate, /eas build|xcodebuild archive|gradle .*bundleRelease|app-store|play-store|AWS_ACCESS_KEY_ID|client_secret|access_token/i);
  assert.match(read("native/novapharm-intelligence-mobile/README.md"), /This does not yet make mobile builds reproducible/);
});
