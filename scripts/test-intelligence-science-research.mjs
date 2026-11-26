import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SCIENCE_WORKFLOW_IDS, SCIENCE_COMMON_GUARDRAILS, planScienceResearchReview, assertScienceProductionReady, scienceGovernanceForWorkspace, assessRosalindResearchBoundary } from "../src/core/intelligence-science-research-contract.mjs";
import { workspaceCapabilityDependencies } from "../src/core/intelligence-22-workspace-readiness.mjs";
import { createOpenAiZdrProvider } from "../src/core/ai/provider-openai-zdr.mjs";
import { configuredInternalProvider, internalModelRegister } from "../src/core/ai/model-registry.mjs";

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

test("every Science workflow points only to canonical, protected Intelligence workspaces", () => {
  const slugs = new Set(Object.keys(workspaceCapabilityDependencies));
  assert.equal(slugs.size, 22);
  const links = new Set();
  for (const workflow of catalogue.workflows) {
    assert.ok(workflow.linkedWorkspaces.length >= 2);
    assert.equal(new Set(workflow.linkedWorkspaces).size, workflow.linkedWorkspaces.length);
    for (const slug of workflow.linkedWorkspaces) {
      assert.ok(slugs.has(slug), `Unknown science-to-Intelligence link: ${slug}`);
      links.add(slug);
    }
  }
  assert.ok(links.has("evidence"));
  assert.ok(links.has("reports"));
  assert.ok(links.has("biotech-intelligence"));
  const web = read("apps/portal/components/science-research-workspace.tsx");
  const native = read("native/novapharm-intelligence-mobile/ScienceResearchMobile.tsx");
  const app = read("native/novapharm-intelligence-mobile/App.tsx");
  assert.match(web, /linkedWorkspaces\.map/);
  assert.match(native, /linkedWorkspaces\.map/);
  assert.match(native, /onOpenWorkspace/);
  assert.match(app, /setSelectedWorkspace\(workspace\)/);
});
test("scientific evidence and model-release guardrails apply to all 22 canonical modules", () => {
  assert.ok(SCIENCE_COMMON_GUARDRAILS.includes("immutable_provenance_and_retraction_review"));
  assert.ok(SCIENCE_COMMON_GUARDRAILS.includes("no_customer_facing_restricted_model_access"));
  for (const slug of Object.keys(workspaceCapabilityDependencies)) {
    const result = scienceGovernanceForWorkspace(slug);
    assert.equal(result.workspaceSlug, slug);
    assert.equal(result.scientificAiProductionCertified, false);
    assert.equal(result.customerModelAccessApproved, false);
    assert.equal(result.internalResearchModelAccessApproved, false);
    assert.equal(result.humanScientificReviewRequired, true);
    assert.deepEqual(result.requiredGuardrails, SCIENCE_COMMON_GUARDRAILS);
  }
  assert.throws(() => scienceGovernanceForWorkspace("science-lab"), /Unknown canonical/);
  assert.throws(() => scienceGovernanceForWorkspace("__proto__"), /Unknown canonical/);
});
test("GPT-Rosalind-6 model reference never grants customer or unapproved internal access", () => {
  assert.equal(catalogue.accessPolicy.researchModelCandidate, "gpt-6-rosalind");
  assert.equal(catalogue.accessPolicy.customerFacingApiUsePermitted, false);
  assert.equal(catalogue.accessPolicy.externalCommercialApiUsePermitted, false);
  assert.equal(catalogue.accessPolicy.researchTierApprovalRequired, true);
  for (const audience of ["customer", "external_commercial", "internal_research", "unspecified"]) {
    const result = assessRosalindResearchBoundary({ audience, productionApproved:true, apiApproved:true });
    assert.equal(result.modelCallAuthorised, false);
    assert.equal(result.customerFacingUsePermitted, false);
    assert.equal(result.externalCommercialUsePermitted, false);
    assert.equal(result.approvedResearchTierVerified, false);
  }
  assert.equal(assessRosalindResearchBoundary({audience:"internal_research"}).internalAudienceCandidate, true);
  assert.equal(assessRosalindResearchBoundary({audience:"customer"}).internalAudienceCandidate, false);
});

test("canonical science readiness principles are identical in cross-workspace reports", () => {
  const source = read("src/core/intelligence-22-workspace-readiness.mjs");
  const rules = read("src/core/intelligence-science-research-principles.mjs");
  assert.match(source, /scientificResearch: SCIENCE_READINESS_BOUNDARY/);
  assert.match(rules, /no_customer_facing_restricted_model_access/);
  assert.match(rules, /reproducibility_and_falsifiable_counterevidence/);
});

test("private release readiness reports Science as unverified for every Intelligence workspace", () => {
  const source = read("src/core/intelligence-release-readiness.mjs");
  const regression = read("scripts/test-intelligence-readiness.mjs");
  assert.match(source, /SCIENCE_READINESS_BOUNDARY/);
  assert.match(source, /gptRosalindResearchApiApprovalVerified: false/);
  assert.match(source, /restrictedResearchModelCustomerUsePermitted: false/);
  assert.match(source, /canonicalWorkspacesCovered: 22/);
  assert.match(regression, /readiness\.science\.scientificAiProductionCertified/);
});

test("actual NOVA model gateway explicitly rejects Rosalind and does not register it for commercial use", () => {
  assert.ok(internalModelRegister.every((entry) => entry.id !== "gpt-6-rosalind"));
  const testApiKey = "test-placeholder-only-not-a-secret";
  assert.throws(
    () => createOpenAiZdrProvider({
      apiKey: testApiKey,
      model: "gpt-6-rosalind",
      endpoint: "https://eu.api.openai.com",
      productionApproved: true,
      euZdrApproved: true,
      fetchImplementation: () => { throw new Error("No external request permitted"); }
    }),
    (error) => error.code === "nova_model_not_approved" && error.statusCode === 400
  );
  assert.throws(() => configuredInternalProvider({
    INTERNAL_AI_PROVIDER: "openai-zdr",
    OPENAI_API_KEY: testApiKey,
    NOVAPHARM_NOVA_MODEL: "gpt-6-rosalind",
    NOVAPHARM_OPENAI_EU_API_ORIGIN: "https://eu.api.openai.com",
    NOVAPHARM_NOVA_PRODUCTION_APPROVED: "true",
    NOVAPHARM_OPENAI_EU_ZDR_APPROVED: "true"
  }), (error) => error.code === "nova_model_not_approved");
});

test("restricted research audience accepts only a bounded, non-sensitive classification", () => {
  for (const audience of ["unspecified", "internal_research", "customer", "external_commercial"]) {
    const result = assessRosalindResearchBoundary({ audience, apiApproved: true, productionApproved: true });
    assert.equal(result.audience, audience);
    assert.equal(result.modelCallAuthorised, false);
    assert.equal(result.customerFacingUsePermitted, false);
  }
  for (const audience of [
    "administrator", "patient-12345", "internal_research ", "a".repeat(9000),
    { patientRecord: "synthetic-sensitive-input" }, ["customer"], null, 9
  ]) {
    assert.throws(
      () => assessRosalindResearchBoundary({ audience }),
      (error) => error?.statusCode === 400 && error?.code === "science_research_audience_invalid" &&
        !String(error.message).includes("synthetic-sensitive-input")
    );
  }
});


test("native Science reference links fail closed and announce browser failures without exposing sensitive data", () => {
  const source = read("native/novapharm-intelligence-mobile/ScienceResearchMobile.tsx");
  const references = JSON.parse(read("docs/intelligence/openai-science-methods-20261118.json")).methods;
  assert.ok(references.length >= 9);
  assert.ok(references.every(x => /^https:\/\/openai\.com(?:\/|$)/.test(x.sourceUrl)),
    "Bundled Science discovery links must remain approved public HTTPS origins");
  assert.match(source, /async function openResearchReference\(id: string, sourceUrl: string\)/);
  assert.match(source, /const approvedReference = \/\^https:/);
  assert.match(source, /if \(!approvedReference\)/);
  assert.match(source, /await Linking\.openURL\(sourceUrl\)/);
  assert.match(source, /try \{[\s\S]*await Linking\.openURL\(sourceUrl\);[\s\S]*\} catch \{/);
  assert.match(source, /AccessibilityInfo\.announceForAccessibility\(message\)/);
  assert.match(source, /sourceOpenFeedback\?\.id === entry\.id/);
  assert.match(source, /accessibilityRole="alert" accessibilityLiveRegion="polite"/);
  assert.match(source, /void openResearchReference\(entry\.id, entry\.sourceUrl\)/);
  assert.doesNotMatch(source, /void Linking\.openURL\(entry\.sourceUrl\)/);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|Authorization:|client_secret|access_token|OPENAI_API_KEY/i);
});
