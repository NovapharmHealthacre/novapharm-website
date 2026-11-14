import assert from "node:assert/strict";
import test from "node:test";
import {
 probeEnterpriseVendor,supportedEnterpriseVendorProbes
} from "../src/core/intelligence-enterprise-vendor-probes.mjs";

const authority={
 verified:true,principalId:"director_001",workspaceId:"novapharm_internal",
 authorityRevision:"revision_001",accessScopes:["admin"]
};
const deny={code:"enterprise_vendor_probe_denied",statusCode:403};
const origins={
 palantir_foundry:"https://novapharm.palantirfoundry.com",
 palo_alto_prisma:"https://api.eu.prismacloud.io"
};
function setup(vendor="palantir_foundry",overrides={}){
 const events=[];
 const inputs={
  vendor,authority,origin:origins[vendor],
  clock:()=>Date.parse("2026-11-13T12:00:00Z"),
  verifyCurrentAuthority:async()=>{events.push({step:"authority"});return true;},
  verifyEntitlement:async()=>{events.push({step:"entitlement"});return true;},
  recordAudit:async record=>{
   events.push({step:"audit",record});
   return {committed:true,eventId:record.eventId};
  },
  resolveCredentials:async()=>{
   events.push({step:"credentials"});
   return vendor==="palantir_foundry"?
    {clientId:"foundry_client_001",clientSecret:"secret-token-safe-001",oauthScope:"api:use-ontologies-read"}:
    {accessKeyId:"prisma_user_001",secretKey:"secret-token-safe-001"};
  },
  httpRequest:async request=>{
   events.push({step:"http",request});
   if(request.method==="POST")return {
    status:200,json:vendor==="palantir_foundry"?
     {access_token:"ephemeral-foundry-token-001"}:
     {token:"ephemeral-prisma-token-001"}
   };
   return {status:200,json:vendor==="palantir_foundry"?
    {data:[{apiName:"medicine-ontology"}]}:
    [{cloudType:"AWS",name:"approved-cloud"}]};
  },
  ...overrides
 };
 return {inputs,events};
}

test("Palantir Foundry probe sends read-only OAuth scope and ontology-list request",async()=>{
 const {inputs,events}=setup();
 const reply=await probeEnterpriseVendor(inputs);
 assert.equal(reply.vendor,"palantir_foundry");
 assert.equal(reply.providerConnectivityObserved,true);
 assert.equal(reply.productionCertified,false);
 assert.equal(reply.customerReleaseApproved,false);
 assert.equal(reply.dataLicenceForReuseVerified,false);
 assert.equal(reply.resourceCount,1);
 assert.equal(JSON.stringify(reply).includes("secret-token-safe-001"),false);
 assert.equal(JSON.stringify(reply).includes("ephemeral-foundry-token-001"),false);
 const http=events.filter(x=>x.step==="http").map(x=>x.request);
 assert.equal(http.length,2);
 assert.equal(http[0].method,"POST");
 assert.equal(http[0].url,"https://novapharm.palantirfoundry.com/multipass/api/oauth2/token");
 assert.equal(new URLSearchParams(http[0].body).get("scope"),"api:use-ontologies-read");
 assert.equal(new URLSearchParams(http[0].body).get("grant_type"),"client_credentials");
 assert.equal(http[1].method,"GET");
 assert.equal(http[1].url,"https://novapharm.palantirfoundry.com/api/v2/ontologies");
 assert.equal(http[1].headers.authorization,"Bearer ephemeral-foundry-token-001");
 assert.ok(http.every(r=>r.redirect==="error" && r.maxBytes===32768 && r.timeoutMs===5000));
 const audits=events.filter(x=>x.step==="audit").map(x=>x.record);
 assert.equal(audits.length,2);
 assert.equal(audits[0].action,"vendor.inventory_probe.preflight");
 assert.equal(audits[1].action,"vendor.inventory_probe.completed");
 assert.notEqual(audits[0].eventId,audits[1].eventId);
 assert.equal(audits[1].preflightEventId,audits[0].eventId);
 assert.equal(audits[1].resourceCount,1);
 assert.ok(events.findIndex(x=>x.step==="credentials") > events.findIndex(x=>x.step==="audit"));
});

test("Prisma Cloud probe logs in and reads cloud inventory only",async()=>{
 const {inputs,events}=setup("palo_alto_prisma");
 const result=await probeEnterpriseVendor(inputs);
 assert.equal(result.vendor,"palo_alto_prisma");
 assert.equal(result.resourceCount,1);
 assert.equal(result.productionCertified,false);
 const http=events.filter(x=>x.step==="http").map(x=>x.request);
 assert.deepEqual(http.map(x=>x.method),["POST","GET"]);
 assert.deepEqual(http.map(x=>x.url),
  ["https://api.eu.prismacloud.io/login","https://api.eu.prismacloud.io/cloud"]);
 assert.equal(JSON.parse(http[0].body).username,"prisma_user_001");
 assert.equal(http[1].headers["x-redlock-auth"],"ephemeral-prisma-token-001");
 assert.equal(JSON.stringify(result).includes("approved-cloud"),false);
});

test("Bloomberg is withheld until licensed account-specific delivery is configured",async()=>{
 let called=0;
 const result=probeEnterpriseVendor({
  vendor:"bloomberg_data_license",authority,origin:"https://data.bloomberg.com",
  httpRequest:async()=>{called++;throw Error("not called");},
  verifyEntitlement:async()=>{called++;return true;},
  verifyCurrentAuthority:async()=>true,
  resolveCredentials:async()=>({}),recordAudit:async()=>true
 });
 await assert.rejects(result,deny);
 assert.equal(called,0);
 assert.deepEqual(supportedEnterpriseVendorProbes,
  ["palantir_foundry","palo_alto_prisma","bloomberg_data_license"]);
});

test("invalid or unsafe origins, principal and scopes never cause HTTP calls",async()=>{
 for(const origin of [
  "http://novapharm.palantirfoundry.com",
  "https://novapharm.palantirfoundry.com.evil.org",
  "https://localhost",
  "https://admin:secret@novapharm.palantirfoundry.com",
  "https://novapharm.palantirfoundry.com/private",
  "https://novapharm.palantirfoundry.com:8443/",
  "https://novapharm.palantirfoundry.com/?access=all"
 ]){
  const {inputs,events}=setup("palantir_foundry",{origin});
  await assert.rejects(probeEnterpriseVendor(inputs),deny);
  assert.equal(events.length,0);
 }
 for(const origin of [
  "https://api.eu.prismacloud.io.attacker.net",
  "https://api.prismacloud.cn","https://prismacloud.io"
 ]){
  const {inputs,events}=setup("palo_alto_prisma",{origin});
  await assert.rejects(probeEnterpriseVendor(inputs),deny);
  assert.equal(events.length,0);
 }
 for(const bad of [
  {...authority,verified:false},{...authority,workspaceId:"bad/tenant"},
  {...authority,accessScopes:["customer"]},{...authority,principalId:{$ne:""}}
 ]){
  const {inputs,events}=setup("palantir_foundry",{authority:bad});
  await assert.rejects(probeEnterpriseVendor(inputs),deny);
  assert.equal(events.length,0);
 }
});

test("revoked authority, unapproved licence or missing audit denies before credentials",async()=>{
 for(const overrides of [
  {verifyCurrentAuthority:async()=>false},
  {verifyEntitlement:async()=>false},
  {recordAudit:async()=>({committed:false})},
  {recordAudit:async()=>({committed:true,eventId:"wrong"})}
 ]){
  const {inputs,events}=setup("palantir_foundry",overrides);
  await assert.rejects(probeEnterpriseVendor(inputs),deny);
  assert.ok(!events.some(x=>x.step==="credentials"||x.step==="http"));
 }
});

test("missing credentials, failed authentication and unavailable inventory fail closed",async()=>{
 for(const overrides of [
  {resolveCredentials:async()=>null},
  {resolveCredentials:async()=>({clientId:"client_001",clientSecret:""})},
  {httpRequest:async()=>({status:401,json:{message:"not authorized"}})},
  {httpRequest:async()=>({status:200,json:{access_token:"x"}})},
  {httpRequest:async r=>r.method==="POST"?
   {status:200,json:{access_token:"ephemeral-foundry-token-001"}}:
   {status:403,json:{data:[]}}},
  {httpRequest:async r=>r.method==="POST"?
   {status:200,json:{access_token:"ephemeral-foundry-token-001"}}:
   {status:200,json:{data:{}}}}
 ]){
  const {inputs}=setup("palantir_foundry",overrides);
  await assert.rejects(probeEnterpriseVendor(inputs),deny);
 }
});

test("late source entitlement revocation prevents inventory data release",async()=>{
 for(const rejectAt of [2,3,4,5,6]){
  let checks=0;
  const {inputs}=setup("palantir_foundry",{
   verifyEntitlement:async()=>++checks!==rejectAt
  });
  await assert.rejects(probeEnterpriseVendor(inputs),deny);
 }
});

test("audit completion refusal, oversized inventory and network errors are denied without leaking secrets",async()=>{
 const requests=[
  {recordAudit:async r=>r.action==="vendor.inventory_probe.preflight"?
    {committed:true,eventId:r.eventId}:{committed:false}},
  {httpRequest:async r=>r.method==="POST"?
    {status:200,json:{access_token:"ephemeral-foundry-token-001"}}:
    {status:200,json:{data:Array(501).fill({})}}},
  {httpRequest:async()=>{throw Error("secret-token-safe-001 must not leak");}}
 ];
 for(const overrides of requests){
  const {inputs}=setup("palantir_foundry",overrides);
  await assert.rejects(probeEnterpriseVendor(inputs),deny);
  try {await probeEnterpriseVendor(inputs);}
  catch(e){
   assert.equal(e.message,"Enterprise vendor probe was denied.");
   assert.equal(e.message.includes("secret-token-safe-001"),false);
  }
 }
});

test("provider credential and authority callback errors never leak sensitive messages",async()=>{
 for(const overrides of [
  {resolveCredentials:async()=>{throw Error("secret-token-safe-001 leak");}},
  {verifyEntitlement:async()=>{throw Error("secret-token-safe-001 leak");}},
  {verifyCurrentAuthority:async()=>{throw Error("secret-token-safe-001 leak");}},
  {recordAudit:async()=>{throw Error("secret-token-safe-001 leak");}}
 ]){
  const {inputs}=setup("palantir_foundry",overrides);
  try{await probeEnterpriseVendor(inputs);assert.fail("Expected vendor probe denial");}
  catch(err){
   assert.equal(err.code,"enterprise_vendor_probe_denied");
   assert.equal(err.message,"Enterprise vendor probe was denied.");
   assert.equal(err.message.includes("secret-token-safe-001"),false);
  }
 }
});

test("Foundry restricted and legacy scopes must be explicitly approved by credential authority",async()=>{
 const {inputs:restricted}=setup("palantir_foundry");
 const candidate=await probeEnterpriseVendor(restricted);
 assert.equal(candidate.providerConnectivityObserved,true);
 const {inputs:legacy,events}=setup("palantir_foundry",{
  resolveCredentials:async()=>({
   clientId:"foundry_client_001",clientSecret:"secret-token-safe-001",
   oauthScope:"api:ontologies-read"
  })
 });
 await probeEnterpriseVendor(legacy);
 const tokenCall=events.filter(x=>x.step==="http")[0].request;
 assert.equal(new URLSearchParams(tokenCall.body).get("scope"),"api:ontologies-read");
 for(const oauthScope of ["api:ontologies-write","api:use-ontologies-write",
   "api:ontologies-read api:ontologies-write","",undefined]){
  let http=0;
  const {inputs}=setup("palantir_foundry",{
   resolveCredentials:async()=>({
    clientId:"foundry_client_001",clientSecret:"secret-token-safe-001",oauthScope
   }),
   httpRequest:async()=>{http++;return {status:200,json:{}};}
  });
  await assert.rejects(probeEnterpriseVendor(inputs),deny);
  assert.equal(http,0);
 }
});
