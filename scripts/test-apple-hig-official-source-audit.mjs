import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const code = readFileSync("scripts/audit-apple-hig-official-sources.mjs", "utf8");
const workflow = readFileSync(".github/workflows/apple-hig-official-source-inventory.yml", "utf8");
const register = JSON.parse(readFileSync("docs/design/apple-hig-172-topic-acceptance-register.json", "utf8"));

test("public Apple Markdown inventory has 172 unique allowlisted sources only", () => {
  assert.equal(register.topics.length, 172);
  assert.equal(new Set(register.topics.map((x) => x.markdown)).size, 172);
  assert.ok(register.topics.every((x) => /^https:\/\/developer\.apple\.com\/design\/human-interface-guidelines\/[a-z0-9-]+\.md$/.test(x.markdown)));
  assert.match(code, /HIG_SOURCE_AUDIT_NETWORK !== "1"/);
  assert.match(code, /catalogue.length, 172/);
  assert.match(code, /url.hostname !== "developer.apple.com"/);
  assert.match(code, /u.hostname, "developer.apple.com"/);
  assert.match(code, /AbortSignal.timeout\(12000\)/);
  assert.match(code, /await sleep\(300\)/);
  assert.match(code, /await Promise.all\(\[worker\(\),worker\(\),worker\(\)\]\)/);
});

test("audit stores digest, headings and links, never full copied article or fake release receipts", () => {
  assert.match(code, /createHash\("sha256"\)/);
  assert.match(code, /insideHigLinks:/);
  assert.match(code, /linkedTopicsNotInOwnerParentIndex:/);
  assert.match(code, /allIndexedLinks: 207/);
  assert.match(code, /supplementaryAnchorChecks: anchorChecks.length/);
  assert.match(code, /supplementaryResourceChecks: supportingResourceChecks.length/);
  assert.match(code, /method: "HEAD"/);
  assert.match(code, /unresolvedAnchors:/);
  assert.match(code, /unresolvedSupportingResources:/);
  assert.match(code, /implementationVerified: false/);

  assert.match(code, /unresolved:/);
  assert.match(code, /if \(report.unresolved.length\) process.exitCode = 1/);
  assert.doesNotMatch(code, /Authorization:|process\.env\.AWS_|client_secret|writeFileSync\(.*text\)/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /push:|pull_request:|deploy|publish|AWS_ACCESS_KEY|secrets\./i);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /retention-days: 14/);
});
