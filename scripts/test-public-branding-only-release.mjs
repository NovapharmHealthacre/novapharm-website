import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APPROVED_CONTACT_ORIGIN, REVIEWED_CONTACT_BLOBS, evaluateBrandingOnlyRelease, gitBlobSha } from "./verify-public-branding-only-release.mjs";

const sha = "a".repeat(40);
const permissions = Object.freeze({
  activatePublicCustomerAccess: false, enableCustomerSubscriptions: false,
  enableCustomerBilling: false, cutOverPortalDnsOrApiMapping: false,
  sendExternalEmail: false, provisionNewPaidInfrastructure: false,
  purchaseVendorLicenses: false, admitUnapprovedMedicineData: false,
  activateNativePalantir: false, activateNativePrisma: false,
  activateNativeBloomberg: false
});
function input() {
  return {
    config: {
      productionSignoff: "not_granted", productionPermissions: {...permissions},
      publicBrandingRelease: { enabled: true, signoff: "granted", scope: "public-static-with-preserved-contact" }
    },
    eventName: "workflow_dispatch", brandingOnly: "true",
    expectedSha: sha, checkedOutSha: sha, contactApiOrigin: APPROVED_CONTACT_ORIGIN,
    sourceBlobs: {...REVIEWED_CONTACT_BLOBS}
  };
}
test("only manually SHA-pinned, separately signed public branding can pass", () => {
  assert.deepEqual(evaluateBrandingOnlyRelease(input()), {approved:true, issues:[]});
});
test("repository's default missing brand signoff cannot release", () => {
  const v=input(); delete v.config.publicBrandingRelease;
  assert.equal(evaluateBrandingOnlyRelease(v).approved,false);
});
test("pushes, ordinary manual releases and false brand flags never inherit branding approval", () => {
  for (const [eventName,brandingOnly] of [["push","true"],["pull_request","true"],["workflow_dispatch","false"],["workflow_dispatch",""]]) {
    const v=input(); Object.assign(v,{eventName,brandingOnly});
    assert.equal(evaluateBrandingOnlyRelease(v).approved,false);
  }
});
test("the exact checked-out source commit must match a valid requested SHA", () => {
  for (const wrong of ["", "a".repeat(39), "b".repeat(40), "HEAD"]) {
    const v=input(); v.expectedSha=wrong;
    assert.equal(evaluateBrandingOnlyRelease(v).approved,false);
  }
});
test("original Contact API cannot be redirected to another HTTPS backend", () => {
  const v=input();v.contactApiOrigin="https://example.com";
  assert.equal(evaluateBrandingOnlyRelease(v).approved,false);
});
test("branding signoff must explicitly approve static public site and existing Contact", () => {
  for (const change of [
    {enabled:false}, {signoff:"not_granted"}, {scope:"public-customer-access"}
  ]) {
    const v=input(); Object.assign(v.config.publicBrandingRelease,change);
    assert.equal(evaluateBrandingOnlyRelease(v).approved,false);
  }
});
test("all customer, paid-service and external-email permissions remain denied", () => {
  for (const key of Object.keys(permissions)) {
    const v=input();v.config.productionPermissions[key]=true;
    assert.equal(evaluateBrandingOnlyRelease(v).approved,false,key);
    delete v.config.productionPermissions[key];
    assert.equal(evaluateBrandingOnlyRelease(v).approved,false,key+" absent is not consent");
  }
});
test("future production permissions cannot silently expand a branding-only release", () => {
  const v=input();
  v.config.productionPermissions.newProductionCustomerExport=true;
  assert.equal(evaluateBrandingOnlyRelease(v).approved,false);
  delete v.config.productionPermissions.newProductionCustomerExport;
  v.config.productionPermissions.newProductionCustomerExport=false;
  assert.equal(evaluateBrandingOnlyRelease(v).approved,true);
});
test("general production signoff cannot be silently repurposed", () => {
  const v=input();v.config.productionSignoff="granted";
  assert.equal(evaluateBrandingOnlyRelease(v).approved,false);
});
test("all three reviewed Contact blobs are immutable inputs to branding publishing", () => {
  for (const path of Object.keys(REVIEWED_CONTACT_BLOBS)) {
    const v=input(); v.sourceBlobs[path]="0".repeat(40);
    assert.equal(evaluateBrandingOnlyRelease(v).approved,false,path);
  }
});
test("git-blob hash algorithm uses exact byte-length-prefixed SHA1", () => {
  assert.equal(gitBlobSha("hello"),"b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0");
});

test("production publisher retains its customer gate and adds only an explicit manual branding gate", () => {
  const publisher = readFileSync(".github/workflows/publish-aws-contact-production.yml","utf8");
  assert.ok(publisher.includes('.productionSignoff == "granted" and .productionPermissions.activatePublicCustomerAccess == true'));
  assert.ok(publisher.includes('inputs.branding_only'));
  assert.ok(publisher.includes('scripts/verify-public-branding-only-release.mjs'));
  // Manually provided workflow inputs must never be expanded into executable Bash.
  // GitHub Actions env mappings isolate quotes, backticks and $() from shell parsing.
  const gate = publisher.split('id: owner_hold')[1]?.split('- name: Exclude Nova ML-only')[0] ?? '';
  assert.match(gate, /RELEASE_EVENT: \$\{\{ github\.event_name \}\}/);
  assert.match(gate, /BRANDING_ONLY_REQUESTED: \$\{\{ inputs\.branding_only \}\}/);
  assert.match(gate, /EXPECTED_SHA: \$\{\{ inputs\.expected_sha \}\}/);
  assert.match(gate, /CONTACT_API_ORIGIN: \$\{\{ inputs\.contact_api_origin \}\}/);
  const bash = gate.split('run: |')[1] ?? '';
  assert.ok(bash, 'Owner production gate must have a shell script');
  // In a branding-only dispatch, explicit narrow authorization must be
  // evaluated BEFORE the broader productionSignoff/customer-access gate.
  // Otherwise later general customer approval could silently bypass the
  // review-only, Contact-pinned branding scope.
  const brandingBranch = 'if [ "$BRANDING_ONLY_REQUESTED" = "true" ]; then';
  const generalCustomerBranch = "elif jq -e '.productionSignoff";
  assert.ok(bash.includes(brandingBranch), 'Explicit branding-only dispatch branch required');
  assert.ok(bash.includes(generalCustomerBranch), 'Ordinary customer release branch preserved');
  assert.ok(bash.indexOf(brandingBranch) < bash.indexOf(generalCustomerBranch),
    'General customer approval must never precede branding-only authorization');
  assert.match(bash, /Branding-only publishing denied; general customer signoff cannot authorize this scope/);
  assert.doesNotMatch(bash, /\$\{\{\s*(?:inputs\.|github\.event_name)/,
    'Never interpolate untrusted workflow inputs into executable shell');
  assert.match(bash, /BRANDING_ONLY=true node scripts\/verify-public-branding-only-release\.mjs/);
  assert.ok(publisher.includes('run: node scripts/verify-public-brand-source-live.mjs'));
  assert.match(publisher,/if: github.ref == 'refs\/heads\/main' && needs.release_scope.outputs.release_needed == 'true'/);
  assert.match(publisher,/node scripts\/check-pages-monotonic-release\.mjs/);
  assert.match(publisher,/node scripts\/activate-contact-intake\.mjs/);
});
