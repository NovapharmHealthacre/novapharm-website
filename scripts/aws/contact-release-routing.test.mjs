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
test("every approved main push dispatches an immutable AWS contact release", () => {
  const dispatcher = get("dispatch-approved-aws-contact-release.yml");
  assert.match(dispatcher, /\non:\n  push:\n    branches: \[main\]/);
  assert.doesNotMatch(dispatcher, /\n    paths:/);
  assert.match(dispatcher, /gh workflow run publish-aws-contact-production\.yml/);
  assert.match(dispatcher, /expected_sha="\$EXPECTED_SHA"/);
  assert.match(dispatcher, /\.ready == true and \.acceptingPublicSubmissions == true/);
});
test("canonical contact publication proves a durable synthetic receipt before deploying", () => {
  const canonical = get("publish-aws-contact-production.yml");
  assert.match(canonical, /expected_sha:/);
  assert.match(canonical, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/);
  assert.match(canonical, /\.persisted == true and \.notificationAccepted == true/);
  assert.match(canonical, /data-live-b2b-enquiry-form/);
  assert.match(canonical, /data-email-enquiry-form/);
});
