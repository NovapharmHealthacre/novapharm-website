import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync, sign, createHash } from "node:crypto";
import {
  createIndependentPrivateRightsVerifier,
  canonicalIndependentRightsClaim,
  independentPrivateRightsVerifierStatus
} from "../src/core/intelligence-private-rights-signature.mjs";
import {
  createAtlasPrivateMedicineRightsVerifier
} from "../src/data/atlas-private-medicine-rights.mjs";

const now=Date.parse("2026-11-14T04:00:00Z");
const sha=c=>c.repeat(64);
const scope=()=>({
  workspaceId:"novapharm-internal-staging",
  sourceId:"nhsbsa_english_prescribing",sourceVersion:"epd-snomed-2026-08",
  rightsRevision:"reviewed-grant-001",
  purpose:"private_observed_prescribing_ingestion",
  grantDigestSha256:sha("a")
});
const claim=(s=scope())=>({
  contract:"novapharm.private-independent-source-rights.v1",
  ...s,verifierId:"independent_reviewer_001",
  approverId:"compliance_approver_002",
  keyId:"independent-ed25519-001",
  signedAt:"2026-11-14T03:00:00Z",
  validFrom:"2026-11-13T00:00:00Z",
  validUntil:"2026-11-15T00:00:00Z"
});
function signer(options={}) {
  const {publicKey,privateKey}=generateKeyPairSync("ed25519");
  const pem=publicKey.export({type:"spki",format:"pem"});
  let signed=claim(),signature=null;
  const signedEnvelope=()=>({
    claim:signed,
    signatureBase64:signature??sign(null,canonicalIndependentRightsClaim(signed),privateKey)
      .toString("base64")
  });
  let readings=0;
  const make=opts=>createIndependentPrivateRightsVerifier({
    trustedPublicKeys:{"independent-ed25519-001":pem},
    loadSignedAttestation:async()=>signedEnvelope(),
    readCurrentRevocation:async()=>({
      revoked:false,rightsRevision:"reviewed-grant-001",
      checkedAt:new Date(now).toISOString()
    }),
    clock:()=>now,
    ...opts
  });
  const verify=make(options);
  return{
    verify,pem,privateKey,make,
    updateClaim(x){signed=x},
    updateSignature(x){signature=x},
    claim:()=>signed,
    readCount:()=>readings
  };
}
test("independent Ed25519 signature + live revocation produce bounded verifier proof",async()=>{
  const s=signer();
  const proof=await s.verify(scope());
  assert.equal(proof?.verifiedSignature,true);
  assert.equal(proof?.grantDigestSha256,sha("a"));
  assert.equal(proof?.verifierId,"independent_reviewer_001");
  assert.equal(proof?.revoked,false);
  assert.equal(proof?.checkedAt,new Date(now).toISOString());
  assert.equal(independentPrivateRightsVerifierStatus.licenceGranted,false);
  assert.equal(independentPrivateRightsVerifierStatus.productionConfigured,false);
});
test("forged signature and modified digest/revision/scope fail closed",async()=>{
  const s=signer();
  const changedClaim={...s.claim(),grantDigestSha256:sha("b")};
  const oldSignature=sign(null,canonicalIndependentRightsClaim(s.claim()),s.privateKey)
    .toString("base64");
  s.updateClaim(changedClaim);
  s.updateSignature(oldSignature);
  assert.equal(await s.verify({...scope(),grantDigestSha256:sha("b")}),null);
  assert.equal(await s.verify(scope()),null);
  const other=signer();
  assert.equal(await other.verify({...scope(),rightsRevision:"replay-other-revision"}),null);
});
test("revocation, stale/future status, expiry and signer self-review deny",async()=>{
  const variants=[
    {readCurrentRevocation:async()=>({revoked:true,
      rightsRevision:"reviewed-grant-001",checkedAt:new Date(now).toISOString()})},
    {readCurrentRevocation:async()=>({revoked:false,
      rightsRevision:"reviewed-grant-001",checkedAt:new Date(now-61_000).toISOString()})},
    {readCurrentRevocation:async()=>({revoked:false,
      rightsRevision:"reviewed-grant-001",checkedAt:new Date(now+1000).toISOString()})},
    {readCurrentRevocation:async()=>({revoked:false,
      rightsRevision:"other-revision",checkedAt:new Date(now).toISOString()})},
    {readCurrentRevocation:async()=>{throw new Error("revocation service unavailable")}}
  ];
  for(const override of variants){
    assert.equal(await signer(override).verify(scope()),null);
  }
  const expired=signer();expired.updateClaim({
    ...expired.claim(),validUntil:"2026-11-14T03:59:59Z"
  });
  assert.equal(await expired.verify(scope()),null);
  const samePerson=signer();samePerson.updateClaim({
    ...samePerson.claim(),approverId:"independent_reviewer_001"
  });
  assert.equal(await samePerson.verify(scope()),null);
});
test("invalid Ed25519 keyring and missing independent authority cannot configure",()=>{
  assert.throws(()=>createIndependentPrivateRightsVerifier({}),
    /independent rights authority/);
  const kp=generateKeyPairSync("ed25519");
  const privatePem=kp.privateKey.export({type:"pkcs8",format:"pem"});
  assert.throws(()=>createIndependentPrivateRightsVerifier({
    trustedPublicKeys:{"independent-ed25519-001":privatePem},
    loadSignedAttestation:async()=>null,
    readCurrentRevocation:async()=>null
  }),/public Ed25519/);
});
test("clock rollback, slow verifier and future-dated attestation refuse signature",async()=>{
  const c=signer({
    clock:(()=>{let n=0;return()=>now-(n++*1000)})()
  });
  assert.equal(await c.verify(scope()),null);
  const slow=signer({
    clock:(()=>{let n=0;return()=>now+(n++*70_000)})()
  });
  assert.equal(await slow.verify(scope()),null);
  const future=signer();future.updateClaim({
    ...future.claim(),signedAt:new Date(now+1000).toISOString()
  });
  assert.equal(await future.verify(scope()),null);
});
test("real signature proof can feed the Atlas rights reader without inventing a grant",async()=>{
  const g={
    workspace_id:"novapharm-internal-staging",
    source_id:"nhsbsa_english_prescribing",
    source_version:"epd-snomed-2026-08",
    resource_id:"partition-001",
    resource_sha256:sha("c"),
    rights_revision:"reviewed-grant-001",
    terms_sha256:sha("d"),
    terminology_rights_revision:"approved-terms-001",
    allowed_purposes:["private_observed_prescribing_ingestion"],
    status:"active",revoked:false,dataset_reuse_approved:true,
    commercial_analysis_approved:true,
    third_party_terminology_reuse_approved:true,
    valid_from:"2026-11-13T00:00:00Z",
    valid_until:"2026-11-15T00:00:00Z"
  };
  const fields=[
    "workspace_id","source_id","source_version","resource_id",
    "resource_sha256","rights_revision","terms_sha256",
    "terminology_rights_revision","allowed_purposes","status",
    "revoked","dataset_reuse_approved","commercial_analysis_approved",
    "third_party_terminology_reuse_approved","valid_from","valid_until"
  ];
  const digest=createHash("sha256")
    .update(JSON.stringify(fields.map(k=>[k,g[k]??null]))).digest("hex");
  const s=signer();
  const original=s.claim();
  s.updateClaim({...original,grantDigestSha256:digest});
  const key={
    workspace_id:1,source_id:1,source_version:1,
    resource_id:1,resource_sha256:1,rights_revision:1
  };
  const db={
    databaseName:"novapharm_intelligence_production",
    collection:name=>{
      assert.equal(name,"npi_source_rights");
      return {
        listIndexes:()=>({toArray:async()=>[{key,unique:true}]}),
        find:()=>({limit:()=>({toArray:async()=>[g]})})
      };
    }
  };
  const read=createAtlasPrivateMedicineRightsVerifier({
    database:db,verifySignedGrant:s.verify,clock:()=>now
  });
  const receipt=await read({
    workspaceId:g.workspace_id,principalId:"board_member_001",
    authorityRevision:"board-role-001",sourceId:g.source_id,
    sourceVersion:g.source_version,resourceId:g.resource_id,
    resourceSha256:g.resource_sha256,rightsRevision:g.rights_revision,
    purpose:"private_observed_prescribing_ingestion"
  });
  assert.equal(receipt?.verifiedByRightsAuthority,true);
  assert.equal(receipt?.termsSha256,sha("d"));
  assert.equal(receipt?.customerPublishApproved,undefined);
});
