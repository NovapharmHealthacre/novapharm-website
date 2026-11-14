import assert from "node:assert/strict";
import test from "node:test";
import {createStrictEnterpriseVendorTransport}
 from "../src/core/intelligence-enterprise-vendor-http.mjs";
import {probeEnterpriseVendor}
 from "../src/core/intelligence-enterprise-vendor-probes.mjs";

const palantir="https://novapharm.palantirfoundry.com";
const prisma="https://api.eu.prismacloud.io";
const deny={code:"enterprise_vendor_transport_denied",statusCode:403};
const json=(value,init={})=>new Response(JSON.stringify(value),{
 status:200,headers:{"content-type":"application/json; charset=utf-8"},...init
});
const request=(url,method,headers={},body)=>{
 return {url,method,headers,...(body===undefined?{}:{body}),
  redirect:"error",timeoutMs:3000,maxBytes:32768};
};
const foundryGet=request(palantir+"/api/v2/ontologies","GET",{
 authorization:"Bearer ephemeral-token-00001",accept:"application/json"
});
const foundryPost=request(palantir+"/multipass/api/oauth2/token","POST",{
 "content-type":"application/x-www-form-urlencoded"
},"grant_type=client_credentials&client_id=client_001&client_secret=fake-token-0001&scope=api%3Aontologies-read");
const prismaGet=request(prisma+"/cloud","GET",{
 "x-redlock-auth":"ephemeral-prisma-token-00001",accept:"application/json"
});
const prismaPost=request(prisma+"/login","POST",{
 "content-type":"application/json"
},JSON.stringify({username:"key_001",password:"secret_00001"}));

test("strict HTTP transport accepts only official read-only inventory endpoints",async()=>{
 const calls=[];
 const http=createStrictEnterpriseVendorTransport({fetchImpl:async(url,opts)=>{
  calls.push({url,opts});
  return json(url.endsWith("/api/v2/ontologies")?{data:[]}:
   url.endsWith("/cloud")?[]:{token:"ephemeral-prisma-token-00001"});
 }});
 for(const req of [foundryGet,foundryPost,prismaGet,prismaPost]){
  assert.equal((await http(req)).status,200);
 }
 assert.equal(calls.length,4);
 for(const {opts} of calls){
  assert.equal(opts.redirect,"error");
  assert.equal(opts.credentials,"omit");
  assert.equal(opts.cache,"no-store");
  assert.ok(opts.signal instanceof AbortSignal);
 }
 assert.deepEqual(calls.map(x=>x.opts.method),["GET","POST","GET","POST"]);
});

test("rejects SSRF, unknown endpoints, wrong HTTP methods and redirects before network",async()=>{
 let requests=0;
 const http=createStrictEnterpriseVendorTransport({fetchImpl:async()=>{
  requests++;return json({});
 }});
 const invalid=[
  {...foundryGet,url:"http://novapharm.palantirfoundry.com/api/v2/ontologies"},
  {...foundryGet,url:"https://localhost/api/v2/ontologies"},
  {...foundryGet,url:"https://novapharm.palantirfoundry.com.attacker.org/api/v2/ontologies"},
  {...foundryGet,url:"https://user:secret@novapharm.palantirfoundry.com/api/v2/ontologies"},
  {...foundryGet,url:palantir+"/api/v2/ontologies?search=secret"},
  {...foundryGet,url:palantir+"/api/v2/ontologies%2f..%2fadmin"},
  {...foundryGet,url:palantir+"/api/v2/ontologies/writes"},
  {...foundryGet,method:"DELETE"},
  {...foundryGet,method:"POST",body:"x"},
  {...foundryPost,method:"GET"},
  {...prismaGet,url:"https://api.eu.prismacloud.io.attacker.org/cloud"},
  {...prismaGet,url:prisma+"/cloud/delete"},
  {...prismaGet,url:prisma+"/login"},
  {...foundryGet,redirect:"follow"},
  {...foundryGet,maxBytes:9999999},
  {...foundryGet,timeoutMs:0},
  {...foundryGet,timeoutMs:60000},
  {...foundryGet,body:"unexpected"},
  {...foundryGet,headers:{authorization:"Bearer safe-token-001\r\nX-Injected: 1"}},
  {...foundryPost,headers:{"content-type":"application/json"}},
  {...prismaPost,headers:{"content-type":"application/x-www-form-urlencoded"}}
 ];
 for(const req of invalid)await assert.rejects(http(req),deny);
 assert.equal(requests,0);
});

test("invalid, redirected, oversized and non-JSON responses are denied",async()=>{
 const wrong=[
  new Response("moved",{status:302,headers:{location:prisma+"/login"}}),
  new Response("text",{status:200,headers:{"content-type":"text/html"}}),
  new Response("bad json",{status:200,headers:{"content-type":"application/json"}}),
  json({data:"x".repeat(50000)}),
  new Response("{}",{status:200,headers:{
   "content-type":"application/json","content-length":"100000"
  }})
 ];
 for(const response of wrong){
  const http=createStrictEnterpriseVendorTransport({fetchImpl:async()=>response});
  await assert.rejects(http({...foundryGet,maxBytes:1024}),deny);
 }
});

test("network failures are sanitised, never disclosing secrets",async()=>{
 const http=createStrictEnterpriseVendorTransport({
  fetchImpl:async()=>{throw new Error("credential=secret-token-safe-001");}
 });
 await assert.rejects(http(foundryPost),deny);
 try{await http(foundryPost);}catch(err){
  assert.equal(err.message,"Enterprise vendor transport denied.");
  assert.equal(err.message.includes("secret-token-safe-001"),false);
 }
});

test("live-shaped Foundry integration composes with private rights and audit gates",async()=>{
 let requests=0;
 const fetchImpl=async(url,opts)=>{
  requests++;
  if(url===palantir+"/multipass/api/oauth2/token"){
   assert.equal(opts.method,"POST");
   return json({access_token:"ephemeral-token-00001"});
  }
  assert.equal(url,palantir+"/api/v2/ontologies");
  assert.equal(opts.headers.authorization,"Bearer ephemeral-token-00001");
  return json({data:[{apiName:"medicine"}]});
 };
 const httpRequest=createStrictEnterpriseVendorTransport({fetchImpl});
 const authority={verified:true,principalId:"director_001",
  workspaceId:"tenant_alpha",authorityRevision:"revision_001",accessScopes:["admin"]};
 const report=await probeEnterpriseVendor({
  vendor:"palantir_foundry",origin:palantir,authority,
  resolveCredentials:async()=>({clientId:"client_001",clientSecret:"secret-token-00001",oauthScope:"api:use-ontologies-read"}),
  verifyEntitlement:async()=>true,verifyCurrentAuthority:async()=>true,
  recordAudit:async(event)=>({committed:true,eventId:event.eventId}),
  httpRequest,clock:()=>Date.parse("2026-11-13T17:00:00Z")
 });
 assert.equal(requests,2);
 assert.equal(report.resourceCount,1);
 assert.equal(report.providerConnectivityObserved,true);
 assert.equal(report.productionCertified,false);
 assert.equal(report.customerReleaseApproved,false);
});

test("live-shaped Prisma Cloud integration composes without returning cloud account identifiers",async()=>{
 let requests=0;
 const httpRequest=createStrictEnterpriseVendorTransport({fetchImpl:async(url,opts)=>{
  requests++;
  if(url===prisma+"/login"){
   assert.equal(opts.method,"POST");
   return json({token:"ephemeral-prisma-token-00001"});
  }
  assert.equal(url,prisma+"/cloud");
  assert.equal(opts.headers["x-redlock-auth"],"ephemeral-prisma-token-00001");
  return json([{accountId:"private-account-001",name:"private-account"}]);
 }});
 const report=await probeEnterpriseVendor({
  vendor:"palo_alto_prisma",origin:prisma,
  authority:{verified:true,principalId:"director_001",
   workspaceId:"tenant_alpha",authorityRevision:"revision_001",accessScopes:["admin"]},
  resolveCredentials:async()=>({accessKeyId:"key_001",secretKey:"secret-token-00001"}),
  verifyCurrentAuthority:async()=>true,verifyEntitlement:async()=>true,
  recordAudit:async(e)=>({committed:true,eventId:e.eventId}),
  httpRequest,clock:()=>Date.parse("2026-11-13T17:00:00Z")
 });
 assert.equal(requests,2);
 assert.equal(report.resourceCount,1);
 assert.equal(JSON.stringify(report).includes("private-account-001"),false);
 assert.equal(report.productionCertified,false);
});
