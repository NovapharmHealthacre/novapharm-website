import assert from "node:assert/strict";
import {test} from "node:test";
import {nativeFdaGatewayReady,queryProtectedFdaNative}
 from "../native/novapharm-intelligence-mobile/ProtectedFdaGateway.ts";

const host="q2e6ztf8ic.execute-api.eu-north-1.amazonaws.com";
const config={
 privateApiOrigin:"https://"+host+"/",
 expectedPrivateApiHost:host,
 mobileSessionAccepted:true,
 privateRouteAccepted:true,
 independentRightsAccepted:true,
 signedAppIdentityAccepted:true
};
const token=async()=>"a".repeat(80);
const response=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json"}
});
function fixture(kind="ndc"){
 return {sourceId:"us.fda.openfda."+kind,kind,records:kind==="adverse-events"?[]:[{productNdc:"12345-678"}],
         retrievedAt:"2026-11-21T00:00:00Z",dataState:"public_source_observations"};
}
test("every independent native approval and explicit host binding is mandatory",()=>{
 assert.equal(nativeFdaGatewayReady(config),true);
 for(const field of ["mobileSessionAccepted","privateRouteAccepted","independentRightsAccepted","signedAppIdentityAccepted"])
   assert.equal(nativeFdaGatewayReady({...config,[field]:false}),false,field);
 for(const origin of ["http://"+host+"/","https://evil.example/","https://"+host+"/notroot",
   "https://"+host+"/?a=1","https://"+host+":9443/"]){
   assert.equal(nativeFdaGatewayReady({...config,privateApiOrigin:origin}),false,origin);
 }
});
test("disabled client never asks for or leaks credentials",async()=>{
 let asked=0,network=0;
 await assert.rejects(queryProtectedFdaNative({config:{...config,mobileSessionAccepted:false},
   kind:"ndc",drug:"apixaban",accessToken:async()=>{asked++;return "a".repeat(80)},
   fetchImpl:async()=>{network++;return response(fixture())}}),/not been accepted/);
 assert.equal(asked,0);assert.equal(network,0);
});
test("approved source-only query is HTTPS, GET, fixed route and private bearer",async()=>{
 let times=0;
 const data=await queryProtectedFdaNative({config,kind:"ndc",drug:"apixaban",accessToken:token,
  fetchImpl:async(url,init)=>{
    times++;
    const u=new URL(String(url));
    assert.equal(u.host,host);
    assert.equal(u.pathname,"/v1/intelligence/regulatory/us/fda-research");
    assert.equal(u.searchParams.get("kind"),"ndc");
    assert.equal(u.searchParams.get("drug"),"apixaban");
    assert.equal(init?.method,"GET");
    assert.equal(init?.redirect,"error");
    assert.equal(init?.headers.Authorization,"Bearer "+"a".repeat(80));
    return response(fixture());
  }
 });
 assert.equal(times,1);
 assert.equal(data.records.length,1);
});
test("disallowed kinds, injection and missing token block outbound",async()=>{
 let network=0;
 for(const [kind,drug,provider] of [
  ["other","apixaban",token],["ndc","a:OR:b",token],["ndc","b\nNEW",token],
  ["ndc","apixaban",async()=>""]
 ]){
   await assert.rejects(queryProtectedFdaNative({config,kind,drug,accessToken:provider,
     fetchImpl:async()=>{network++;return response(fixture())}}));
 }
 assert.equal(network,0);
});
test("FAERS must be count-only, rejects patient raw events, other unsafe responses",async()=>{
 const safe=await queryProtectedFdaNative({config,kind:"adverse-events",drug:"apixaban",accessToken:token,
   fetchImpl:async()=>response(fixture("adverse-events"))});
 assert.equal(safe.records.length,0);
 for(const v of [
   response({sourceId:"us.fda.openfda.adverse-events",dataState:"public_source_observations",records:[{patient:"private"}]}),
   response(fixture("ndc"),403),response(fixture("ndc"),429),
   new Response("html",{status:200,headers:{"content-type":"text/html"}}),
   response({records:[]})
 ]){
   await assert.rejects(queryProtectedFdaNative({config,kind:"adverse-events",drug:"apixaban",accessToken:token,
     fetchImpl:async()=>v}));
 }
});

test("native FDA gateway bounds streamed bytes even when content-length is missing or dishonest",async()=>{
 for(const mocked of [
  new Response(JSON.stringify(fixture("ndc")),{headers:{"content-type":"application/json","content-length":"262145"}}),
  new Response(JSON.stringify({sourceId:"us.fda.openfda.ndc",dataState:"public_source_observations",records:[{oversized:"x".repeat(280000)}]}),
    {headers:{"content-type":"application/json"}}),
  new Response(new Uint8Array([0xff,0xfe]),{headers:{"content-type":"application/json"}})
 ]){
  await assert.rejects(queryProtectedFdaNative({
   config,kind:"ndc",drug:"apixaban",accessToken:token,fetchImpl:async()=>mocked
  }));
 }
});
test("native FDA gateway rejects source-ID swaps and contradictory source result kinds",async()=>{
 const invalid=[
  {...fixture("ndc"),sourceId:"us.fda.openfda.recalls"},
  {...fixture("ndc"),kind:"recalls"},
  {...fixture("ndc"),dataState:"no_source_matches"}
 ];
 for(const data of invalid){
  await assert.rejects(queryProtectedFdaNative({
   config,kind:"ndc",drug:"apixaban",accessToken:token,fetchImpl:async()=>response(data)
  }),/provenance/);
 }
});
test("native FDA gateway parses valid streaming body without reading the unbounded text method",async()=>{
 const mocked=response(fixture("ndc"));
 mocked.text=async()=>{throw Error("Forbidden unbounded text read");};
 const value=await queryProtectedFdaNative({
   config,kind:"ndc",drug:"apixaban",accessToken:token,fetchImpl:async()=>mocked
 });
 assert.equal(value.records.length,1);
});
