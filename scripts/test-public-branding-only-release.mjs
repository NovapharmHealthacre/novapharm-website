import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APPROVED_CONTACT_ORIGIN, REVIEWED_CONTACT_BLOBS, evaluateBrandingOnlyRelease, gitBlobSha } from "./verify-public-branding-only-release.mjs";

const sha = "a".repeat(40);
const permissions = Object.freeze({
  activatePublicCustomerAccess: false, enableCustomerSubscriptions: false,
  enableCustomerBilling: false, cutOverPortalDnsOrApiMapping: false,
  sendExternalEmail: false, provisionNewPaidInfrastructure: false,
  purchaseVendorLicenses: false, admitUnapprovedMedicineData: false
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
  assert.ok(publisher.includes('run: node scripts/verify-public-brand-source-live.mjs'));
  assert.match(publisher,/if: github.ref == 'refs\/heads\/main' && needs.release_scope.outputs.release_needed == 'true'/);
  assert.match(publisher,/node scripts\/check-pages-monotonic-release\.mjs/);
  assert.match(publisher,/node scripts\/activate-contact-intake\.mjs/);
});
