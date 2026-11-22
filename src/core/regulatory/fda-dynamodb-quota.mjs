/**
 * Atomic FDA quota contract for an approved DynamoDB PK/SK table.
 * REQUIRES an existing, independently approved table, IAM isolation,
 * billing clearance and a server-held 64+ character secret. No table is
 * created or written until a real AWS adapter is injected by an operator.
 *
 * All FDA datasets share the same per-principal 60-second window so changing
 * dataset keys cannot bypass the limit. Raw subjects are never persisted.
 */
import { createHmac } from "node:crypto";
const fixedRoute="/v1/intelligence/regulatory/us/fda-research";
function unavailable(message="Protected FDA quota is not configured.") {
  return Object.assign(new Error(message),{statusCode:503});
}
function validTable(value) {
  return typeof value==="string" &&
    /^[A-Za-z0-9_.-]{3,255}$/u.test(value) &&
    !value.startsWith(".") && !value.endsWith(".") ;
}
function quotaConfig(env) {
  if(env.NPI_FDA_QUOTA_TABLE_APPROVED!=="true" ||
     !validTable(env.NPI_FDA_QUOTA_TABLE) ||
     typeof env.NPI_FDA_QUOTA_HMAC_SECRET!=="string" ||
     env.NPI_FDA_QUOTA_HMAC_SECRET.length<64 ||
     /[\p{Cc}\p{Cf}\p{Cs}]/u.test(env.NPI_FDA_QUOTA_HMAC_SECRET))
    throw unavailable();
  const max=Number(env.NPI_FDA_QUOTA_MAX_REQUESTS??"5");
  if(!Number.isSafeInteger(max)||max<1||max>5)throw unavailable();
  return {table:env.NPI_FDA_QUOTA_TABLE,secret:env.NPI_FDA_QUOTA_HMAC_SECRET,max};
}
/**
 * @param {{updateItem:(input:object)=>Promise<unknown>, env?:object, nowMs?:()=>number}} deps
 * @returns {(request:{sub:string,path:string,kind:string})=>Promise<boolean>}
 */
export function createAtomicDynamoFdaQuota({updateItem,env=process.env,nowMs=Date.now}={}) {
  return async ({sub,path,kind}={})=>{
    if(typeof updateItem!=="function")throw unavailable("Atomic FDA quota service unavailable.");
    const {table,secret,max}=quotaConfig(env);
    if(typeof sub!=="string" || sub.length<6 || sub.length>512 ||
       /[\p{Cc}\p{Cf}\p{Cs}]/u.test(sub) ||
       path!==fixedRoute ||
       !["labels","approvals","ndc","adverse-events","recalls"].includes(kind))
       throw unavailable("FDA research quota request invalid.");
    const timestamp=nowMs();
    if(!Number.isFinite(timestamp) || timestamp<0 || !Number.isSafeInteger(Math.floor(timestamp)))
      throw unavailable("FDA quota clock unavailable.");
    const minute=Math.floor(timestamp/60000);
    const principal=createHmac("sha256",secret)
      .update("US-FDA\0").update(sub).update("\0").update(path).digest("hex");
    const params={
      TableName:table,
      Key:{
        PK:{S:"FDA_QUOTA#"+principal},
        SK:{S:"MINUTE#"+minute}
      },
      UpdateExpression:"SET #used = if_not_exists(#used, :zero) + :one, #ttl = :expiry",
      ConditionExpression:"attribute_not_exists(#used) OR #used < :max",
      ExpressionAttributeNames:{"#used":"used","#ttl":"ttlEpoch"},
      ExpressionAttributeValues:{
        ":zero":{N:"0"},":one":{N:"1"},":max":{N:String(max)},
        ":expiry":{N:String(Math.floor(timestamp/1000)+180)}
      },
      ReturnValues:"NONE"
    };
    try { await updateItem(params); return true; }
    catch(error) {
      if(error?.name==="ConditionalCheckFailedException" ||
         error?.Code==="ConditionalCheckFailedException")return false;
      throw unavailable("Atomic FDA quota service unavailable.");
    }
  };
}
