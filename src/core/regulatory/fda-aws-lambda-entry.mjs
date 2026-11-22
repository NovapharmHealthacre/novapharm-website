/**
 * Deployable Node.js 22 Lambda factory for the FDA-only research route.
 * This file never provisions AWS resources or grants access.
 * AWS SDK v3 is loaded from the approved Lambda runtime only after
 * explicit owner, licensing, audit, and quota approvals.
 */
import { createPrivateFdaRuntime } from "./fda-private-runtime.mjs";

const rejectHeaders = Object.freeze({
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store, max-age=0",
  "x-content-type-options":"nosniff",
  "x-robots-tag":"noindex, nofollow, noarchive"
});
const unavailable=()=>({
  statusCode:503,headers:rejectHeaders,
  body:JSON.stringify({error:"Protected FDA research is not released."}),
  isBase64Encoded:false
});

function hasRequiredRelease(env){
  return env.NPI_FDA_OWNER_PRODUCTION_SIGNOFF==="true" &&
    env.NPI_FDA_RELEASE_ENABLED==="true" &&
    env.NPI_FDA_SOURCE_RIGHTS_SIGNOFF==="true" &&
    env.NPI_FDA_INDEPENDENT_ACCEPTANCE==="true" &&
    env.NPI_FDA_QUOTA_TABLE_APPROVED==="true" &&
    env.NPI_FDA_QUOTA_REGION==="eu-north-1" &&
    env.AWS_REGION==="eu-north-1" &&
    typeof env.NPI_FDA_QUOTA_TABLE==="string" &&
    /^[-A-Za-z0-9_.]{3,255}$/u.test(env.NPI_FDA_QUOTA_TABLE) &&
    !env.NPI_FDA_QUOTA_TABLE.startsWith(".") &&
    !env.NPI_FDA_QUOTA_TABLE.endsWith(".");
}

/**
 * @param {{ env?:object, clock?:()=>number,
 * sdkLoader?:()=>Promise<{DynamoDBClient:Function,UpdateItemCommand:Function}>,
 * searchLabels?:Function, searchEvidence?:Function }} dependencies
 */
export function createFdaAwsLambdaHandler({
  env=process.env,
  clock=Date.now,
  sdkLoader=()=>import("@aws-sdk/client-dynamodb"),
  searchLabels,searchEvidence
}={}){
  let runtimePromise;
  return async function handler(event){
    // No SDK client, credentials, FDA network or DynamoDB operation without sign-off.
    if(!hasRequiredRelease(env))return unavailable();
    try {
      if(!runtimePromise){
        runtimePromise=(async()=>{
          const sdk=await sdkLoader();
          if(typeof sdk?.DynamoDBClient!=="function" ||
             typeof sdk?.UpdateItemCommand!=="function")
            throw new Error("FDA quota SDK unavailable");
          const client=new sdk.DynamoDBClient({region:"eu-north-1",maxAttempts:2});
          if(!client || typeof client.send!=="function")
            throw new Error("FDA quota adapter unavailable");
          const updateItem=async input=>client.send(new sdk.UpdateItemCommand(input));
          return createPrivateFdaRuntime({
            updateItem,env,clock,
            ...(searchLabels ? {searchLabels}:{}),
            ...(searchEvidence ? {searchEvidence}:{})
          });
        })();
      }
      const runtime=await runtimePromise;
      return await runtime(event);
    }catch{
      // No tokens, subject IDs, source responses or internal exceptions in output.
      return unavailable();
    }
  };
}

export const handler=createFdaAwsLambdaHandler();
