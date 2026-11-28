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
 assert.equal(file.dataset.resourceSha256,"6b0b99e22968ac2f7eb730511fd3c3b9d59a1e47acd814053c573a8976ca5551");
 assert.equal(file.dataset.privateArchiveS3Verified,true);
 assert.equal(file.dataset.sourceReleaseManifestVerified,false);
 assert.equal(file.releaseGates.fullResourceChecksumVerified,false);
 assert.equal(file.independentReview.rightsRevision,null);
 assert.equal(file.independentReview.licenseEvidenceId,null);
});

const staging=JSON.parse(readFileSync(new URL("../docs/intelligence/NHSBSA_EPD_S3_AUG_2026_ARCHIVE_EVIDENCE.json",import.meta.url),"utf8"));
test("live-inspected archive receipt metadata matches source review exactly, without accepting data",()=>{
 assert.equal(staging.archive.sha256,file.dataset.resourceSha256);
 assert.equal(staging.csv.sha256,file.dataset.extractedCsvSha256);
 assert.equal(staging.archive.bytes,644232845);
 assert.equal(staging.csv.bytes,7432815985);
 assert.equal(staging.archive.s3MetadataSha256,staging.archive.sha256);
 assert.equal(staging.archive.s3FullByteHashVerifiedByPriorArchiveReceipt,true);
 assert.equal(staging.quality.records,17754211);
 assert.equal(staging.quality.apixabanRows,50593);
 assert.equal(Object.values(staging.quality.apixabanPresentationCounts).reduce((a,b)=>a+b,0),50593);
 for(const n of ["invalidItems","invalidQuantity","invalidNic","invalidActualCost","apixabanMissingSnomed","rowLengthMismatches","unexpectedReportingPeriods"])assert.equal(staging.quality[n],0);
 assert.equal(staging.authority.acceptedMedicineObservations,0);
 for(const [k,v] of Object.entries(staging.authority))if(k!=="acceptedMedicineObservations")assert.equal(v,false,k);
 assert.equal(staging.archive.sourceReleaseManifestIndependentlyCertified,false);
});
