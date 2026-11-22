import assert from "node:assert/strict";
import { test } from "node:test";
import { createFdaAwsLambdaHandler } from "../src/core/regulatory/fda-aws-lambda-entry.mjs";

const now=1795260000;
const issuer="https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_jBL6hCUE2";
const env={
 AWS_REGION:"eu-north-1",NPI_FDA_QUOTA_REGION:"eu-north-1",
 NPI_FDA_OWNER_PRODUCTION_SIGNOFF:"true",NPI_FDA_RELEASE_ENABLED:"true",
 NPI_FDA_SOURCE_RIGHTS_SIGNOFF:"true",NPI_FDA_INDEPENDENT_ACCEPTANCE:"true",
 NPI_FDA_QUOTA_TABLE_APPROVED:"true",NPI_FDA_QUOTA_TABLE:"approved-isolated-private-fda",
 NPI_FDA_QUOTA_HMAC_SECRET:"Q".repeat(64),NPI_FDA_QUOTA_MAX_REQUESTS:"5",
 NPI_FDA_EXPECTED_ISSUER:issuer,NPI_FDA_APPROVED_CLIENT_IDS:"approved-native",
 NPI_FDA_APPROVED_BOARD_GROUPS:"board-reviewers",
 NPI_FDA_REQUIRED_SCOPE:"novapharm/fda.read"
};
function event(kind="ndc"){
 return {
  rawPath:"/v1/intelligence/regulatory/us/fda-research",
  requestContext:{http:{method:"GET"},authorizer:{jwt:{
    claims:{token_use:"access",iss:issuer,sub:"pseudonymous-board-user",
    client_id:"approved-native",exp:String(now+600),scope:"openid novapharm/fda.read",
    "cognito:groups":'["board-reviewers"]'},scopes:["novapharm/fda.read"]
  }}},
  queryStringParameters:{kind,drug:"apixaban"},
  rawQueryString:"kind="+kind+"&drug=apixaban"
 };
}
function create(options={}){
 const seen=[];
 class FakeCommand { constructor(input){ this.input=input; } }
 class FakeClient {
   constructor(config){seen.push(["client",config]);}
   async send(cmd){seen.push(["quota",cmd.input]);return {};}
 }
 const sdkLoader=async()=>{seen.push(["sdk"]);return {
  DynamoDBClient:FakeClient,UpdateItemCommand:FakeCommand};};
 const handler=createFdaAwsLambdaHandler({
  env,clock:()=>now*1000,sdkLoader,
  searchEvidence:async (kind,drug,context)=>{
    seen.push(["fda",kind,drug,context]);
    return {sourceId:"us.fda.openfda."+kind,
      dataState:"public_source_observations",
      records:kind==="adverse-events"?[]:[{productNdc:"12345-678"}],
      matchedCountReported:9};
  },
  searchLabels:async (drug,context)=>{
    seen.push(["labels",drug,context]);
    return {sourceId:"us.fda.openfda-labels",dataState:"no_source_matches",records:[]};
  },...options
 });
 return {handler,seen};
}
test("owner and all three release grants must be true before importing AWS SDK",async()=>{
 for(const key of ["NPI_FDA_OWNER_PRODUCTION_SIGNOFF",
  "NPI_FDA_RELEASE_ENABLED","NPI_FDA_SOURCE_RIGHTS_SIGNOFF",
  "NPI_FDA_INDEPENDENT_ACCEPTANCE","NPI_FDA_QUOTA_TABLE_APPROVED"]){
   const x=create({env:{...env,[key]:"false"}});
   const response=await x.handler(event());
   assert.equal(response.statusCode,503,key);
   assert.deepEqual(x.seen,[]);
 }
 for(const item of [{...env,AWS_REGION:"eu-west-2"},
  {...env,NPI_FDA_QUOTA_REGION:"eu-west-2"},
  {...env,NPI_FDA_QUOTA_TABLE:"bad table"}]){
   const x=create({env:item});
   assert.equal((await x.handler(event())).statusCode,503);
   assert.deepEqual(x.seen,[]);
 }
});
test("authorized synthetic request binds SDK v3 UpdateItem then calls source adapter",async()=>{
 const x=create();
 const res=await x.handler(event());
 assert.equal(res.statusCode,200);
 assert.equal(res.headers["cache-control"],"no-store, max-age=0");
 assert.equal(JSON.parse(res.body).records[0].productNdc,"12345-678");
 assert.deepEqual(x.seen.map(x=>x[0]),["sdk","client","quota","fda"]);
 assert.equal(x.seen[1][1].region,"eu-north-1");
 assert.equal(x.seen[2][1].TableName,"approved-isolated-private-fda");
 assert.match(x.seen[2][1].Key.PK.S,/^FDA_QUOTA#[a-f0-9]{64}$/u);
 assert.ok(!JSON.stringify(x.seen[2][1]).includes("pseudonymous-board-user"));
});
test("runtime reuses one SDK client but atomically counts every approved request",async()=>{
 const x=create();
 assert.equal((await x.handler(event("ndc"))).statusCode,200);
 assert.equal((await x.handler(event("recalls"))).statusCode,200);
 assert.equal(x.seen.filter(y=>y[0]==="sdk").length,1);
 assert.equal(x.seen.filter(y=>y[0]==="client").length,1);
 assert.equal(x.seen.filter(y=>y[0]==="quota").length,2);
});
test("unapproved Cognito roles cannot query source or consume a quota counter",async()=>{
 const x=create();
 const e=event();e.requestContext.authorizer.jwt.claims["cognito:groups"]='["customer"]';
 assert.equal((await x.handler(e)).statusCode,403);
 assert.equal(x.seen.filter(y=>y[0]==="quota").length,0);
 assert.equal(x.seen.filter(y=>y[0]==="fda").length,0);
});
test("conditional quota exhaustion is 429; SDK failure and internal messages never escape",async()=>{
 const exhausted=create({sdkLoader:async()=>({
  DynamoDBClient:class {async send(){const x=new Error("SECRET-QUOTA-INTERNAL");x.name="ConditionalCheckFailedException";throw x;}},
  UpdateItemCommand:class {constructor(input){this.input=input;}}
 })});
 const v=await exhausted.handler(event());
 assert.equal(v.statusCode,429);
 assert.ok(!v.body.includes("SECRET"));
 const failed=create({sdkLoader:async()=>{throw Error("SECRET-SDK-CREDENTIAL");}});
 const z=await failed.handler(event());
 assert.equal(z.statusCode,503);
 assert.ok(!z.body.includes("SECRET"));
});
test("direct Lambda event without API Gateway trusted JWT is rejected",async()=>{
 const x=create();
 const e=event();delete e.requestContext.authorizer;
 assert.equal((await x.handler(e)).statusCode,403);
 assert.equal(x.seen.some(y=>y[0]==="quota"),false);
 assert.equal(x.seen.some(y=>y[0]==="fda"),false);
});
