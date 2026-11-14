import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import {
  createAtlasG2AtomicStore, atlasG2AtomicStorageStatus
} from "../src/data/atlas-medicine-g2-atomic-store.mjs";

const hash = x => createHash("sha256").update(x).digest("hex");
const h = c => c.repeat(64);
const workspace = "novapharm-internal-staging";
const source = "nhsbsa_english_prescribing";
const now = Date.parse("2026-11-13T12:00:00Z");
const keys = {
  npi_medicine_evidence: {
    workspace_id: 1, source_id: 1, source_version: 1,
    resource_id: 1, row_id: 1
  },
  npi_evidence_manifests: {
    workspace_id: 1, manifest_sha256: 1
  },
  npi_audit_events: {
    workspace_id: 1, event_id: 1
  }
};
const sample = () => {
  const row = {
    workspace_id: workspace,
    medicine_identity: "medicine:reviewed:1",
    code_system: "BNF_PRESENTATION_CODE", source_code: "0208020Z0AAAAAA",
    source_id: source, source_version: "epd-snomed-2026-08",
    resource_id: "partition-001", resource_sha256: h("a"),
    row_id: "official-row-001", provenance_sha256: h("b"),
    period: "2026-08", jurisdiction: "England",
    geography_id: "NHS-AREA-01", metric: "items", unit: "items",
    value: 5, evidence_type: "observed_fact",
    identity_revision: "mapping-version-001",
    rights_revision: "independent-licence-v1",
    status: "candidate_not_accepted"
  };
  return {
    contract: "novapharm.private-medicine-atomic-admission.v1",
    workspaceId: workspace,
    principalId: "board_member_001", authorityRevision: "board-review-001",
    sourceId: source, sourceVersion: row.source_version,
    resourceId: row.resource_id, resourceSha256: row.resource_sha256,
    period: row.period, rowsDigest: hash(row.row_id + ":" + row.provenance_sha256),
    reconciliationTotal: 5, rowCount: 1,
    rightsRevision: row.rights_revision,
    manifestSha256: h("c"), eventId: randomUUID(),
    customerPublishApproved: false,
    records: [row]
  };
};
function fake({ indexMissing = null, denyAuthority = false, denyRights = false,
  denyIdentity = false, denySource = false, failAudit = false,
  hideQuarantineReadback = false, verifyIdentityCallback = null } = {}) {
  const names = Object.keys(keys);
  const data = Object.fromEntries(names.map(name => [name, []]));
  let started = 0, committed = 0, rolledBack = 0;
  const matching = (item, filter) => Object.entries(filter).every(([k,v]) => item[k] === v);
  const coll = name => ({
    listIndexes() {
      const valid = {name:"g2_unique", key:keys[name], unique:true};
      return {toArray:async()=>indexMissing === name ? [] : [{name:"_id_",key:{_id:1},unique:true},valid]};
    },
    async findOne(filter) {
      if (name === "npi_audit_events" && hideQuarantineReadback &&
        filter.action === "medicine_evidence.quarantine") return null;
      return data[name].find(item=>matching(item,filter))??null;
    },
    async insertMany(records) {
      data[name].push(...structuredClone(records));
      return {acknowledged:true,insertedCount:records.length};
    },
    async insertOne(doc) {
      if (name === "npi_audit_events" && failAudit &&
        doc.action === "medicine_evidence.quarantine") throw new Error("audit outage");
      data[name].push(structuredClone(doc));
      return {acknowledged:true,insertedId:randomUUID()};
    },
    async countDocuments(filter) {
      return data[name].filter(item=>matching(item,filter)).length;
    },
    async updateMany(filter, update) {
      const rows = data[name].filter(item=>matching(item,filter));
      for(const row of rows)Object.assign(row,update.$set);
      return {acknowledged:true, matchedCount:rows.length, modifiedCount:rows.length};
    },
    async updateOne(filter, update) {
      const item = data[name].find(row=>matching(row,filter));
      if(item) Object.assign(item,update.$set);
      return {acknowledged:true,modifiedCount:item?1:0};
    }
  });
  const client = {startSession() {
    started++;
    return {
      async withTransaction(work,config) {
        assert.equal(config.writeConcern.w,"majority");
        assert.equal(config.writeConcern.j,true);
        assert.equal(config.readConcern.level,"snapshot");
        const old=structuredClone(data);
        try {const value=await work();committed++;return value;}
        catch(e) {
          for(const name of names)data[name]=old[name];
          rolledBack++;throw e;
        }
      },
      async endSession() {}
    };
  }};
  const db = {databaseName:"novapharm_intelligence_production",collection:coll};
  const store = createAtlasG2AtomicStore({
    client, database:db, clock:()=>now,
    verifyTransactionAuthority:async()=>!denyAuthority,
    verifyTransactionRights:async()=>!denyRights,
    verifyTransactionIdentity:async claim=>{
      assert.equal(claim.workspaceId,workspace);
      assert.equal(claim.period,"2026-08");
      assert.equal(claim.rows[0].medicineIdentity,"medicine:reviewed:1");
      assert.equal(claim.rows[0].codeSystem,"BNF_PRESENTATION_CODE");
      assert.equal(claim.rows[0].sourceCode,"0208020Z0AAAAAA");
      if (verifyIdentityCallback) return verifyIdentityCallback(claim);
      return !denyIdentity;
    },
    verifyTransactionSource: async receipt=>{
      assert.equal(receipt.sourceId,source);
      assert.equal(receipt.reportingPeriod,"2026-08");
      assert.equal(receipt.rowCount,1);
      assert.equal(receipt.reconciliationTotal,5);
      return !denySource;
    }
  });
  return {store,data, stats:()=>({started,committed,rolledBack})};
}

test("synthetic candidate commits evidence, manifest, audit transaction and reads majority", async()=>{
  const sys=fake(), input=sample();
  const receipt=await sys.store.commitAtomic(input);
  assert.equal(receipt.committed,true);
  assert.equal(receipt.customerPublishApproved,false);
  assert.equal(receipt.rowCount,1);
  assert.equal(sys.data.npi_medicine_evidence.length,1);
  assert.equal(sys.data.npi_evidence_manifests.length,1);
  assert.equal(sys.data.npi_audit_events.length,1);
  assert.equal(sys.data.npi_medicine_evidence[0].status,"privately_admitted_not_published");
  const read=await sys.store.readBackCommit({
    transactionId:receipt.transactionId, workspaceId:workspace,
    manifestSha256:receipt.manifestSha256, eventId:receipt.eventId, expectedRows:1
  });
  assert.equal(read.durable,true);
  assert.equal(read.customerPublishApproved,false);
  assert.deepEqual(sys.stats(),{started:1,committed:1,rolledBack:0});
  assert.equal(atlasG2AtomicStorageStatus.productionWired,false);
});

test("quarantine is transactional, audited and strips private admitted status", async()=>{
  const sys=fake(),p=sample(),w=await sys.store.commitAtomic(p);
  const receipt=await sys.store.quarantineCommitted({
    transactionId:w.transactionId,workspaceId:workspace,manifestSha256:w.manifestSha256,
    eventId:w.eventId,reason:"rights_recheck_failed_after_commit",
    customerPublishApproved:false
  });
  assert.equal(receipt.quarantined,true);
  assert.equal(receipt.auditCommitted,true);
  assert.equal(sys.data.npi_medicine_evidence[0].status,"quarantined_never_publish");
  assert.equal(sys.data.npi_evidence_manifests[0].status,"quarantined_never_publish");
  assert.equal(sys.data.npi_audit_events.length,2);
  assert.equal((await sys.store.readBackCommit({
    transactionId:w.transactionId,workspaceId:workspace,manifestSha256:w.manifestSha256,
    eventId:w.eventId,expectedRows:1
  })),null);
});

test("no unique indexes means no evidence or audit writes", async()=>{
  for(const indexMissing of Object.keys(keys)){
    const s=fake({indexMissing});
    await assert.rejects(s.store.commitAtomic(sample()),e=>e.code==="unique_index_unavailable");
    assert.equal(s.stats().started,0);
    assert.ok(Object.values(s.data).every(rows=>rows.length===0));
  }
});

test("missing authority or rights reverses transaction before writes", async()=>{
  for(const config of [{denyAuthority:true},{denyRights:true}]){
    const s=fake(config);
    await assert.rejects(s.store.commitAtomic(sample()),e=>e.code==="live_authority_or_rights_revoked");
    assert.ok(Object.values(s.data).every(rows=>rows.length===0));
    assert.deepEqual(s.stats(),{started:1,committed:0,rolledBack:1});
  }
});

test("tampered patient field, totals or digest fail before opening Mongo transaction", async()=>{
  const mutants=[
    p=>{p.records[0].patient_name="should not persist";},
    p=>{p.reconciliationTotal=100;},
    p=>{p.rowsDigest=h("e");},
    p=>{p.records[0].status="accepted";},
    p=>{p.customerPublishApproved=true;},
    p=>{p.records[0].row_id="operator.$ne";}
  ];
  for(const mutate of mutants){
    const s=fake(),p=sample();mutate(p);
    await assert.rejects(s.store.commitAtomic(p));
    assert.equal(s.stats().started,0);
  }
});

test("already committed manifest cannot be inserted a second time", async()=>{
  const s=fake(),p=sample();
  await s.store.commitAtomic(p);
  await assert.rejects(s.store.commitAtomic({...p,eventId:randomUUID()}),
    e=>e.code==="atomic_transaction_failed");
  assert.equal(s.data.npi_medicine_evidence.length,1);
  assert.equal(s.data.npi_evidence_manifests.length,1);
  assert.equal(s.data.npi_audit_events.length,1);
  assert.equal(s.stats().rolledBack,1);
});

test("quarantine audit outage rolls back evidence/manifest state", async()=>{
  const s=fake({failAudit:true}),p=sample(),receipt=await s.store.commitAtomic(p);
  await assert.rejects(s.store.quarantineCommitted({
    workspaceId:workspace,transactionId:receipt.transactionId,
    manifestSha256:receipt.manifestSha256,eventId:receipt.eventId,
    reason:"durable_audit_or_manifest_missing",customerPublishApproved:false
  }),e=>e.code==="quarantine_transaction_failed");
  assert.equal(s.data.npi_medicine_evidence[0].status,"privately_admitted_not_published");
  assert.equal(s.data.npi_evidence_manifests[0].status,"privately_admitted_not_published");
  assert.equal(s.data.npi_audit_events.length,1);
});

test("readback rejects wrong workspace, mismatched event, row count, or altered audit", async()=>{
  const s=fake(),receipt=await s.store.commitAtomic(sample());
  const good={
    workspaceId:workspace,transactionId:receipt.transactionId,
    manifestSha256:receipt.manifestSha256,eventId:receipt.eventId,expectedRows:1
  };
  for(const change of [
    {workspaceId:"another_workspace"},{eventId:randomUUID()},{expectedRows:2}
  ])assert.equal(await s.store.readBackCommit({...good,...change}),null);
  s.data.npi_audit_events[0].customer_publish_approved=true;
  assert.equal(await s.store.readBackCommit(good),null);
});

test("store cannot be constructed without a scoped Mongo client and external validators",()=>{
  assert.throws(()=>createAtlasG2AtomicStore({
    database:{databaseName:"novapharm_staging",collection:()=>({})},
    client:{startSession(){}},verifyTransactionAuthority:async()=>true,
    verifyTransactionRights:async()=>true
  }),e=>e.code==="trusted_atlas_runtime_required");
  assert.throws(()=>createAtlasG2AtomicStore({
    database:{databaseName:"novapharm_intelligence_production",collection:()=>({})},
    client:{startSession(){}}
  }),e=>e.code==="trusted_atlas_runtime_required");
});

test("committed quarantine without an independently readable audit cannot attest success", async()=>{
  const s=fake({hideQuarantineReadback:true}),p=sample();
  const receipt=await s.store.commitAtomic(p);
  await assert.rejects(s.store.quarantineCommitted({
    workspaceId:workspace, transactionId:receipt.transactionId,
    manifestSha256:receipt.manifestSha256, eventId:receipt.eventId,
    reason:"rights_recheck_failed_after_commit",
    customerPublishApproved:false
  }),e=>e.code==="quarantine_durable_readback_failed");
  assert.equal(s.data.npi_medicine_evidence[0].status,"quarantined_never_publish");
  assert.equal(s.data.npi_evidence_manifests[0].status,"quarantined_never_publish");
  assert.equal(s.data.npi_audit_events.length,2);
});


test("independent exact temporal identity verification is mandatory before any G2 write", async()=>{
  const sys=fake({denyIdentity:true});
  await assert.rejects(sys.store.commitAtomic(sample()),
    e=>e.code==="live_canonical_identity_unverified");
  assert.ok(Object.values(sys.data).every(rows=>rows.length===0));
  assert.deepEqual(sys.stats(),{started:1,committed:0,rolledBack:1});
});


test("independent publisher source receipt and reconciled partition is mandatory before any G2 write", async()=>{
  const sys=fake({denySource:true});
  await assert.rejects(sys.store.commitAtomic(sample()),
    e=>e.code==="live_source_reconciliation_unverified");
  assert.ok(Object.values(sys.data).every(rows=>rows.length===0));
  assert.deepEqual(sys.stats(),{started:1,committed:0,rolledBack:1});
});


test("end-to-end G1 validation through G2 and the private store remains nonpublishable", async()=>{
  const {admitPrivateOfficialMedicineEvidence} = await import(
    "../src/core/medicine-evidence-atomic-admission.mjs");
  const prepared=sample();
  const row=prepared.records[0];
  const sourceRow={
    source_id:row.source_id,source_version:row.source_version,
    resource_id:row.resource_id,resource_sha256:row.resource_sha256,
    row_id:row.row_id,row_sha256:row.provenance_sha256,
    period:row.period,jurisdiction:row.jurisdiction,geography_id:row.geography_id,
    metric:row.metric,unit:row.unit,value:row.value,
    code_system:row.code_system,source_code:row.source_code,
    medicine_identity:row.medicine_identity,
    identity_proof:{
      matchType:"verified_exact",verifiedByAuthority:true,
      sourceCode:row.source_code,codeSystem:row.code_system,
      medicineIdentity:row.medicine_identity,sourceVersion:row.source_version,
      mappingRevision:row.identity_revision,referenceSha256:h("d")
    }
  };
  const when="2026-11-13T12:00:00Z";
  const snapshot={
    sourceId:source,sourceVersion:row.source_version,resourceId:row.resource_id,
    resourceSha256:row.resource_sha256,period:row.period,jurisdiction:"England",
    sourceHashIndependentlyVerified:true,fullPartitionVerified:true,
    expectedRows:1,expectedTotal:5,metric:"items",unit:"items",
    expectedRowsDigest:hash(sourceRow.row_id+":"+sourceRow.row_sha256),
    containsPatientData:false
  };
  const grant={
    status:"active",verifiedByRightsAuthority:true,sourceId:source,
    sourceVersion:row.source_version,resourceId:row.resource_id,
    allowedPurposes:["private_observed_prescribing_ingestion"],
    commercialAnalysisApproved:true,datasetReuseApproved:true,
    termsSha256:h("e"),termsUrl:"https://opendata.nhsbsa.net/pages/terms-and-conditions",
    rightsRevision:row.rights_revision,reviewerId:"fixture_independent",
    reviewedAt:"2026-11-12T00:00:00Z",
    validFrom:"2026-11-12T00:00:00Z",
    thirdPartyTerminologyReuseApproved:true,
    terminologyRightsRevision:"fixture-term-rights-v1"
  };
  const release={
    environment:"private_staging",verifiedServerSide:true,
    customerPublishingEnabled:false,allowPatientData:false,checkedAt:when
  };
  const authority={
    verifiedBySessionService:true,workspaceId:workspace,
    principalId:"board_member_001",authorityRevision:"board-review-001",
    scopes:["board"],customerAccess:false
  };
  const verifyCurrentRights=async()=>({
    verifiedByRightsAuthority:true,status:"active",revoked:false,
    workspaceId:workspace,sourceId:source,sourceVersion:row.source_version,
    resourceId:row.resource_id,resourceSha256:row.resource_sha256,
    rightsRevision:grant.rightsRevision,termsSha256:grant.termsSha256,
    terminologyRightsRevision:grant.terminologyRightsRevision,
    datasetReuseApproved:true,commercialAnalysisApproved:true,
    thirdPartyTerminologyReuseApproved:true,
    allowedPurposes:["private_observed_prescribing_ingestion"],
    checkedAt:when,validFrom:"2026-11-12T00:00:00Z"
  });
  const sys=fake();
  const args={
    snapshot,rows:[sourceRow],grant,release,authority,
    verifyCurrentAuthority:async()=>true,verifyCurrentRights,
    ...sys.store,now:new Date(when),clock:()=>Date.parse(when)
  };
  const admitted=await admitPrivateOfficialMedicineEvidence(args);
  assert.equal(admitted.status,"privately_admitted_requires_independent_release");
  assert.equal(admitted.acceptedPrivateRows,1);
  assert.equal(admitted.customerPublishApproved,false);
  assert.equal(admitted.productionCertified,false);
  assert.equal(admitted.aiExecutionApproved,false);
  assert.equal(sys.data.npi_medicine_evidence.length,1);
  assert.equal(sys.data.npi_evidence_manifests.length,1);
  assert.equal(sys.data.npi_audit_events.length,1);

  // An identical scoped candidate with no independent live rights must not
  // open a second transaction or accept a synthetic source grant.
  const bad=fake();
  await assert.rejects(admitPrivateOfficialMedicineEvidence({
    ...args,...bad.store,verifyCurrentRights:async()=>null
  }), e=>e.code==="rights_revoked_before_commit");
  assert.equal(bad.stats().started,0);
  assert.ok(Object.values(bad.data).every(v=>v.length===0));
});

test("G2 exposes exact source scheme, code and mapping revision to trusted identity authority",async()=>{
  let check=null;
  const sys=fake({verifyIdentityCallback: async value => {
    check=value;return true;
  }});
  await sys.store.commitAtomic(sample());
  assert.equal(check.sourceId,"nhsbsa_english_prescribing");
  assert.equal(check.sourceVersion,"epd-snomed-2026-08");
  assert.equal(check.period,"2026-08");
  assert.deepEqual(check.rows.map(row=>({
    system:row.codeSystem, code:row.sourceCode,
    mapping:row.mappingRevision, canonical:row.medicineIdentity
  })),[{
    system:"BNF_PRESENTATION_CODE", code:"0208020Z0AAAAAA",
    mapping:"mapping-version-001",canonical:"medicine:reviewed:1"
  }]);
});

test("G2 rejects ambiguous or forged source codes before any database writes",async()=>{
  for(const change of [
    row=>{delete row.source_code;},
    row=>{row.source_code="";},
    row=>{row.code_system="SNOMED_UNVERIFIED";},
    row=>{row.source_code={$ne:""};},
    row=>{delete row.code_system;}
  ]) {
    const sys=fake(),p=sample();change(p.records[0]);
    await assert.rejects(sys.store.commitAtomic(p),
      e=>e.code==="invalid_g2_source_row");
    assert.equal(sys.stats().started,0);
  }
});
