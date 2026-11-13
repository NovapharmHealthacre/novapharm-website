import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  createAtlasPrivateMedicineRightsVerifier, atlasPrivateMedicineRightsSource
} from "../src/data/atlas-private-medicine-rights.mjs";

const at = Date.parse("2026-11-13T12:00:00Z");
const sha = "a".repeat(64);
const request = () => ({
  principalId: "board_member_001", authorityRevision: "role-v1",
  workspaceId: "novapharm-internal-staging",
  sourceId: "nhsbsa_english_prescribing",
  sourceVersion: "epd-snomed-2026-08",
  resourceId: "partition-001", resourceSha256: sha,
  rightsRevision: "independently-reviewed-001",
  purpose: "private_observed_prescribing_ingestion"
});
const record = () => ({
  workspace_id: "novapharm-internal-staging",
  source_id: "nhsbsa_english_prescribing",
  source_version: "epd-snomed-2026-08",
  resource_id: "partition-001", resource_sha256: sha,
  rights_revision: "independently-reviewed-001",
  terms_sha256: "b".repeat(64),
  terminology_rights_revision: "independent-terminology-001",
  allowed_purposes: ["private_observed_prescribing_ingestion"],
  status: "active", revoked: false, dataset_reuse_approved: true,
  commercial_analysis_approved: true,
  third_party_terminology_reuse_approved: true,
  valid_from: "2026-11-12T00:00:00Z",
  valid_until: "2026-11-14T00:00:00Z"
});
const dig = r => {
  const order = [
    "workspace_id", "source_id", "source_version", "resource_id",
    "resource_sha256", "rights_revision", "terms_sha256",
    "terminology_rights_revision", "allowed_purposes", "status",
    "revoked", "dataset_reuse_approved", "commercial_analysis_approved",
    "third_party_terminology_reuse_approved", "valid_from", "valid_until"
  ];
  return createHash("sha256").update(JSON.stringify(order.map(k => [k,r[k] ?? null]))).digest("hex");
};
const requiredIndex = {
  name: "rights_unique_exact_resource_revision",
  unique: true,
  key: {
    workspace_id: 1, source_id: 1, source_version: 1,
    resource_id: 1, resource_sha256: 1, rights_revision: 1
  }
};
function setup(grants = [record()], overrides = {}) {
  const { indexes = [requiredIndex], ...injections } = overrides;
  const queries = []; let verifications = 0;
  const db = { databaseName: "novapharm_intelligence_production",
    collection: name => {
      assert.equal(name, "npi_source_rights");
      return {listIndexes: () => ({toArray: async () => indexes}),
        find: (query, opts) => {
        queries.push(query);
        assert.equal(opts.projection._id, 0);
        return {limit: n => {
          assert.equal(n,2);
          return {toArray: async () => grants};
        }};
      }};
    }
  };
  const verifySignedGrant = async input => {
    verifications++;
    return {
      verifiedSignature: true, grantDigestSha256: input.grantDigestSha256,
      verifierId: "independent_authority_001", revoked: false,
      checkedAt: new Date(at).toISOString()
    };
  };
  return {queries, calls: () => verifications,
    verify: createAtlasPrivateMedicineRightsVerifier({
      database: db, verifySignedGrant,
      clock: () => at, ...injections
    })};
}
test("production rights read is a strict private, read-only operation", async () => {
  const s = setup();
  const v = await s.verify(request());
  assert.equal(v.verifiedByRightsAuthority,true);
  assert.equal(v.status,"active");
  assert.equal(v.customerAccessEnabled,undefined);
  assert.equal(v.resourceSha256,sha);
  assert.equal(s.queries.length,1);
  assert.deepEqual(s.queries[0], {
    workspace_id: "novapharm-internal-staging",
    source_id: "nhsbsa_english_prescribing",
    source_version: "epd-snomed-2026-08",
    resource_id: "partition-001", resource_sha256: sha,
    rights_revision: "independently-reviewed-001"
  });
  assert.equal(atlasPrivateMedicineRightsSource.productionReady,false);
  assert.equal(atlasPrivateMedicineRightsSource.sourceLicenceGranted,false);
});
test("missing or duplicate rights records never become authority", async () => {
  for(const grants of [[],[record(),record()]]) {
    const s=setup(grants);
    assert.equal(await s.verify(request()),null);
    assert.equal(s.calls(),0);
  }
});
test("wrong workspace, missing selectors and user operators never reach Atlas", async () => {
  for(const bad of [
    {workspaceId:"tenant_other"}, {sourceId:{$ne:""}},
    {rightsRevision:""}, {purpose:"customer_analytics"}, {resourceSha256:"bad"}
  ]) {
    const s=setup();
    assert.equal(await s.verify({...request(),...bad}),null);
    assert.equal(s.queries.length,0);
  }
});
test("revoked, expired, unlicensed, altered and cross-tenant grants deny", async () => {
  const mutants=[
    {revoked:true},{status:"pending"},{valid_until:"2026-11-12T00:00:00Z"},
    {third_party_terminology_reuse_approved:false},{commercial_analysis_approved:false},
    {allowed_purposes:["private_observed_prescribing_ingestion","customer"]},
    {workspace_id:"tenant_other"},{terms_sha256:"not_sha256"},{resource_sha256:"c".repeat(64)}
  ];
  for(const mutation of mutants) {
    const s=setup([{...record(),...mutation}]);
    assert.equal(await s.verify(request()),null);
    assert.equal(s.calls(),0);
  }
});
test("signed external grant must match exact digest, identity, time and revocation", async () => {
  const variants=[
    {verifiedSignature:false},{grantDigestSha256:"c".repeat(64)},
    {verifierId:""},{revoked:true},{checkedAt:"2026-11-13T11:55:00Z"}
  ];
  for(const bad of variants) {
    const s=setup([record()], { verifySignedGrant: async input => ({
      verifiedSignature:true, grantDigestSha256:input.grantDigestSha256,
      verifierId:"authority_001",revoked:false,checkedAt:new Date(at).toISOString(),...bad
    })});
    assert.equal(await s.verify(request()),null);
  }
});
test("clock rollback or expiry during verification denies", async()=>{
  const roll=setup([record()], {clock: (()=>{let i=0;return ()=>at-(i++*1000)})()});
  assert.equal(await roll.verify(request()),null);
  const near=record();near.valid_until="2026-11-13T12:00:05Z";
  const exp=setup([near], {clock:(()=>{let i=0;return ()=>at+(i++*10000)})()});
  assert.equal(await exp.verify(request()),null);
});
test("wrong database or absent independent verifier fail before any reads",()=>{
  assert.throws(()=>createAtlasPrivateMedicineRightsVerifier({
    database:{databaseName:"novapharm_staging",collection:()=>({find(){}})},
    verifySignedGrant:async()=>true
  }),/Trusted private/);
  assert.throws(()=>createAtlasPrivateMedicineRightsVerifier({
    database:{databaseName:"novapharm_intelligence_production",collection:()=>({find(){}})}
  }),/Trusted private/);
});

test("read refuses until the exact compound unique rights constraint exists", async () => {
  const variants = [
    [],
    [{ ...requiredIndex, unique: false }],
    [{ ...requiredIndex, key: { workspace_id: 1, source_id: 1 } }],
    [{ ...requiredIndex, sparse: true }],
    [{ ...requiredIndex, partialFilterExpression: { status: "active" } }],
    [{ ...requiredIndex, collation: { locale: "en" } }]
  ];
  for (const indexes of variants) {
    const s = setup([record()], { indexes });
    assert.equal(await s.verify(request()), null);
    assert.equal(s.queries.length, 0);
    assert.equal(s.calls(), 0);
  }
});
