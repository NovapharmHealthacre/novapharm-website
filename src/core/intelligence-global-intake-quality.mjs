/**
 * Strict source-page quality indicators for internal pharmaceutical data review.
 * Counts only the current bounded upstream response, NEVER national coverage.
 * A score, status or complete API response must not promote clinical claims.
 */
const MAX_RECORDS=20000;
const RE_SHA=/^[a-f0-9]{64}$/;
function reject(message){throw new Error("Source page quality rejected: "+message);}
function responseRows(sourceId,raw){
  if(sourceId==="ca-health-canada-dpd")return raw;
  if(sourceId==="us-fda-drugsfda")return raw?.results;
  if(sourceId==="global-clinicaltrials")return raw?.studies;
  if(sourceId==="global-europepmc")return raw?.resultList?.result;
  if(sourceId==="es-aemps-cima")return raw?.resultados;
  reject("unsupported source");
}
export function assessGlobalSourcePageQuality({sourceId,raw,normalized,manifest,limit}={}){
  const rows=responseRows(sourceId,raw);
  if(!Array.isArray(rows)||rows.length>MAX_RECORDS||
    !Number.isInteger(limit)||limit<1||limit>10||
    !normalized||normalized.sourceId!==sourceId||
    normalized.canPublish!==false||
    normalized.dataState!=="unreconciled_upstream_preview"||
    !Array.isArray(normalized.records)||
    !manifest||manifest.sourceKey!==sourceId||
    manifest.canPublish!==false||manifest.productionAccepted!==false||
    !RE_SHA.test(manifest.digestSha256||"")){
    reject("untrusted preview or manifest");
  }
  const sampleLimit=Math.min(rows.length,limit);
  const seen=new Set();
  const duplicates=new Set();
  for(const record of normalized.records){
    if(typeof record?.localId!=="string"||record.localId.length===0||
      typeof record.label!=="string"||record.label.length===0){
      reject("invalid normalized record");
    }
    if(seen.has(record.localId))duplicates.add(record.localId);
    seen.add(record.localId);
  }
  if(normalized.records.length>sampleLimit)reject("normalized count exceeds raw response page");
  const reasons=[];
  if(rows.length===0)reasons.push("NO_RECORDS_IN_RETURNED_PAGE");
  if(rows.length>limit)reasons.push("PAGE_TRUNCATED_BY_EVALUATION_LIMIT");
  if(normalized.records.length<sampleLimit)reasons.push("UNMAPPED_OR_INCOMPLETE_SOURCE_ROW");
  if(duplicates.size>0)reasons.push("DUPLICATE_SOURCE_LOCAL_IDENTIFIERS");
  return Object.freeze({
    contract:"novapharm.intelligence.source-page-quality.v1",
    sourceId,
    pageRowsReturned:rows.length,
    selectedRows:normalized.records.length,
    uniqueSourceIds:seen.size,
    localEvaluationLimit:limit,
    reviewReasons:Object.freeze(reasons),
    sourcePopulationCompleteness:"NOT_DEMONSTRATED",
    canonicalMedicineMappings:"UNRESOLVED",
    crossCountryComparable:false,
    downstreamCustomerPublicationAllowed:false,
    qualityDecision:"INDEPENDENT_REVIEW_REQUIRED"
  });
}
