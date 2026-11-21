import assert from "node:assert/strict";
import test from "node:test";
import {
  sourceCommands, classifyWorkflow, auditWorkflowFiles, auditRepositoryWorkflows,
  reviewedPagesPublishers
} from "./audit-public-publisher-entrypoints.mjs";

const protectedPublisher=(withPullRequest=false)=> [
  "name: Approved publisher",
  "on:", "  workflow_dispatch:",
  "permissions:", "  contents: read", "  pages: write", "  id-token: write",
  "jobs:",
  ...(withPullRequest ? [
    "  validate-release:", "    if: github.event_name == 'pull_request'",
    "    permissions:", "      contents: read",
    "    steps:", "      - run: node scripts/test-static-public-source-safety.mjs"
  ]:[]),
  "  build:", "    steps:",
  "      - uses: actions/upload-pages-artifact@pinned",
  "  deploy:", "    steps:",
  "      - uses: actions/deploy-pages@pinned"
].join("\n");

test("the reviewed three publisher names cannot be changed without review",()=>{
  assert.deepEqual([...reviewedPagesPublishers],[
    "pages-live-publish.yml","pages-public-release-recovery.yml","publish-aws-contact-production.yml"]);
});

test("legitimate read-only workflows and comments never imply Pages release",()=>{
  const y=[
    "# pages: write",
    "name: Test",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  verify:",
    "    steps:",
    "      - run: echo read-only",
    "      # - uses: actions/deploy-pages@unreviewed"
  ].join("\n");
  const row=classifyWorkflow("test-only.yml",y);
  assert.equal(row.deployPages,false);
  assert.equal(row.pagesWrite,false);
  assert.deepEqual(row.issues,[]);
  assert.ok(!sourceCommands(y).includes("actions/deploy-pages"));
});

test("unreviewed Pages deploy/upload/write tokens and direct branch pushes fail",()=>{
  for(const yaml of [
    "jobs:\n  deploy:\n    steps:\n      - uses: actions/deploy-pages@pinned",
    "jobs:\n  build:\n    steps:\n      - uses: actions/upload-pages-artifact@pinned",
    "permissions:\n  pages: write",
    "jobs:\n  run:\n    steps:\n      - run: git push origin HEAD:gh-pages",
    "jobs:\n  run:\n    steps:\n      - run: gh api --method PATCH repos/owner/repo/git/refs/heads/gh-pages",
    "jobs:\n  run:\n    steps:\n      - run: npx gh-pages -d _site"
  ]){
    const result=classifyWorkflow("unreviewed-publisher.yml",yaml);
    assert.ok(result.issues.length>0, "Missing publisher-path risk: "+yaml);
  }
});

test("approved publishing jobs retain upload, deploy and Pages permissions, but not privileged PR validation",()=>{
  for(const name of reviewedPagesPublishers){
    const isWeb=name!=="publish-aws-contact-production.yml";
    const good=classifyWorkflow(name,protectedPublisher(isWeb));
    assert.deepEqual(good.issues,[],name);
    const removed=classifyWorkflow(name,protectedPublisher(isWeb).replace("pages: write","pages: read"));
    assert.ok(removed.issues.length,name);
    if(isWeb){
      const privileged=classifyWorkflow(name,protectedPublisher(true)
        .replace("      contents: read","      pages: write"));
      assert.ok(privileged.issues.some(s=>/Pull request validation/.test(s)));
    }
  }
});

test("whole-estate workflow census enforces every permitted publisher with no unknown deploy path",()=>{
  const report=auditRepositoryWorkflows();
  assert.ok(report.workflowsScanned>=200);
  assert.equal(report.reviewedPagesPublisherCount,3);
  assert.equal(report.unreviewedPotentialPagesPublishers,0);
  assert.equal(report.violations,0);
  assert.ok(!("ownerProductionSignoff" in report));
  assert.ok(!("allHigTopicsAccepted" in report));
});

test("missing reviewed publisher and duplicates are fatal, not silently skipped",()=>{
  assert.throws(()=>auditWorkflowFiles([{name:"site.yml",yaml:"name: ci"}]),/Reviewed Pages publisher missing/);
  assert.throws(()=>auditWorkflowFiles([
    {name:"pages-live-publish.yml",yaml:protectedPublisher(true)},
    {name:"pages-live-publish.yml",yaml:protectedPublisher(true)}
  ]),/Duplicate workflow name/);
});
