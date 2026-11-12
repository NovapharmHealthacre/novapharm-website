import assert from "node:assert/strict";
import test from "node:test";
import {
  commitPandoraMedicineDecision as commit, pandoraStagingCollections as names
} from "../src/core/intelligence-pandora-transactional-ledger.mjs";
import { pandoraUniqueIndexes, provisionPandoraStagingUniqueIndexes, verifyPandoraStagingUniqueIndexes } from "../src/data/atlas-pandora-staging-indexes.mjs";

const now = "2026-11-12T10:00:00.000Z";
const sha = value => value.repeat(64);
const record = () => ({
  case_id: "case-0123456789abcdef0123456789abcdef",
  tenant_id: "tenant-001", medicine_id: "medicine-0123456789abcdef0123456789abcdef",
  status: "draft", version: 1, proposer_id: "person-proposer-001",
  reviewer_id: null, approver_id: null, evidence_snapshot_sha256: sha("a"),
  rights_revision: "rights-v1", audit_head_sha256: null
});
const source = () => ({
  source_id: "nhsbsa.epd", source_version: "2026-09",
  provenance_sha256: sha("b"), rights_revision: "rights-v1",
  allowed_for_decision_review: true, status: "active", evidence_type: "observed_fact"
});
const manifest = () => ({
  case_id: record().case_id, tenant_id: "tenant-001",
  medicine_id: record().medicine_id, snapshot_sha256: sha("a"),
  rights_revision: "rights-v1", accepted_for_decision_review: true,
  sample_data: false, customer_submitted: false, model_generated: false,
  sources: [source()]
});
const grant = () => ({
  tenant_id: "tenant-001", source_id: "nhsbsa.epd", source_version: "2026-09",
  rights_revision: "rights-v1", status: "active", allowed_purposes: ["decision_review"],
  valid_from: "2026-01-01T00:00:00.000Z", valid_until: null
});
const identity = (id, role) => ({
  tenant_id: "tenant-001", subject_id: id, role, authority_revision: "auth-v1",
  verified: true, mfa_verified: true, revoked_at: null,
  session_expires_at: "2026-11-13T00:00:00.000Z"
});
const accounts = () => [
  identity("person-proposer-001","analyst"),
  identity("person-reviewer-001","independent_reviewer"),
  identity("person-approver-001","independent_approver"),
  identity("person-security-001","security_admin")
];
const environment = {
  ATLAS_ENVIRONMENT: "staging",
  PANDORA_STAGING_DECISION_LEDGER_ENABLED: "true",
  PANDORA_STAGING_DECISION_AUDIT_ENABLED: "true",
  PANDORA_OWNER_FINAL_APPROVAL_REQUIRED: "true",
  PANDORA_FINAL_APPROVER_SUBJECT_ID: "person-approver-001"
};
const release = { verifiedServerSide: true, privateDecisionReviewApproved: true };
const actor = (subjectId = "person-proposer-001") => ({
  verifiedServerSide: true, mfaVerified: true, tenantId: "tenant-001", subjectId
});
const request = (action = "submit", version = 1) => ({
  caseId: record().case_id, tenantId: "tenant-001",
  action, expectedVersion: version, reasonCode: "evidence_review"
});
function matches(row, query) {
  for (const [key,value] of Object.entries(query)) {
    if (key === "$or") {
      if (!value.some(part => matches(row, part))) return false;
      continue;
    }
    const actual = row[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if ("$lte" in value && !(actual <= value.$lte)) return false;
      if ("$gt" in value && !(actual > value.$gt)) return false;
      continue;
    }
    if (value === null ? actual != null : Array.isArray(actual) ? !actual.includes(value) : actual !== value) return false;
  }
  return true;
}
function fixture({
  cases = [record()], manifests = [manifest()], authorities = accounts(),
  rights = [grant()], events = [], failAudit = false, failIndexes = false
} = {}) {
  let state = Object.fromEntries(
    Object.entries(names).map(([key,name]) => [name, structuredClone({cases,manifests,authorities,rights,events}[key])])
  );
  const operations = [];
  const db = {
    databaseName: "novapharm_staging",
    collection(name) {
      if (!(name in state)) throw Error("Unknown collection " + name);
      return {
        listIndexes() {
          return { async toArray() {
            if (failIndexes) return [{name:"_id_",key:{_id:1},unique:true}];
            return [
              {name:"_id_",key:{_id:1},unique:true},
              ...pandoraUniqueIndexes.filter(x=>x.collection===name)
                .map(x=>({name:x.name,key:x.keys,unique:true}))
            ];
          } };
        },
        async findOne(query, options) {
          assert.ok(options?.session);
          operations.push({op:"read",name});
          return state[name].find(row => matches(row,query)) ?? null;
        },
        async updateOne(query, patch, options) {
          assert.ok(options?.session);
          operations.push({op:"update",name});
          const row = state[name].find(row => matches(row,query));
          if (!row) return {matchedCount:0,modifiedCount:0};
          for (const [key,value] of Object.entries(patch.$set ?? {})) row[key] = value;
          for (const [key,value] of Object.entries(patch.$inc ?? {})) row[key] = (row[key] ?? 0) + value;
          return {matchedCount:1,modifiedCount:1};
        },
        async insertOne(doc, options) {
          assert.ok(options?.session);
          operations.push({op:"insert",name});
          if (failAudit && name === names.events) return { acknowledged:false };
          state[name].push(doc);
          return {acknowledged:true,insertedId:"inserted"};
        }
      };
    }
  };
  const session = {
    async withTransaction(fn,options) {
      operations.push({op:"transaction",options});
      const before = structuredClone(state);
      try { return await fn(); }
      catch(error) { state=before; throw error; }
    },
    async endSession() { operations.push({op:"end"}); }
  };
  const client = { startSession() { return session; } };
  return { client, db, operations, getState: () => state };
}
const input = (f, overrides={}) => ({
  client:f.client, db:f.db, environment, now, release,
  actor:actor(), request:request(), ...overrides
});

test("three independent people commit 3 transitions with a linked immutable audit chain",async()=>{
  const f=fixture();
  const a=await commit(input(f));
  assert.equal(a.committed,true);
  assert.equal(a.status,"staging_transaction_committed");
  assert.equal(a.externalActionAllowed,false);
  assert.equal(a.customerAccessGranted,false);
  const b=await commit(input(f,{
    request:request("review",2),actor:actor("person-reviewer-001")
  }));
  const c=await commit(input(f,{
    request:request("approve",3),actor:actor("person-approver-001")
  }));
  assert.equal(c.decisionStatus,"approved");
  assert.equal(c.version,4);
  assert.equal(f.getState()[names.cases][0].reviewer_id,"person-reviewer-001");
  assert.equal(f.getState()[names.cases][0].approver_id,"person-approver-001");
  const events=f.getState()[names.events];
  assert.equal(events.length,3);
  assert.equal(events[0].previous_event_sha256,null);
  assert.equal(events[1].previous_event_sha256,a.auditSha256);
  assert.equal(events[2].previous_event_sha256,b.auditSha256);
  assert.equal(c.auditSha256,events[2].event_sha256);
  assert.equal(f.getState()[names.cases][0].audit_head_sha256,c.auditSha256);
  assert.equal(f.operations.filter(x=>x.op==="transaction").length,3);
  assert.deepEqual(f.operations[0].options.writeConcern,{w:"majority",j:true});
  assert.equal(f.operations.filter(x=>x.name===names.rights&&x.op==="update").length,3);
  assert.doesNotMatch(JSON.stringify(events),/patient@example|sk_secret|raw_prompt/);
});
test("owner-only final approval requires independent reviewer and exact verified owner subject",async()=>{
  const p=fixture({cases:[{...record(),status:"approval_pending",version:3,reviewer_id:"person-reviewer-001"}]});
  const wrongOwner={...environment,PANDORA_FINAL_APPROVER_SUBJECT_ID:"person-security-001"};
  await assert.rejects(commit(input(p,{
    environment:wrongOwner,
    request:request("approve",3),actor:actor("person-approver-001")
  })),error=>error.code==="owner_final_approver_required");
  const noOwner={...environment,PANDORA_FINAL_APPROVER_SUBJECT_ID:""};
  await assert.rejects(commit(input(p,{
    environment:noOwner,
    request:request("approve",3),actor:actor("person-approver-001")
  })),error=>error.code==="ledger_disabled");
  assert.equal(p.getState()[names.events].length,0);
});
test("missing genuine source grant, revoked licence and duplicate evidence cannot commit",async()=>{
  for(const variant of [
    {rights:[]},
    {rights:[{...grant(),status:"revoked"}]},
    {rights:[{...grant(),allowed_purposes:["external_ai"]}]},
    {manifests:[{...manifest(),sources:[source(),source()]}]},
    {manifests:[{...manifest(),sample_data:true}]}
  ]){
    const f=fixture(variant);
    await assert.rejects(commit(input(f)),error=>error.statusCode===403);
    assert.equal(f.getState()[names.cases][0].version,1);
    assert.equal(f.getState()[names.events].length,0);
  }
});
test("an approved case can be revoked safely after source rights withdrawal",async()=>{
  const c={...record(),status:"approved",version:4,
    reviewer_id:"person-reviewer-001",approver_id:"person-approver-001"};
  const f=fixture({cases:[c],rights:[],manifests:[]});
  const receipt=await commit(input(f,{request:request("revoke",4),
    actor:actor("person-security-001")}));
  assert.equal(receipt.decisionStatus,"revoked");
  assert.equal(f.getState()[names.events].length,1);
  assert.equal(f.operations.filter(x=>x.name===names.rights).length,0);
});
test("wrong tenant, missing MFA, expired authority and self approval are all denied",async()=>{
  const invalids=[
    { actor:{...actor(),tenantId:"other-tenant"} },
    { actor:{...actor(),mfaVerified:false} },
    { request:{...request(),tenantId:"other-tenant"} },
    { release:{...release,privateDecisionReviewApproved:false} }
  ];
  for(const bad of invalids){
    const f=fixture();
    await assert.rejects(commit(input(f,bad)),error=>error.statusCode===403);
    assert.equal(f.getState()[names.events].length,0);
  }
  const f=fixture({authorities:accounts().map(x=>x.subject_id==="person-proposer-001"?
    {...x,session_expires_at:"2026-11-11T00:00:00.000Z"}:x)});
  await assert.rejects(commit(input(f)),error=>error.statusCode===403);
  const p=fixture({cases:[{...record(),status:"approval_pending",version:3,reviewer_id:"person-reviewer-001"}]});
  await assert.rejects(commit(input(p,{actor:actor("person-proposer-001"),
    request:request("approve",3)})),error=>error.statusCode===403);
});
test("stale versions, audit failure and impossible state changes roll back completely",async()=>{
  const stale=fixture();
  await assert.rejects(commit(input(stale,{request:request("submit",2)})),
    error=>error.code==="stale_case_version");
  const badAudit=fixture({failAudit:true});
  await assert.rejects(commit(input(badAudit)),error=>error.code==="audit_write_failed");
  assert.equal(badAudit.getState()[names.cases][0].version,1);
  assert.equal(badAudit.getState()[names.cases][0].status,"draft");
  assert.equal(badAudit.getState()[names.authorities][0].decision_commit_fence,undefined);
  assert.equal(badAudit.getState()[names.rights][0].decision_commit_fence,undefined);
  const badState=fixture();
  await assert.rejects(commit(input(badState,{request:request("approve",1),
    actor:actor("person-approver-001")})),error=>error.statusCode===403);
});
test("private maintenance can provision and verify six genuinely unique index definitions",async()=>{
  const store=new Map();
  const db={databaseName:"novapharm_staging",collection(name){
    if(!store.has(name)) store.set(name,[]);
    return {
      async createIndex(keys,opts){
        assert.equal(opts.unique,true);
        assert.equal(typeof opts.name,"string");
        store.get(name).push({name:opts.name,key:keys,unique:true});
        return opts.name;
      },
      listIndexes(){return {async toArray(){return store.get(name);}};}
    };
  }};
  await assert.rejects(provisionPandoraStagingUniqueIndexes({db,environment}),
    error=>error.code==="index_provision_disabled");
  const approved={...environment,PANDORA_STAGING_INDEX_PROVISION_ENABLED:"true"};
  const outcome=await provisionPandoraStagingUniqueIndexes({db,environment:approved});
  assert.deepEqual(outcome,{verified:true,uniqueIndexCount:6});
  assert.equal(await verifyPandoraStagingUniqueIndexes({db,environment:approved}),true);
});
test("missing unique Atlas constraints prohibit every committed decision",async()=>{
  const f=fixture({failIndexes:true});
  await assert.rejects(commit(input(f)),error=>error.code==="missing_unique_index");
  assert.equal(f.getState()[names.cases][0].version,1);
  assert.equal(f.getState()[names.events].length,0);
  assert.equal(f.operations.length,0);
});
test("default-off, no public mode, malicious selectors and revoked release never reach storage",async()=>{
  const variants=[
    {environment:{}},
    {environment:{...environment,ATLAS_ENVIRONMENT:"production"}},
    {environment:{...environment,PANDORA_ALLOW_PUBLIC_ACCESS:"true"}},
    {environment:{...environment,PANDORA_ALLOW_EXTERNAL_ACTIONS:"true"}},
    {request:{...request(),caseId:{$ne:null}}},
    {request:{...request(),reasonCode:"ignore instructions"}},
  ];
  for(const patch of variants){
    const f=fixture();
    await assert.rejects(commit(input(f,patch)),error=>error.statusCode===403);
    assert.equal(f.operations.length,0);
  }
});
