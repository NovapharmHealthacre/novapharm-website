import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { prepareOfficialMedicineEvidenceCandidate } from "../src/core/medicine-evidence-admission.mjs";
import { createAtlasG2AtomicStore } from "../src/data/atlas-medicine-g2-atomic-store.mjs";

const h = c => c.repeat(64);
const hash = x => createHash("sha256").update(x).digest("hex");
const source = "nhsbsa_english_prescribing";
const workspace = "novapharm-internal-staging";
function fixture(code="001234567890") {
  const sourceVersion="epd-snomed-2026-08", resourceId="epd-202608-partition-01";
  const resourceSha256=h("b"), rowId="publisher-record-1", rowSha256=h("a");
  const row = {
    source_id:source, source_version:sourceVersion, resource_id:resourceId,
    resource_sha256:resourceSha256, row_id:rowId, row_sha256:rowSha256,
    period:"2026-08", jurisdiction:"England", geography_id:"QWO",
    metric:"items", unit:"items", value:4,
    code_system:"BNF_PRESENTATION_CODE", source_code:code,
    medicine_identity:"medicine:approved:1",
    identity_proof:{
      matchType:"verified_exact",verifiedByAuthority:true,
      sourceCode:code,codeSystem:"BNF_PRESENTATION_CODE",
      medicineIdentity:"medicine:approved:1",sourceVersion,
      mappingRevision:"source-code-map-v1",referenceSha256:h("c")
    }
  };
  return {
    rows:[row],
    snapshot:{
      sourceId:source,sourceVersion,resourceId,resourceSha256,
      period:"2026-08",jurisdiction:"England",sourceHashIndependentlyVerified:true,
      fullPartitionVerified:true,expectedRows:1,expectedTotal:4,
      metric:"items",unit:"items",
      expectedRowsDigest:hash(rowId+":"+rowSha256),containsPatientData:false
    },
    grant:{
      status:"active",verifiedByRightsAuthority:true,sourceId:source,
      sourceVersion,resourceId,allowedPurposes:["private_observed_prescribing_ingestion"],
      commercialAnalysisApproved:true,datasetReuseApproved:true,
      termsSha256:h("d"),termsUrl:"https://opendata.nhsbsa.net/pages/terms-and-conditions",
      rightsRevision:"licensed-reviewed-v1",reviewerId:"compliance-reviewer-1",
      reviewedAt:"2026-11-10T06:00:00Z",validFrom:"2026-11-10T06:00:00Z",
      thirdPartyTerminologyReuseApproved:true,terminologyRightsRevision:"bnf-rights-v1"
    },
    release:{environment:"private_staging",verifiedServerSide:true,
      customerPublishingEnabled:false,allowPatientData:false,
      checkedAt:"2026-11-11T06:00:00Z"}
  };
}
function fakeStore(onIdentity) {
  const unique={
    npi_medicine_evidence:{workspace_id:1,source_id:1,source_version:1,
      resource_id:1,row_id:1},
    npi_evidence_manifests:{workspace_id:1,manifest_sha256:1},
    npi_audit_events:{workspace_id:1,event_id:1}
  };
  let writes=0, transactions=0;
  const db={
    databaseName:"novapharm_intelligence_production",
    collection(name) {
      assert.ok(Object.hasOwn(unique,name));
      return {
        listIndexes:()=>({toArray:async()=>[{
          name:"uniqueness",key:unique[name],unique:true
        }]}),
        findOne:async()=>null,
        insertMany:async rows=>{writes+=rows.length;return {
          acknowledged:true,insertedCount:rows.length
        }},
        insertOne:async()=>{writes++;return{
          acknowledged:true,insertedId:randomUUID()
        }},
        updateOne:async()=>({acknowledged:true,modifiedCount:1}),
        updateMany:async()=>({acknowledged:true,matchedCount:1,modifiedCount:1}),
        countDocuments:async()=>0
      };
    }
  };
  const client={startSession:()=>{
    transactions++;
    return {
      withTransaction:async callback=>callback(),
      endSession:async()=>{}
    };
  }};
  const store=createAtlasG2AtomicStore({
    database:db,client,clock:()=>Date.parse("2026-11-13T12:00:00Z"),
    verifyTransactionAuthority:async()=>true,
    verifyTransactionRights:async()=>true,
    verifyTransactionIdentity:async check=>onIdentity(check),
    verifyTransactionSource:async check=>{
      assert.equal(check.sourceId,source);return true;
    }
  });
  return {store,stats:()=>({writes,transactions})};
}
function payload(candidate) {
  return {
    contract:"novapharm.private-medicine-atomic-admission.v1",
    workspaceId:workspace,principalId:"board_member_001",
    authorityRevision:"board-review-001",
    sourceId:candidate.sourceId,sourceVersion:candidate.sourceVersion,
    resourceId:candidate.resourceId,resourceSha256:candidate.resourceSha256,
    period:candidate.period,rowsDigest:candidate.rowsDigest,
    reconciliationTotal:candidate.reconciliationTotal,rowCount:candidate.rowCount,
    rightsRevision:candidate.rightsRevision,manifestSha256:h("e"),
    eventId:randomUUID(),customerPublishApproved:false,
    records:candidate.records
  };
}
test("synthetic official-source G1 to G2 handoff preserves exact leading-zero code", async()=>{
  const candidate=prepareOfficialMedicineEvidenceCandidate(fixture());
  assert.equal(candidate.acceptedObservations,0);
  assert.equal(candidate.records[0].source_code,"001234567890");
  assert.equal(candidate.records[0].code_system,"BNF_PRESENTATION_CODE");
  let called=0;
  const {store,stats}=fakeStore(async check=>{
    called++;
    assert.equal(check.workspaceId,workspace);
    assert.equal(check.period,"2026-08");
    assert.equal(check.rows.length,1);
    assert.deepEqual(check.rows[0],{
      rowId:"publisher-record-1",provenanceSha256:h("a"),
      medicineIdentity:"medicine:approved:1",
      codeSystem:"BNF_PRESENTATION_CODE",sourceCode:"001234567890",
      mappingRevision:"source-code-map-v1"
    });
    return true;
  });
  const receipt=await store.commitAtomic(payload(candidate));
  assert.equal(receipt.customerPublishApproved,false);
  assert.equal(receipt.committed,true);
  assert.equal(called,1);
  assert.deepEqual(stats(),{writes:3,transactions:1});
});
test("G2 refuses missing exact source code before opening a transaction",async()=>{
  const valid=prepareOfficialMedicineEvidenceCandidate(fixture());
  const corrupted=structuredClone(valid.records[0]);
  delete corrupted.source_code;
  const {store,stats}=fakeStore(async()=>true);
  await assert.rejects(
    store.commitAtomic(payload({...valid,records:[corrupted]})),
    e=>e.code==="invalid_g2_source_row"
  );
  assert.deepEqual(stats(),{writes:0,transactions:0});
});
