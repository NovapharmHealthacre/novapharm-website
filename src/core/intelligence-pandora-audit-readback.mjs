/**
 * PANDORA verified private decision history readback (staging candidate).
 *
 * A case is not "auditable" merely because a write returned success.
 * This verifies every decision event from genesis against the stored case
 * head using the exact v1 event-field order and a majority snapshot read.
 * Hash chaining detects accidental or one-sided mutations; it is NOT a
 * substitute for independently immutable/WORM audit retention.
 */
import { createHash, randomUUID } from "node:crypto";
import { pandoraStagingCollections } from "./intelligence-pandora-transactional-ledger.mjs";
import { verifyPandoraStagingUniqueIndexes } from "../data/atlas-pandora-staging-indexes.mjs";

const caseIdPattern=/^case-[a-f0-9]{32}$/u;
const tenantPattern=/^[a-z0-9][a-z0-9-]{2,63}$/u;
const principalPattern=/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const shaPattern=/^[a-f0-9]{64}$/u;
const iso=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u;
const eventKeys=[
  "contract","event_id","case_id","tenant_id","medicine_id","version",
  "previous_status","status","action","reason_code","actor_id",
  "actor_authority_revision","evidence_snapshot_sha256","rights_revision",
  "previous_event_sha256","recorded_at"
];
const transitions=Object.freeze({
  submit:["draft","under_review"],
  review:["under_review","approval_pending"],
  approve:["approval_pending","approved"],
  reject:["under_review|approval_pending","rejected"],
  withdraw:["draft|under_review","withdrawn"],
  revoke:["approved","revoked"]
});
const roles=new Set(["analyst","independent_reviewer","independent_approver","security_admin"]);
const deny=code=>Object.assign(new Error("PANDORA decision history unavailable."),{code,statusCode:403});
const hash=event=>createHash("sha256").update(JSON.stringify(event)).digest("hex");
function canonicalEvent(row) {
  const picked=Object.fromEntries(eventKeys.map(key=>[key,row[key]]));
  if(Object.values(picked).includes(undefined))throw deny("malformed_audit_event");
  if(picked.contract!=="novapharm.pandora.decision-audit.v1" ||
      typeof picked.event_id!=="string" || !/^[0-9a-f-]{36}$/u.test(picked.event_id) ||
      !shaPattern.test(picked.evidence_snapshot_sha256) ||
      (picked.previous_event_sha256!==null && !shaPattern.test(picked.previous_event_sha256)) ||
      (picked.rights_revision!==null && !principalPattern.test(picked.rights_revision)) ||
      !iso.test(picked.recorded_at))throw deny("malformed_audit_event");
  return picked;
}
function validTimestamp(value) {
  return typeof value==="string" && iso.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString()===value;
}

/**
 * recordReadAudit MUST commit an internal access event in the SAME MongoDB
 * transaction and revalidate session rights; no unsigned callback as evidence
 * of production audit compliance. Never expose directly over a public route.
 */
export async function readPandoraDecisionHistory({
  client,db,request,actor,environment=process.env,
  recordReadAudit,now=new Date().toISOString()
}={}){
  if(environment.ATLAS_ENVIRONMENT!=="staging" ||
     environment.PANDORA_STAGING_HISTORY_READ_ENABLED!=="true" ||
     environment.PANDORA_STAGING_DECISION_AUDIT_ENABLED!=="true" ||
     environment.PANDORA_ALLOW_PUBLIC_ACCESS==="true" ||
     environment.PANDORA_OWNER_FINAL_APPROVAL_REQUIRED!=="true" ||
     !principalPattern.test(environment.PANDORA_FINAL_APPROVER_SUBJECT_ID??"") ||
     db?.databaseName!=="novapharm_staging" ||
     typeof client?.startSession!=="function" ||
     typeof db?.collection!=="function" ||
     typeof recordReadAudit!=="function")throw deny("history_disabled");
  if(!caseIdPattern.test(request?.caseId??"") ||
     !tenantPattern.test(request?.tenantId??"") ||
     !actor?.verifiedServerSide || actor.mfaVerified!==true ||
     actor.tenantId!==request.tenantId ||
     !principalPattern.test(actor.subjectId??"") ||
     !principalPattern.test(actor.authorityRevision??"") ||
     !validTimestamp(now))throw deny("invalid_history_request");
  await verifyPandoraStagingUniqueIndexes({db,environment});
  const cases=db.collection(pandoraStagingCollections.cases);
  const events=db.collection(pandoraStagingCollections.events);
  const authorities=db.collection(pandoraStagingCollections.authorities);
  if(typeof cases.findOne!=="function" ||
     typeof events.find!=="function" ||
     typeof authorities.findOne!=="function" ||
     typeof authorities.updateOne!=="function")throw deny("history_store_unavailable");
  const session=client.startSession();
  if(typeof session?.withTransaction!=="function" || typeof session?.endSession!=="function")
    throw deny("history_transaction_unavailable");
  try{
    const outcome=await session.withTransaction(async()=>{
      const authority=await authorities.findOne({
        tenant_id:request.tenantId,subject_id:actor.subjectId
      },{session});
      if(!authority || authority.verified!==true || authority.mfa_verified!==true ||
         authority.revoked_at!=null || authority.authority_revision!==actor.authorityRevision ||
         !roles.has(authority.role) ||
         !validTimestamp(authority.session_expires_at) ||
         Date.parse(authority.session_expires_at)<=Date.parse(now))
        throw deny("history_authority_unavailable");
      const guard=await authorities.updateOne({
        tenant_id:request.tenantId,subject_id:actor.subjectId,
        authority_revision:actor.authorityRevision,
        verified:true,mfa_verified:true,revoked_at:null,
        session_expires_at:{$gt:now}
      },{$inc:{decision_commit_fence:1}},{session});
      if(guard?.matchedCount!==1 || guard?.modifiedCount!==1)
        throw deny("history_authority_changed");
      const current=await cases.findOne({
        tenant_id:request.tenantId,case_id:request.caseId
      },{session});
      if(!current || current.tenant_id!==request.tenantId ||
         current.case_id!==request.caseId ||
         !Number.isSafeInteger(current.version) ||
         current.version<1 || current.version>501 ||
         !principalPattern.test(current.medicine_id??"") ||
         !shaPattern.test(current.evidence_snapshot_sha256??""))
        throw deny("history_case_unavailable");

      const cursor=events.find({
        tenant_id:request.tenantId,case_id:request.caseId
      },{session});
      if(typeof cursor?.sort!=="function")throw deny("history_store_unavailable");
      const values=await cursor.sort({version:1}).limit(501).toArray();
      if(!Array.isArray(values) || values.length!==current.version-1)
        throw deny("history_gap_or_overflow");
      let last=null, priorStatus="draft", lastTime=0;
      const history=[];
      for(let i=0;i<values.length;i++){
        const item=values[i];
        const event=canonicalEvent(item);
        if(event.tenant_id!==request.tenantId ||
           event.case_id!==request.caseId ||
           event.medicine_id!==current.medicine_id ||
           event.evidence_snapshot_sha256!==current.evidence_snapshot_sha256 ||
           event.version!==i+2 ||
           event.previous_event_sha256!==last ||
           event.previous_status!==priorStatus ||
           !Object.hasOwn(transitions,event.action))
          throw deny("history_lineage_invalid");
        const [from,to]=transitions[event.action];
        if(!from.split("|").includes(event.previous_status) || event.status!==to)
          throw deny("history_transition_invalid");
        const occurred=Date.parse(event.recorded_at);
        if(!Number.isFinite(occurred) || occurred<lastTime || occurred>Date.parse(now))
          throw deny("history_clock_invalid");
        const calculated=hash(event);
        if(!shaPattern.test(item.event_sha256??"") || item.event_sha256!==calculated)
          throw deny("history_tampered");
        last=calculated;priorStatus=event.status;lastTime=occurred;
        history.push(Object.freeze({
          eventId:event.event_id,version:event.version,action:event.action,
          status:event.status,actorId:event.actor_id,
          reasonCode:event.reason_code,at:event.recorded_at,
          auditSha256:calculated
        }));
      }
      if(current.status!==priorStatus ||
         (current.audit_head_sha256??null)!==last)
        throw deny("history_head_mismatch");
      const readEventId=randomUUID();
      const audit=await recordReadAudit({
        session,eventId:readEventId,tenantId:request.tenantId,
        caseId:request.caseId,subjectId:actor.subjectId,
        authorityRevision:actor.authorityRevision,
        caseVersion:current.version,headSha256:last,at:now
      });
      if(audit?.committed!==true || audit.eventId!==readEventId)
        throw deny("history_read_audit_unavailable");
      return Object.freeze({
        verified:true,status:"staging_verified_history",
        caseId:request.caseId,tenantId:request.tenantId,
        version:current.version,decisionStatus:current.status,
        auditHeadSha256:last,
        events:Object.freeze(history),
        externalActionAllowed:false,customerAccessGranted:false
      });
    },{readConcern:{level:"snapshot"},writeConcern:{w:"majority",j:true},readPreference:"primary"});
    if(outcome?.verified!==true)throw deny("history_transaction_not_committed");
    return outcome;
  }finally{
    await session.endSession();
  }
}
