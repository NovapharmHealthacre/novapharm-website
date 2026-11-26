import assert from "node:assert/strict";
import {test} from "node:test";
import {createAtomicDynamoFdaQuota} from "../src/core/regulatory/fda-dynamodb-quota.mjs";

const secret="a".repeat(70);
const env={
 NPI_FDA_QUOTA_TABLE_APPROVED:"true",
 NPI_FDA_QUOTA_TABLE:"reviewed-isolated-fda-quota-table",
 NPI_FDA_QUOTA_HMAC_SECRET:secret,
 NPI_FDA_QUOTA_MAX_REQUESTS:"5"
};
const route="/v1/intelligence/regulatory/us/fda-research";
const request={sub:"reviewed-anonymous-principal-123",path:route,kind:"labels"};
function fakeStore(){
 const counters=new Map(),writes=[];
 async function updateItem(payload) {
   writes.push(payload);
   const key=payload.Key.PK.S+"|"+payload.Key.SK.S;
   const count=counters.get(key)??0;
   const max=Number(payload.ExpressionAttributeValues[":max"].N);
   if(count>=max){
     const error=new Error("quota exceeded");error.name="ConditionalCheckFailedException";throw error;
   }
   counters.set(key,count+1);
 }
 return {updateItem,writes,counters};
}
test("no AWS write if missing approval, private salt, valid table or quota",async()=>{
 for(const changes of [
   {NPI_FDA_QUOTA_TABLE_APPROVED:"false"},
   {NPI_FDA_QUOTA_TABLE:""},
   {NPI_FDA_QUOTA_TABLE:"bad/table"},
   {NPI_FDA_QUOTA_HMAC_SECRET:"short"},
   {NPI_FDA_QUOTA_MAX_REQUESTS:"6"},
   {NPI_FDA_QUOTA_MAX_REQUESTS:"0"}
 ]){
   const store=fakeStore();
   const limit=createAtomicDynamoFdaQuota({updateItem:store.updateItem,env:{...env,...changes},nowMs:()=>1795260000000});
   await assert.rejects(limit(request),/not configured/);
   assert.equal(store.writes.length,0);
 }
});
test("no AWS write for missing identity, bad route or invalid kinds",async()=>{
 for(const req of [
  {...request,sub:""},
  {...request,path:"/public/api"},
  {...request,kind:"unreviewed"},
  {...request,sub:"foo\nbar"}
 ]){
   const store=fakeStore(),limit=createAtomicDynamoFdaQuota({
     updateItem:store.updateItem,env,nowMs:()=>1795260000000
   });
   await assert.rejects(limit(req));
   assert.equal(store.writes.length,0);
 }
});
test("multiple FDA datasets share one atomic five-call limit, without writing subject IDs",async()=>{
 const store=fakeStore();
 const limiter=createAtomicDynamoFdaQuota({updateItem:store.updateItem,env,nowMs:()=>1795260000000});
 const kinds=["labels","approvals","ndc","adverse-events","recalls","labels","ndc","labels"];
 const answers=await Promise.all(kinds.map(kind=>limiter({...request,kind})));
 assert.deepEqual(answers,[true,true,true,true,true,false,false,false]);
 assert.equal(store.counters.size,1);
 const entry=store.writes[0];
 assert.equal(entry.TableName,env.NPI_FDA_QUOTA_TABLE);
 assert.match(entry.Key.PK.S,/^FDA_QUOTA#[a-f0-9]{64}$/u);
 assert.ok(!JSON.stringify(entry).includes(request.sub));
 assert.equal(entry.ExpressionAttributeValues[":max"].N,"5");
 assert.equal(entry.ExpressionAttributeNames["#ttl"],"ttlEpoch");
 assert.equal(entry.ConditionExpression,"attribute_not_exists(#used) OR #used < :max");
});
test("different identities, time windows and HMAC secrets isolate counters",async()=>{
 const store=fakeStore();
 const base=1795260000000;
 const limit1=createAtomicDynamoFdaQuota({updateItem:store.updateItem,env,nowMs:()=>base});
 const limit2=createAtomicDynamoFdaQuota({updateItem:store.updateItem,env,nowMs:()=>base+60000});
 const limit3=createAtomicDynamoFdaQuota({updateItem:store.updateItem,env:{...env,NPI_FDA_QUOTA_HMAC_SECRET:"b".repeat(70)},nowMs:()=>base});
 assert.equal(await limit1(request),true);
 assert.equal(await limit1({...request,sub:"different-board-principal"}),true);
 assert.equal(await limit2(request),true);
 assert.equal(await limit3(request),true);
 assert.equal(store.counters.size,4);
});
test("Dynamo transport and clock failures deny rather than silently allowing research",async()=>{
 const broken=createAtomicDynamoFdaQuota({
   updateItem:async()=>{throw Error("connection failed details")},
   env,nowMs:()=>1795260000000
 });
 await assert.rejects(broken(request),/unavailable/);
 const clock=createAtomicDynamoFdaQuota({
   updateItem:async()=>{throw Error("must not call")},
   env,nowMs:()=>NaN
 });
 await assert.rejects(clock(request),/clock unavailable/);
});
test("unwired or non-atomic quota provider fails closed",async()=>{
 const limiter=createAtomicDynamoFdaQuota({env,nowMs:()=>1795260000000});
 await assert.rejects(limiter(request),/quota service unavailable/);
});
