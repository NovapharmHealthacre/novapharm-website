import {test} from "node:test";
import assert from "node:assert/strict";
import manifest from "../config/intelligence/us-fda-governance-source-manifest.json" with {type:"json"};
import {
 validateFdaGovernanceManifest,fdaSourceIdentity,dedupeFdaSourceObservations,reviewFdaSourceAdmission
} from "../src/core/regulatory/fda-data-admission.mjs";

test("five source manifests are exact official URLs, pre-screened, no commercial rights",()=>{
 assert.equal(manifest.sourceTypes.length,5);
 assert.ok(validateFdaGovernanceManifest());
 for(const source of manifest.sourceTypes){
   assert.ok(source.endpoint.startsWith("https://api.fda.gov/drug/"));
   assert.equal(source.rawPatientDataAllowed,false);
   assert.equal(source.acceptForCommercialUse,false);
   assert.equal(source.rightsStatus,"pre_screen_only");
 }
 assert.equal(manifest.admissionPermitted,false);
 assert.equal(manifest.independentRegulatorySignoff,"not_granted");
 assert.equal(manifest.independentLegalRightsSignoff,"not_granted");
});
test("source identity is a provenance-key, not a global medicine identifier",()=>{
 const types=[
  ["labels",{setId:"LABEL_A",effectiveDate:"20261120"}],
  ["approvals",{applicationNumber:"NDA123456"}],
  ["ndc",{productNdc:"12345-678"}],
  ["recalls",{recallNumber:"D-123-2026"}],
  ["adverse-events",{query:"apixaban",retrievedAt:"2026-11-21T10:00:00Z"}]
 ];
 for(const [kind,record] of types){
   const a=fdaSourceIdentity(kind,record,"2026-11-21");
   assert.match(a.compositeKey,/^us-source-observation:[a-f0-9]{64}$/);
   assert.equal(a.country,"US");
   assert.equal(a.globalMedicineIdentity,null);
   assert.notEqual(a.compositeKey,fdaSourceIdentity(kind,record,"2026-11-22").compositeKey);
 }
 assert.equal(fdaSourceIdentity("ndc",{brandName:"Not an identity"},"2026-11-21"),null);
 assert.equal(fdaSourceIdentity("ndc",{productNdc:"12345-678"},"yesterday"),null);
});
test("duplicates collapse within source/version without implying cross-source equivalence",()=>{
 const a=fdaSourceIdentity("ndc",{productNdc:"12345-678"},"2026-11-21");
 const b=fdaSourceIdentity("ndc",{productNdc:"12345-678"},"2026-11-22");
 const c=fdaSourceIdentity("approvals",{applicationNumber:"12345-678"},"2026-11-21");
 const list=dedupeFdaSourceObservations([a,a,b,c]);
 assert.equal(list.length,3);
 assert.notEqual(c.compositeKey,a.compositeKey);
 assert.throws(()=>dedupeFdaSourceObservations([{compositeKey:"unsafe"}]));
});
test("all attempts to admit current quarantined sources fail, even with fabricated approval arguments",()=>{
 for(const source of manifest.sourceTypes){
   const record=source.kind==="labels"?{setId:"LABEL_A",effectiveDate:"20261120"}:
    source.kind==="approvals"?{applicationNumber:"NDA123456"}:
    source.kind==="ndc"?{productNdc:"12345-678"}:
    source.kind==="recalls"?{recallNumber:"D-123-2026"}:
    {query:"apixaban",retrievedAt:"2026-11-21T10:00:00Z"};
   const result=reviewFdaSourceAdmission({
     kind:source.kind,record,asOf:"2026-11-21",
     rightsGrant:{status:"approved",sourceId:source.sourceId,commercialUseAllowed:true,thirdPartyExceptionsApproved:true,reviewedAt:"2026-11-21",reviewedBy:"fabricated"},
     independentRegulatoryApproval:true,independentSecurityAcceptance:true,ownerReleaseSignoff:true
   });
   assert.equal(result.accepted,false,source.kind);
 }
});
test("invalid manifests cannot override source-specific permissions",()=>{
 const bad={...manifest,sourceTypes:[...manifest.sourceTypes]};
 bad.sourceTypes[0]={...bad.sourceTypes[0],acceptForCommercialUse:true,rightsStatus:"approved"};
 assert.equal(validateFdaGovernanceManifest(bad),false);
 const result=reviewFdaSourceAdmission({kind:"labels",record:{setId:"LABEL_A",effectiveDate:"20261120"},asOf:"2026-11-21",sourceManifest:bad});
 assert.deepEqual(result,{accepted:false,reason:"invalid_governance_manifest"});
});
