/**
 * Strict, read-only MongoDB Atlas collection adapter for the enterprise gateway.
 * Server-side dependency injection only. No network connection, credentials,
 * model invocation, rights self-attestation or customer/public route.
 *
 * Collections are trusted handles established by a separately approved private
 * service identity. This adapter has no authority to create or approve records.
 */
const CAPABILITIES = new Set(["foundry_ops","cloud_security","pharma_markets","nova_research"]);
const WORKSPACE = /^[a-z0-9][a-z0-9_-]{2,63}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/u;
const PURPOSE = "enterprise_internal_research";
const RECORD_KEYS = [
  "recordId","workspaceId","capability","sourceId","sourceVersion",
  "evidenceSha256","payloadSha256","state","isSynthetic",
  "observedAt","recordedAt","payload"
];
const RIGHTS_KEYS = [
  "workspaceId","sourceId","sourceVersion","status","revokedAt",
  "verifiedByRightsAuthority","rightsRevision","decisionSha256",
  "allowedPurposes","allowedCapabilities","validFrom","validUntil"
];
const projection = fields => Object.fromEntries([["_id",0],...fields.map(f=>[f,1])]);
const RECORD_PROJECTION = Object.freeze(projection(RECORD_KEYS));
const RIGHTS_PROJECTION = Object.freeze(projection(RIGHTS_KEYS));
const deny = () => Object.assign(new Error("Enterprise Atlas read adapter denied."),{
  code:"enterprise_atlas_read_denied",statusCode:403
});
const validId = value => typeof value==="string" && ID.test(value);
const date = value => {
  if(typeof value!=="string" || !ISO.test(value))return false;
  const t=Date.parse(value);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0,19)===value.slice(0,19);
};
function queryCursor(collection, filter, options, limit) {
  if(!collection || typeof collection.find!=="function")throw deny();
  const cursor=collection.find(filter,options);
  if(!cursor || typeof cursor.limit!=="function")throw deny();
  const limited=cursor.limit(limit);
  if(!limited || typeof limited.toArray!=="function")throw deny();
  return limited;
}
/**
 * Projection-only adapter. Query selectors are assembled exclusively from
 * already validated server-scoped scalar fields. Never spread input into a
 * Mongo filter or return an unrestricted source document.
 */
export function createEnterpriseAtlasReadAdapters({ recordsCollection, rightsCollection }={}) {
  if(!recordsCollection || typeof recordsCollection.find!=="function" ||
     !rightsCollection || typeof rightsCollection.find!=="function")throw deny();

  async function loadRecords({workspaceId,capability,asOf,limit,purpose}={}) {
    if(typeof workspaceId!=="string" || !WORKSPACE.test(workspaceId) ||
       !CAPABILITIES.has(capability) || !date(asOf) || purpose!==PURPOSE ||
       !Number.isInteger(limit) || limit<1 || limit>20)throw deny();

    const cursor=queryCursor(recordsCollection,{
      workspaceId,capability,state:"accepted",isSynthetic:false,
      observedAt:{$lte:asOf},recordedAt:{$lte:asOf}
    },{projection:RECORD_PROJECTION,maxTimeMS:3000},limit+1);
    const rows=await cursor.toArray();
    // No silently truncated reads: >limit should be a hard failure requiring
    // a separately designed stable, authorised pagination contract.
    if(!Array.isArray(rows) || rows.length>limit)throw deny();
    for(const row of rows){
      if(!row || typeof row!=="object" || Array.isArray(row) ||
         row.workspaceId!==workspaceId || row.capability!==capability ||
         row.state!=="accepted" || row.isSynthetic!==false ||
         !date(row.observedAt) || !date(row.recordedAt) ||
         Date.parse(row.observedAt)>Date.parse(asOf) ||
         Date.parse(row.recordedAt)>Date.parse(asOf) ||
         Object.keys(row).some(key=>!RECORD_KEYS.includes(key)))throw deny();
    }
    return rows;
  }
  async function resolveSourceGrant({workspaceId,sourceId,sourceVersion,capability,purpose}={}) {
    if(typeof workspaceId!=="string" || !WORKSPACE.test(workspaceId) ||
      !validId(sourceId) || !validId(sourceVersion) ||
      !CAPABILITIES.has(capability) || purpose!==PURPOSE)throw deny();
    const cursor=queryCursor(rightsCollection,{
      workspaceId,sourceId,sourceVersion
    },{projection:RIGHTS_PROJECTION,maxTimeMS:3000},2);
    const rows=await cursor.toArray();
    if(!Array.isArray(rows) || rows.length>1)throw deny();
    const grant=rows[0]??null;
    if(grant!==null && (!grant || typeof grant!=="object" || Array.isArray(grant) ||
       Object.keys(grant).some(key=>!RIGHTS_KEYS.includes(key)) ||
       grant.workspaceId!==workspaceId || grant.sourceId!==sourceId ||
       grant.sourceVersion!==sourceVersion))throw deny();
    // Only the parent gateway can decide validity and freshness of the grant;
    // no inferred approval from an official source registry document.
    return grant;
  }
  return Object.freeze({loadRecords,resolveSourceGrant});
}
