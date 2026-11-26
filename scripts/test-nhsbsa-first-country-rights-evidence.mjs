import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const file=JSON.parse(readFileSync(new URL("../docs/intelligence/NHSBSA_EPD_FIRST_RELEASE_RIGHTS_20261126.json",import.meta.url),"utf8"));
test("first-country terms preserve exact source resource and England-only scope",()=>{
 assert.equal(file.contract,"novapharm.intelligence.nhsbsa-first-country-source-terms-review.v1");
 assert.equal(file.dataset.period,"2026-08");
 assert.equal(file.dataset.ckanResourceUuid,"30b74257-9912-4b54-8990-8eec2a4b7f14");
 assert.equal(file.dataset.datastoreResourceId,"EPD_SNOMED_202608");
 assert.match(file.scope,/England/);
 assert.equal(file.publishedTerms.licenseIdentifier,"OGL-UK-3.0");
 assert.equal(file.publishedTerms.publisherPageCurrentVersionVerified,false);
});
test("publisher reference is never substituted for independent source rights",()=>{
 for(const val of Object.values(file.releaseGates)) assert.equal(val,false);
 for(const val of Object.values(file.thirdPartyTerminology))assert.equal(val,false);
 for(const val of ["legalReviewerApproved","technicalApproverApproved","sourceRightsSignaturePresent"])assert.equal(file.independentReview[val],false);
 assert.equal(file.dataset.resourceSha256,null);
 assert.equal(file.independentReview.rightsRevision,null);
 assert.equal(file.independentReview.licenseEvidenceId,null);
});
