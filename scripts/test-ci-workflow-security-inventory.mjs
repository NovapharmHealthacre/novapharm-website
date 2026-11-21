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

test("PR validators are read-only; source-write jobs only stage nonlive branches after a main push", () => {
  const found = [];
  for (const file of workflows) {
    const body = readFileSync(join(root, file), "utf8");
    if (!/^  pull_request:/m.test(body) || !/^\s+contents:\s*write\s*$/m.test(body)) continue;
    found.push(file);
    assert.ok(allowedCandidateWriters.has(file),
      "Unexpected PR workflow with repository source write grants: " + file);
    assert.match(body, /^permissions:\s*\n\s*contents: read\s*$/m,
      "Globally restrict all PR workflow credentials to read-only: " + file);
    const writer = ({
      "stage-safe-commerce-restoration.yml": "stage-commerce",
      "stage-safe-editorial-restoration.yml": "prepare-candidate",
      "stage-safe-esco-restoration.yml": "stage-esco",
    })[file];
    const prIndex = body.indexOf("\n  validate-pr:\n");
    const writerIndex = body.indexOf("\n  " + writer + ":\n");
    assert.ok(prIndex >= 0 && writerIndex > prIndex,
      "PR and write jobs must be structurally isolated: " + file);
    const prJob = body.slice(prIndex, writerIndex);
    const writerJob = body.slice(writerIndex);
    assert.match(prJob, /^\s{4}if:\s*github.event_name == 'pull_request'\s*$/m);
    assert.match(prJob, /^\s{4}permissions:\s*\n\s{6}contents: read\s*$/m);
    assert.match(prJob, /github.event.pull_request.head.sha/,
      "PR tests must check out immutable source head: " + file);
    assert.doesNotMatch(prJob, /\bcontents:\s*write\b|\bgit\s+-C\s+published\s+push\b/,
      "Read-only PR job must not have any GitHub write path: " + file);
    assert.match(writerJob, /^\s{4}if:\s*github.event_name == 'push'\s*$/m);
    assert.match(writerJob, /^\s{4}permissions:\s*\n\s{6}contents: write\s*$/m);

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


test("commerce no-change acceptance is read-only PR-scoped, never a publishing bypass", () => {
  const workflow = readFileSync(join(root, "stage-safe-commerce-restoration.yml"), "utf8");
  const pr = workflow.split("\n  validate-pr:\n")[1]?.split("\n  stage-commerce:\n")[0] ?? "";
  const publisher = workflow.split("\n  stage-commerce:\n")[1] ?? "";
  assert.match(pr, /NOVAPHARM_CI_ALLOW_NOOP:\s*"true"/);
  assert.doesNotMatch(publisher, /NOVAPHARM_CI_ALLOW_NOOP/);
  const source = readFileSync("scripts/stage-safe-commerce-restoration.py", "utf8");
  assert.match(source, /os\.environ\.get\("NOVAPHARM_CI_ALLOW_NOOP"\) == "true"/);
  assert.match(source, /os\.environ\.get\("GITHUB_EVENT_NAME"\) == "pull_request"/);
  assert.match(source, /An existing public website file was overwritten/);
  assert.match(source, /No new commerce public files staged/);
});
