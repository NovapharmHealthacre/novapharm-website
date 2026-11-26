import { createHash } from "node:crypto";
import manifest from "../../../config/intelligence/us-fda-governance-source-manifest.json" with { type: "json" };

const byKind = new Map(manifest.sourceTypes.map(source=>[source.kind,source]));
function deny(reason){return Object.freeze({accepted:false,reason});}
export function validateFdaGovernanceManifest(value=manifest) {
  const kinds=["labels","approvals","ndc","adverse-events","recalls"];
  if (value?.manifestVersion!==manifest.manifestVersion || value?.jurisdiction!=="US" ||
      value?.policy!=="quarantined_research_only" || value?.admissionPermitted!==false ||
      !Array.isArray(value.sourceTypes)||value.sourceTypes.length!==5 ||
      new Set(value.sourceTypes.map(x=>x.kind)).size!==5) return false;
  for(const kind of kinds){
    const original=byKind.get(kind),source=value.sourceTypes.find(x=>x.kind===kind);
    if(!source || source.endpoint!==original.endpoint || source.sourceId!==original.sourceId ||
      source.rightsStatus!=="pre_screen_only"||source.thirdPartyExceptionReview!=="pending"||
      source.acceptForCommercialUse!==false||source.rawPatientDataAllowed!==false) return false;
  }
  return true;
}
function idPart(value,max=128){
  if(typeof value!=="string")return null;
  const cleaned=value.normalize("NFKC").trim();
  return cleaned.length>0&&cleaned.length<=max&&!/[\p{Cc}\p{Cf}\p{Cs}]/u.test(cleaned) ? cleaned : null;
}
export function fdaSourceIdentity(kind, record, asOf){
  const source=byKind.get(kind);
  if(!source || !/^\d{4}-\d{2}-\d{2}$/u.test(asOf||""))return null;
  let id;
  if(kind==="labels") id = idPart(record?.setId) && idPart(record?.effectiveDate,16)
    ? idPart(record.setId)+"@"+idPart(record.effectiveDate,16):null;
  else if(kind==="approvals")id=idPart(record?.applicationNumber,40);
  else if(kind==="ndc")id=idPart(record?.productNdc,40);
  else if(kind==="recalls")id=idPart(record?.recallNumber,60);
  else id = idPart(record?.query,80) && idPart(record?.retrievedAt,40)
      ? idPart(record.query,80)+"@"+idPart(record.retrievedAt,40):null;
  if(!id)return null;
  // Different observations/versions cannot be confused with universal medicine IDs.
  const digest=createHash("sha256").update(["US",source.sourceId,id,asOf].join("|")).digest("hex");
  return Object.freeze({
    compositeKey:"us-source-observation:"+digest,
    country:"US",sourceId:source.sourceId,sourceRecordId:id,observationDate:asOf,
    globalMedicineIdentity:null
  });
}
export function dedupeFdaSourceObservations(observations){
  if(!Array.isArray(observations))throw Error("Expected source observations");
  const seen=new Set(),unique=[];
  for(const obs of observations){
    if(!obs || typeof obs.compositeKey!=="string" || !/^us-source-observation:[a-f0-9]{64}$/u.test(obs.compositeKey))
      throw Error("Missing valid FDA provenance identity");
    if(seen.has(obs.compositeKey))continue;
    seen.add(obs.compositeKey);unique.push(obs);
  }
  return Object.freeze(unique);
}
/**
 * No DB mutation. Grants are separate, immutable and scope-specific.
 * This returns an admission DECISION, not a publish operation.
 */
export function reviewFdaSourceAdmission({
  kind, record, asOf, rightsGrant, independentRegulatoryApproval,
  independentSecurityAcceptance, ownerReleaseSignoff, sourceManifest=manifest
}={}){
  if(!validateFdaGovernanceManifest(sourceManifest))return deny("invalid_governance_manifest");
  const identity=fdaSourceIdentity(kind,record,asOf);
  if(!identity)return deny("unresolved_source_identity");
  if(kind==="adverse-events")return deny("faers_count_only_not_individual_facts");
  const source=byKind.get(kind);
  if(source.acceptForCommercialUse!==true||source.rightsStatus!=="approved")
    return deny("publisher_rights_not_approved");
  if(!rightsGrant || rightsGrant.sourceId!==identity.sourceId || rightsGrant.status!=="approved" ||
    !rightsGrant.commercialUseAllowed || rightsGrant.thirdPartyExceptionsApproved!==true ||
    !rightsGrant.reviewedBy || !rightsGrant.reviewedAt) return deny("individual_source_rights_grant_missing");
  if(independentRegulatoryApproval!==true||independentSecurityAcceptance!==true||ownerReleaseSignoff!==true)
    return deny("independent_release_acceptance_missing");
  return Object.freeze({accepted:true,identity});
}
