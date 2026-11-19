import assert from "node:assert/strict";
import test from "node:test";
import {
  planPrivateEpdQuarantineCloudTrailSelectors as plan,
  privateEpdCloudTrailAuditScope as scope
} from "../src/core/intelligence-s3-quarantine-audit-selector-plan.mjs";
const management={ReadWriteType:"All",IncludeManagementEvents:true,
  DataResources:[],ExcludeManagementEventSources:[]};
const evidence={ReadWriteType:"WriteOnly",IncludeManagementEvents:false,
  DataResources:[{Type:"AWS::S3::Object",Values:[scope.existingEvidencePrefix]}],
  ExcludeManagementEventSources:[]};
const initial=()=>[structuredClone(management),structuredClone(evidence)];
const invoke=(selector=initial(),opts={})=>plan({
  trailName:scope.trailName,eventSelectors:selector,advancedEventSelectors:[],...opts
});
test("preserves baseline management and existing intelligence evidence events",()=>{
  const a=initial(),copy=structuredClone(a);
  const x=invoke(a);
  assert.equal(x.mode,"proposal_not_applied");
  assert.equal(x.approvedForExecution,false);
  assert.equal(x.customerAccessEnabled,false);
  assert.equal(x.addedSelectorCount,1);
  assert.deepEqual(x.selectors.slice(0,2),copy);
  assert.deepEqual(a,copy);
});
test("quarantine is exact prefix S3 read and write only",()=>{
  const x=invoke();
  const selector=x.selectors[2];
  assert.equal(selector.ReadWriteType,"All");
  assert.equal(selector.IncludeManagementEvents,false);
  assert.deepEqual(selector.DataResources,
    [{Type:"AWS::S3::Object",Values:[scope.quarantineArchivePrefix]}]);
  assert.equal(selector.DataResources[0].Values[0].endsWith("/"),true);
});
test("already present exact selector is idempotent and unapproved",()=>{
  const first=invoke();const again=invoke(first.selectors);
  assert.equal(again.addedSelectorCount,0);
  assert.equal(again.approvedForExecution,false);
  assert.equal(again.status,"selector_present_requires_live_event_proof");
});
test("fail closed if management or existing object audit changes",()=>{
  const a=initial();
  a[0].IncludeManagementEvents=false;
  assert.throws(()=>invoke(a),/existing_audit_policy_drift/);
  const b=initial();b[1].DataResources=[];
  assert.throws(()=>invoke(b),/existing_audit_policy_drift/);
  const c=initial();c[1].ReadWriteType="All";
  assert.throws(()=>invoke(c),/existing_audit_policy_drift/);
});
test("wrong account or bucket, selector overlap, and advanced mode deny",()=>{
  assert.throws(()=>invoke(initial(),{trailName:"wrong"}),/wrong_trail/);
  assert.throws(()=>invoke([]),/unexpected_selector_count/);
  assert.throws(()=>invoke(initial(),{advancedEventSelectors:[{}]}),
    /unexpected_selector_mode/);
  const malformed=[...initial(),{...evidence,DataResources:[
    {Type:"AWS::S3::Object",Values:["arn:aws:s3:::*"]}]}];
  assert.throws(()=>invoke(malformed),/quarantine_selector_mismatch/);
});
test("never mutates caller's audit or quota inputs",()=>{
  const a=initial(),copy=JSON.stringify(a);
  const x=invoke(a);
  x.selectors[2].DataResources[0].Values[0]="altered";
  assert.equal(JSON.stringify(a),copy);
  assert.equal(scope.applied,false);
});
