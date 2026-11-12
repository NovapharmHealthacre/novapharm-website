/**
 * PANDORA's required unique-key schema. Private Atlas staging only.
 *
 * Do not treat a non-unique lookup index as an authority/decision safety guard.
 * This adapter never opens a connection or creates an access grant.
 */
export const pandoraUniqueIndexes = Object.freeze([
  {collection:"nova_decision_cases_staging",name:"uq_pandora_tenant_case",keys:{tenant_id:1,case_id:1}},
  {collection:"nova_decision_manifests_staging",name:"uq_pandora_tenant_case_snapshot_rights",keys:{
    tenant_id:1,case_id:1,snapshot_sha256:1,rights_revision:1
  }},
  {collection:"nova_decision_authorities_staging",name:"uq_pandora_tenant_actor",keys:{tenant_id:1,subject_id:1}},
  {collection:"nova_decision_rights_staging",name:"uq_pandora_tenant_source_version",keys:{
    tenant_id:1,source_id:1,source_version:1
  }},
  {collection:"nova_decision_events_staging",name:"uq_pandora_tenant_case_version",keys:{
    tenant_id:1,case_id:1,version:1
  }},
  {collection:"nova_decision_events_staging",name:"uq_pandora_event_id",keys:{event_id:1}}
]);
const fail = reason => Object.assign(new Error("PANDORA storage indexes not accepted."), {code:reason,statusCode:503});
function requirePrivateEnvironment(environment){
  if (environment?.ATLAS_ENVIRONMENT !== "staging" ||
      environment?.PANDORA_ALLOW_PUBLIC_ACCESS === "true") throw fail("index_scope_denied");
}
function validIndex(index,spec){
  return index && index.name === spec.name && index.unique === true &&
    JSON.stringify(index.key) === JSON.stringify(spec.keys) &&
    index.sparse !== true && index.partialFilterExpression == null;
}
/** Block all case commits if ANY of these compound indexes is absent or non-unique. */
export async function verifyPandoraStagingUniqueIndexes({db,environment=process.env}={}){
  requirePrivateEnvironment(environment);
  if(typeof db?.collection!=="function" || db.databaseName!=="novapharm_staging") throw fail("index_store_unavailable");
  const byCollection=new Map();
  for(const spec of pandoraUniqueIndexes){
    if(!byCollection.has(spec.collection)){
      const collection=db.collection(spec.collection);
      if(typeof collection?.listIndexes!=="function") throw fail("index_reader_unavailable");
      const cursor=collection.listIndexes();
      if(typeof cursor?.toArray!=="function") throw fail("index_reader_unavailable");
      const list=await cursor.toArray();
      if(!Array.isArray(list)) throw fail("index_reader_unavailable");
      byCollection.set(spec.collection,list);
    }
    if(!byCollection.get(spec.collection).some(index=>validIndex(index,spec))) throw fail("missing_unique_index");
  }
  return true;
}
/** Provision empty, private staging collections only in approved maintenance execution. */
export async function provisionPandoraStagingUniqueIndexes({db,environment=process.env}={}){
  requirePrivateEnvironment(environment);
  if(environment.PANDORA_STAGING_INDEX_PROVISION_ENABLED!=="true") throw fail("index_provision_disabled");
  if(typeof db?.collection!=="function" || db.databaseName!=="novapharm_staging") throw fail("index_store_unavailable");
  for(const spec of pandoraUniqueIndexes){
    const collection=db.collection(spec.collection);
    if(typeof collection?.createIndex!=="function") throw fail("index_writer_unavailable");
    const created=await collection.createIndex(spec.keys,{name:spec.name,unique:true});
    if(created!==spec.name) throw fail("index_not_created");
  }
  await verifyPandoraStagingUniqueIndexes({db,environment});
  return Object.freeze({verified:true,uniqueIndexCount:pandoraUniqueIndexes.length});
}
