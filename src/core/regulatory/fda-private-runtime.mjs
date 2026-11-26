/**
 * Dependency-injected private FDA Lambda runtime candidate.
 * AWS operator must wire an approved DynamoDB SDK UpdateItem adapter, qualified
 * Lambda alias and API Gateway JWT authorizer before use. No default handler
 * is exported: missing sign-offs or dependency cannot publish an endpoint.
 */
import { createPrivateFdaHandler } from "./fda-private-http-handler.mjs";
import { createAtomicDynamoFdaQuota } from "./fda-dynamodb-quota.mjs";
export function createPrivateFdaRuntime({updateItem,env=process.env,clock=Date.now,
  searchLabels,searchEvidence}={}) {
  const limit=createAtomicDynamoFdaQuota({updateItem,env,nowMs:clock});
  return createPrivateFdaHandler({
    env,clock,limit,
    ...(searchLabels ? {searchLabels}:{ }),
    ...(searchEvidence ? {searchEvidence}:{ })
  });
}
