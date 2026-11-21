import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = ".github/workflows";
const allowedCandidateWriters = new Set([
  "stage-safe-commerce-restoration.yml",
  "stage-safe-editorial-restoration.yml",
  "stage-safe-esco-restoration.yml",
]);
const workflows = readdirSync(root).filter(name => name.endsWith(".yml") || name.endsWith(".yaml")).sort();

test("complete workflow inventory forbids unpinned Actions and privileged PR-target execution", () => {
  assert.ok(workflows.length >= 209, "An unexpected drop in tracked workflow coverage requires review");
  for (const file of workflows) {
    const body = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(body, /^  pull_request_target:\s*$/m,
      "Privileged pull_request_target execution is unapproved: " + file);
    for (const [, action] of body.matchAll(/^\s*uses:\s*(\S+)/gm)) {
      if (action.startsWith("./")) continue;
      assert.match(action, /@[a-f0-9]{40}$/,
        "External GitHub Action must be pinned to an immutable SHA: " + file + " " + action);
    }
  }
});

test("PR workflows with write grants only stage nonlive restoration branches after protected main merges", () => {
  const found = [];
  for (const file of workflows) {
    const body = readFileSync(join(root, file), "utf8");
    if (!/^  pull_request:/m.test(body) || !/^\s+contents:\s*write\s*$/m.test(body)) continue;
    found.push(file);
    assert.ok(allowedCandidateWriters.has(file),
      "Unexpected PR workflow with repository source write grants: " + file);
    assert.match(body, /if:\s*github\.event_name == 'push'/,
      "Candidate branch mutations must never run during PR validation: " + file);
    assert.match(body, /git -C published push origin/,
      "Restoration write is restricted to a reviewed non-live branch: " + file);
    assert.doesNotMatch(body, /git\s+(?:-C\s+published\s+)?push\s+origin\s+["']?HEAD:(?:refs\/heads\/)?(?:main|gh-pages)\b/,
      "PR-triggered staging source must not push directly to a protected branch: " + file);
  }
  assert.deepEqual(found.sort(), [...allowedCandidateWriters].sort(),
    "Any newly privileged workflow must pass independent release governance");
});
