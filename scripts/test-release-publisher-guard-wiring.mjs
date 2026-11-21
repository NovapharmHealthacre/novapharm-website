import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const policyScript = "node scripts/check-release-branch-protection.mjs";
const policies = [
  { file: ".github/workflows/pages-live-publish.yml",
    job: "  build:\n", before: "      - name: Mark publication pending\n" },
  { file: ".github/workflows/pages-public-release-recovery.yml",
    job: "  build:\n", before: "      - name: Mark publication pending\n" },
  { file: ".github/workflows/publish-aws-contact-production.yml",
    job: "  deploy:\n", before: "      - name: Prove forward-only release ancestry and deploy evidence\n" }
];

test("all three approved Pages publication workflows require current branch protection before publishing", () => {
  for(const p of policies){
    const yaml=readFileSync(p.file, "utf8");
    const jobStart=yaml.indexOf(p.job);
    const stepStart=yaml.indexOf("      - name: Fail closed if public GitHub branches",jobStart);
    const calls=yaml.split(policyScript).length-1;
    assert.notEqual(jobStart,-1, "Missing release job: "+p.file);
    assert.notEqual(stepStart,-1, "Missing protection gate: "+p.file);
    assert.equal(calls,1, "Guard must occur exactly once in "+p.file);
    const next=yaml.indexOf(p.before,stepStart);
    assert.ok(next>stepStart, "Guard must run before publication begins in "+p.file);
    assert.match(yaml.slice(stepStart,next),/GH_TOKEN:\s*\$\{\{ github\.token \}\}/);
    assert.ok(stepStart>jobStart, "Guard must be inside production job in "+p.file);
  }
});

test("manual publishing and AWS-backed contact release retain their prior safety checks",()=>{
  const live=readFileSync(policies[0].file,"utf8");
  const recovery=readFileSync(policies[1].file,"utf8");
  const aws=readFileSync(policies[2].file,"utf8");
  for(const yaml of [live,recovery]){
    assert.match(yaml,/github\.event_name != 'pull_request'/);
    assert.match(yaml,/Prevent silent downgrade of a verified live contact service/);
  }
  assert.match(aws,/Prove forward-only release ancestry and deploy evidence/);
  assert.match(aws,/check-pages-monotonic-release\.mjs/);
  assert.match(aws,/productionSignoff == "granted"/);
});

test("the branch readback is not itself a deployment or an Apple HIG acceptance receipt",()=>{
  const code=readFileSync("scripts/check-release-branch-protection.mjs","utf8");
  assert.ok(!/execFileSync\("gh", \["api", "--method"/.test(code));
  assert.match(code,/protected !== true/);
  assert.match(code,/not proof of two-person review/);
  assert.ok(!code.includes("productionSignoff = \"granted\""));
});
