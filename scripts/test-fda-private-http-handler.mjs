import assert from "node:assert/strict";
import { test } from "node:test";
import { createPrivateFdaHandler } from "../src/core/regulatory/fda-private-http-handler.mjs";

const now = 1795260000;
const issuer="https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_jBL6hCUE2";
const env={
  NPI_FDA_RELEASE_ENABLED:"true",
  NPI_FDA_SOURCE_RIGHTS_SIGNOFF:"true",
  NPI_FDA_INDEPENDENT_ACCEPTANCE:"true",
  NPI_FDA_EXPECTED_ISSUER:issuer,
  NPI_FDA_APPROVED_CLIENT_IDS:"native-reviewed-client",
  NPI_FDA_APPROVED_BOARD_GROUPS:"board-reviewers",
  NPI_FDA_REQUIRED_SCOPE:"novapharm/fda.read"
};
const allKinds=["labels","approvals","ndc","adverse-events","recalls"];
function event(kind="ndc", partial={}) {
  return {
    rawPath:"/v1/intelligence/regulatory/us/fda-research",
    rawQueryString:"kind="+kind+"&drug=apixaban",
    requestContext:{
      http:{method:"GET"},
      authorizer:{
        jwt:{
          claims:{ token_use:"access",sub:"pseudonymous-fda-board-user",iss:issuer,
            client_id:"native-reviewed-client",exp:String(now+600),
            scope:"openid novapharm/fda.read",
            "cognito:groups":'["board-reviewers"]'
          },
          scopes:["openid","novapharm/fda.read"]
        }
      }
    },
    queryStringParameters:{kind,drug:"apixaban"},
    ...partial
  };
}
function create(options={}) {
  const calls=[];
  const handler=createPrivateFdaHandler({
    env,clock:()=>now*1000,
    limit:async ({sub,kind}) => {calls.push(["limiter",sub,kind]);return true;},
    searchEvidence:async (kind,drug,scope)=>{
      calls.push(["source",kind,drug,scope.accessScopes[0]]);
      const samples={approvals:{applicationNumber:"NDA123456"},
        ndc:{productNdc:"12345-678"},recalls:{recallNumber:"D-0001-2026"}};
      return {kind,sourceId:"us.fda.openfda."+kind,dataState:"public_source_observations",
        records:kind==="adverse-events"?[]:[samples[kind]],matchedCountReported:2};
    },
    searchLabels:async (drug,scope)=>{
      calls.push(["labels",drug,scope.accessScopes[0]]);
      return {sourceId:"us.fda.openfda-labels",records:[],dataState:"no_source_matches"};
    },
    ...options
  });
  return {handler,calls};
}
test("missing release sign-off, rights or limiter refuses without source calls",async()=>{
 for(const [key,value] of [
   ["NPI_FDA_RELEASE_ENABLED","false"],["NPI_FDA_SOURCE_RIGHTS_SIGNOFF","false"],
   ["NPI_FDA_INDEPENDENT_ACCEPTANCE","false"],["NPI_FDA_REQUIRED_SCOPE",""],
   ["NPI_FDA_APPROVED_CLIENT_IDS",""],["NPI_FDA_APPROVED_BOARD_GROUPS",""]
 ]){
   const {handler,calls}=create({env:{...env,[key]:value}});
   const v=await handler(event());
   assert.equal(v.statusCode,503,key);
   assert.equal(calls.length,0);
 }
 const {handler,calls}=create({limit:undefined});
 assert.equal((await handler(event())).statusCode,503);
 assert.deepEqual(calls,[]);
});
test("JWT claims are only accepted when gateway supplied access token, audience, scope and exact board group",async()=>{
 const mutated=[
   {authorizer:null},
   {authorizer:{jwt:{claims:{...event().requestContext.authorizer.jwt.claims,token_use:"id"}}}},
   {authorizer:{jwt:{claims:{...event().requestContext.authorizer.jwt.claims,iss:"https://attacker.example/"}}}},
   {authorizer:{jwt:{claims:{...event().requestContext.authorizer.jwt.claims,client_id:"unreviewed-app"}}}},
   {authorizer:{jwt:{claims:{...event().requestContext.authorizer.jwt.claims,scope:"openid","cognito:groups":'["board-reviewers"]'},scopes:[]}}},
   {authorizer:{jwt:{claims:{...event().requestContext.authorizer.jwt.claims,"cognito:groups":'["customer","board-reviewers-fake"]'}}}},
   {authorizer:{jwt:{claims:{...event().requestContext.authorizer.jwt.claims,exp:String(now)}}}},
   {authorizer:{jwt:{claims:{...event().requestContext.authorizer.jwt.claims,sub:""}}}}
 ];
 for(const m of mutated){
   const {handler,calls}=create();
   const e=event();e.requestContext={...e.requestContext,...m};
   const v=await handler(e);
   assert.equal(v.statusCode,403,JSON.stringify(m).slice(0,100));
   assert.equal(calls.length,0);
 }
});
test("GET only, route exact, bounded kinds and drug input",async()=>{
 for(const change of [
   {rawPath:"/v1/intelligence/regulatory/us/fda-research/evil"},
   {rawPath:"/v1/intelligence/regulatory/us/fda-evidence"},
   {queryStringParameters:{kind:"users",drug:"apixaban"}},
   {queryStringParameters:{kind:"ndc",drug:"bad:OR:*"}},
   {rawQueryString:"x".repeat(501)},
 ]){
   const {handler,calls}=create();
   const v=await handler(event("ndc",change));
   assert.ok([400,404].includes(v.statusCode));
   assert.equal(calls.length,0);
 }
 const {handler,calls}=create();
 const e=event();e.requestContext.http.method="POST";
 const v=await handler(e);assert.equal(v.statusCode,405);assert.equal(v.headers.allow,"GET");
 assert.equal(calls.length,0);
});
for(const kind of allKinds){
 test("approved board research response "+kind+" is no-store and source-only",async()=>{
   const {handler,calls}=create();
   const v=await handler(event(kind));
   assert.equal(v.statusCode,200);
   assert.match(v.headers["cache-control"],/no-store/);
   assert.equal(v.headers["x-robots-tag"],"noindex, nofollow, noarchive");
   assert.equal(JSON.parse(v.body).sourceId,kind==="labels"?"us.fda.openfda-labels":"us.fda.openfda."+kind);
   assert.equal(calls[0][0],"limiter");
   assert.equal(calls[1][0],kind==="labels"?"labels":"source");
   if(kind==="adverse-events")assert.equal(JSON.parse(v.body).records.length,0);
 });
}
test("raw HTTP API query pollution is rejected before atomic quota and FDA egress",async()=>{
 const cases=[
  "kind=ndc&kind=recalls&drug=apixaban",
  "kind=ndc&drug=apixaban&drug=warfarin",
  "kind=ndc&drug=apixaban&source=private",
  "drug=apixaban",
  "kind=ndc",
  "kind=recalls&drug=apixaban",
  "kind=ndc&drug=warfarin",
  "kind=ndc&drug=apixaban&",
  "kind=ndc&drug=apixaban&kind=ndc",
  ""
 ];
 for(const rawQueryString of cases){
  const {handler,calls}=create();
  const res=await handler(event("ndc",{rawQueryString}));
  assert.equal(res.statusCode,400,rawQueryString);
  assert.equal(calls.length,0,rawQueryString);
 }
 const {handler,calls}=create();
 assert.equal((await handler(event("ndc",{queryStringParameters:{kind:"ndc",drug:"apixaban",extra:"x"}}))).statusCode,400);
 assert.equal(calls.length,0);
});
test("unexpected, too-many, or oversized source records cannot leak through board API",async()=>{
 for(const payload of [
  {sourceId:"us.fda.openfda.ndc",records:[{id:"private"}],dataState:"unverified"},
  {sourceId:"us.fda.openfda.recalls",records:[],dataState:"public_source_observations"},
  {sourceId:"us.fda.openfda.ndc",records:[{id:"private"}],dataState:"no_source_matches"},
  {sourceId:"us.fda.openfda.ndc",records:[{id:"private"}]},
  {sourceId:"us.fda.openfda.ndc",dataState:"public_source_observations",records:Array(6).fill({id:"x"})},
  {sourceId:"us.fda.openfda.ndc",dataState:"public_source_observations",records:[{note:"x".repeat(270000)}]}
 ]){
  const {handler,calls}=create({searchEvidence:async()=>payload});
  const result=await handler(event("ndc"));
  assert.equal(result.statusCode,503);
  assert.equal(calls[0][0],"limiter");
  assert.ok(!result.body.includes("private"));
  assert.ok(!result.body.includes("x".repeat(500)));
 }
});
test("FDA allowlist denies unknown source metadata, unreviewed patient fields and nested objects",async()=>{
 const cases=[
  {sourceId:"us.fda.openfda.ndc",dataState:"public_source_observations",records:[{productNdc:"12345-678",patient:{name:"SENSITIVE"}}]},
  {sourceId:"us.fda.openfda.ndc",dataState:"public_source_observations",records:[{productNdc:"12345-678"}],debugSecret:"SENSITIVE"},
  {sourceId:"us.fda.openfda.ndc",dataState:"public_source_observations",records:[{productNdc:"12345-678",genericName:"SENSITIVE\\nTEXT"}]},
  {sourceId:"us.fda.openfda.ndc",dataState:"public_source_observations",records:[{productNdc:"12345-678"}],limitations:[{token:"SENSITIVE"}]},
  {sourceId:"us.fda.openfda.ndc",dataState:"public_source_observations",records:[{productNdc:"12345-678"}],matchedCountReported:-1},
 ];
 for(const payload of cases){
  const {handler,calls}=create({searchEvidence:async()=>payload});
  const response=await handler(event("ndc"));
  assert.equal(response.statusCode,503);
  assert.equal(calls[0][0],"limiter");
  assert.ok(!response.body.includes("SENSITIVE"));
 }
});
test("FDA response allowlist accepts reviewed nested approvals and limited source fields",async()=>{
 const {handler}=create({searchEvidence:async()=>({
  sourceId:"us.fda.openfda.approvals",
  dataState:"public_source_observations",kind:"approvals",
  records:[{applicationNumber:"NDA123456",products:[{brandName:"Reviewed"}],
    submissions:[{status:"AP"}]}],matchedCountReported:1,limitations:["Research only"]
 })});
 const response=await handler(event("approvals"));
 assert.equal(response.statusCode,200);
 assert.equal(JSON.parse(response.body).records[0].products[0].brandName,"Reviewed");
});
test("FDA response allowlist rejects unreviewed nested approval fields",async()=>{
 const {handler}=create({searchEvidence:async()=>({
  sourceId:"us.fda.openfda.approvals",dataState:"public_source_observations",
  records:[{applicationNumber:"NDA123456",products:[{patient:"SENSITIVE"}]}]
 })});
 const response=await handler(event("approvals"));
 assert.equal(response.statusCode,503);
 assert.ok(!response.body.includes("SENSITIVE"));
});
test("quota refusal/transport failure and malformed FAERS data fail closed",async()=>{
 const blocked=create({limit:async()=>false});
 const status=await blocked.handler(event());
 assert.equal(status.statusCode,429);
 assert.equal(status.headers["retry-after"],"60");
 assert.ok(!status.body.includes("pseudonymous-fda-board-user"));
 const failed=create({limit:async()=>{throw Error("internal key") }});
 const v=await failed.handler(event());
 assert.equal(v.statusCode,503);
 assert.ok(!v.body.includes("internal key"));
 const unsafe=create({searchEvidence:async()=>({records:[{patient:{name:"PRIVATE"}}]})});
 const z=await unsafe.handler(event("adverse-events"));
 assert.equal(z.statusCode,503);
 assert.ok(!z.body.includes("PRIVATE"));
});
