import assert from "node:assert/strict";
import test from "node:test";
import {buildSourceSnapshotQuarantine,classifySourceSnapshotReplay,assertSourceSnapshotPublishable} from "../src/core/intelligence-source-snapshot-quarantine.mjs";
function sample(overrides={}){
  return {sourceKey:"nhsbsa-epd-snomed",jurisdiction:"GB-ENG",publisher:"NHS Business Services Authority",datasetKey:"english-prescribing-dataset-epd-with-snomed-code",resourceId:"epd-snomed-2026-08",resourceUrl:"https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code",expectedOrigin:"https://opendata.nhsbsa.net",mediaType:"text/csv",schemaVersion:"snomed-string-v1",observationStart:"2026-08-01",observationEnd:"2026-08-31",publishedOn:"2026-09-20",fetchedAt:"2026-11-17T17:00:00.000Z",bytes:Buffer.from("BNF_CODE,SNOMED_CODE,ITEMS\nEXAMPLE,01234,1\n"),...overrides};
}
test("snapshot identity is immutable and does not contain source bytes",()=>{
 const a=buildSourceSnapshotQuarantine(sample()),b=buildSourceSnapshotQuarantine(sample({fetchedAt:"2026-11-17T18:00:00.000Z"}));
 assert.equal(a.snapshotId,b.snapshotId);
 assert.match(a.digestSha256,/^[0-9a-f]{64}$/);
 assert.equal(a.sourceRightsIndependentlyApproved,false);
 assert.equal(a.canPublish,false);
 assert.equal(a.productionAccepted,false);
 assert.equal(a.rightsEvidenceId,null);
 assert.equal(a.jurisdiction,"GB-ENG");
 assert.ok(!Object.hasOwn(a,"bytes"));
 assert.ok(!JSON.stringify(a).includes("EXAMPLE"));
 assert.ok(Object.isFrozen(a));
 assert.throws(()=>assertSourceSnapshotPublishable(a),/Quarantine rejected/);
});
test("changed raw bytes create conflict, unchanged bytes form idempotent duplicate",()=>{
 const a=buildSourceSnapshotQuarantine(sample());
 const b=buildSourceSnapshotQuarantine(sample({bytes:Buffer.from("BNF_CODE,SNOMED_CODE,ITEMS\nEXAMPLE,01234,2\n")}));
 assert.notEqual(a.digestSha256,b.digestSha256);
 assert.notEqual(a.snapshotId,b.snapshotId);
 assert.equal(classifySourceSnapshotReplay([],a).decision,"QUARANTINE_NEW_CANDIDATE");
 assert.equal(classifySourceSnapshotReplay([a],a).decision,"DUPLICATE");
 assert.equal(classifySourceSnapshotReplay([a],b).decision,"QUARANTINE_CONFLICTING_REVISION");
});
test("deny origin tricks, bad dates, unreviewed permissions and oversized content",()=>{
 const cases=[{resourceUrl:"http://opendata.nhsbsa.net/api/"},{resourceUrl:"https://opendata.nhsbsa.net.evil.example/resource"},{resourceUrl:"https://user:pass@opendata.nhsbsa.net/data"},{expectedOrigin:"https://different.example"},{resourceUrl:"https://opendata.nhsbsa.net/data#fragment"},{publishedOn:"2026-08-10"},{fetchedAt:"2026-08-01T10:00:00.000Z"},{observationStart:"2026-02-30"},{observationEnd:"2026-07-31"},{observationEnd:"2026-13-01"},{rightsEvidenceId:"pretend-approved"},{jurisdiction:"UK-wide"},{mediaType:"application/octet-stream"},{publisher:"Publisher\nInjected"},{bytes:Buffer.alloc(262145,1)},{bytes:"unverified bytes"}];
 for(const item of cases)assert.throws(()=>buildSourceSnapshotQuarantine(sample(item)),/Quarantine rejected/);
});
test("malformed or customer-publishable manifests cannot be used in replay",()=>{
 const x=buildSourceSnapshotQuarantine(sample());
 assert.throws(()=>classifySourceSnapshotReplay([{...x,canPublish:true}],x));
 assert.throws(()=>classifySourceSnapshotReplay([],{...x,productionAccepted:true}));
});
test("global research samples cannot be conflated with England prescription figures",()=>{
 const g=buildSourceSnapshotQuarantine(sample({sourceKey:"clinicaltrials-v2",jurisdiction:"GLOBAL",publisher:"ClinicalTrials.gov",datasetKey:"studies",resourceId:"nct-registry-check",resourceUrl:"https://clinicaltrials.gov/api/v2/studies",expectedOrigin:"https://clinicaltrials.gov",mediaType:"application/json",schemaVersion:"ctgov-v2",observationStart:"2026-11-01",observationEnd:"2026-11-01",publishedOn:"2026-11-01",bytes:Buffer.from('{"studies":[]}')}));
 assert.equal(g.jurisdiction,"GLOBAL");assert.equal(g.canPublish,false);assert.notEqual(g.snapshotId,buildSourceSnapshotQuarantine(sample()).snapshotId);
});
