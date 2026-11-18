import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SCIENCE_WORKFLOW_IDS, planScienceResearchReview, assertScienceProductionReady } from "../src/core/intelligence-science-research-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const catalogue = JSON.parse(read("docs/intelligence/science-research-capabilities-20261118.json"));

test("one six-workflow catalogue is shared across protected web and both native previews", () => {
  assert.deepEqual(catalogue.workflows.map((w) => w.id), SCIENCE_WORKFLOW_IDS);
  assert.equal(catalogue.workflows.length, 6);
  assert.ok(catalogue.workflows.every((w) => w.requirements.length >= 3 && w.description && w.title));
  assert.equal(catalogue.claims.productionApproved, false);
  assert.equal(catalogue.claims.modelConnected, false);
  assert.equal(catalogue.claims.customerPublishable, false);
  const web = read("apps/portal/components/science-research-workspace.tsx");
  const mobile = read("native/novapharm-intelligence-mobile/ScienceResearchMobile.tsx");
  assert.match(web, /science-research-capabilities-20261118\.json/);
  assert.match(mobile, /science-research-capabilities-20261118\.json/);
  assert.match(web, /No model connected/);
  assert.match(mobile, /No model connected/);
  assert.doesNotMatch(web + mobile, /fetch\(|OPENAI_API_KEY|Authorization:|api\.openai\.com|client_secret|access_token/);
});
test("science web route is a protected Intelligence subview, not a public page or extra canonical workspace", () => {
  const routes = read("apps/portal/data/routes.ts");
  const workspace = read("apps/portal/components/medicines-intelligence.tsx");
  const app = read("apps/portal/app/[[...slug]]/page.tsx");
  const catalogue22 = read("apps/portal/data/intelligence-workspaces.ts");
  assert.match(routes, /"science-lab"/);
  assert.match(workspace, /ScienceResearchWorkspace/);
  assert.match(app, /verifiedPortalSession/);
  assert.match(app, /sessionDecision/);
  assert.equal((catalogue22.match(/\{ slug: "/g) || []).length, 22);
});
test("iOS Android tab is discoverable and explicitly offline", () => {
  const app = read("native/novapharm-intelligence-mobile/App.tsx");
  assert.match(app, /ScienceResearchMobile/);
  assert.match(app, /screen: "science"/);
  assert.match(app, /No live medicine data/);
  assert.doesNotMatch(app, /fetch\(|OPENAI_API_KEY|api\.openai\.com/);
});
test("review plans never create a claim of source, model or clinical readiness", () => {
  const result = planScienceResearchReview({ workflowId:"literature-evidence", subjectRef:"medicine-apixaban", jurisdiction:"GB", sourceRefs:["pubmed:12345","trials:NCT12345678"] });
  assert.equal(result.status, "planning_only");
  assert.deepEqual(result.referencedSourceIds, ["pubmed:12345","trials:NCT12345678"]);
  assert.equal(result.modelInvocationAuthorised, false);
  assert.equal(result.customerPublishable, false);
  assert.equal(result.clinicalDecisionReady, false);
  assert.equal(result.externalScienceSiteIsNotAnApi, true);
});
test("invalid or duplicate science references fail closed", () => {
  const base = {workflowId:"data-code",subjectRef:"medicine-1",jurisdiction:"GB"};
  assert.throws(()=>planScienceResearchReview({ ...base,workflowId:"not-a-workflow" }), /valid workflow/);
  assert.throws(()=>planScienceResearchReview({ ...base,jurisdiction:"UK/GB" }), /valid workflow/);
  assert.throws(()=>planScienceResearchReview({ ...base,sourceRefs:["src-1","src-1"] }), /valid workflow/);
  assert.throws(()=>planScienceResearchReview({ ...base,sourceRefs:["src-1", "has spaces"] }), /valid workflow/);
  assert.throws(()=>planScienceResearchReview({ ...base,sourceRefs:new Array(17).fill("a") }), /valid workflow/);
  assert.throws(()=>assertScienceProductionReady({ approved:true }), /independent backend/);
});
