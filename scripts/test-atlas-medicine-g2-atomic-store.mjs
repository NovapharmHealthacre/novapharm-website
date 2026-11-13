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
  denyIdentity = false, denySource = false, failAudit = false, hideQuarantineReadback = false } = {}) {
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
